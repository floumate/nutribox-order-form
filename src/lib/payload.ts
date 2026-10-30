import { state } from "./state";
import { urlContext } from "./urlParams";
import { getPhoneNumber } from "./phone";
import { getPlan, getMacros } from "../config/plans";
import { getDiet } from "../config/dietTypes";
import { ADD_ONS, MEAL_SLOTS } from "../config/extras";
import { buildRegistration } from "./registration";
import {
  activeAddOn,
  addOnAmount,
  orderKind,
  orderTotal,
  partnerActive,
  selectedMeals,
} from "./order";
import { ENV } from "../config/env";
import { EXTRAS_ENABLED } from "../config/flags";
import { peekVisitId } from "./setterTracking";
import { getLang } from "./i18n";

// =====================================================================
// Gradi payload za Make / abandoned iz trenutnog stanja forme.
// Parametri (cenaPaketa, setter, affiliate, paket) se ubacuju ovde.
// =====================================================================

export function buildPayload(): Record<string, unknown> {
  const plan = state.plan ? getPlan(state.plan) : undefined;
  const diet = state.tipIshrane ? getDiet(state.tipIshrane) : undefined;
  const macros =
    state.plan && state.pol ? getMacros(state.plan, state.pol) : null;
  // Ukupno za plaćanje (paket + dodatak) - isti iznos koji pouzeće naplati.
  const price = orderTotal();

  // Imena polja USKLAĐENA sa starom 28-dnevnom formom (da Make/GHL mapiranje
  // radi bez remapiranja). Nova polja (motivacija/Kucni-broj/nutriChef) su
  // označena dole — za njih se prave novi GHL Custom Field-ovi.
  const payload: Record<string, unknown> = {
    Ime: state.ime,
    Prezime: state.prezime,
    "datum-rodjenja": state.datumRodjenja,
    Email: state.email,
    "Broj-telefona": getPhoneNumber() || state.telefon,

    Cilj: plan?.name ?? "", // stara forma: PLAN se šalje kao "Cilj"
    Pol: state.pol ?? "",
    "Tip-ishrane": diet?.name ?? "",
    NamirniceZalzbacivanje: state.izuzeteNamirnice.join(", "),
    // ?ns=year nema korak sa paketima - "custom" da prođe Make filtere
    // koji traže paket.
    paket: urlContext.agreedPrice ? "custom" : (state.paket ?? ""),
    "datum-dostave": state.datumDostave,

    Naselje: state.dostava.naselje,
    Adresa: state.dostava.adresa,
    "Broj-stana": state.dostava.brojStana,
    "Broj-sprata": state.dostava.brojSprata,
    "Sifra-ulaznih-vrata": state.dostava.sifraUlaznihVrata,
    "Instrukcije-za-vozaca": state.dostava.instrukcije,

    UkupneKalorije: macros?.kcal ?? "",
    Proteini: macros?.proteini ?? "",
    Hidrati: macros?.uh ?? "",
    Masti: macros?.masti ?? "",

    nacinPlacanja: state.nacinPlacanja ?? "",
    cenaPaketa: price != null ? String(price) : "",
    checkbox: true, // consent (stara forma šalje "checkbox: true")

    affiliate: urlContext.affiliate,
    discountCode: urlContext.discountCode,
    setter: urlContext.setter,

    // ---- NOVA polja (nema ih u staroj formi → novi GHL Custom Fields) ----
    motivacija: state.cilj, // "Izaberi cilj koji želiš da ostvariš"
    "Kucni-broj": state.dostava.kucniBroj,
  };

  // "prod" | "staging" — da se u Make-u filterom odvoje test porudžbine sa
  // vuksanvasic.webflow.io od pravih sa nutribox.rs.
  payload.env = ENV;

  // "year" kad je porudžbina sa ?ns=year - cena se dogovara sa Vuksanom,
  // pa `paket` ide kao "custom", `cenaPaketa` je namerno prazan, a
  // registracija ide sa `paket: "custom"` i bez cene (vidi registration.ts).
  payload.ns = urlContext.ns;

  // Jezik na kom je kupac popunio formu ("sr" | "en" | "ru"). Sva ostala
  // polja su uvek na srpskom, bez obzira na jezik.
  payload.jezik = getLang();

  // Vezuje porudžbinu za dolazak preko AI settera. Prazno kad poseta nije
  // došla sa ?s=a. Make ovo šalje dalje kao "order".
  payload.visit_id = peekVisitId();

  // "da" kad je porudžbina preko partner linka (Nutribox 3.0), da tim vidi
  // zašto je cena niža. Prazno inače.
  payload.partner = partnerActive() ? "da" : "";

  // Paket sa 2 obroka i dodatak (Nutribox 3.0), na srpskom - za tim. Šalje
  // se samo dok je to uključeno, da se Make payload na prod ne menja.
  if (EXTRAS_ENABLED) {
    const kind = orderKind();
    const addOn = activeAddOn();
    payload.tipPaketa = kind === "partial" ? "2 obroka + užina" : "Ceo dan";
    payload.obroci = selectedMeals()
      .map((id) => MEAL_SLOTS.find((m) => m.id === id)?.label ?? id)
      .join(", ");
    payload.dodatak = addOn ? (ADD_ONS.find((a) => a.code === addOn)?.name ?? addOn) : "";
    payload.cenaDodatka = addOn ? String(addOnAmount()) : "";
  }

  // Odakle je kupac došao (GHL polje Source) i UTM oznake reklame.
  payload.source = urlContext.source;
  payload.utm_source = urlContext.utmSource;
  payload.utm_medium = urlContext.utmMedium;
  payload.utm_campaign = urlContext.utmCampaign;

  // Gotov Nikolin registration payload (string) — Make HTTP modul ga prosleđuje
  // kao raw body + doda X-API-Key. Prazno kad se ne registruje (custom plan).
  const reg = buildRegistration();
  payload.registrationJson = reg ? JSON.stringify(reg) : "";

  if (state.nacinPlacanja === "Firma") {
    payload.nazivFirme = state.firma.nazivFirme;
    payload.adresaFirme = state.firma.adresaFirme;
    payload.emailFirme = state.firma.emailFirme;
    payload.pibFirme = state.firma.pibFirme;
    payload.maticniBrojFirme = state.firma.maticniBrojFirme;
  }

  if (urlContext.isCustomPlan) {
    payload.plan = "custom";
    payload.customPlanName = urlContext.customPlanName;
  }

  // Refer-a-friend: šalje se SAMO kad postoji referral (izbegava prazna polja).
  if (urlContext.referredBy) {
    payload.preporucenOd = urlContext.referredBy;
    payload.promoKod = "onboarding";
  }

  return payload;
}
