import type { DietId } from "../types";

// =====================================================================
// TIPOVI ISHRANE. Tekst ispod = šta tip uključuje/isključuje (samo opis,
// nema pod-opcija).
// =====================================================================

export interface DietType {
  id: DietId;
  name: string;
  description: string;
}

export const DIET_TYPES: DietType[] = [
  {
    id: "balance",
    name: "Balance",
    description: "Uključuje meso, ribu, jaja, povrće, voće i mlečne proizvode",
  },
  {
    id: "pescaterian",
    name: "Pescaterian",
    description:
      "Uključuje ribu, morske plodove, jaja, mlečne proizvode, povrće i voće – bez mesa",
  },
  {
    id: "vegetarian",
    name: "Vegetarian",
    description:
      "Uključuje povrće, voće, žitarice, mahunarke, jaja i mlečne proizvode – bez mesa i ribe",
  },
  {
    id: "vegan",
    name: "Vegan",
    description:
      "Uključuje biljne namirnice – povrće, voće, žitarice, mahunarke, bez ikakvih proizvoda životinjskog porekla",
  },
];

export function getDiet(id: DietId): DietType | undefined {
  return DIET_TYPES.find((d) => d.id === id);
}
