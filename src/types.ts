// =====================================================================
// Centralni tipovi za celu formu.
// =====================================================================

export type PlanId = "nutrislim" | "nutribalance" | "nutripump" | "highprotein";

export type Sex = "Muški" | "Ženski";

export type DietId = "balance" | "pescaterian" | "vegetarian" | "vegan";

export type PackageId =
  | "28-dnevni"
  | "20-dnevni"
  | "7-dnevni"
  | "5-dnevni"
  | "probni";

export type PaymentMethod = "Kartica" | "Pouzeće" | "Firma";

/** Dnevni makro ciljevi koji se prikazuju korisniku (fiksni po Plan × Pol). */
export interface Macros {
  kcal: number | null;
  proteini: number | null; // g
  uh: number | null; // ugljeni hidrati, g
  masti: number | null; // g
}

/** Podaci o firmi (samo kad je način plaćanja "Firma"). */
export interface FirmaData {
  nazivFirme: string;
  adresaFirme: string;
  emailFirme: string;
  pibFirme: string;
  maticniBrojFirme: string;
}

/** Glavno stanje forme — popunjava se kroz korake. */
export interface FormState {
  ime: string;
  prezime: string;
  email: string;
  telefon: string; // E.164 (iz intl-tel-input)

  plan: PlanId | null;
  pol: Sex | null;
  tipIshrane: DietId | null;
  paket: PackageId | null;

  nacinPlacanja: PaymentMethod | null;
  firma: FirmaData;
}

export function createInitialState(): FormState {
  return {
    ime: "",
    prezime: "",
    email: "",
    telefon: "",
    plan: null,
    pol: null,
    tipIshrane: null,
    paket: null,
    nacinPlacanja: null,
    firma: {
      nazivFirme: "",
      adresaFirme: "",
      emailFirme: "",
      pibFirme: "",
      maticniBrojFirme: "",
    },
  };
}
