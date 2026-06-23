import type { StepConfig } from "./stepEngine";
import { state } from "../lib/state";
import { urlContext } from "../lib/urlParams";
import { isPhoneValid } from "../lib/phone";
import { initDatepicker } from "../lib/datepicker";
import { showError, hideError, EMAIL_REGEX } from "../lib/validation";
import { PLANS, getPlan, getMacros } from "../config/plans";
import { DIET_TYPES, getDiet } from "../config/dietTypes";
import { PACKAGES, getPackage } from "../config/packages";
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
// Ikone (placeholder — zameni pravim asset-ima kasnije)
// ---------------------------------------------------------------------

const ICON_PKG = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 7l16 8-16 8-16-8z"/><path d="M8 15v18l16 8 16-8V15"/><path d="M24 23v18"/></svg>`;

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

function renderPackageCards(container: HTMLElement): void {
  container.innerHTML = PACKAGES.map((p) => {
    const price = computePrice(p.id, urlContext);
    const priceHtml =
      price != null
        ? `<span class="card__price">${formatPrice(price)} <small>RSD</small></span>`
        : "";
    const badge = p.badge ? `<span class="card__badge">${p.badge}</span>` : "";
    return `
    <button type="button" class="card card--pkg card--${p.tier}" data-choice="${p.id}">
      <span class="card__icon">${ICON_PKG}</span>
      <span class="card__info">
        ${badge}
        <span class="card__title">${p.name}</span>
        <span class="card__sub">${p.subtitle}</span>
      </span>
      ${priceHtml}
    </button>`;
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
  // ----- STEP: Informacije -----
  const stepInfo = reqEl<HTMLElement>(form, '[data-step="info"]');
  bindInput(stepInfo, "#ime", (v) => (state.ime = v));
  bindInput(stepInfo, "#prezime", (v) => (state.prezime = v));
  bindInput(stepInfo, "#email", (v) => (state.email = v));
  bindInput(stepInfo, "#telefon", (v) => (state.telefon = v));

  // ----- STEP: Plan -----
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

  // ----- STEP: Paket -----
  const stepPaket = reqEl<HTMLElement>(form, '[data-step="paket"]');
  const paketGrid = reqEl<HTMLElement>(stepPaket, '[data-grid="paket"]');
  renderPackageCards(paketGrid);
  wireChoiceGrid(paketGrid, (v) => (state.paket = v as PackageId));

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
    const price = state.paket ? computePrice(state.paket, urlContext) : null;
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
  [
    stepInfo,
    stepPlan,
    stepPol,
    stepDiet,
    stepPaket,
    stepDatum,
    stepAdresa,
    stepPay,
  ].forEach((s) => {
    s.addEventListener("input", () => hideError(s));
    s.addEventListener("change", () => hideError(s));
  });

  return [
    {
      id: "info",
      el: stepInfo,
      validate: () => {
        if (!state.ime.trim() || !state.prezime.trim()) {
          showError(stepInfo, "Molimo unesite ime i prezime.");
          return false;
        }
        if (!EMAIL_REGEX.test(state.email.trim())) {
          showError(stepInfo, "Molimo unesite ispravan email.");
          return false;
        }
        const phone = stepInfo.querySelector<HTMLInputElement>("#telefon");
        if (!phone || phone.value.trim() === "") {
          showError(stepInfo, "Molimo unesite broj telefona.");
          return false;
        }
        if (!isPhoneValid()) {
          showError(stepInfo, "Broj telefona nije ispravan.");
          return false;
        }
        hideError(stepInfo);
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
      id: "paket",
      el: stepPaket,
      validate: () => {
        if (!state.paket) {
          showError(stepPaket, "Molimo izaberite paket.");
          return false;
        }
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
