// =====================================================================
// Eksterni endpoint-i. Isti kao na staroj formi.
// =====================================================================

export const ENDPOINTS = {
  /** Make webhook - glavni order payload. */
  make: "https://hook.eu2.make.com/3q6ocfceqheyiuhh1ulq62m8l1fniq6h",

  /** Make webhook - abandoned cart. */
  abandoned: "https://hook.eu2.make.com/gnawubotwvk1tb8wyiqz31q2ncmoryd2",

  /** Raiffeisen checkout (kartično plaćanje). PRODUKCIJA.
   *  ⚠️ Prod još NEMA `_max` kodove (NutriMax puca INVALID_PLAN), a `probni`
   *  je tamo test režim (500 RSD umesto 3.500). Standardni paketi rade.
   *  Staging (ima sve kodove): "https://raifpay-staging.nutribox.dev/checkout" */
  raiffeisenCheckout: "https://raifpay-prod.nutribox.dev/checkout",

  /** Bazni URL za thank-you stranice (hvala-*). Live Webflow domen. */
  thankYouBase: "https://www.nutribox.rs",
} as const;
