import type { StepConfig } from "./stepEngine";
import { state } from "../lib/state";
import { urlContext } from "../lib/urlParams";
import { isPhoneValid } from "../lib/phone";
import { showError, hideError, EMAIL_REGEX } from "../lib/validation";
import { PLANS, getPlan, getMacros } from "../config/plans";
import { DIET_TYPES, getDiet } from "../config/dietTypes";
import { PACKAGES, getPackage } from "../config/packages";
import { computePrice, formatPrice } from "../config/pricing";
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
): void {
  container.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-choice]");
    if (!card || !container.contains(card)) return;
    container
      .querySelectorAll<HTMLElement>("[data-choice]")
      .forEach((c) => c.classList.toggle("card--selected", c === card));
    onSelect(card.dataset.choice ?? "", card);
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

// ---------------------------------------------------------------------
// Ikone (placeholder — zameni pravim asset-ima kasnije)
// ---------------------------------------------------------------------

const ICON_PLAN = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="17"/><path d="M16 24.5l5.5 5.5L33 18"/></svg>`;
const ICON_DIET = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 36c0-13 11-23 25-24-1 14-11 24-25 24z"/><path d="M19 31c4-5 9-8 14-10"/></svg>`;
const ICON_PKG = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 7l16 8-16 8-16-8z"/><path d="M8 15v18l16 8 16-8V15"/><path d="M24 23v18"/></svg>`;

// ---------------------------------------------------------------------
// Render kartica
// ---------------------------------------------------------------------

function renderPlanCards(container: HTMLElement): void {
  container.innerHTML = PLANS.map(
    (p) => `
    <button type="button" class="card card--choice" data-choice="${p.id}">
      <span class="card__icon">${ICON_PLAN}</span>
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
      <span class="card__icon">${ICON_DIET}</span>
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
      ${badge}
      <span class="card__icon">${ICON_PKG}</span>
      <span class="card__title">${p.name}</span>
      <span class="card__sub">${p.subtitle}</span>
      ${priceHtml}
    </button>`;
  }).join("");
}

function renderPaymentCards(container: HTMLElement): void {
  const opcije: { value: PaymentMethod; desc: string }[] = [
    { value: "Kartica", desc: "Plati odmah karticom (Raiffeisen)" },
    { value: "Pouzeće", desc: "Plati kuriru pri dostavi" },
    { value: "Firma", desc: "Plaćanje preko računa firme" },
  ];
  container.innerHTML = opcije
    .map(
      (o) => `
    <button type="button" class="card card--choice card--pay" data-choice="${o.value}">
      <span class="card__title">${o.value}</span>
      <span class="card__desc">${o.desc}</span>
    </button>`,
    )
    .join("");
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
  wireChoiceGrid(planGrid, (v) => (state.plan = v as PlanId));

  // ----- STEP: Pol -----
  const stepPol = reqEl<HTMLElement>(form, '[data-step="pol"]');
  const polGrid = reqEl<HTMLElement>(stepPol, '[data-grid="pol"]');
  renderPolCards(polGrid);
  wireChoiceGrid(polGrid, (v) => (state.pol = v as Sex));

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
  wireChoiceGrid(dietGrid, (v) => (state.tipIshrane = v as DietId));

  // ----- STEP: Paket -----
  const stepPaket = reqEl<HTMLElement>(form, '[data-step="paket"]');
  const paketGrid = reqEl<HTMLElement>(stepPaket, '[data-grid="paket"]');
  renderPackageCards(paketGrid);
  wireChoiceGrid(paketGrid, (v) => (state.paket = v as PackageId));

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

  const renderSummary = () => {
    const summary = stepPay.querySelector<HTMLElement>("[data-summary]");
    if (!summary) return;
    const plan = state.plan ? getPlan(state.plan) : undefined;
    const diet = state.tipIshrane ? getDiet(state.tipIshrane) : undefined;
    const pkg = state.paket ? getPackage(state.paket) : undefined;
    const price = state.paket ? computePrice(state.paket, urlContext) : null;
    const row = (label: string, value: string) =>
      `<div class="summary__row"><span>${label}</span><strong>${value || "—"}</strong></div>`;
    summary.innerHTML =
      row("Plan", plan?.name ?? "") +
      row("Pol", state.pol ?? "") +
      row("Tip ishrane", diet?.name ?? "") +
      row("Paket", pkg?.name ?? "") +
      `<div class="summary__row summary__total"><span>Ukupno</span><strong>${formatPrice(price)} RSD</strong></div>`;
  };

  // Generičko skrivanje errora na promenu unutar koraka.
  [stepInfo, stepPlan, stepPol, stepDiet, stepPaket, stepPay].forEach((s) => {
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
      id: "placanje",
      el: stepPay,
      onEnter: renderSummary,
    },
  ];
}
