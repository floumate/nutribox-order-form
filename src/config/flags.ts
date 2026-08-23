import { ENV, type Env } from "./env";

// =====================================================================
// PREKIDAČI (privremena stanja).
// =====================================================================

/**
 * Kartično plaćanje.
 *
 *   true  = checkout → Raiffeisen stranica za unos kartice
 *   false = "Plaćanje karticom" vodi na /hvala sa uputstvima za uplatu
 *           (broj računa, IPS QR, uplatnica)
 *
 * Sada je uključeno SAMO na staging-u:
 *
 *   prod (nutribox.rs)              → false, prenos na račun
 *   staging (vuksanvasic.webflow.io) → true, testno kartično
 *
 * Zašto: prelazi se sa stare firme (NUTRI BOX D.O.O., račun u blokadi) na
 * novu (NUTRIBOX KETERING D.O.O.). Raiffeisen prvo mora da odobri testno
 * okruženje na vuksanvasic.webflow.io; LIVE kredencijali stižu tek posle
 * toga. Do tada na produkciji NE SME da bude kartice - dve uplate od
 * 22.08.2026. su otišle na blokiran račun stare firme.
 *
 * Kad stignu LIVE kredencijali: `prod: true` (jedna linija) - ali TEK POSLE
 * testa sa ?testiranje-placanja=true, gde se na checkout stranici očima
 * proveri da piše NUTRIBOX KETERING D.O.O.
 *
 * Detalji: docs/POVRATAK-NA-RAIFPAY.md
 */
const CARD_ENABLED_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const CARD_PAYMENT_ENABLED = CARD_ENABLED_BY_ENV[ENV];

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";
