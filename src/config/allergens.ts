import type { DietId } from "../types";

// =====================================================================
// Kategorije za izbacivanje ("izbaci ono što ne jedeš") - zavise od
// izabranog tipa ishrane. Fiksne kategorije, ne pretraga namirnica.
// =====================================================================

export const ALLERGENS_BY_DIET: Record<DietId, string[]> = {
  balance: ["Gluten", "Laktoza", "Orašasti plodovi", "Svinjetina", "Riba", "Morski plodovi"],
  fish: ["Gluten", "Laktoza", "Orašasti plodovi", "Morski plodovi"],
  vegan: ["Gluten", "Orašasti plodovi"],
  vegetarian: ["Gluten", "Laktoza", "Orašasti plodovi"],
};

export function getAllergensFor(diet: DietId | null): string[] {
  return diet ? (ALLERGENS_BY_DIET[diet] ?? []) : [];
}
