import type { AddOnCode, MealSlot, PackageId } from "../types";
import { getPackage } from "./packages";

// =====================================================================
// NUTRIBOX 3.0 - DOWNSELL I DODATAK (Nikola 30.10.2026 + Dušanov
// prototip; staging dok se ne pusti - flags.ts EXTRAS_ENABLED).
//
//   - downsell (?brojobroka=2): kupac bira tačno 2 glavna obroka;
//   - dodatak uz plan, u obe forme: najviše jedan (supa, užina ili komplet).
//
// Kodovi su Nikolini i idu u registraciju (`obroci`, `dodatak`) i u
// plaćanje karticom (`mealSlots`, `addOn`). Srpski nazivi idu u Make.
// =====================================================================

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: "breakfast", label: "Doručak" },
  { id: "lunch", label: "Ručak" },
  { id: "dinner", label: "Večera" },
];

export const ADD_ONS: { code: AddOnCode; name: string }[] = [
  { code: "soup", name: "Sezonski potaž od povrća ili supa" },
  { code: "snack", name: "Dodatna užina" },
  { code: "soup_snack", name: "Komplet supa + užina" },
];

/**
 * Cena dodatka za CEO plan, po Nikolinom kodu trajanja - ista uz pun paket
 * i uz paket sa 2 obroka. Cene su iz Dušanovog prototipa (Danilo: ove važe,
 * ne Nikolin API), osim supe 7d = 3.080 (Danilo, 31.10.2026: konačna cena).
 *
 * ⚠️ Kartica naplati iznos koji izračuna Nikolin backend - njegov API je
 * 30.10.2026 imao drugačiji komplet (18.000 / 16.400 / 6.860 / 4.900) i
 * nijedan dodatak uz partial_*. Mora da se uskladi pre live-a.
 */
const ADD_ON_PRICES: Record<string, Record<AddOnCode, number>> = {
  "28_day": { soup: 8400, snack: 9600, soup_snack: 15400 },
  "20_day": { soup: 7600, snack: 8800, soup_snack: 14800 },
  "7_day": { soup: 3080, snack: 3780, soup_snack: 6400 },
  "5_day": { soup: 2200, snack: 2700, soup_snack: 4400 },
};

/** Cena dodatka uz paket, ili null kad ga taj paket nema. */
export function addOnPrice(packageId: PackageId, code: AddOnCode): number | null {
  const pkg = getPackage(packageId);
  if (!pkg) return null;
  return ADD_ON_PRICES[pkg.raiffeisenPlan]?.[code] ?? null;
}

/** Dodaci koji postoje uz paket, redom kao u ADD_ONS. */
export function addOnsFor(packageId: PackageId): AddOnCode[] {
  return ADD_ONS.map((a) => a.code).filter((c) => addOnPrice(packageId, c) != null);
}

/** Broj dana paketa ("28_day" → 28), za opis na kartici dodatka. */
export function packageDays(packageId: PackageId): number | null {
  const pkg = getPackage(packageId);
  const days = pkg ? parseInt(pkg.raiffeisenPlan, 10) : NaN;
  return Number.isNaN(days) ? null : days;
}
