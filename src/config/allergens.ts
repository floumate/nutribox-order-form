import type { DietId } from "../types";
import { EXTRAS_ENABLED } from "./flags";

// =====================================================================
// Kategorije za izbacivanje ("izbaci ono što ne jedeš") - zavise od
// izabranog tipa ishrane. Fiksne kategorije, ne pretraga namirnica.
// =====================================================================

/** Najviše toliko izbačenih namirnica. */
const MAX_EXCLUDE = 2;

export const ALLERGENS_BY_DIET: Record<DietId, string[]> = {
  balance: ["Gluten", "Laktoza", "Orašasti plodovi", "Svinjetina", "Riba", "Morski plodovi"],
  fish: ["Gluten", "Laktoza", "Orašasti plodovi", "Morski plodovi"],
  vegan: ["Gluten", "Orašasti plodovi"],
  vegetarian: ["Gluten", "Laktoza", "Orašasti plodovi"],
};

/**
 * Nutribox 3.0 (Dušanov prototip, EXTRAS_ENABLED): izbalansirani najviše 2
 * od četiri, riblji gluten i/ili laktoza, vegetarijanski samo gluten,
 * veganski bez izmena.
 */
const ALLERGENS_BY_DIET_V3: Record<DietId, string[]> = {
  balance: ["Gluten", "Laktoza", "Riba", "Svinjetina"],
  fish: ["Gluten", "Laktoza"],
  vegan: [],
  vegetarian: ["Gluten"],
};

/** Parovi koji ne smeju zajedno (3.0: izbalansirani bez glutena I laktoze). */
const EXCLUSIVE_V3: Partial<Record<DietId, [string, string][]>> = {
  balance: [["Gluten", "Laktoza"]],
};

export function getAllergensFor(diet: DietId | null): string[] {
  if (!diet) return [];
  return (EXTRAS_ENABLED ? ALLERGENS_BY_DIET_V3 : ALLERGENS_BY_DIET)[diet] ?? [];
}

/** Da li namirnica ne može da se doda uz već izabrane (limit ili par). */
export function isExcludeBlocked(
  diet: DietId | null,
  selected: string[],
  option: string,
): boolean {
  if (selected.includes(option)) return false;
  if (selected.length >= MAX_EXCLUDE) return true;
  const pairs = (diet && EXTRAS_ENABLED ? EXCLUSIVE_V3[diet] : undefined) ?? [];
  return pairs.some(
    ([a, b]) => (option === a && selected.includes(b)) || (option === b && selected.includes(a)),
  );
}
