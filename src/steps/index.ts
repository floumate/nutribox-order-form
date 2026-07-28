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

/** Multi-select toggle (za izbacivanje namirnica) - svaka kartica se toggluje nezavisno. */
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
  const sex = state.pol;
  container.innerHTML = PLANS.map((p) => {
    const m = sex ? getMacros(p.id, sex) : null;
    const macroHtml =
      m && m.kcal != null
        ? `<span class="macros">
             <span class="macros__kcal">${m.kcal}<small>kcal</small></span>
             <span class="macros__grid">
               <span class="macro"><b>${m.proteini}g</b><i>Proteini</i></span>
               <span class="macro"><b>${m.uh}g</b><i>UH</i></span>
               <span class="macro"><b>${m.masti}g</b><i>Masti</i></span>
             </span>
           </span>`
        : "";
    return `
    <button type="button" class="card card--choice card--plan" data-choice="${p.id}">
      <span class="card__icon"><img src="${p.icon}" alt="" /></span>
      <span class="card__title">${p.name}</span>
      <span class="card__desc">${p.tagline}</span>
      ${macroHtml}
    </button>`;
  }).join("");
}

function renderGoalCards(container: HTMLElement): void {
  container.innerHTML = GOALS.map(
    (g) => `
    <button type="button" class="card card--choice card--goal" data-choice="${escapeHtml(g)}">
      <span class="card__title">${escapeHtml(g)}</span>
    </button>`,
  ).join("");
}

/** Display labele za pol (vrednost ostaje "Muški"/"Ženski" za makroe/Airtable/Nikolu). */
const POL_LABELS: Record<Sex, string> = {
  Muški: "Muškarca",
  Ženski: "Ženu",
};

function renderPolCards(container: HTMLElement): void {
  const opcije: Sex[] = ["Muški", "Ženski"];
  container.innerHTML = opcije
    .map(
      (s) => `
    <button type="button" class="card card--choice card--pol" data-choice="${s}">
      <span class="card__title">${POL_LABELS[s]}</span>
    </button>`,
    )
    .join("");
}

function renderDietCards(container: HTMLElement): void {
  container.innerHTML = DIET_TYPES.map(
    (d) => `
    <button type="button" class="card card--choice" data-choice="${d.id}">
      <span class="card__icon"><img src="${d.icon}" alt="" /></span>
      <span class="card__title">${d.label}</span>
      <span class="card__desc">${d.description}</span>
    </button>`,
  ).join("");
}

