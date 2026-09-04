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
 * Uključeno na oba okruženja od 04.09.2026.
 *
 * Put dovde: stara firma (NUTRI BOX D.O.O.) je zatvorena i račun blokiran,
 * pa je kartica bila ugašena od 23.08. Prvo je Raiffeisen odobrio testno
 * okruženje na vuksanvasic.webflow.io, pa su stigli LIVE kredencijali.
 *
 * Pre uključivanja provereno na PRAVOJ prod checkout stranici:
 *   Merchant: NUTRIBOX KETERING DOO ONLINE
 *   Amount:   300.00 RSD (kod PROBNI300)
 *
 * Ta provera nije formalnost. U avgustu je kartica vraćena na osnovu usmene
 * potvrde da je merchant prebačen - nije bio, i dve uplate su otišle na
 * blokiran račun. Ako se ovo ikad opet gasi i pali, prvo se otvori checkout
 * stranica i OČIMA se pročita koja firma piše.
 *
 * Gašenje: vrati `prod: false` (jedna linija). /hvala stranica i uplatnice
 * u public/uplatnica/ stoje na svom mestu. Detalji:
 * docs/POVRATAK-NA-RAIFPAY.md
 */
const CARD_ENABLED_BY_ENV: Record<Env, boolean> = {
  prod: true,
  staging: true,
};

export const CARD_PAYMENT_ENABLED = CARD_ENABLED_BY_ENV[ENV];

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";
