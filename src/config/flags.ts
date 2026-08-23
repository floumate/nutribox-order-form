// =====================================================================
// PREKIDAČI (privremena stanja).
// =====================================================================

/**
 * Kartično plaćanje preko raifpay-a.
 *
 *   true  = normalno (checkout → Raiffeisen stranica)
 *   false = "Plaćanje karticom" ne zove raifpay nego vodi na /hvala sa
 *           uputstvima za uplatu (broj računa, IPS QR, uplatnica).
 *
 * Bilo je `false` od 2026-08-02 do 2026-08-13, dok je firma na koju su
 * stizale kartične uplate bila zatvorena.
 *
 * 2026-08-23 opet `false`. Razlog: na Raiffeisen checkout stranici kao
 * merchant i dalje stoji NUTRI BOX D.O.O. ONLINE (stara firma, račun u
 * blokadi) - dve uplate od 22.08. su otišle tamo. Merchant se podešava na
 * raifpay strani (Nikola), ne iz forme: mi šaljemo samo šifru paketa na
 * /checkout i radimo redirect na `redirectUrl` koji dobijemo nazad.
 *
 * Vraćamo na `true` tek kad Nikola potvrdi da je merchant NUTRIBOX KETERING
 * D.O.O. - i to POSLE testa sa ?testiranje-placanja=true (100 RSD), gde se
 * na checkout stranici očima proveri koja firma piše.
 *
 * Ako ikad opet zatreba gašenje: vrati na `false` (jedan push) - /hvala
 * stranica i uplatnice u public/uplatnica/ su i dalje na svom mestu.
 * Detalji: docs/POVRATAK-NA-RAIFPAY.md
 */
export const CARD_PAYMENT_ENABLED = false;

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";
