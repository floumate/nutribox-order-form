import { BACKUP_KEY, BACKUP_TABLE, BACKUP_URL } from "../config/backup";
import type { OrderData } from "./bulletproof";

// =====================================================================
// Rezervni upis porudžbine u Supabase.
//
// Poenta nije da zameni Make, nego da postoji trag i kad Make ne dobije
// porudžbinu: red koji ostane nepotvrđen javlja se na Slack, pa kupca
// zovemo isti dan umesto da saznamo od njega.
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

/** Upis porudžbine, odmah po kliku na "Poruči". */
export function backupOrder(payload: OrderData): void {
  if (!ukljuceno()) return;
  try {
    const adresa = [
      tekst(payload.Naselje),
      [tekst(payload.Adresa), tekst(payload["Kucni-broj"])].join(" ").trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const red = {
      order_id: tekst(payload.order_id),
      ime: tekst(payload.Ime),
      prezime: tekst(payload.Prezime),
      telefon: tekst(payload["Broj-telefona"]),
      email: tekst(payload.Email),
      paket: tekst(payload.paket),
      cena: tekst(payload.cenaPaketa),
      nacin_placanja: tekst(payload.nacinPlacanja),
      adresa,
      podaci: payload,
    };

    void fetch(`${BACKUP_URL}/rest/v1/${BACKUP_TABLE}`, {
      method: "POST",
      headers: zaglavlja(),
      body: JSON.stringify(red),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* rezerva nikad ne sme da smeta porudžbini */
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
