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

  const payload: Record<string, unknown> = {
    Ime: state.ime,
    Prezime: state.prezime,
    datumRodjenja: state.datumRodjenja,
    Email: state.email,
    "Broj-telefona": getPhoneNumber() || state.telefon,

    cilj: state.cilj,
    nutriPlan: plan?.name ?? "",
    pol: state.pol ?? "",
    tipIshrane: diet?.name ?? "",
    izuzeteNamirnice: state.izuzeteNamirnice.join(", "),
    // NutriChef lead: 3+ izbačenih namirnica (Vegan 2+) → custom plan, bez cene.
    nutriChef: qualifiesForNutriChef(),
    paket: state.paket ?? "",
    datumDostave: state.datumDostave,

    naselje: state.dostava.naselje,
    adresa: state.dostava.adresa,
    kucniBroj: state.dostava.kucniBroj,
    brojStana: state.dostava.brojStana,
    brojSprata: state.dostava.brojSprata,
    sifraUlaznihVrata: state.dostava.sifraUlaznihVrata,
    instrukcije: state.dostava.instrukcije,

    kcal: macros?.kcal ?? "",
    proteini: macros?.proteini ?? "",
    uh: macros?.uh ?? "",
    masti: macros?.masti ?? "",

    nacinPlacanja: state.nacinPlacanja ?? "",
    cenaPaketa: price != null ? String(price) : "",

    affiliate: urlContext.affiliate,
    discountCode: urlContext.discountCode,
    setter: urlContext.setter,
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

  return payload;
}
