import type { Lang, PackageId, PackageKind, PlanId, Sex } from "../types";
import { getMacros, isMaxPlan } from "./plans";
import { PARTNER_ENABLED, PRICING_V3 } from "./flags";

// =====================================================================
// NUTRIBOX 3.0 (staging dok se ne pusti - flags.ts PRICING_V3).
//
// Cena zavisi od PAKETA i VELIČINE, a veličina od kalorija (pol + plan):
//   XS–M = 1.300–2.000 kcal · L = 2.600 kcal · XL = 3.000 kcal
// Isti obračun radi Nikolin backend iz `gender` + `goal`, pa forma mora da
// prikazuje tačno ove iznose. Nema probnog paketa ni kodova popusta.
// =====================================================================

export type SizeTier = "base" | "L" | "XL";

export function sizeTier(plan: PlanId | null, pol: Sex | null): SizeTier {
  if (!plan || !pol) return "base";
  const kcal = getMacros(plan, pol).kcal ?? 0;
  if (kcal >= 3000) return "XL";
  if (kcal >= 2600) return "L";
  return "base";
}

const PRICES_V3: Partial<Record<PackageId, Record<SizeTier, number>>> = {
  "28-dnevni": { base: 78400, L: 88400, XL: 98400 },
  "20-dnevni": { base: 60400, L: 68400, XL: 79400 },
  "7-dnevni": { base: 22400, L: 24400, XL: 28400 },
  "5-dnevni": { base: 17400, L: 18400, XL: 22400 },
};

/**
 * Partner popust = cena dostave (partner je na istoj adresi), isti iznos za
 * sve veličine i za paket sa 2 obroka (Nikola, 30.10.2026). Na dodatke ne
 * važi. 28 i 20 dana iz Nikolinog dokumenta; 5 i 7 dana je Ružičin iznos -
 * proveriti na stagingu da banka naplati isto.
 */
const PARTNER_DISCOUNT: Partial<Record<PackageId, number>> = {
  "28-dnevni": 8400,
  "20-dnevni": 6000,
  "7-dnevni": 2100,
  "5-dnevni": 1500,
};

/**
 * Paket sa 2 glavna obroka + užina (Nikola, 30.10.2026): ista cena za sve
 * veličine, porcija je najviše M.
 */
const PARTIAL_PRICES: Partial<Record<PackageId, number>> = {
  "28-dnevni": 58400,
  "20-dnevni": 44400,
  "7-dnevni": 16400,
  "5-dnevni": 12400,
};

/** Porudžbina preko partner linka, kad je partner uključen (flags.ts). */
export function isPartnerOrder(ctx: { partner?: boolean }): boolean {
  return PARTNER_ENABLED && ctx.partner === true;
}

/** Paketi koji postoje u ovoj verziji cena (3.0 nema probni). */
export function packageAvailable(id: PackageId): boolean {
  return !PRICING_V3 || PRICES_V3[id] != null;
}

// =====================================================================
// CENE.
//
// Sve cene su "mašinske" (ceo broj RSD, npr. 78400). Display se formatira
// preko formatPrice() → "78.400,00".
//
// Cena zavisi i od PAKETA i od PLANA: NutriMax ima poseban (viši) nivo,
// NutriSlim/NutriBalance/NutriPump dele isti (standard) nivo.
//
// Prioritet (isti kao stara forma):
//   custom plan  >  discountCode  >  affiliate  >  default
//
// ?discountCode=NUTRI20 = -20% na SVE pakete, oba nivoa. Kombinuje se sa
// ?paket=, npr. order-form?paket=20-dnevni&discountCode=NUTRI20.
// Kartica: raifpay sam računa iznos iz šifre paketa + discountCode, pa
// NUTRI20 mora da postoji i tamo za svaki paket (inače naplati punu cenu).
// =====================================================================

interface PriceSet {
  default: number | null;
  /** discountCode → cena */
  discounts: Record<string, number>;
  /** affiliate → cena */
  affiliates: Record<string, number>;
}

const PRICES_STANDARD: Record<PackageId, PriceSet> = {
  "28-dnevni": {
    default: 78400,
    discounts: { NUTRI20: 62720, "2828": 50400, onboarding10: 70560 },
    affiliates: { thundertopteam: 70560, NUTRI10: 70560, mimavelickovic: 70560 },
  },
  "7-dnevni": {
    default: 21000,
    discounts: { NUTRI20: 16800, onboarding10: 18900 },
    affiliates: { thundertopteam: 18900, NUTRI10: 18900, mimavelickovic: 18900 },
  },
  "20-dnevni": {
    default: 60000,
    discounts: { NUTRI20: 48000, onboarding10: 54000 }, // -20% / -10%
    affiliates: { thundertopteam: 54000, NUTRI10: 54000, mimavelickovic: 54000 }, // -10%
  },
  "5-dnevni": {
    default: 15000,
    discounts: { NUTRI20: 12000, onboarding10: 13500 }, // -20% / -10%
    affiliates: { thundertopteam: 13500, NUTRI10: 13500, mimavelickovic: 13500 }, // -10%
  },
  probni: {
    default: 3500,
    discounts: { NUTRI20: 2800, onboarding10: 3150 }, // -20% / -10%
    affiliates: { thundertopteam: 3150, NUTRI10: 3150, mimavelickovic: 3150 }, // -10%
  },
};

