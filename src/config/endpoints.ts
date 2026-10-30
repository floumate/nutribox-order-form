import { ENV } from "./env";

// =====================================================================
// Eksterni endpoint-i, po okruženju (vidi env.ts).
// =====================================================================

/** Checkout za kartično plaćanje. POST vrati 201 + { orderId, redirectUrl,
 *  expiresAt }; forma preusmeri na `redirectUrl`.
 *
 *  Stari `raifpay-prod` / `raifpay-staging` domeni su UGAŠENI - 02.09.2026.
 *  im DNS više ne postoji, pa je kartica na produkciji pucala sa "Trenutno
 *  ne možemo da pokrenemo plaćanje". Sve je prešlo na `customer-api`.
 *
 *  CORS na oba propušta https://floumate.github.io (provereno). */
const CHECKOUT: Record<typeof ENV, string> = {
  prod: "https://customer-api.prod.nutribox.dev/card-payments/checkout",
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
