// =====================================================================
// URL parametri (affiliate, discountCode, setter, referred_by, custom
// plan, test). Čitaju se jednom - URL se ne menja tokom popunjavanja.
// =====================================================================

export interface UrlContext {
  affiliate: string;
  discountCode: string;
  setter: string;
  /** Refer-a-friend: email preporučioca (?referred_by=). "" ako nema. */
  referredBy: string;
  plan: string; // "custom" ili ""
  customPlanName: string; // npr. "standard"
  isCustomPlan: boolean;
  isTest: boolean; // ?testiranje-placanja=true
}

function read(): UrlContext {
  const p = new URLSearchParams(window.location.search);
  const plan = p.get("plan") ?? "";
  const customPlanName = p.get("customPlanName") ?? "";
  return {
    affiliate: p.get("affiliate") ?? "",
    discountCode: p.get("discountCode") ?? "",
    setter: p.get("setter") ?? "",
    referredBy: p.get("referred_by") ?? "",
    plan,
    customPlanName,
    isCustomPlan: plan === "custom" && customPlanName === "standard",
    isTest: p.get("testiranje-placanja") === "true",
  };
}

export const urlContext: UrlContext = read();
