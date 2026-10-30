import { state } from "./state";
import { urlContext } from "./urlParams";
import { EXTRAS_ENABLED } from "../config/flags";
import { computePrice, isPartnerOrder } from "../config/pricing";
import { MEAL_SLOTS, addOnPrice } from "../config/extras";
import type { AddOnCode, MealSlot, PackageKind } from "../types";

// =====================================================================
// Šta je kupac stvarno poručio: vrsta paketa, obroci, dodatak i ukupna
// cena. Jedno mesto za pregled, Make, registraciju i karticu, da sva
// četiri uvek kažu isto (Nikola: razlika = ručna provera).
// =====================================================================

/** Bira li kupac vrstu paketa i dodatak. Ne uz ?ns=year, ?paket= i custom. */
export function extrasOffered(): boolean {
  return (
    EXTRAS_ENABLED &&
    !urlContext.agreedPrice &&
    !urlContext.isCustomPlan &&
    urlContext.fixedPackage === null
  );
}

export function orderKind(): PackageKind {
  return extrasOffered() && state.tipPaketa === "partial" ? "partial" : "full";
}

/** Partner popust - za sada samo uz pun paket. */
export function partnerActive(): boolean {
  return isPartnerOrder(urlContext) && orderKind() === "full";
}

/** Izabrani obroci redom doručak → večera (samo uz paket sa 2 obroka). */
export function selectedMeals(): MealSlot[] {
  if (orderKind() !== "partial") return [];
  return MEAL_SLOTS.map((m) => m.id).filter((id) => state.obroci.includes(id));
}

/** Dodatak koji važi za izabrani paket, ili null. */
export function activeAddOn(): AddOnCode | null {
  if (!extrasOffered() || orderKind() !== "full") return null;
  if (!state.paket || !state.dodatak) return null;
  return addOnPrice(state.paket, state.dodatak) != null ? state.dodatak : null;
}

export function addOnAmount(): number {
  const code = activeAddOn();
  return code && state.paket ? (addOnPrice(state.paket, code) ?? 0) : 0;
}

/** Cena paketa bez dodatka. */
export function packagePrice(): number | null {
  if (!state.paket) return null;
  return computePrice(state.paket, urlContext, state.plan, state.pol, orderKind());
}

/** Ukupno za plaćanje: paket + dodatak. */
export function orderTotal(): number | null {
  const price = packagePrice();
  return price == null ? null : price + addOnAmount();
}
