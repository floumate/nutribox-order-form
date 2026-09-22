import {
  BACKUP_KEY,
  BACKUP_STEPS_TABLE,
  BACKUP_TABLE,
  BACKUP_URL,
} from "../config/backup";
import type { OrderData } from "./bulletproof";
import { buildPayload } from "./payload";

// =====================================================================
// Rezervni upis u Supabase.
//
// Dva traga, oba nezavisna od Make-a:
//   `porudzbine` - upisuje se na klik "Poruči" i označava potvrđenom kad
//                  Make javi prijem. Nepotvrđen red pali alarm na Slack.
//   `koraci`     - zapis pri svakom prelasku na sledeći korak, da bismo
//                  imali ime i telefon i kad poslednji klik nikad ne ode.
//
// Sve greške se gutaju - ovo ne sme ni da uspori ni da obori porudžbinu.
// =====================================================================

function ukljuceno(): boolean {
  return BACKUP_URL !== "" && BACKUP_KEY !== "";
}

function zaglavlja(): Record<string, string> {
  return {
    apikey: BACKUP_KEY,
    Authorization: `Bearer ${BACKUP_KEY}`,
    "Content-Type": "application/json",
    // Bez ovoga PostgREST vraća upisani red, a anon nema pravo čitanja.
    Prefer: "return=minimal",
  };
}

function tekst(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

/** Polja koja se traže očima kad porudžbinu treba uneti ručno. */
function vidljivaPolja(payload: OrderData) {
  const adresa = [
    tekst(payload.Naselje),
    [tekst(payload.Adresa), tekst(payload["Kucni-broj"])].join(" ").trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ime: tekst(payload.Ime),
    prezime: tekst(payload.Prezime),
    telefon: tekst(payload["Broj-telefona"]),
    email: tekst(payload.Email),
    plan: tekst(payload.Cilj), // "Cilj" u payload-u je naziv plana (NutriSlim...)
    paket: tekst(payload.paket),
    cena: tekst(payload.cenaPaketa),
    nacin_placanja: tekst(payload.nacinPlacanja),
    adresa,
  };
}

function posalji(tabela: string, red: unknown): void {
  void fetch(`${BACKUP_URL}/rest/v1/${tabela}`, {
    method: "POST",
    headers: zaglavlja(),
    body: JSON.stringify(red),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Broj porudžbine se pravi čim prvi put zatreba i nosi se do kraja, pa su
 * zapisi iz `koraci` i red u `porudzbine` vezani za isti broj.
 */
let radniOrderId = "";

export function getWorkingOrderId(): string {
  if (!radniOrderId) {
    const c = window.crypto;
    radniOrderId =
      c && typeof c.randomUUID === "function"
        ? "nutribox_" + c.randomUUID()
        : "nutribox_" +
          Date.now().toString(16) +
          "_" +
          Math.random().toString(16).slice(2);
  }
  return radniOrderId;
}

/** Upis porudžbine, odmah po kliku na "Poruči". */
export function backupOrder(payload: OrderData): void {
  if (!ukljuceno()) return;
  try {
    const p = vidljivaPolja(payload);
    posalji(BACKUP_TABLE, {
      order_id: tekst(payload.order_id),
      ime: p.ime,
      prezime: p.prezime,
      telefon: p.telefon,
      email: p.email,
      paket: p.paket,
      cena: p.cena,
      nacin_placanja: p.nacin_placanja,
      adresa: p.adresa,
      podaci: payload,
    });
  } catch {
    /* rezerva nikad ne sme da smeta porudžbini */
  }
}

/**
 * Zapis o koraku. Samo DODAJE - postojeći zapisi se ne diraju, pa vraćanje
 * unazad i izmena odgovora prosto ostavljaju nov, noviji zapis.
 */
export function saveStep(korak: string): void {
  if (!ukljuceno()) return;
  try {
    const payload = buildPayload();
    payload.order_id = getWorkingOrderId();
    const p = vidljivaPolja(payload);
    posalji(BACKUP_STEPS_TABLE, {
      order_id: payload.order_id,
      korak,
      ime: p.ime,
      prezime: p.prezime,
      telefon: p.telefon,
      email: p.email,
      plan: p.plan,
      paket: p.paket,
      nacin_placanja: p.nacin_placanja,
      adresa: p.adresa,
      podaci: payload,
    });
  } catch {
    /* isto - tiho */
  }
}

/** Make je potvrdio prijem - red više nije razlog za uzbunu. */
export function markBackupConfirmed(orderId: string): void {
  if (!ukljuceno() || !orderId) return;
  try {
    const url =
      `${BACKUP_URL}/rest/v1/${BACKUP_TABLE}` +
      `?order_id=eq.${encodeURIComponent(orderId)}`;

    void fetch(url, {
      method: "PATCH",
      headers: zaglavlja(),
      body: JSON.stringify({
        potvrdjeno: true,
        potvrdjeno_u: new Date().toISOString(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* isto - tiho */
  }
}
