import { state } from "./state";
import { urlContext } from "./urlParams";
import { getPhoneNumber } from "./phone";
import { getPlan, getMacros, isMaxPlan } from "../config/plans";
import { getDiet } from "../config/dietTypes";
import { computePrice } from "../config/pricing";
import { qualifiesForNutriChef } from "./nutrichef";

// =====================================================================
// Gradi payload za Make / abandoned iz trenutnog stanja forme.
// Parametri (cenaPaketa, setter, affiliate, paket) se ubacuju ovde.
// =====================================================================

export function buildPayload(): Record<string, unknown> {
  const plan = state.plan ? getPlan(state.plan) : undefined;
  const diet = state.tipIshrane ? getDiet(state.tipIshrane) : undefined;
  const macros =
    state.plan && state.pol ? getMacros(state.plan, state.pol) : null;
  const price = state.paket
    ? computePrice(state.paket, urlContext, isMaxPlan(state.plan))
    : null;

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
    paket: state.paket ?? "",
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
    nutriChef: qualifiesForNutriChef(), // true = NutriChef lead (bez paketa/cene)
  };

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
