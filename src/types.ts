// =====================================================================
// Centralni tipovi za celu formu.
// =====================================================================

export type PlanId = "nutrislim" | "nutribalance" | "nutripump" | "nutrimax";

export type Sex = "Muški" | "Ženski";

export type DietId = "balance" | "fish" | "vegetarian" | "vegan";

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

/** Podaci za dostavu (adresa). */
export interface DostavaData {
  naselje: string;
  adresa: string;
  kucniBroj: string;
  brojSprata: string;
  brojStana: string;
  sifraUlaznihVrata: string;
  instrukcije: string;
}

/** Glavno stanje forme — popunjava se kroz korake. */
export interface FormState {
  ime: string;
  prezime: string;
  datumRodjenja: string; // d.m.Y (flatpickr)
  email: string;
  telefon: string; // E.164 (iz intl-tel-input)

  plan: PlanId | null;
  pol: Sex | null;
  tipIshrane: DietId | null;
  /** Namirnice izabrane za isključivanje (zavisi od tipa ishrane). */
  izuzeteNamirnice: string[];
  paket: PackageId | null;
  datumDostave: string; // d.m.Y (flatpickr)
  dostava: DostavaData;

  nacinPlacanja: PaymentMethod | null;
  firma: FirmaData;
}

export function createInitialState(): FormState {
  return {
    ime: "",
    prezime: "",
    datumRodjenja: "",
    email: "",
    telefon: "",
    plan: null,
    pol: null,
    tipIshrane: null,
    izuzeteNamirnice: [],
    paket: null,
    datumDostave: "",
    dostava: {
      naselje: "",
      adresa: "",
      kucniBroj: "",
      brojSprata: "",
      brojStana: "",
      sifraUlaznihVrata: "",
      instrukcije: "",
    },
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
