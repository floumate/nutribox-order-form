import type { StepConfig } from "./stepEngine";
import { state } from "../lib/state";
import { urlContext } from "../lib/urlParams";
import { isPhoneValid } from "../lib/phone";
import { initDatepicker, initBirthDatepicker } from "../lib/datepicker";
import { showError, hideError, EMAIL_REGEX } from "../lib/validation";
import { GOALS } from "../config/goals";
import { PLANS, getPlan, getMacros, isMaxPlan } from "../config/plans";
import { DIET_TYPES, getDiet } from "../config/dietTypes";
import { getAllergensFor } from "../config/allergens";
import { qualifiesForNutriChef } from "../lib/nutrichef";
import { PACKAGES, PACKAGE_GROUPS, getPackage } from "../config/packages";
import { computePrice, formatPrice } from "../config/pricing";
import { NASELJA } from "../config/delivery";
import { PAYMENT_OPTIONS } from "../config/payments";
import type {
  DietId,
  FirmaData,
  PackageId,
  PaymentMethod,
  PlanId,
  Sex,
} from "../types";

// ---------------------------------------------------------------------
// Helperi
// ---------------------------------------------------------------------

function reqEl<T extends HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`[nutribox] Nedostaje element: ${sel}`);
  return el;
}

function wireChoiceGrid(
  container: HTMLElement,
  onSelect: (value: string, card: HTMLElement) => void,
  autoNext = false,
): void {
  let timer: number | undefined;
  container.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-choice]");
    if (!card || !container.contains(card)) return;
    container
      .querySelectorAll<HTMLElement>("[data-choice]")
      .forEach((c) => c.classList.toggle("card--selected", c === card));
    onSelect(card.dataset.choice ?? "", card);
    const step = container.closest<HTMLElement>(".step");
    if (step) hideError(step);

    // Auto-next: posle kratkog highlighta pređi na sledeći korak.
    if (autoNext && step) {
      const nextBtn = step.querySelector<HTMLElement>('[data-nav="next"]');
      if (nextBtn) {
        clearTimeout(timer);
        timer = window.setTimeout(() => nextBtn.click(), 280);
      }
    }
  });
}

/** Multi-select toggle (za izbacivanje namirnica) — svaka kartica se toggluje nezavisno. */
function wireMultiToggle(
  container: HTMLElement,
  onToggle: (value: string, selected: boolean) => void,
): void {
  container.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-choice]");
    if (!card || !container.contains(card)) return;
    const nowSelected = !card.classList.contains("card--selected");
    card.classList.toggle("card--selected", nowSelected);
    onToggle(card.dataset.choice ?? "", nowSelected);
    const step = container.closest<HTMLElement>(".step");
    if (step) hideError(step);
  });
}

function bindInput(
  root: ParentNode,
  sel: string,
  onChange: (value: string) => void,
): void {
  const input = root.querySelector<HTMLInputElement>(sel);
  if (!input) return;
  input.addEventListener("input", () => onChange(input.value));
}

