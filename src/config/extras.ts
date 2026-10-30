import type { AddOnCode, MealSlot, PackageId } from "../types";
import { ENDPOINTS } from "./endpoints";
import { getPackage } from "./packages";

// =====================================================================
// NUTRIBOX 3.0 - DODATAK (Nikola, 30.10.2026; staging dok se ne pusti -
// flags.ts EXTRAS_ENABLED).
//
//   - paket sa 2 obroka + užina: kupac bira tačno 2 glavna obroka;
//   - dodatak uz pun paket: najviše jedan (supa, užina ili oba).
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
  { code: "soup", name: "Sezonska supa ili potaž" },
  { code: "snack", name: "Dodatna užina" },
  { code: "soup_snack", name: "Sezonska supa i dodatna užina" },
];

/**
 * Cena dodatka za CEO paket, po Nikolinom kodu paketa. Ovo su vrednosti sa
 * njegovog API-ja (30.10.2026) - važe dok se API ne učita i lokalno
 * (localhost API ne propušta). Kartica naplati iznos po API-ju, pa forma
 * mora da prikazuje isti.
 *
 * ⚠️ Supa za 7 dana: Vuksanova lista kaže 3.400, API 3.080 - Danilo
 * proverava sa Vuksanom i Nikolom.
 */
let addOnPrices: Record<string, Partial<Record<AddOnCode, number>>> = {
  "28_day": { soup: 8400, snack: 9600, soup_snack: 18000 },
  "20_day": { soup: 7600, snack: 8800, soup_snack: 16400 },
  "7_day": { soup: 3080, snack: 3780, soup_snack: 6860 },
  "5_day": { soup: 2200, snack: 2700, soup_snack: 4900 },
};

/** Cena dodatka uz paket, ili null kad ga taj paket nema. */
export function addOnPrice(packageId: PackageId, code: AddOnCode): number | null {
  const pkg = getPackage(packageId);
  if (!pkg) return null;
  return addOnPrices[pkg.raiffeisenPlan]?.[code] ?? null;
}

/** Dodaci koji postoje uz paket, redom kao u ADD_ONS. */
export function addOnsFor(packageId: PackageId): AddOnCode[] {
  return ADD_ONS.map((a) => a.code).filter((c) => addOnPrice(packageId, c) != null);
}

interface ApiAddOns {
  packageCode?: unknown;
  addOns?: { code?: unknown; price?: { value?: unknown } }[];
}

/**
 * Učitaj cene sa Nikolinog API-ja. Vrati true kad su cene zamenjene. Ako
 * API ne odgovori, ostaju cene iz tabele gore.
 */
export async function loadAddOnPrices(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(ENDPOINTS.addOnPrices, { signal: ctrl.signal });
    if (!r.ok) return false;
    const data = (await r.json()) as ApiAddOns[];
    if (!Array.isArray(data)) return false;
    const known = new Set<string>(ADD_ONS.map((a) => a.code));
    const next: typeof addOnPrices = {};
    for (const row of data) {
      if (typeof row.packageCode !== "string") continue;
      const prices: Partial<Record<AddOnCode, number>> = {};
      for (const a of row.addOns ?? []) {
        const value = a.price?.value;
        if (typeof a.code === "string" && known.has(a.code) && typeof value === "number") {
          prices[a.code as AddOnCode] = value;
        }
      }
      next[row.packageCode] = prices; // prazno = paket nema dodatke
    }
    addOnPrices = next;
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
