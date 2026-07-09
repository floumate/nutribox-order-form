import { state } from "./state";

// =====================================================================
// NutriChef (personal chef) preusmeravanje.
//
// Pravilo: ako korisnik izbaci 2+ namirnice, standardni paketi mu ne
// odgovaraju → šaljemo ga na NutriChef stranicu (booking poziva + custom
// plan).
//
// ⚠️ TRIGGER (kada/gde se okida redirect) još NIJE određen — klijent javlja
//    naknadno. Kad kaže, samo pozovi maybeRedirectToNutriChef() na tom mestu
//    (npr. na "Dalje" iz namirnice koraka ili pre submita).
// =====================================================================

export const NUTRICHEF_URL = "https://www.nutribox.rs/personal-chef";

/** Da li korisnik ispunjava uslov za NutriChef (2+ izuzete namirnice). */
export function qualifiesForNutriChef(): boolean {
  return state.izuzeteNamirnice.length >= 2;
}

/** Preusmeri na NutriChef stranicu (probija iframe do top prozora). */
export function redirectToNutriChef(): void {
  window.top!.location.href = NUTRICHEF_URL;
}

/** Ako je uslov ispunjen → redirect. Vrati true ako je preusmerio. */
export function maybeRedirectToNutriChef(): boolean {
  if (!qualifiesForNutriChef()) return false;
  redirectToNutriChef();
  return true;
}
