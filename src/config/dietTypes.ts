import type { DietId } from "../types";
import iconBalanced from "../assets/icons/balanced.svg";
import iconVeggie from "../assets/icons/veggie.svg";
import iconPescatarian from "../assets/icons/pescatarian.svg";
import iconVegan from "../assets/icons/vegan.svg";

// =====================================================================
// TIPOVI ISHRANE. Tekst ispod = šta tip uključuje/isključuje (samo opis,
// nema pod-opcija). Nazivi/redosled identični live formi.
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
    id: "vegetarian",
    name: "Vegeterian",
    description:
      "Uključuje povrće, voće, žitarice, mahunarke, jaja i mlečne proizvode – bez mesa i ribe",
    icon: iconVeggie,
  },
  {
    id: "pescaterian",
    name: "Pescaterian",
    description:
      "Uključuje ribu, morske plodove, jaja, mlečne proizvode, povrće i voće – bez mesa",
    icon: iconPescatarian,
  },
  {
    id: "vegan",
    name: "Vegan",
    description:
      "Uključuje biljne namirnice – povrće, voće, žitarice, mahunarke, bez ikakvih proizvoda životinjskog porekla",
    icon: iconVegan,
  },
];

export function getDiet(id: DietId): DietType | undefined {
  return DIET_TYPES.find((d) => d.id === id);
}
