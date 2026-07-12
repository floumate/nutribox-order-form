import { state } from "./state";

// =====================================================================
// NutriChef (personal chef) grana.
//
// Pravilo: ako korisnik izbaci 3+ namirnice (za Vegan 2+, jer Vegan ima
// samo 2 opcije), standardni paketi mu ne odgovaraju → ide na NutriChef
// granu: preskače se korak sa cenom (paket) i plaćanje, a na kraju submit
// vodi na NutriChef stranicu (zakazivanje poziva + custom plan).
// =====================================================================

export const NUTRICHEF_URL = "https://www.nutribox.rs/personal-chef";

/**
 * Da li izbor spada u NutriChef (custom plan).
 * Prag: 3+ izuzete namirnice; za Vegan 2+ (Vegan ima samo 2 opcije).
 * Čita se dinamički iz stanja → grana se menja ako korisnik promeni izbor.
 */
export function qualifiesForNutriChef(): boolean {
  const n = state.izuzeteNamirnice.length;
  if (state.tipIshrane === "vegan") return n >= 2;
  return n >= 3;
}
