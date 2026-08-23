import { ENV } from "./env";

// =====================================================================
// Eksterni endpoint-i, po okruženju (vidi env.ts).
// =====================================================================

/** Checkout za kartično plaćanje. Contract je isti na oba: POST vrati
 *  201 + { orderId, redirectUrl, expiresAt }.
 *
 *  ⚠️ STAGING i CORS: customer-api trenutno propušta samo
 *  https://vuksanvasic.webflow.io. Forma šalje sa https://floumate.github.io
 *  (iframe), pa dok Nikola ne doda taj origin u allowlist, browser blokira
 *  zahtev. Fallback koji VEĆ propušta github.io:
 *      "https://raifpay-staging.nutribox.dev/checkout"
 *  Ako zatreba - zameni jednu liniju ispod. */
const CHECKOUT: Record<typeof ENV, string> = {
  prod: "https://raifpay-prod.nutribox.dev/checkout",
  staging: "https://customer-api.staging.nutribox.dev/card-payments/checkout",
};

/** Bazni URL za thank-you stranice (hvala-*). */
const THANK_YOU_BASE: Record<typeof ENV, string> = {
  prod: "https://www.nutribox.rs",
  staging: "https://vuksanvasic.webflow.io",
};

export const ENDPOINTS = {
  /** Make webhook - glavni order payload. */
  make: "https://hook.eu2.make.com/3q6ocfceqheyiuhh1ulq62m8l1fniq6h",

  /** Make webhook - abandoned cart. */
  abandoned: "https://hook.eu2.make.com/gnawubotwvk1tb8wyiqz31q2ncmoryd2",

  raiffeisenCheckout: CHECKOUT[ENV],

  thankYouBase: THANK_YOU_BASE[ENV],
} as const;
