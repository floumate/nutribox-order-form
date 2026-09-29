// =====================================================================
// Naselja (zone dostave) - isto kao live forma. Klijent dopunjava po potrebi.
// Grupisana po gradu; u listi se grad prikazuje kao naslov grupe, a u
// payload ide samo naselje.
// =====================================================================

export const NASELJA_PO_GRADU: { grad: string; naselja: string[] }[] = [
  {
    grad: "Beograd",
    naselja: [
      "Stari grad",
      "Savski venac",
      "Vračar",
      "Palilula",
      "Zvezdara",
      "Voždovac",
      "Čukarica",
      "Rakovica",
      "Novi Beograd",
      "Zemun",
    ],
  },
  {
    // Isti uslovi dostave kao Beograd (klijent, 29.09.2026).
    grad: "Novi Sad",
    naselja: ["Novi Sad"],
  },
];

export const NASELJA: string[] = NASELJA_PO_GRADU.flatMap((g) => g.naselja);
