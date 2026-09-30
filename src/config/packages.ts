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
// Raiffeisen kodovi (Nikola potvrdio): standard = {28,20,7,5}_day + probni;
// NutriMax = *_max. "Hvala" stranice ne zavise od paketa: pouzeće ide na
// /hvala-pouzece, firma na /hvala-firma (submit.ts).
// =====================================================================

export type PackageTier = "hero" | "secondary" | "muted" | "trial";

/** Grupa trajanja (kako klijent deli pakete na formi). */
export type PackageGroup = "mesecni" | "nedeljni" | "probni";

export const PACKAGE_GROUPS: { id: PackageGroup; label: string }[] = [
  { id: "mesecni", label: "Mesečni" },
  { id: "nedeljni", label: "Nedeljni" },
  { id: "probni", label: "Dnevni" },
];

export interface PackageDef {
  id: PackageId;
  name: string;
  subtitle: string;
  badge?: string;
  tier: PackageTier;
  group: PackageGroup;
  /** Kod koji Raiffeisen checkout očekuje za "plan" (standard nivo). */
  raiffeisenPlan: string;
  /** Kod za NutriMax nivo (viša cena). */
  raiffeisenPlanMax: string;
}

export const PACKAGES: PackageDef[] = [
  {
    id: "28-dnevni",
    name: "28-dnevni plan",
    subtitle: "Ceo mesec - svaki dan",
    tier: "hero",
    group: "mesecni",
    raiffeisenPlan: "28_day",
    raiffeisenPlanMax: "28_day_max",
  },
  {
    id: "7-dnevni",
    name: "7-dnevni plan",
    subtitle: "Cela nedelja",
    tier: "secondary",
    group: "nedeljni",
    raiffeisenPlan: "7_day",
    raiffeisenPlanMax: "7_day_max",
  },
  {
    id: "20-dnevni",
    name: "20-dnevni plan",
    subtitle: "Radni dani - bez vikenda",
    tier: "muted",
    group: "mesecni",
    raiffeisenPlan: "20_day",
    raiffeisenPlanMax: "20_day_max",
  },
  {
    id: "5-dnevni",
    name: "5-dnevni plan",
    subtitle: "Radna nedelja - bez vikenda",
    tier: "muted",
    group: "nedeljni",
    raiffeisenPlan: "5_day",
    raiffeisenPlanMax: "5_day_max",
  },
  {
    id: "probni",
    name: "1-dnevni plan",
    subtitle: "1 dan - probaj pre nego što se odlučiš",
    tier: "trial",
    group: "probni",
    raiffeisenPlan: "probni",
    raiffeisenPlanMax: "probni_max",
  },
];

export function getPackage(id: PackageId): PackageDef | undefined {
  return PACKAGES.find((p) => p.id === id);
}
