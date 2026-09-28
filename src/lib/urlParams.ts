// =====================================================================
// URL parametri (affiliate, discountCode, s, referred_by, custom plan,
// test). Čitaju se jednom - URL se ne menja tokom popunjavanja.
// =====================================================================

export interface UrlContext {
  affiliate: string;
  discountCode: string;
  /** Ko je doveo kupca. Čita se iz ?s= (kratko, da ne izgleda kao praćenje).
   *  U Make payload i dalje ide pod imenom `setter`, da mapiranja u Google
   *  Sheets-u i GHL-u ostanu netaknuta. */
  setter: string;
  /** Refer-a-friend: email preporučioca (?referred_by=). "" ako nema. */
  referredBy: string;
  plan: string; // "custom" ili ""
  customPlanName: string; // npr. "standard"
  isCustomPlan: boolean;
  isTest: boolean; // ?testiranje-placanja=true
  /** Sirova vrednost ?ns= (ide u payload kao `ns`). */
  ns: string;
  /**
   * ?ns=year - cena se dogovara direktno sa Vuksanom.
   * Forma tada nema korak sa cenama, u pregledu nema iznosa, plaćanje je
   * samo pouzeće ili kartica, i obe vode na "hvala" stranice bez iznosa.
   * Kartica NE ide na banku - nema iznosa koji bi se naplatio.
   */
  agreedPrice: boolean;
}

function read(): UrlContext {
  const p = new URLSearchParams(window.location.search);
  const plan = p.get("plan") ?? "";
  const customPlanName = p.get("customPlanName") ?? "";
  return {
    affiliate: p.get("affiliate") ?? "",
    discountCode: p.get("discountCode") ?? "",
    setter: p.get("s") ?? "",
    referredBy: p.get("referred_by") ?? "",
    plan,
    customPlanName,
    isCustomPlan: plan === "custom" && customPlanName === "standard",
    isTest: p.get("testiranje-placanja") === "true",
    ns: p.get("ns") ?? "",
    agreedPrice: p.get("ns") === "year",
  };
}

export const urlContext: UrlContext = read();
