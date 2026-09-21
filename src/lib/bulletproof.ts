import { ENDPOINTS } from "../config/endpoints";

// =====================================================================
// BULLETPROOF SUBMIT
// Slojevi odbrane:
//   1. UUID order_id za dedup u Make-u
//   2. localStorage queue (preživljava browser crash)
//   3. sendBeacon (garantovano slanje pre navigacije)
//   4. fetch + keepalive + retry (3x exponential backoff)
//   5. recovery queue na svakom učitavanju stranice
// =====================================================================

const QUEUE_KEY = "nutribox_order_queue";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000];

export type OrderData = Record<string, unknown> & { order_id?: string };

interface QueueItem {
  order_id: string;
  data: OrderData;
  attempts: number;
  last_attempt: number | null;
  confirmed: boolean;
  created_at: number;
}

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as QueueItem[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

function generateOrderId(): string {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return "nutribox_" + window.crypto.randomUUID();
  }
  return "nutribox_xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
}

function saveToQueue(orderData: OrderData): void {
  // Ponovni pokušaj nosi ISTI order_id - ne gomilaj isti red dvaput.
  const queue = readQueue().filter((i) => i.order_id !== orderData.order_id);
  queue.push({
    order_id: orderData.order_id as string,
    data: orderData,
    attempts: 0,
    last_attempt: null,
    confirmed: false,
    created_at: Date.now(),
  });
  writeQueue(queue);
}

function markConfirmed(orderId: string): void {
  writeQueue(
    readQueue().map((i) => {
      if (i.order_id === orderId) i.confirmed = true;
      return i;
    }),
  );
}

export function cleanQueue(): void {
  const now = Date.now();
  writeQueue(
    readQueue().filter((i) => {
      if (i.confirmed) return false;
      if (now - i.created_at > 24 * 60 * 60 * 1000) return false;
      return true;
    }),
  );
}

/**
 * Beacon kao form-encoded - JEDINI oblik koji ovde stvarno stigne.
 *
 * Izmereno 21.09.2026. na test webhook-u (Make, ista platforma):
 *   beacon + application/json  → nikad ne stigne. Nije "prost" zahtev, pa
 *     traži preflight, a Make odgovara sa `Access-Control-Allow-Origin: *`
 *     dok beacon uvek ide sa credentials "include" - browser to odbije.
 *     sendBeacon svejedno vrati true, pa se greška ne vidi.
 *   beacon + text/plain        → stigne, ali Make NE parsira telo: sva
 *     polja su prazna.
 *   beacon + form-encoded      → stigne I Make ga parsira u ista polja kao
 *     JSON. Zato ovaj oblik.
 *
 * Payload je ravan (samo tekst, brojevi i true/false), pa ga form-encoded
 * prenosi bez gubitka; sve što ipak ne bi bilo prosto ide kao JSON tekst.
 */
export function sendViaBeaconForm(
  url: string,
  data: Record<string, unknown>,
): boolean {
  try {
    if (typeof navigator.sendBeacon !== "function") return false;
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      form.set(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }
    const blob = new Blob([form.toString()], {
      type: "application/x-www-form-urlencoded",
    });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

function sendViaBeacon(data: OrderData): boolean {
  return sendViaBeaconForm(ENDPOINTS.make, data);
}

function sendViaFetch(data: OrderData, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(ENDPOINTS.make, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive: true,
    signal: controller.signal,
  })
    .then((r) => {
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    });
}

function sendWithRetry(data: OrderData, attempt = 0): Promise<Response> {
  return sendViaFetch(data).catch((err) => {
    if (attempt >= MAX_RETRIES - 1) throw err;
    const delay = RETRY_DELAYS[attempt] ?? 5000;
    return new Promise<Response>((resolve) => {
      setTimeout(() => resolve(sendWithRetry(data, attempt + 1)), delay);
    });
  });
}

export interface SubmitHandle {
  /** Jedinstveni id porudžbine (Make po njemu radi dedup). */
  orderId: string;
  /** true kad je Make potvrdio prijem, false kad prvi krug nije uspeo. */
  delivered: Promise<boolean>;
}

/**
 * Glavni submit.
 *
 * Dva nezavisna kanala idu UVEK, jer nijedan sam nije dovoljan:
 *   - beacon (form-encoded) preživi zatvaranje strane, ali ne kaže da li je
 *     stigao;
 *   - fetch kaže da li je stigao, ali ga browser ume prekinuti pri odlasku.
 * Make dedupuje po order_id, pa dupla dostava ne pravi duplu porudžbinu.
 *
 * Uz to POZIVALAC čeka `delivered` pre nego što odvede kupca sa stranice.
 */
export function bulletproofSubmit(formData: OrderData): SubmitHandle {
  if (!formData.order_id) formData.order_id = generateOrderId();
  formData.submitted_at = new Date().toISOString();
  formData.user_agent = navigator.userAgent;
  formData.attempt_source = "initial_submit";

  const orderId = formData.order_id as string;

  saveToQueue(formData); // sloj 1: localStorage PRE network-a
  sendViaBeacon(formData); // sloj 2: beacon (vidi upozorenje gore)

  // sloj 3: fetch + retry u pozadini
  const delivered = sendWithRetry(formData)
    .then(() => {
      markConfirmed(orderId);
      return true;
    })
    .catch(() => false); // queue pokušava ponovo na sledećem otvaranju forme

  return { orderId, delivered };
}

/** Recovery - pokreće se na svakom page loadu. */
export function processRecoveryQueue(): void {
  const queue = readQueue();
  const now = Date.now();
  const pending = queue.filter((i) => {
    if (i.confirmed) return false;
    if (i.last_attempt && now - i.last_attempt < 30000) return false;
    if (i.attempts >= 10) return false;
    return true;
  });

  pending.forEach((item) => {
    const data: OrderData = {
      ...item.data,
      attempt_source: "recovery_queue",
      recovery_attempt: (item.attempts || 0) + 1,
    };
    sendWithRetry(data)
      .then(() => markConfirmed(item.order_id))
      .catch(() => {
        writeQueue(
          readQueue().map((i) => {
            if (i.order_id === item.order_id) {
              i.attempts = (i.attempts || 0) + 1;
              i.last_attempt = Date.now();
            }
            return i;
          }),
        );
      });
  });
}

/** Auto-start recovery (kao na staroj formi). */
export function startRecovery(): void {
  setTimeout(processRecoveryQueue, 2000);
  setInterval(processRecoveryQueue, 60000);
  cleanQueue();
}
