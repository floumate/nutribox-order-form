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

/** Vrsta paketa (Nutribox 3.0): ceo dan ili 2 glavna obroka + užina. */
export type PackageKind = "full" | "partial";

/** Glavni obroci za paket sa 2 obroka - Nikolini kodovi (`obroci`, `mealSlots`). */
export type MealSlot = "breakfast" | "lunch" | "dinner";

/** Dodatak uz pun paket - Nikolini kodovi (`dodatak`, `addOn`). */
export type AddOnCode = "soup" | "snack" | "soup_snack";

export type PaymentMethod = "Kartica" | "Pouzeće" | "Firma";

/** Jezik forme. Menja samo PRIKAZ - vrednosti u payload-u ostaju srpske. */
export type Lang = "sr" | "en" | "ru";

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

/** Glavno stanje forme - popunjava se kroz korake. */
export interface FormState {
  ime: string;
  prezime: string;
  datumRodjenja: string; // d.m.Y (flatpickr)
  email: string;
  telefon: string; // E.164 (iz intl-tel-input)

  /** Odgovor na uvodno pitanje "Izaberi cilj koji želiš da ostvariš?"
   *  (zasebno pitanje - NE određuje plan; čuva se za segmentaciju). */
  cilj: string;
  plan: PlanId | null;
  pol: Sex | null;
  tipIshrane: DietId | null;
  /** Namirnice izabrane za isključivanje (zavisi od tipa ishrane). */
  izuzeteNamirnice: string[];
  paket: PackageId | null;
  /** Ceo dan ili 2 obroka + užina (samo uz EXTRAS_ENABLED). */
  tipPaketa: PackageKind;
  /** Izabrana 2 glavna obroka kad je tipPaketa "partial". */
  obroci: MealSlot[];
  /** Dodatak uz pun paket, null = bez dodatka. */
  dodatak: AddOnCode | null;
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
    cilj: "",
    plan: null,
    pol: null,
    tipIshrane: null,
    izuzeteNamirnice: [],
    paket: null,
    tipPaketa: "full",
    obroci: [],
    dodatak: null,
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
