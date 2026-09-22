// =====================================================================
// REZERVNA EVIDENCIJA PORUDŽBINA (Supabase).
//
// Forma upiše porudžbinu ovde u istom trenutku kad je šalje Make-u, i
// označi je kao potvrđenu tek kad Make javi da ju je primio. Red koji
// ostane nepotvrđen znači da porudžbina NIJE stigla u Make - Supabase
// posle 5 minuta šalje poruku na Slack. Vidi docs/supabase-rezerva.sql.
//
// Ovo NE zamenjuje slanje Make-u i ne usporava kupca; ide sa strane.
//
// Dok su vrednosti ispod prazne, ne šalje se ništa (kao kod VISIT_WEBHOOK).
// =====================================================================

/** Adresa Supabase projekta, npr. "https://abcdefgh.supabase.co". */
export const BACKUP_URL = "";

/**
 * `anon` ključ tog projekta.
 *
 * Javan je i sme da stoji u kodu forme - svako ko otvori sajt ga vidi.
 * Zaštita je u pravima: tim ključem se može samo upisati porudžbina i
 * označiti da je potvrđena, ništa se ne može pročitati ni obrisati
 * (vidi SQL u docs/supabase-rezerva.sql).
 */
export const BACKUP_KEY = "";

/** Naziv tabele iz SQL-a. */
export const BACKUP_TABLE = "porudzbine";
