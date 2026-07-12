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
  const queue = readQueue();
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

function sendViaBeacon(data: OrderData): boolean {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    return navigator.sendBeacon(ENDPOINTS.make, blob);
  } catch {
    return false;
  }
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

/** Glavni submit - beacon odmah + fetch retry u pozadini. Vraća order_id. */
export function bulletproofSubmit(formData: OrderData): string {
  if (!formData.order_id) formData.order_id = generateOrderId();
  formData.submitted_at = new Date().toISOString();
  formData.user_agent = navigator.userAgent;
  formData.attempt_source = "initial_submit";

  saveToQueue(formData); // sloj 1: localStorage PRE network-a
  sendViaBeacon(formData); // sloj 2: beacon (preživi navigaciju)

  // sloj 3: fetch + retry u pozadini
  sendWithRetry(formData)
    .then(() => markConfirmed(formData.order_id as string))
    .catch(() => {
      /* beacon je verovatno prošao; queue retry-uje na sledećem loadu */
    });

  return formData.order_id as string;
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
