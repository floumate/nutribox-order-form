import { state } from "./state";
import { urlContext } from "./urlParams";
import { getPhoneNumber } from "./phone";
import { getPlan, getMacros } from "../config/plans";
import { getDiet } from "../config/dietTypes";
import { computePrice } from "../config/pricing";

// =====================================================================
// Gradi payload za Make / abandoned iz trenutnog stanja forme.
// Parametri (cenaPaketa, setter, affiliate, paket) se ubacuju ovde.
// =====================================================================

export function buildPayload(): Record<string, unknown> {
  const plan = state.plan ? getPlan(state.plan) : undefined;
  const diet = state.tipIshrane ? getDiet(state.tipIshrane) : undefined;
  const macros =
    state.plan && state.pol ? getMacros(state.plan, state.pol) : null;
  const price = state.paket ? computePrice(state.paket, urlContext) : null;

  const payload: Record<string, unknown> = {
    Ime: state.ime,
    Prezime: state.prezime,
    Email: state.email,
    "Broj-telefona": getPhoneNumber() || state.telefon,

    nutriPlan: plan?.name ?? "",
    pol: state.pol ?? "",
    tipIshrane: diet?.name ?? "",
    paket: state.paket ?? "",

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
