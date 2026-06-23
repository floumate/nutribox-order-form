import { ENDPOINTS } from "../config/endpoints";
import { runtime } from "./runtime";
import { buildPayload } from "./payload";

// =====================================================================
// ABANDONED CART
// Timer (10 min) + sessionStorage. Šalje beacon na abandoned webhook ako
// korisnik napusti formu bez submita. Triggeri: email blur/change,
// next/prev klik, visibilitychange (hidden), pagehide. Restore na reload.
// =====================================================================

const TIMER_MINUTA = 10;
const SESSION_KEY = "if_abandoned_data";
const SESSION_START = "if_abandoned_start";

let formData: Record<string, unknown> = {};
let abandonedSent = false;
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
  // ako je korisnik stvarno interagovao — inače bi se abandoned okidao i za
  // praznu formu na sledećem load-u.
  if (!interacted) return;
  formData = buildPayload();
  if (runtime.currentStepId) formData.last_completed_step = runtime.currentStepId;
  saveSession();
}

function send(): void {
  if (!interacted) return;
  if (runtime.submitted) return;
  if (abandonedSent) return;
  if (Object.keys(formData).length === 0) return;
  abandonedSent = true;
  formData.form_status = "abandoned";
  try {
    navigator.sendBeacon(ENDPOINTS.abandoned, JSON.stringify(formData));
  } catch {
    /* ignore */
  }
  clearSession();
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

/** Pozvati iz submit-a TEK kad validacija prođe — gasi abandoned tracking. */
export function cancelAbandoned(): void {
  runtime.submitted = true;
  if (abandonedTimer !== null) clearTimeout(abandonedTimer);
  clearSession();
}

export function initAbandoned(): void {
  // Restore iz prethodne sesije — pošalji abandoned i očisti.
  loadSession();
  if (Object.keys(formData).length > 0) {
    formData.form_status = "abandoned";
    try {
      navigator.sendBeacon(ENDPOINTS.abandoned, JSON.stringify(formData));
    } catch {
      /* ignore */
    }
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
    if (document.visibilityState === "hidden") {
      collect();
      send();
    } else if (!runtime.submitted) {
      abandonedSent = false;
    }
  });

  window.addEventListener("pagehide", () => {
    collect();
    send();
  });
}
