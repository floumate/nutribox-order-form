// =====================================================================
// Merenje dolazaka koji stižu preko AI settera.
//
// Forma šalje SAMO događaj "visit", i to direktno iz browsera - ta adresa
// ne traži tajni header, pa nema šta da procuri u bundle. CORS je podešen
// sa druge strane.
//
// Događaji "order" i "paid" NE idu iz forme - šalje ih Make scenario.
// (Forma ionako ne sazna ishod plaćanja: kupac ode na Raiffeisen domen.)
//
// Dok je VISIT_WEBHOOK prazan, ne šalje se ništa.
// =====================================================================

/**
 * Puna adresa, npr:
 * "https://primer.com/api/webhooks/visit/f7313c5b-0511-4938-9009-78df8f5cadd9"
 */
export const VISIT_WEBHOOK = "";

/** Prati se samo ova vrednost ?setter=. Sve ostalo se ignoriše. */
export const TRACKED_SETTER = "asistent";
