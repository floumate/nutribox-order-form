import type { PaymentMethod } from "../types";
import iconKartica from "../assets/icons/pay-kartica.svg";
import iconPouzece from "../assets/icons/pay-pouzece.svg";
import iconFirma from "../assets/icons/pay-firma.svg";

// =====================================================================
// Načini plaćanja — tekstovi i ikonice kao live forma.
// (value ostaje Kartica/Pouzeće/Firma — submit logika zavisi od toga.)
// =====================================================================

export interface PaymentOption {
  value: PaymentMethod;
  title: string;
  desc: string;
  icon: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: "Kartica",
    title: "Plaćanje karticom",
    desc: "Platite odmah pomoću kartice, uputstva Vam šaljemo na email.",
    icon: iconKartica,
  },
  {
    value: "Pouzeće",
    title: "Plaćanje pri pouzeću",
    desc: "Platite dostavljaču pri prvoj dostavi, detaljna uputstva Vam šaljemo na email.",
    icon: iconPouzece,
  },
  {
    value: "Firma",
    title: "Plaćanje preko firme",
    desc: "Na mejl koji ste uneli iznad šaljemo Vam fakturu na osnovu koje možete platiti.",
    icon: iconFirma,
  },
];
