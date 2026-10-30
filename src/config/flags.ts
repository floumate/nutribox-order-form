import { ENV, type Env } from "./env";
import type { Lang } from "../types";

// =====================================================================
// PREKIDAČI (privremena stanja).
// =====================================================================

/**
 * Kartično plaćanje.
 *
 *   true  = checkout → Raiffeisen stranica za unos kartice
 *   false = "Plaćanje karticom" vodi na /hvala sa uputstvima za uplatu
 *           (broj računa, IPS QR, uplatnica)
 *
 * Uključeno na oba okruženja od 04.09.2026.
 *
 * Put dovde: stara firma (NUTRI BOX D.O.O.) je zatvorena i račun blokiran,
 * pa je kartica bila ugašena od 23.08. Prvo je Raiffeisen odobrio testno
 * okruženje na vuksanvasic.webflow.io, pa su stigli LIVE kredencijali.
 *
 * Pre uključivanja provereno na PRAVOJ prod checkout stranici:
 *   Merchant: NUTRIBOX KETERING DOO ONLINE
 *   Amount:   300.00 RSD (kod PROBNI300)
 *
 * Ta provera nije formalnost. U avgustu je kartica vraćena na osnovu usmene
 * potvrde da je merchant prebačen - nije bio, i dve uplate su otišle na
 * blokiran račun. Ako se ovo ikad opet gasi i pali, prvo se otvori checkout
 * stranica i OČIMA se pročita koja firma piše.
 *
 * Gašenje: vrati `prod: false` (jedna linija). /hvala stranica i uplatnice
 * u public/uplatnica/ stoje na svom mestu. Detalji:
 * docs/POVRATAK-NA-RAIFPAY.md
 */
const CARD_ENABLED_BY_ENV: Record<Env, boolean> = {
  prod: true,
  staging: true,
};

export const CARD_PAYMENT_ENABLED = CARD_ENABLED_BY_ENV[ENV];

/** Stranica sa uputstvima za uplatu (koristi se dok je kartica ugašena). */
export const UPLATNICA_PATH = "/hvala";

/**
 * Kartica: prvo plaćanje u banci, pa porudžbina u Make sa brojem plaćanja
 * (`raifpayOrderId` u registraciji - Nikolin zahtev, 03.10.2026).
 *
 *   false = stari redosled: porudžbina u Make odmah, istovremeno sa
 *           checkout-om, bez broja plaćanja
 *
 * Prvo samo staging: Nikolin checkout ne prima zahteve sa localhost-a, pa
 * se novi redosled može proveriti samo na vuksanvasic.webflow.io.
 */
const CHECKOUT_FIRST_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const CHECKOUT_FIRST = CHECKOUT_FIRST_BY_ENV[ENV];

/**
 * Nutribox 3.0, korak 1: pol i cilj (`gender`, `goal`) u zahtevu za
 * plaćanje karticom. Nikolin novi backend iz njih računa veličinu paketa i
 * iznos, a bez njih vraća 400.
 *
 * Na prod ide PRE Nikolinog deploy-a, na dan koji se dogovori. Trenutni
 * backend ova polja ignoriše, pa je bezbedno da izađe ranije od ostalog.
 */
const SEND_GENDER_GOAL_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const SEND_GENDER_GOAL = SEND_GENDER_GOAL_BY_ENV[ENV];

/**
 * Nutribox 3.0, korak 2: nove cene po veličini paketa (kcal), bez `_max`
 * kodova, bez probnog paketa i bez kodova popusta (NUTRI20, ONBOARDING10,
 * affiliate). Odluke: Vuksan 22.10.2026.
 *
 * Na prod se uključuje TEK POSLE Nikolinog deploy-a: stari backend bez
 * `_max` naplati NutriMax kao običan paket.
 */
const PRICING_V3_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const PRICING_V3 = PRICING_V3_BY_ENV[ENV];

/**
 * Nutribox 3.0, korak 3: partner popust preko linka `?partner=1` - forma
 * prikaže partnersku cenu i pošalje `partner: true` u plaćanje karticom i u
 * registraciju. Radi samo uz nove cene (PRICING_V3).
 *
 * Na prod TEK POSLE Nikolinog deploy-a: do tada registracija odbija polje
 * `partner` (ide na ručnu proveru), a kartica ga ignoriše i naplati punu cenu.
 */
const PARTNER_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const PARTNER_ENABLED = PARTNER_BY_ENV[ENV] && PRICING_V3;

/**
 * Nutribox 3.0, Nikolin dodatak (30.10.2026) + Dušanov prototip (30.10.2026):
 *   - downsell forma (?brojobroka=2): paket sa 2 glavna obroka
 *     (`partial_*`), bez cilja, pola i kalorija, ista cena za sve
 *     kombinacije; kupac bira tačno 2 obroka (`obroci` / `mealSlots`);
 *   - korak "Dodaj uz svoj plan" pre plaćanja, u obe forme: supa, užina
 *     ili komplet (`dodatak` / `addOn`), cene iz prototipa (extras.ts);
 *   - nova pravila za izbacivanje namirnica po jelovniku (allergens.ts).
 * Dodatak se ne nudi uz ?ns=year, ?paket= i custom plan. Radi samo uz
 * nove cene.
 *
 * Na prod TEK POSLE Nikolinog deploy-a: stari backend ne zna ni partial
 * kodove ni dodatke.
 */
const EXTRAS_BY_ENV: Record<Env, boolean> = {
  prod: false,
  staging: true,
};

export const EXTRAS_ENABLED = EXTRAS_BY_ENV[ENV] && PRICING_V3;

/**
 * Jezici forme, po okruženju.
 *
 *   ["sr"]             = forma samo na srpskom, bez izbora jezika
 *   ["sr", "en", "ru"] = izbor jezika gore desno; forma sama uzme jezik
 *                        stranice sa koje je otvorena (Webflow /en/, /ru/)
 *
 * Jezik se dodaje tek kad je OBJAVLJEN na sajtu tog okruženja. Posle
 * porudžbine forma vodi na /en/hvala-..., /ru/hvala-..., a te stranice
 * postoje tek kad Webflow objavi taj locale - inače kupac posle plaćanja
 * vidi 404.
 *
 * EN i RU objavljeni na nutribox.rs 01.10.2026, pa su uključeni i na prod.
 */
const LANGS_BY_ENV: Record<Env, Lang[]> = {
  prod: ["sr", "en", "ru"],
  staging: ["sr", "en", "ru"],
};

export const FORM_LANGS: Lang[] = LANGS_BY_ENV[ENV];
