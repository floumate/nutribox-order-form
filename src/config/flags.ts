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
 * stizale kartične uplate bila zatvorena. Uplate sad idu novoj firmi
 * (NUTRIBOX KETERING D.O.O.), pa je kartica vraćena.
 *
 * Ako ikad opet zatreba gašenje: vrati na `false` (jedan push) - /hvala
 * stranica i uplatnice u public/uplatnica/ su i dalje na svom mestu.
 * Detalji: docs/POVRATAK-NA-RAIFPAY.md
 */
export const CARD_PAYMENT_ENABLED = true;

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";
