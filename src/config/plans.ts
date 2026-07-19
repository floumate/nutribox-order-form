import type { Macros, PlanId, Sex } from "../types";
import iconFatLoss from "../assets/icons/fat-loss.svg";
import iconLeanGains from "../assets/icons/lean-gains.svg";
import iconMuscleGain from "../assets/icons/muscle-gain.svg";
import iconNutriMax from "../assets/icons/nutri-max.svg";

// =====================================================================
// PLANOVI (ciljevi) + makro tabela.
// Vrednosti su iz klijentove šeme (Zakonitosti za određivanje veličine
// paketa za kuhinju: XS/S/M/L/XL po kcal).
// =====================================================================

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  icon: string;
  /** Fiksni makro ciljevi po polu. */
  macros: Record<Sex, Macros>;
}

export const PLANS: Plan[] = [
  {
    id: "nutrislim",
    name: "NutriSlim",
    tagline: "Paket visoko proteinskih obroka za mršavljenje",
    icon: iconFatLoss,
    macros: {
      Muški: { kcal: 1600, proteini: 140, uh: 140, masti: 53 },
      Ženski: { kcal: 1300, proteini: 114, uh: 114, masti: 43 },
    },
  },
  {
    id: "nutribalance",
    name: "NutriBalance",
    tagline: "Paket pravilno izbalansiranih obroka za tvoj dan",
    icon: iconLeanGains,
    macros: {
      Muški: { kcal: 2000, proteini: 150, uh: 225, masti: 56 },
      Ženski: { kcal: 1600, proteini: 120, uh: 180, masti: 44 },
    },
  },
  {
    id: "nutripump",
    name: "NutriPump",
    tagline: "Paket visoko proteinskih obroka za dobijanje mišićne mase",
    icon: iconMuscleGain,
    macros: {
      Muški: { kcal: 2600, proteini: 163, uh: 325, masti: 72 },
      Ženski: { kcal: 2000, proteini: 125, uh: 250, masti: 56 },
    },
  },
  {
    id: "nutrimax",
    name: "NutriMax",
    tagline: "Paket sa najvišim energetskim unosom",
    icon: iconNutriMax,
    macros: {
      Muški: { kcal: 3000, proteini: 263, uh: 300, masti: 83 },
      Ženski: { kcal: 2600, proteini: 228, uh: 260, masti: 72 },
    },
  },
];

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getMacros(id: PlanId, sex: Sex): Macros {
  const fallback: Macros = { kcal: null, proteini: null, uh: null, masti: null };
  return getPlan(id)?.macros[sex] ?? fallback;
}

/** NutriMax ima poseban (viši) cenovni nivo - koristi se u pricing.ts. */
export function isMaxPlan(id: PlanId | null): boolean {
  return id === "nutrimax";
}
