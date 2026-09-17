// =====================================================================
// Error prikaz/skrivanje po koraku. Svaki korak ima ".error-message".
// =====================================================================

export function showError(stepEl: HTMLElement, message: string): void {
  const error = stepEl.querySelector<HTMLElement>(".error-message");
  if (!error) return;
  error.classList.add("visible");
  const text = error.querySelector<HTMLElement>(".error-message__text");
  if (text) text.textContent = message;
  else error.textContent = message;
}

export function hideError(stepEl: HTMLElement): void {
  const error = stepEl.querySelector<HTMLElement>(".error-message");
  if (error) error.classList.remove("visible");
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// =====================================================================
// Mejl: oblik zapisa + česte greške u kucanju domena.
// =====================================================================

/** Svuda se čuva malim slovima i bez razmaka - Airtable, GHL i Nikola tako
 *  dobijaju isti zapis. Veličina slova u mejlu ionako ništa ne znači. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Domeni koji su skoro uvek greška u kucanju → ispravka.
 *
 * Samo TAČNO poklapanje celog domena, bez pogađanja po sličnosti - ispravna
 * adresa ne sme da dobije lažno upozorenje. Upozorenje ne blokira slanje.
 */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.rs": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gamil.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
};

/** Predlog ispravke mejla, ili "" kad nema šta da se predloži. */
export function suggestEmailFix(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "";
  const fixed = DOMAIN_TYPOS[email.slice(at + 1)];
  return fixed ? email.slice(0, at + 1) + fixed : "";
}