function renderAllergenCards(
  container: HTMLElement,
  options: string[],
  selected: string[],
  atLimit: boolean,
): void {
  container.innerHTML = options
    .map((label) => {
      const isSel = selected.includes(label);
      const disabled = atLimit && !isSel; // dostignut limit → ostale zaključaj
      return `
    <button type="button"${disabled ? " disabled" : ""} class="card card--choice card--allergen${
      isSel ? " card--selected" : ""
    }${disabled ? " card--disabled" : ""}" data-choice="${escapeHtml(label)}">
      <span class="allergen-check" aria-hidden="true"></span>
      <span class="card__title">${escapeHtml(label)}</span>
    </button>`;
    })
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
  // ----- STEP: Cilj (uvodno pitanje - ne bira plan) -----
  const stepMotivacija = reqEl<HTMLElement>(form, '[data-step="motivacija"]');
  const motivacijaGrid = reqEl<HTMLElement>(stepMotivacija, '[data-grid="motivacija"]');
  renderGoalCards(motivacijaGrid);
  wireChoiceGrid(motivacijaGrid, (v) => (state.cilj = v), true);

  // ----- STEP: Paket (NutriSlim/Balance/Pump/Max) — sa makroima -----
  const stepPlan = reqEl<HTMLElement>(form, '[data-step="plan"]');
  const planGrid = reqEl<HTMLElement>(stepPlan, '[data-grid="plan"]');
  const renderPlan = () => {
    renderPlanCards(planGrid); // makroi zavise od izabranog pola
    if (state.plan) selectCardInGrid(planGrid, state.plan);
  };
  renderPlan();
  wireChoiceGrid(planGrid, (v) => (state.plan = v as PlanId), true);

  // ----- STEP: Pol -----
  const stepPol = reqEl<HTMLElement>(form, '[data-step="pol"]');
  const polGrid = reqEl<HTMLElement>(stepPol, '[data-grid="pol"]');
  renderPolCards(polGrid);
  wireChoiceGrid(polGrid, (v) => (state.pol = v as Sex), true);

  // ----- STEP: Tip jelovnika (+ isključivanje namirnica ispod) -----
  const stepDiet = reqEl<HTMLElement>(form, '[data-step="diet"]');
  const dietGrid = reqEl<HTMLElement>(stepDiet, '[data-grid="diet"]');
  const namirniceGrid = reqEl<HTMLElement>(stepDiet, '[data-grid="namirnice"]');
  renderDietCards(dietGrid);

  // Ograničenje: najviše 2 izbačene namirnice.
  const MAX_EXCLUDE = 2;

  // Prikaži namirnice za trenutni jelovnik; odbaci selekcije koje mu ne pripadaju.
  const renderNamirnice = () => {
    const options = getAllergensFor(state.tipIshrane);
    state.izuzeteNamirnice = state.izuzeteNamirnice.filter((v) => options.includes(v));
    const atLimit = state.izuzeteNamirnice.length >= MAX_EXCLUDE;
    renderAllergenCards(namirniceGrid, options, state.izuzeteNamirnice, atLimit);
  };

  // Izbor jelovnika: postavi tip + osveži namirnice ISPOD (bez auto-next).
  // Promena jelovnika RESETUJE izbačene namirnice (čistije).
  wireChoiceGrid(dietGrid, (v) => {
    if (v !== state.tipIshrane) state.izuzeteNamirnice = [];
    state.tipIshrane = v as DietId;
    renderNamirnice();
  });

  wireMultiToggle(namirniceGrid, (value, selected) => {
    if (selected) {
      if (state.izuzeteNamirnice.length >= MAX_EXCLUDE) return; // preko limita (kartice su i disabled)
      if (!state.izuzeteNamirnice.includes(value)) state.izuzeteNamirnice.push(value);
    } else {
      state.izuzeteNamirnice = state.izuzeteNamirnice.filter((v) => v !== value);
    }
    renderNamirnice(); // osveži disabled stanje ostalih
  });

  // Na ulazak: prvi jelovnik unapred izabran → odmah se vide namirnice za izbacivanje.
  const renderDiet = () => {
    if (!state.tipIshrane) state.tipIshrane = DIET_TYPES[0]?.id ?? null;
    if (state.tipIshrane) selectCardInGrid(dietGrid, state.tipIshrane);
    renderNamirnice();
  };

  // ----- STEP: Plan trajanja -----
  const stepPaket = reqEl<HTMLElement>(form, '[data-step="paket"]');
  const paketGrid = reqEl<HTMLElement>(stepPaket, '[data-grid="paket"]');
  const renderPaket = () => {
    renderPackageCards(paketGrid, isMaxPlan(state.plan));
    if (state.paket) selectCardInGrid(paketGrid, state.paket);
  };
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
    `<option value="">Izaberite zonu</option>` +
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
        { value: "Muški", label: POL_LABELS["Muški"] },
        { value: "Ženski", label: POL_LABELS["Ženski"] },
      ],
      stored: () => state.pol ?? "",
      display: () => (state.pol ? POL_LABELS[state.pol] : ""),
      apply: (v) => {
        state.pol = v as Sex;
        selectCardInGrid(polGrid, v);
      },
    },
    {
      label: "Tip jelovnika",
      kind: "select",
      options: DIET_TYPES.map((d) => ({ value: d.id, label: d.label })),
      stored: () => state.tipIshrane ?? "",
      display: () =>
        state.tipIshrane ? (getDiet(state.tipIshrane)?.label ?? "") : "",
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
      label: "Zona dostave",
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
          <span class="summary__value">${escapeHtml(f.display() || "-")}</span>
          <button type="button" class="summary__edit" data-sedit="${i}">Izmeni</button>
        </div>`,
      ).join("") +
      `<div class="summary__row summary__total"><span class="summary__label">Ukupno</span><strong>${formatPrice(price)} RSD</strong></div>`;
  };

  // Osveži samo "Ukupno" (bez re-rendera celog summary-ja, da ne zatvori druge editore).
  const updateTotal = () => {
    const price = state.paket
      ? computePrice(state.paket, urlContext, isMaxPlan(state.plan))
      : null;
    const totalEl = summaryEl.querySelector<HTMLElement>(".summary__total strong");
    if (totalEl) totalEl.textContent = `${formatPrice(price)} RSD`;
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
      // sačuvaj SAMO ovaj red — ostali otvoreni editori ostaju netaknuti
      field.apply((existing as HTMLInputElement | HTMLSelectElement).value);
      existing.remove();
      const valueSpan = row.querySelector<HTMLElement>(".summary__value");
      if (valueSpan) {
        valueSpan.textContent = field.display() || "-";
        valueSpan.style.display = "";
      }
      btn.textContent = "Izmeni";
      updateTotal();
    }
  });

  // Generičko skrivanje errora na promenu unutar koraka.
  [
    stepMotivacija,
    stepPlan,
    stepPol,
    stepDiet,
    stepPaket,
    stepLicneInfo,
    stepDatum,
    stepAdresa,
    stepPay,
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
      onEnter: renderPlan,
      validate: () => {
        if (!state.plan) {
          showError(stepPlan, "Molimo izaberite paket.");
          return false;
        }
        return true;
      },
    },
    {
      id: "diet",
      el: stepDiet,
      onEnter: renderDiet,
      validate: () => {
        if (!state.tipIshrane) {
          showError(stepDiet, "Molimo izaberite tip jelovnika.");
          return false;
        }
        return true;
      },
    },
    {
      id: "paket",
      el: stepPaket,
      onEnter: renderPaket,
      validate: () => {
        if (!state.paket) {
          showError(stepPaket, "Molimo izaberite plan.");
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
    },
  ];
}
