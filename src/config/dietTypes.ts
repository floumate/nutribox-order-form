import type { DietId } from "../types";
import iconBalanced from "../assets/icons/balanced.svg";
import iconVeggie from "../assets/icons/veggie.svg";
import iconFish from "../assets/icons/pescatarian.svg";
import iconVegan from "../assets/icons/vegan.svg";

// =====================================================================
// TIPOVI ISHRANE (jelovnici).
//   name  = VREDNOST koja se šalje (Airtable opcija / payload Tip-ishrane).
//           NE menjati bez usklađivanja Airtable select opcija.
//   label = DISPLAY naziv koji korisnik vidi ("... jelovnik").
//   id    = interni ključ → Nikola dobija ovo kao tipIshrane
//           (balance/fish/vegan/vegetarian).
// =====================================================================

export interface DietType {
  id: DietId;
  /** Vrednost koja se šalje (Airtable/payload). */
  name: string;
  /** Display naziv (prikaz korisniku). */
  label: string;
  description: string;
  icon: string;
}

export const DIET_TYPES: DietType[] = [
  {
    id: "balance",
    name: "Balance",
    label: "Izbalansirani jelovnik",
    description: "Uključuje meso, ribu, jaja, povrće, voće i mlečne proizvode",
    icon: iconBalanced,
  },
  {
    id: "fish",
    name: "Pescaterian",
    label: "Riblji jelovnik",
    description:
      "Uključuje ribu, morske plodove, jaja, mlečne proizvode, povrće i voće",
    icon: iconFish,
  },
  {
    id: "vegan",
    name: "Vegan",
    label: "Veganski jelovnik",
    description:
      "Uključuje biljne namirnice, žitarice, mahunarke, bez ikakvih namirnica životinjskog porekla",
    icon: iconVegan,
  },
  {
    id: "vegetarian",
    name: "Vegeterian",
    label: "Vegeterijanski jelovnik",
    description:
      "Uključuje povrće, voće, žitarice, mahunarke, jaja i mlečne proizvode",
    icon: iconVeggie,
  },
];

export function getDiet(id: DietId): DietType | undefined {
  return DIET_TYPES.find((d) => d.id === id);
}
