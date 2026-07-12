// =====================================================================
// Eksterni endpoint-i. Isti kao na staroj formi.
// =====================================================================

export const ENDPOINTS = {
  /** Make webhook - glavni order payload. */
  make: "https://hook.eu2.make.com/3q6ocfceqheyiuhh1ulq62m8l1fniq6h",

  /** Make webhook - abandoned cart. */
  abandoned: "https://hook.eu2.make.com/gnawubotwvk1tb8wyiqz31q2ncmoryd2",

  /** Raiffeisen checkout (kartično plaćanje). Produkcija.
   *  (staging za test → "https://raifpay-staging.nutribox.dev/checkout") */
  raiffeisenCheckout: "https://raifpay-prod.nutribox.dev/checkout",

  /** Bazni URL za thank-you stranice.
   *  ⚠️ TESTIRANJE: staging Webflow domen. Za go-live → "https://www.nutribox.rs" */
  thankYouBase: "https://vuksanvasic.webflow.io",
} as const;
