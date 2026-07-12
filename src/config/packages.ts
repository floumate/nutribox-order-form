import type { PackageId } from "../types";

// =====================================================================
// PAKETI.
//
// Vizuelna hijerarhija (tier):
//   hero      → 28-dnevni (najistaknutiji)
//   secondary → 7-dnevni
//   muted     → 20-dnevni i 5-dnevni (bez vikenda, manje istaknuti)
//   trial     → probni (najmanje istaknut)
//
// ⚠️ raiffeisenPlan za 20/5 i thank-you stranice za 20/5/probni su
//    PLACEHOLDER (TODO). Popuni kad dobiješ kodove/linkove.
// =====================================================================

export type PackageTier = "hero" | "secondary" | "muted" | "trial";

/** Grupa trajanja (kako klijent deli pakete na formi). */
export type PackageGroup = "mesecni" | "nedeljni" | "probni";

export const PACKAGE_GROUPS: { id: PackageGroup; label: string }[] = [
  { id: "mesecni", label: "Mesečni paket" },
  { id: "nedeljni", label: "Nedeljni paket" },
  { id: "probni", label: "Probni paket" },
];

export interface PackageDef {
  id: PackageId;
  name: string;
  subtitle: string;
  badge?: string;
  tier: PackageTier;
  group: PackageGroup;
  /** Kod koji Raiffeisen checkout očekuje za "plan". */
  raiffeisenPlan: string;
  /** Thank-you stranice (relativne na thankYouBase). null = TODO. */
  tyPouzece: string | null;
  tyFirma: string | null;
}

export const PACKAGES: PackageDef[] = [
  {
    id: "28-dnevni",
    name: "28-dnevni paket",
    subtitle: "Ceo mesec - svaki dan",
    badge: "Najpopularniji",
    tier: "hero",
    group: "mesecni",
    raiffeisenPlan: "28_day",
    tyPouzece: "/hvala-28-pouzece",
    tyFirma: "/hvala-28-firma",
  },
  {
    id: "7-dnevni",
    name: "7-dnevni paket",
    subtitle: "Cela nedelja",
    tier: "secondary",
    group: "nedeljni",
    raiffeisenPlan: "7_day",
    tyPouzece: "/hvala-7-pouzece",
    tyFirma: "/hvala-7-firma",
  },
  {
    id: "20-dnevni",
    name: "20-dnevni paket",
    subtitle: "Radni dani - bez vikenda",
    tier: "muted",
    group: "mesecni",
    raiffeisenPlan: "20_day", // TODO: potvrdi kod sa Raiffeisen strane
    tyPouzece: null, // TODO
    tyFirma: null, // TODO
  },
  {
    id: "5-dnevni",
    name: "5-dnevni paket",
    subtitle: "Radna nedelja - bez vikenda",
    tier: "muted",
    group: "nedeljni",
    raiffeisenPlan: "5_day", // TODO: potvrdi kod sa Raiffeisen strane
    tyPouzece: null, // TODO
    tyFirma: null, // TODO
  },
  {
    id: "probni",
    name: "Probni paket",
    subtitle: "1 dan - probaj pre nego što se odlučiš",
    tier: "trial",
    group: "probni",
    raiffeisenPlan: "probni",
    tyPouzece: null, // TODO
    tyFirma: null, // TODO
  },
];

export function getPackage(id: PackageId): PackageDef | undefined {
  return PACKAGES.find((p) => p.id === id);
}
