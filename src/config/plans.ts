import type { Macros, PlanId, Sex } from "../types";
import iconFatLoss from "../assets/icons/fat-loss.svg";
import iconLeanGains from "../assets/icons/lean-gains.svg";
import iconMuscleGain from "../assets/icons/muscle-gain.svg";
// High Protein nema svoju ikonicu na CDN-u (nije na live formi) — placeholder.
// TODO: zameni pravom HP ikonicom kad stigne.
const iconHighProtein = iconMuscleGain;

// =====================================================================
// PLANOVI (ciljevi) + makro tabela.
//
// ⚠️ MAKRO VREDNOSTI SU PLACEHOLDER (null = "—" u UI-ju).
//    Popuni kcal/proteini/uh/masti za svaku kombinaciju Plan × Pol
//    kad klijent pošalje brojke. Ništa drugo ne treba da se menja.
// =====================================================================

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  icon: string;
  /** Fiksni makro ciljevi po polu. */
  macros: Record<Sex, Macros>;
}

const PRAZNO: Macros = { kcal: null, proteini: null, uh: null, masti: null };

export const PLANS: Plan[] = [
  {
    id: "nutrislim",
    name: "NutriSlim",
    tagline: "Paket visoko proteinskih obroka za mršavljenje",
    icon: iconFatLoss,
    macros: {
      Muški: { ...PRAZNO },
      Ženski: { ...PRAZNO },
    },
  },
  {
    id: "nutribalance",
    name: "NutriBalance",
    tagline: "Paket pravilno izbalansiranih obroka za tvoj dan",
    icon: iconLeanGains,
    macros: {
      Muški: { ...PRAZNO },
      Ženski: { ...PRAZNO },
    },
  },
  {
    id: "nutripump",
    name: "NutriPump",
    tagline: "Paket visoko proteinskih obroka za dobijanje mišićne mase",
    icon: iconMuscleGain,
    macros: {
      Muški: { ...PRAZNO },
      Ženski: { ...PRAZNO },
    },
  },
  {
    id: "highprotein",
    name: "High Protein",
    tagline: "Paket sa najvišim udelom proteina",
    icon: iconHighProtein,
    macros: {
      Muški: { ...PRAZNO },
      Ženski: { ...PRAZNO },
    },
  },
];

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getMacros(id: PlanId, sex: Sex): Macros {
  return getPlan(id)?.macros[sex] ?? { ...PRAZNO };
}
