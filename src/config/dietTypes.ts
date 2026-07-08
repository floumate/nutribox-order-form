import type { DietId } from "../types";
import iconBalanced from "../assets/icons/balanced.svg";
import iconVeggie from "../assets/icons/veggie.svg";
import iconFish from "../assets/icons/pescatarian.svg";
import iconVegan from "../assets/icons/vegan.svg";

// =====================================================================
// TIPOVI ISHRANE. Tekst ispod = šta tip uključuje/isključuje (samo opis).
// Redosled/nazivi po klijentovoj šemi: Balance, Fish, Vegan, Vegeterian.
// =====================================================================

export interface DietType {
  id: DietId;
  name: string;
  description: string;
  icon: string;
}

export const DIET_TYPES: DietType[] = [
  {
    id: "balance",
    name: "Balance",
    description: "Uključuje meso, ribu, jaja, povrće, voće i mlečne proizvode",
    icon: iconBalanced,
  },
  {
    id: "fish",
    name: "Fish",
    description:
      "Uključuje ribu, morske plodove, jaja, mlečne proizvode, povrće i voće – bez mesa",
    icon: iconFish,
  },
  {
    id: "vegan",
    name: "Vegan",
    description:
      "Uključuje biljne namirnice – povrće, voće, žitarice, mahunarke, bez ikakvih proizvoda životinjskog porekla",
    icon: iconVegan,
  },
  {
    id: "vegetarian",
    name: "Vegeterian",
    description:
      "Uključuje povrće, voće, žitarice, mahunarke, jaja i mlečne proizvode – bez mesa i ribe",
    icon: iconVeggie,
  },
];

export function getDiet(id: DietId): DietType | undefined {
  return DIET_TYPES.find((d) => d.id === id);
}