/** NutriMax nivo. Popusti = isti PROCENAT kao standard (onboarding10 -10%,
 *  NUTRI20 -20%, affiliate -10%). 2828 (specijalna cena) NIJE definisan za
 *  NutriMax. ⚠️ Prikaz — proveriti da raifpay naplaćuje iste iznose na karticu. */
const PRICES_MAX: Record<PackageId, PriceSet> = {
  "28-dnevni": {
    default: 98400,
    discounts: { NUTRI20: 78720, onboarding10: 88560 }, // -20% / -10%
    affiliates: { thundertopteam: 88560, NUTRI10: 88560, mimavelickovic: 88560 }, // -10%
  },
  "20-dnevni": {
    default: 79000,
    discounts: { NUTRI20: 63200, onboarding10: 71100 }, // -20% / -10%
    affiliates: { thundertopteam: 71100, NUTRI10: 71100, mimavelickovic: 71100 }, // -10%
  },
  "7-dnevni": {
    default: 28000,
    discounts: { NUTRI20: 22400, onboarding10: 25200 }, // -20% / -10%
    affiliates: { thundertopteam: 25200, NUTRI10: 25200, mimavelickovic: 25200 }, // -10%
  },
  "5-dnevni": {
    default: 20000,
    discounts: { NUTRI20: 16000, onboarding10: 18000 }, // -20% / -10%
    affiliates: { thundertopteam: 18000, NUTRI10: 18000, mimavelickovic: 18000 }, // -10%
  },
  probni: {
    default: 4500,
    discounts: { NUTRI20: 3600, onboarding10: 4050 }, // -20% / -10%
    affiliates: { thundertopteam: 4050, NUTRI10: 4050, mimavelickovic: 4050 }, // -10%
  },
};

/** Custom plan ("plan=custom&customPlanName=standard") nadjačava sve. */
const CUSTOM_PRICES: Record<string, number> = {
  standard: 117000,
};

export interface PriceContext {
  affiliate: string;
  discountCode: string;
  isCustomPlan: boolean;
  customPlanName: string;
  /** ?partner=1 (Nutribox 3.0). */
  partner?: boolean;
}

/**
 * Vrati mašinsku cenu (ceo broj) za paket u datom kontekstu, ili null.
 * Plan i pol određuju cenovni nivo: do 3.0 NutriMax vs ostali, od 3.0
 * veličinu po kalorijama. `kind` = ceo dan ili 2 obroka (bez dodatka -
 * ukupnu cenu sa dodatkom računa lib/order.ts).
 */
export function computePrice(
  packageId: PackageId,
  ctx: PriceContext,
  plan: PlanId | null,
  pol: Sex | null,
  kind: PackageKind = "full",
): number | null {
  // 1) Custom plan ima najviši prioritet.
  if (ctx.isCustomPlan && CUSTOM_PRICES[ctx.customPlanName] != null) {
    return CUSTOM_PRICES[ctx.customPlanName] ?? null;
  }

  // Nutribox 3.0: samo veličina, bez kodova popusta; partner - popust.
  if (PRICING_V3) {
    const full =
      kind === "partial" ? PARTIAL_PRICES[packageId] : PRICES_V3[packageId]?.[sizeTier(plan, pol)];
    if (full == null) return null;
    return isPartnerOrder(ctx) ? full - (PARTNER_DISCOUNT[packageId] ?? 0) : full;
  }

  const set = (isMaxPlan(plan) ? PRICES_MAX : PRICES_STANDARD)[packageId];

  // 2) discountCode
  if (ctx.discountCode && set.discounts[ctx.discountCode] != null) {
    return set.discounts[ctx.discountCode] ?? null;
  }

  // 3) affiliate
  if (ctx.affiliate && set.affiliates[ctx.affiliate] != null) {
    return set.affiliates[ctx.affiliate] ?? null;
  }

  // 4) default
  return set.default;
}

const RSD_FORMAT = new Intl.NumberFormat("sr-RS", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "78.400,00" (bez oznake valute). Uvek srpski - ide i u URL thank-you
 *  stranice. Za prikaz u formi: formatPriceDisplay. */
export function formatPrice(machine: number | null): string {
  if (machine == null) return "-";
  return RSD_FORMAT.format(machine);
}

const DISPLAY_LOCALE: Record<Lang, string> = {
  sr: "sr-RS",
  en: "en-US",
  ru: "ru-RU",
};

/** Cena na jeziku forme: sr "78.400,00", en "78,400.00", ru "78 400,00". */
export function formatPriceDisplay(machine: number | null, lang: Lang): string {
  if (machine == null) return "-";
  return new Intl.NumberFormat(DISPLAY_LOCALE[lang], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(machine);
}
