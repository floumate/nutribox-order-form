import { state } from "./state";
import { urlContext } from "./urlParams";
import { getPhoneNumber } from "./phone";
import { getPackage } from "../config/packages";
import { isMaxPlan } from "../config/plans";
import { qualifiesForNutriChef } from "./nutrichef";
import type { PlanId } from "../types";

// =====================================================================
// Registration payload za Nikolin backend (POST /webhooks/customer/registration).
// Forma gradi TAČAN contract; Make HTTP modul samo prosleđuje kao raw body
// i dodaje X-API-Key header (server-side). Sva mapiranja vrednosti su ovde
// (TS, testabilno) umesto u krhkim Make if()/switch izrazima.
// =====================================================================

const POL_MAP: Record<string, "male" | "female"> = {
  Muški: "male",
  Ženski: "female",
};

const CILJ_MAP: Record<PlanId, "slim" | "balance" | "pump" | "max"> = {
  nutrislim: "slim",
  nutribalance: "balance",
  nutripump: "pump",
  nutrimax: "max",
};

const PLACANJE_MAP: Record<string, "cash" | "card" | "invoice"> = {
  Kartica: "card",
  Pouzeće: "cash",
  Firma: "invoice",
};

/** Kategorije namirnica (forma) → Nikolin enum. */
const NAMIRNICE_MAP: Record<string, string> = {
  Gluten: "gluten",
  Laktoza: "lactose",
  "Orašasti plodovi": "nuts",
  Svinjetina: "pork",
  Riba: "fish",
  "Morski plodovi": "seafood",
};

/**
 * Vrati Nikolin registration objekat, ili null kad se NE registruje:
 *   - NutriChef lead (ide na personal-chef, bez paketa)
 *   - custom plan (nije u Nikolinom enum-u)
 *   - nepotpuni podaci (npr. abandoned)
 */
export function buildRegistration(): Record<string, unknown> | null {
  if (qualifiesForNutriChef()) return null;
  if (urlContext.isCustomPlan) return null;

  const plan = state.plan;
  const paketId = state.paket;
  const pol = state.pol;
  const tip = state.tipIshrane;
  const nacin = state.nacinPlacanja;
  if (!plan || !paketId || !pol || !tip || !nacin) return null;

  const pkg = getPackage(paketId);
  if (!pkg) return null;

  const paketKod = isMaxPlan(plan) ? pkg.raiffeisenPlanMax : pkg.raiffeisenPlan;

  const reg: Record<string, unknown> = {
    ime: state.ime,
    prezime: state.prezime,
    datumRodjenja: state.datumRodjenja,
    email: state.email,
    brojTelefona: getPhoneNumber() || state.telefon,
    pol: POL_MAP[pol],
    cilj: CILJ_MAP[plan],
    tipIshrane: tip, // diet id = balance | fish | vegan | vegetarian
    paket: paketKod,
    datumPocetka: state.datumDostave,
    naselje: state.dostava.naselje,
    adresa: state.dostava.adresa,
    kucniBroj: state.dostava.kucniBroj,
    nacinPlacanja: PLACANJE_MAP[nacin],
  };

  // Namirnice → enum niz (bez duplikata), samo ako ih ima.
  const namirnice = [
    ...new Set(
      state.izuzeteNamirnice
        .map((n) => NAMIRNICE_MAP[n])
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  if (namirnice.length > 0) reg.namirniceZaIskljucivanje = namirnice;

  // Opciona adresna polja.
  if (state.dostava.brojSprata) reg.brojSprata = state.dostava.brojSprata;
  if (state.dostava.brojStana) reg.brojStana = state.dostava.brojStana;
  if (state.dostava.sifraUlaznihVrata)
    reg.sifraUlaznihVrata = state.dostava.sifraUlaznihVrata;
  if (state.dostava.instrukcije)
    reg.instrukcijeZaVozaca = state.dostava.instrukcije;

  // Referral / promo.
  if (urlContext.referredBy) reg.preporucenOd = urlContext.referredBy;
  if (urlContext.discountCode) reg.promoKod = urlContext.discountCode;

  // Firma (Nikola ne traži emailFirme).
  if (nacin === "Firma") {
    reg.nazivFirme = state.firma.nazivFirme;
    reg.pib = state.firma.pibFirme;
    reg.mb = state.firma.maticniBrojFirme;
    reg.adresaFirme = state.firma.adresaFirme;
  }

  return reg;
}
