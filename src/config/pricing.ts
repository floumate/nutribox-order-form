import type { PackageId } from "../types";

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
//   (discountCode/affiliate popusti važe samo za standard nivo)
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
    discounts: { onboarding10: 54000 }, // 10% off
    affiliates: { thundertopteam: 54000, NUTRI10: 54000, mimavelickovic: 54000 }, // -10%
  },
  "5-dnevni": {
    default: 15000,
    discounts: { onboarding10: 13500 }, // 10% off
    affiliates: { thundertopteam: 13500, NUTRI10: 13500, mimavelickovic: 13500 }, // -10%
  },
  probni: {
    default: 3500,
    discounts: { onboarding10: 3150 }, // 10% off
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
    discounts: { onboarding10: 71100 }, // -10%
    affiliates: { thundertopteam: 71100, NUTRI10: 71100, mimavelickovic: 71100 }, // -10%
  },
  "7-dnevni": {
    default: 28000,
    discounts: { NUTRI20: 22400, onboarding10: 25200 }, // -20% / -10%
    affiliates: { thundertopteam: 25200, NUTRI10: 25200, mimavelickovic: 25200 }, // -10%
  },
  "5-dnevni": {
    default: 20000,
    discounts: { onboarding10: 18000 }, // -10%
    affiliates: { thundertopteam: 18000, NUTRI10: 18000, mimavelickovic: 18000 }, // -10%
  },
  probni: {
    default: 4500,
    discounts: { onboarding10: 4050 }, // -10%
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
}

/**
 * Vrati mašinsku cenu (ceo broj) za paket u datom kontekstu, ili null.
 * `isMax` = true kad je izabran NutriMax plan (poseban cenovni nivo).
 */
export function computePrice(
  packageId: PackageId,
  ctx: PriceContext,
  isMax: boolean,
): number | null {
  // 1) Custom plan ima najviši prioritet.
  if (ctx.isCustomPlan && CUSTOM_PRICES[ctx.customPlanName] != null) {
    return CUSTOM_PRICES[ctx.customPlanName] ?? null;
  }

  const set = (isMax ? PRICES_MAX : PRICES_STANDARD)[packageId];

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

/** "78.400,00" (bez oznake valute). */
export function formatPrice(machine: number | null): string {
  if (machine == null) return "-";
  return RSD_FORMAT.format(machine);
}
