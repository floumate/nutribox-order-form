// =====================================================================
// Eksterni endpoint-i. Isti kao na staroj formi.
// =====================================================================

export const ENDPOINTS = {
  /** Make webhook — glavni order payload. */
  make: "https://hook.eu2.make.com/twv3ywvotuzl2nks4kat1j3e10kj22ud",

  /** Make webhook — abandoned cart. */
  abandoned: "https://hook.eu2.make.com/jq84kea153fu4dsa7j4nxjrjo8g1v8by",

  /** Raiffeisen checkout (kartično plaćanje). */
  raiffeisenCheckout: "https://raifpay-prod.nutribox.dev/checkout",

  /** Bazni URL za thank-you stranice. */
  thankYouBase: "https://www.nutribox.rs",
} as const;