/** Programatski označi karticu u gridu (za inline izmenu sa summary-ja). */
function selectCardInGrid(grid: HTMLElement, value: string): void {
  grid
    .querySelectorAll<HTMLElement>("[data-choice]")
    .forEach((c) => c.classList.toggle("card--selected", c.dataset.choice === value));
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Render kartica
// ---------------------------------------------------------------------

function renderPlanCards(container: HTMLElement): void {
  container.innerHTML = PLANS.map(
    (p) => `
    <button type="button" class="card card--choice" data-choice="${p.id}">
      <span class="card__icon"><img src="${p.icon}" alt="" /></span>
      <span class="card__title">${p.name}</span>
      <span class="card__desc">${p.tagline}</span>
    </button>`,
  ).join("");
}

function renderGoalCards(container: HTMLElement): void {
  container.innerHTML = GOALS.map(
    (g) => `
    <button type="button" class="card card--choice card--goal" data-choice="${escapeHtml(g)}">
      <span class="card__title">${escapeHtml(g)}</span>
    </button>`,
  ).join("");
}

function renderPolCards(container: HTMLElement): void {
  const opcije: Sex[] = ["Muški", "Ženski"];
  container.innerHTML = opcije
    .map(
      (s) => `
    <button type="button" class="card card--choice card--pol" data-choice="${s}">
      <span class="card__title">${s}</span>
    </button>`,
    )
    .join("");
}

function renderDietCards(container: HTMLElement): void {
  container.innerHTML = DIET_TYPES.map(
    (d) => `
    <button type="button" class="card card--choice" data-choice="${d.id}">
      <span class="card__icon"><img src="${d.icon}" alt="" /></span>
      <span class="card__title">${d.name}</span>
      <span class="card__desc">${d.description}</span>
    </button>`,
  ).join("");
}

function renderAllergenCards(
  container: HTMLElement,
  options: string[],
  selected: string[],
): void {
  container.innerHTML = options
    .map(
      (label) => `
    <button type="button" class="card card--choice card--allergen${
      selected.includes(label) ? " card--selected" : ""
    }" data-choice="${escapeHtml(label)}">
      <span class="card__title">${escapeHtml(label)}</span>
    </button>`,
    )
    .join("");
}

function renderPackageCards(container: HTMLElement, isMax: boolean): void {
  const cardHtml = (p: (typeof PACKAGES)[number]): string => {
    const price = computePrice(p.id, urlContext, isMax);
    const priceHtml =
      price != null
        ? `<span class="card__price">${formatPrice(price)} <small>RSD</small></span>`
        : "";
    const badge = p.badge ? `<span class="card__badge">${p.badge}</span>` : "";
    return `
    <button type="button" class="card card--pkg card--${p.tier}" data-choice="${p.id}">
      <span class="card__info">
        ${badge}
        <span class="card__title">${p.name}</span>
        <span class="card__sub">${p.subtitle}</span>
      </span>
      ${priceHtml}
    </button>`;
  };

  container.innerHTML = PACKAGE_GROUPS.map((g) => {
    const cards = PACKAGES.filter((p) => p.group === g.id).map(cardHtml).join("");
    return `
    <div class="pkg-group">
      <span class="pkg-group__label">${g.label}</span>
      <div class="pkg-group__cards">${cards}</div>
    </div>`;
  }).join("");
}

function renderPaymentCards(container: HTMLElement): void {
  container.innerHTML = PAYMENT_OPTIONS.map(
    (o) => `
    <button type="button" class="card card--choice" data-choice="${o.value}">
      <span class="card__icon"><img src="${o.icon}" alt="" /></span>
      <span class="card__title">${o.title}</span>
      <span class="card__desc">${o.desc}</span>
    </button>`,
  ).join("");
}

// ---------------------------------------------------------------------
// Build svih koraka
// ---------------------------------------------------------------------

export function buildSteps(form: HTMLFormElement): StepConfig[] {
  // ----- STEP: Cilj (uvodno pitanje — ne bira plan) -----
  const stepMotivacija = reqEl<HTMLElement>(form, '[data-step="motivacija"]');
  const motivacijaGrid = reqEl<HTMLElement>(stepMotivacija, '[data-grid="motivacija"]');
  renderGoalCards(motivacijaGrid);
  wireChoiceGrid(motivacijaGrid, (v) => (state.cilj = v), true);

  // ----- STEP: Plan (NutriSlim/Balance/Pump/Max) -----
  const stepPlan = reqEl<HTMLElement>(form, '[data-step="plan"]');
  const planGrid = reqEl<HTMLElement>(stepPlan, '[data-grid="plan"]');
  renderPlanCards(planGrid);
  wireChoiceGrid(planGrid, (v) => (state.plan = v as PlanId), true);

  // ----- STEP: Pol -----
  const stepPol = reqEl<HTMLElement>(form, '[data-step="pol"]');
  const polGrid = reqEl<HTMLElement>(stepPol, '[data-grid="pol"]');
  renderPolCards(polGrid);
  wireChoiceGrid(polGrid, (v) => (state.pol = v as Sex), true);

  // ----- STEP: Makro vrednosti (read-only) -----
  const stepMacros = reqEl<HTMLElement>(form, '[data-step="macros"]');
  const updateMacros = () => {
    const m =
      state.plan && state.pol ? getMacros(state.plan, state.pol) : null;
    const plan = state.plan ? getPlan(state.plan) : undefined;
    const subtitle = reqEl<HTMLElement>(stepMacros, "[data-macros-subtitle]");
    subtitle.textContent =
      plan && state.pol ? `${plan.name} · ${state.pol}` : "";
    const set = (key: keyof NonNullable<typeof m>, suffix: string) => {
      const el = stepMacros.querySelector<HTMLElement>(`[data-macro="${key}"]`);
      if (!el) return;
      const val = m?.[key];
      el.textContent = val != null ? `${val}${suffix}` : "—";
    };
    set("kcal", "");
    set("proteini", " g");
    set("uh", " g");
    set("masti", " g");
  };

  // ----- STEP: Tip ishrane -----
  const stepDiet = reqEl<HTMLElement>(form, '[data-step="diet"]');
  const dietGrid = reqEl<HTMLElement>(stepDiet, '[data-grid="diet"]');
  renderDietCards(dietGrid);
  wireChoiceGrid(dietGrid, (v) => (state.tipIshrane = v as DietId), true);

  // ----- STEP: Izbacivanje namirnica -----
  const stepNamirnice = reqEl<HTMLElement>(form, '[data-step="namirnice"]');
  const namirniceGrid = reqEl<HTMLElement>(stepNamirnice, '[data-grid="namirnice"]');
  const ncBanner = stepNamirnice.querySelector<HTMLElement>("[data-nutrichef-banner]");
  const ncDefault = stepNamirnice.querySelector<HTMLElement>("[data-nutrichef-default]");
  const ncActive = stepNamirnice.querySelector<HTMLElement>("[data-nutrichef-active]");
  // Rana najava: kad se pređe prag (3+, Vegan 2+) → jača poruka o NutriChef-u.
  const updateNutriChefBanner = () => {
    const on = qualifiesForNutriChef();
    if (ncDefault) ncDefault.hidden = on;
    if (ncActive) ncActive.hidden = !on;
    if (ncBanner) ncBanner.classList.toggle("nutrichef-banner--active", on);
  };
  wireMultiToggle(namirniceGrid, (value, selected) => {
    if (selected) {
      if (!state.izuzeteNamirnice.includes(value)) state.izuzeteNamirnice.push(value);
    } else {
      state.izuzeteNamirnice = state.izuzeteNamirnice.filter((v) => v !== value);
    }
    updateNutriChefBanner();
  });
  const renderNamirnice = () => {
    const options = getAllergensFor(state.tipIshrane);
    // zadrži samo selekcije koje su i dalje validne za trenutni tip ishrane
    state.izuzeteNamirnice = state.izuzeteNamirnice.filter((v) => options.includes(v));
    renderAllergenCards(namirniceGrid, options, state.izuzeteNamirnice);
    updateNutriChefBanner();
  };

  // ----- STEP: Paket -----
  const stepPaket = reqEl<HTMLElement>(form, '[data-step="paket"]');
  const paketGrid = reqEl<HTMLElement>(stepPaket, '[data-grid="paket"]');
  const renderPaket = () => renderPackageCards(paketGrid, isMaxPlan(state.plan));
  renderPaket();
  wireChoiceGrid(paketGrid, (v) => (state.paket = v as PackageId));

  // ----- STEP: Lične informacije -----
  const stepLicneInfo = reqEl<HTMLElement>(form, '[data-step="licneInformacije"]');
  bindInput(stepLicneInfo, "#ime", (v) => (state.ime = v));
  bindInput(stepLicneInfo, "#prezime", (v) => (state.prezime = v));
  bindInput(stepLicneInfo, "#email", (v) => (state.email = v));
  bindInput(stepLicneInfo, "#telefon", (v) => (state.telefon = v));
  const birthDateInput = reqEl<HTMLInputElement>(stepLicneInfo, "#datumRodjenja");
  initBirthDatepicker(birthDateInput, (v) => (state.datumRodjenja = v));

  // ----- STEP: Početni datum dostave -----
  const stepDatum = reqEl<HTMLElement>(form, '[data-step="datum"]');
  const futureDate = reqEl<HTMLInputElement>(stepDatum, "#futureDate");
  initDatepicker(futureDate, (v) => (state.datumDostave = v));

  // ----- STEP: Podaci za dostavu -----
  const stepAdresa = reqEl<HTMLElement>(form, '[data-step="adresa"]');
  const naseljeSelect = reqEl<HTMLSelectElement>(stepAdresa, "[data-dostava='naselje']");
  const adresaInput = reqEl<HTMLInputElement>(stepAdresa, "[data-dostava='adresa']");
  naseljeSelect.innerHTML =
    `<option value="">Izaberite naselje</option>` +
    NASELJA.map((n) => `<option value="${n}">${n}</option>`).join("");
  stepAdresa
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "[data-dostava]",
    )
    .forEach((el) => {
      const key = el.dataset.dostava as keyof typeof state.dostava;
      const handler = () => (state.dostava[key] = el.value);
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });

  // ----- STEP: Plaćanje -----
  const stepPay = reqEl<HTMLElement>(form, '[data-step="placanje"]');
  const payGrid = reqEl<HTMLElement>(stepPay, '[data-grid="placanje"]');
  const firmaWrap = reqEl<HTMLElement>(stepPay, "[data-firma-wrap]");
  renderPaymentCards(payGrid);
  wireChoiceGrid(payGrid, (v) => {
    state.nacinPlacanja = v as PaymentMethod;
    firmaWrap.style.display = v === "Firma" ? "block" : "none";
  });
  stepPay.querySelectorAll<HTMLInputElement>("[data-firma]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const key = inp.dataset.firma as keyof FirmaData;
      state.firma[key] = inp.value;
    });
  });

  // ---- Summary recap sa inline izmenom ("Izmeni" / "Sačuvaj") ----
  const summaryEl = reqEl<HTMLElement>(stepPay, "[data-summary]");

  interface SumField {
    label: string;
    kind: "select" | "text" | "date";
    options?: { value: string; label: string }[];
    stored: () => string;
    display: () => string;
    apply: (v: string) => void;
  }

  const SUM_FIELDS: SumField[] = [
    {
      label: "Plan",
      kind: "select",
      options: PLANS.map((p) => ({ value: p.id, label: p.name })),
      stored: () => state.plan ?? "",
      display: () => (state.plan ? (getPlan(state.plan)?.name ?? "") : ""),
      apply: (v) => {
        state.plan = v as PlanId;
        selectCardInGrid(planGrid, v);
      },
    },
    {
      label: "Pol",
      kind: "select",
      options: [
        { value: "Muški", label: "Muški" },
        { value: "Ženski", label: "Ženski" },
      ],
      stored: () => state.pol ?? "",
      display: () => state.pol ?? "",
      apply: (v) => {
        state.pol = v as Sex;
        selectCardInGrid(polGrid, v);
      },
    },
    {
      label: "Tip ishrane",
      kind: "select",
      options: DIET_TYPES.map((d) => ({ value: d.id, label: d.name })),
      stored: () => state.tipIshrane ?? "",
      display: () =>
        state.tipIshrane ? (getDiet(state.tipIshrane)?.name ?? "") : "",
      apply: (v) => {
        state.tipIshrane = v as DietId;
        selectCardInGrid(dietGrid, v);
      },
    },
    {
      label: "Paket",
      kind: "select",
      options: PACKAGES.map((p) => ({ value: p.id, label: p.name })),
      stored: () => state.paket ?? "",
      display: () => (state.paket ? (getPackage(state.paket)?.name ?? "") : ""),
      apply: (v) => {
        state.paket = v as PackageId;
        selectCardInGrid(paketGrid, v);
      },
    },
    {
      label: "Datum dostave",
      kind: "date",
      stored: () => state.datumDostave,
      display: () => state.datumDostave,
      apply: (v) => {
        state.datumDostave = v;
        const fp = (futureDate as unknown as { _flatpickr?: { setDate: (d: string, t: boolean, f: string) => void } })._flatpickr;
        if (fp) fp.setDate(v, false, "d.m.Y");
        else futureDate.value = v;
      },
    },
    {
      label: "Naselje",
      kind: "select",
      options: NASELJA.map((n) => ({ value: n, label: n })),
      stored: () => state.dostava.naselje,
      display: () => state.dostava.naselje,
      apply: (v) => {
        state.dostava.naselje = v;
        naseljeSelect.value = v;
      },
    },
    {
      label: "Adresa",
      kind: "text",
      stored: () => state.dostava.adresa,
      display: () => state.dostava.adresa,
      apply: (v) => {
        state.dostava.adresa = v;
        adresaInput.value = v;
      },
    },
  ];

  const renderSummary = () => {
    const price = state.paket
      ? computePrice(state.paket, urlContext, isMaxPlan(state.plan))
      : null;
    summaryEl.innerHTML =
      SUM_FIELDS.map(
        (f, i) => `
        <div class="summary__row" data-srow="${i}">
          <span class="summary__label">${f.label}</span>
          <span class="summary__value">${escapeHtml(f.display() || "—")}</span>
          <button type="button" class="summary__edit" data-sedit="${i}">Izmeni</button>
        </div>`,
      ).join("") +
      `<div class="summary__row summary__total"><span class="summary__label">Ukupno</span><strong>${formatPrice(price)} RSD</strong></div>`;
  };

  summaryEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-sedit]");
    if (!btn) return;
    const field = SUM_FIELDS[Number(btn.dataset.sedit)];
    if (!field) return;
    const row = btn.closest<HTMLElement>(".summary__row");
    if (!row) return;

    const existing = row.querySelector<HTMLElement>(".summary__editor");
    if (!existing) {
      // uđi u edit mod
      const valueSpan = row.querySelector<HTMLElement>(".summary__value");
      if (valueSpan) valueSpan.style.display = "none";
      let editor: HTMLInputElement | HTMLSelectElement;
      if (field.kind === "select") {
        const sel = document.createElement("select");
        sel.innerHTML = (field.options ?? [])
          .map(
            (o) =>
              `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`,
          )
          .join("");
        sel.value = field.stored();
        editor = sel;
      } else {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = field.stored();
        if (field.kind === "date") inp.readOnly = true;
        editor = inp;
      }
      editor.className = "summary__editor";
      btn.insertAdjacentElement("beforebegin", editor);
      if (field.kind === "date") initDatepicker(editor as HTMLInputElement, () => {});
      btn.textContent = "Sačuvaj";
    } else {
      // sačuvaj
      field.apply((existing as HTMLInputElement | HTMLSelectElement).value);
      renderSummary();
    }
  });

  // Generičko skrivanje errora na promenu unutar koraka.
  // ----- STEP (grana): NutriChef lead -----
  const stepNutriChef = reqEl<HTMLElement>(form, '[data-step="nutrichef"]');

  [
    stepMotivacija,
    stepPlan,
    stepPol,
    stepDiet,
    stepNamirnice,
    stepPaket,
    stepLicneInfo,
    stepDatum,
    stepAdresa,
    stepPay,
    stepNutriChef,
  ].forEach((s) => {
    s.addEventListener("input", () => hideError(s));
    s.addEventListener("change", () => hideError(s));
  });

  return [
    {
      id: "motivacija",
      el: stepMotivacija,
      validate: () => {
        if (!state.cilj) {
          showError(stepMotivacija, "Molimo izaberite cilj.");
          return false;
        }
        return true;
      },
    },
    {
      id: "pol",
      el: stepPol,
      validate: () => {
        if (!state.pol) {
          showError(stepPol, "Molimo izaberite pol.");
          return false;
        }
        return true;
      },
    },
    {
      id: "plan",
      el: stepPlan,
      validate: () => {
        if (!state.plan) {
          showError(stepPlan, "Molimo izaberite plan.");
          return false;
        }
        return true;
      },
    },
    {
      id: "macros",
      el: stepMacros,
      onEnter: updateMacros,
    },
    {
      id: "diet",
      el: stepDiet,
      validate: () => {
        if (!state.tipIshrane) {
          showError(stepDiet, "Molimo izaberite tip ishrane.");
          return false;
        }
        return true;
      },
    },
    {
      id: "namirnice",
      el: stepNamirnice,
      onEnter: renderNamirnice,
    },
    {
      id: "paket",
      el: stepPaket,
      onEnter: renderPaket,
      // NutriChef grana preskače cenu — custom plan se dogovara na pozivu.
      skip: () => qualifiesForNutriChef(),
      validate: () => {
        if (!state.paket) {
          showError(stepPaket, "Molimo izaberite paket.");
          return false;
        }
        return true;
      },
    },
    {
      id: "licneInformacije",
      el: stepLicneInfo,
      validate: () => {
        if (!state.ime.trim() || !state.prezime.trim()) {
          showError(stepLicneInfo, "Molimo unesite ime i prezime.");
          return false;
        }
        if (!state.datumRodjenja.trim()) {
          showError(stepLicneInfo, "Molimo unesite datum rođenja.");
          return false;
        }
        if (!EMAIL_REGEX.test(state.email.trim())) {
          showError(stepLicneInfo, "Molimo unesite ispravan email.");
          return false;
        }
        const phone = stepLicneInfo.querySelector<HTMLInputElement>("#telefon");
        if (!phone || phone.value.trim() === "") {
          showError(stepLicneInfo, "Molimo unesite broj telefona.");
          return false;
        }
        if (!isPhoneValid()) {
          showError(stepLicneInfo, "Broj telefona nije ispravan.");
          return false;
        }
        hideError(stepLicneInfo);
        return true;
      },
    },
    {
      id: "datum",
      el: stepDatum,
      validate: () => {
        if (!state.datumDostave.trim()) {
          showError(stepDatum, "Molimo izaberite datum početka dostave.");
          return false;
        }
        return true;
      },
    },
    {
      id: "adresa",
      el: stepAdresa,
      validate: () => {
        if (!state.dostava.naselje.trim() || !state.dostava.adresa.trim()) {
          showError(stepAdresa, "Molimo unesite naselje i adresu.");
          return false;
        }
        return true;
      },
    },
    {
      id: "placanje",
      el: stepPay,
      onEnter: renderSummary,
      // NutriChef grana ne ide na plaćanje (nema cene) — vidi "nutrichef" korak.
      skip: () => qualifiesForNutriChef(),
    },
    {
      id: "nutrichef",
      el: stepNutriChef,
      // Prikazuje se samo za NutriChef granu (3+ izbačeno, Vegan 2+).
      skip: () => !qualifiesForNutriChef(),
    },
  ];
}
