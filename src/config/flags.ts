// =====================================================================
// PREKIDAČI (privremena stanja).
// =====================================================================

/**
 * Kartično plaćanje preko raifpay-a.
 *
 *   true  = normalno (checkout → Raiffeisen stranica)
 *   false = PRIVREMENO: firma na koju su stizale uplate je zatvorena, pa
 *           "Plaćanje karticom" umesto raifpay-a vodi na /hvala sa
 *           uputstvima za uplatu (broj računa, IPS QR, uplatnica).
 *
 * Raifpay kod OSTAJE netaknut - samo se ne poziva dok je ovo false.
 * Povratak = vrati na true (jedan push), ništa drugo se ne dira.
 */
export const CARD_PAYMENT_ENABLED = false;

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";
