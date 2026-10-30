// =====================================================================
// URL parametri (affiliate, discountCode, s, referred_by, custom plan,
// test). Čitaju se jednom - URL se ne menja tokom popunjavanja.
// =====================================================================

import { PACKAGES } from "../config/packages";
import { packageAvailable } from "../config/pricing";
import type { PackageId } from "../types";

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
  /**
   * ?paket=28-dnevni (ili drugi id iz packages.ts) - link sa stranice
   * jednog paketa. Paket je unapred izabran, korak sa paketima se preskače,
   * a u pregledu se paket vidi bez "Izmeni". null = kupac bira sam.
   * Ne važi uz ?ns=year (tamo paketa nema).
   */
  fixedPackage: PackageId | null;
  /**
   * ?partner=1 - kupac je partner postojećeg kupca (ista adresa) i dobija
   * partner cenu. Ne važi uz ?ns=year i custom plan. Da li se uopšte
   * primenjuje odlučuje PARTNER_ENABLED (vidi isPartnerOrder u pricing.ts).
   */
  partner: boolean;
  /**
   * ?brojobroka=2 - downsell forma: paket sa 2 glavna obroka, bez cilja,
   * pola i kalorija. Ne važi uz ?ns=year i custom plan. Da li se uopšte
   * primenjuje odlučuje EXTRAS_ENABLED (vidi isDownsell u order.ts).
   */
  twoMeals: boolean;
  /** UTM oznake iz linka reklame ("" ako ih nema). */
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /**
   * Odakle je kupac došao, jednom rečju - za GHL polje Source.
   * Redosled: utm_source > reklama bez UTM-a (fbclid/gclid) > AI setter
   * > affiliate > preporuka > "direktno". Vidi readSource().
   */
  source: string;
}

function readSource(p: URLSearchParams): string {
  const utm = (p.get("utm_source") ?? "").trim().toLowerCase();
  if (utm) return utm;
  if (p.get("fbclid")) return "meta_ads";
  if (p.get("gclid")) return "google_ads";
  const setter = p.get("s") ?? "";
  if (setter === "a") return "ai_setter";
  if (setter) return "setter_" + setter;
  if (p.get("affiliate")) return "affiliate";
  if (p.get("referred_by")) return "preporuka";
  return "direktno";
}

function readPackage(p: URLSearchParams): PackageId | null {
  if (p.get("ns") === "year") return null;
  const id = p.get("paket") ?? "";
  // Paket koji u trenutnim cenama ne postoji (probni od 3.0) → kupac bira sam.
  return PACKAGES.some((pkg) => pkg.id === id) && packageAvailable(id as PackageId)
    ? (id as PackageId)
    : null;
}

function readPartner(p: URLSearchParams, isCustomPlan: boolean): boolean {
  if (p.get("ns") === "year" || isCustomPlan) return false;
  const v = (p.get("partner") ?? "").trim().toLowerCase();
  return v !== "" && v !== "0" && v !== "false" && v !== "ne";
}

function read(): UrlContext {
  const p = new URLSearchParams(window.location.search);
  const plan = p.get("plan") ?? "";
  const customPlanName = p.get("customPlanName") ?? "";
  const isCustomPlan = plan === "custom" && customPlanName === "standard";
  return {
    affiliate: p.get("affiliate") ?? "",
    discountCode: p.get("discountCode") ?? "",
    setter: p.get("s") ?? "",
    referredBy: p.get("referred_by") ?? "",
    plan,
    customPlanName,
    isCustomPlan,
    isTest: p.get("testiranje-placanja") === "true",
    ns: p.get("ns") ?? "",
    agreedPrice: p.get("ns") === "year",
    fixedPackage: readPackage(p),
    partner: readPartner(p, isCustomPlan),
    twoMeals: p.get("ns") !== "year" && !isCustomPlan && p.get("brojobroka") === "2",
    utmSource: p.get("utm_source") ?? "",
    utmMedium: p.get("utm_medium") ?? "",
    utmCampaign: p.get("utm_campaign") ?? "",
    source: readSource(p),
  };
}

export const urlContext: UrlContext = read();
