import { ENDPOINTS } from "../config/endpoints";
import { runtime } from "./runtime";
import { buildPayload } from "./payload";
import { sendViaBeaconForm } from "./bulletproof";

/**
 * Slanje na abandoned webhook.
 *
 * Do 21.09.2026. je ovde stajao `sendBeacon(JSON.stringify(...))`. Takav
 * zahtev Make prima kao običan tekst i NE parsira ga - polja su stizala
 * prazna. Form-encoded beacon Make razume; fetch je rezerva kad beacon ne
 * postoji. Samo jedan kanal, jer abandoned nema order_id za dedup.
 */
function sendAbandoned(data: Record<string, unknown>): void {
  if (sendViaBeaconForm(ENDPOINTS.abandoned, data)) return;
  void fetch(ENDPOINTS.abandoned, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {});
}

// =====================================================================
// ABANDONED CART
// Timer (10 min) + sessionStorage. Šalje beacon na abandoned webhook ako
// korisnik napusti formu bez submita. Triggeri: email blur/change,
// next/prev klik, visibilitychange (hidden), pagehide. Restore na reload.
// =====================================================================

const TIMER_MINUTA = 10;
const SESSION_KEY = "if_abandoned_data";
const SESSION_START = "if_abandoned_start";
/** Otisak poslednjeg poslatog abandoned-a - ne briše ga clearSession(). */
const SESSION_SENT = "if_abandoned_sent";

let formData: Record<string, unknown> = {};
let abandonedTimer: number | null = null;
let timerStarted = false;
let interacted = false;

function saveSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(formData));
  } catch {
    /* ignore */
  }
}

function loadSession(): void {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) formData = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_START);
  } catch {
    /* ignore */
  }
}

function saveStart(): void {
  try {
    if (!sessionStorage.getItem(SESSION_START)) {
      sessionStorage.setItem(SESSION_START, Date.now().toString());
    }
  } catch {
    /* ignore */
  }
}

function remainingTime(): number {
  try {
    const start = sessionStorage.getItem(SESSION_START);
    if (!start) return TIMER_MINUTA * 60 * 1000;
    const remaining = TIMER_MINUTA * 60 * 1000 - (Date.now() - parseInt(start));
    return remaining > 0 ? remaining : 0;
  } catch {
    return TIMER_MINUTA * 60 * 1000;
  }
}

function collect(): void {
  // buildPayload() uvek vraća ključeve (i prazne), pa snimamo session SAMO
  // ako je korisnik stvarno interagovao - inače bi se abandoned okidao i za
  // praznu formu na sledećem load-u.
  if (!interacted) return;
  formData = buildPayload();
  if (runtime.currentStepId) formData.last_completed_step = runtime.currentStepId;
  saveSession();
}

/**
 * Abandoned bez mejla ili telefona nikome ne služi - nema kome da se javi.
 * Pre ovoga je skoro svaki klik na prvo "Dalje" slao prazan zapis.
 */
function hasContact(data: Record<string, unknown>): boolean {
  const email = String(data.Email ?? "");
  const phoneDigits = String(data["Broj-telefona"] ?? "").replace(/\D/g, "");
  return email.includes("@") || phoneDigits.length >= 8;
}

/** Sve što je kupac popunio, bez polja koja se menjaju sama. */
function fingerprint(data: Record<string, unknown>): string {
  const rest: Record<string, unknown> = { ...data };
  delete rest.form_status;
  return JSON.stringify(rest);
}

function alreadySent(sig: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_SENT) === sig;
  } catch {
    return false;
  }
}

function markSent(sig: string): void {
  try {
    sessionStorage.setItem(SESSION_SENT, sig);
  } catch {
    /* ignore */
  }
}

/**
 * Pošalji abandoned samo ako ima kome da se javi i ako se od poslednjeg
 * slanja nešto promenilo. Ranije je svaki izlazak na drugi tab (poruka,
 * zaključan telefon) slao isti zapis ponovo, pa se jedan kupac pojavljivao
 * po nekoliko puta.
 */
function trySend(data: Record<string, unknown>): boolean {
  if (!hasContact(data)) return false;
  const sig = fingerprint(data);
  if (alreadySent(sig)) return false;
  markSent(sig);
  sendAbandoned({ ...data, form_status: "abandoned" });
  return true;
}

function send(): void {
  if (!interacted) return;
  if (runtime.submitted) return;
  if (Object.keys(formData).length === 0) return;
  if (trySend(formData)) clearSession();
}

function startTimer(): void {
  if (timerStarted) return;
  timerStarted = true;
  saveStart();
  const remaining = remainingTime();
  if (remaining === 0) {
    send();
    return;
  }
  abandonedTimer = window.setTimeout(send, remaining);
}

function listenEmailField(): void {
  const emailInput = document.querySelector<HTMLInputElement>(
    'input[name="Email"], input[name="email"], input[type="email"]',
  );
  if (!emailInput) {
    window.setTimeout(listenEmailField, 300);
    return;
  }
  const onInteract = () => {
    interacted = true;
    collect();
    startTimer();
  };
  emailInput.addEventListener("blur", onInteract);
  emailInput.addEventListener("change", onInteract);
}

/** Pozvati iz submit-a TEK kad validacija prođe - gasi abandoned tracking. */
export function cancelAbandoned(): void {
  runtime.submitted = true;
  if (abandonedTimer !== null) clearTimeout(abandonedTimer);
  clearSession();
}

export function initAbandoned(): void {
  // Restore iz prethodne sesije - pošalji abandoned i očisti.
  loadSession();
  if (Object.keys(formData).length > 0) {
    trySend(formData);
    clearSession();
    formData = {};
  }

  listenEmailField();

  // next/prev klik → interakcija + pokupi podatke
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-nav="next"]')) {
      interacted = true;
      collect();
      startTimer();
    } else if (target.closest('[data-nav="prev"]')) {
      collect();
    }
  });

  document.addEventListener("visibilitychange", () => {
    // Pri povratku na tab ne treba ništa: trySend sam odbija isti zapis,
    // a pušta ga ako je kupac u međuvremenu nešto dopunio.
    if (document.visibilityState === "hidden") {
      collect();
      send();
    }
  });

  window.addEventListener("pagehide", () => {
    collect();
    send();
  });
}
