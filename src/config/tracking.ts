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
 * Puna adresa za "visit". Ne traži tajni header, CORS je `*`, pa se zove
 * direktno iz browsera.
 *
 * ⚠️ UUID je isti kao na `order` webhook-u. Onaj iz prve specifikacije
 * (f7313c5b-...) NIJE aktivan - vraća prazno `{"ok":false}`.
 * Prazan string ovde gasi merenje.
 */
export const VISIT_WEBHOOK =
  "https://ai-setter-three.vercel.app/api/webhooks/visit/dd3d36e6-16fd-4118-8f98-7ee21a2946ba";

/** Prati se samo ova vrednost ?s=. Sve ostalo se ignoriše. */
export const TRACKED_SETTER = "a";
