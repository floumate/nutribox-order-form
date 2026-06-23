import { state } from "./state";
import { urlContext } from "./urlParams";
import { buildPayload } from "./payload";
import { bulletproofSubmit } from "./bulletproof";
import { cancelAbandoned } from "./abandoned";
import { getPackage } from "../config/packages";
import { ENDPOINTS } from "../config/endpoints";
import { getPhoneNumber } from "./phone";
import { EMAIL_REGEX, showError, hideError } from "./validation";

// =====================================================================
// Glavni submit handler.
//   Kartica → Raiffeisen checkout (redirect na redirectUrl)
//   Pouzeće / Firma → Make webhook + redirect na thank-you stranicu
// Sve uz bulletproof slanje na Make.
// =====================================================================

function setButtonLoading(btn: HTMLButtonElement, loading: boolean, original: string) {
  btn.disabled = loading;
  btn.textContent = loading ? "Učitavanje..." : original;
}

export function attachSubmit(form: HTMLFormElement): void {
  const paymentStep = form.querySelector<HTMLElement>('[data-step="placanje"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!paymentStep) return;

    // --- VALIDACIJA ---
    const nacin = state.nacinPlacanja;
    if (!nacin) {
      showError(paymentStep, "Molimo izaberite način plaćanja.");
      return;
    }

    const checkboxes = paymentStep.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"].consent',
    );
    const allChecked = Array.from(checkboxes).every((c) => c.checked);
    if (!allChecked) {
      showError(paymentStep, "Morate prihvatiti uslove da biste nastavili.");
      return;
    }

    if (nacin === "Firma") {
      const f = state.firma;
      const prazno =
        !f.nazivFirme.trim() ||
        !f.adresaFirme.trim() ||
        !f.emailFirme.trim() ||
        !f.pibFirme.trim() ||
        !f.maticniBrojFirme.trim();
      if (prazno) {
        showError(paymentStep, "Molimo popunite sva polja firme.");
        return;
      }
      if (!EMAIL_REGEX.test(f.emailFirme.trim())) {
        showError(paymentStep, "Email firme nije ispravan.");
        return;
      }
    }

    if (!state.email) {
      showError(paymentStep, "Email je obavezan.");
      return;
    }

    hideError(paymentStep);
    cancelAbandoned(); // validacija prošla → ugasi abandoned

    const payload = buildPayload();
    const pkg = state.paket ? getPackage(state.paket) : undefined;

    // ---------------- POUZEĆE / FIRMA ----------------
    if (nacin !== "Kartica") {
      const orderId = bulletproofSubmit(payload);

      const tyPath = nacin === "Pouzeće" ? pkg?.tyPouzece : pkg?.tyFirma;
      if (!tyPath) {
        // Thank-you stranica nije podešena za ovaj paket (TODO u config-u).
        console.warn(
          `[nutribox] Nedostaje thank-you stranica za paket "${state.paket}" / ${nacin}.`,
        );
      }

      const tyParams = new URLSearchParams();
      if (urlContext.affiliate) tyParams.set("affiliate", urlContext.affiliate);
      if (urlContext.discountCode)
        tyParams.set("discountCode", urlContext.discountCode);
      if (state.paket) tyParams.set("paket", state.paket);
      if (urlContext.isCustomPlan) {
        tyParams.set("plan", "custom");
        tyParams.set("customPlanName", urlContext.customPlanName);
      }
      tyParams.set("order_id", orderId);

      const base = tyPath ? ENDPOINTS.thankYouBase + tyPath : ENDPOINTS.thankYouBase;
      window.location.href = base + "?" + tyParams.toString();
      return;
    }

    // ---------------- KARTICA ----------------
    const btn =
      form.querySelector<HTMLButtonElement>('[data-nav="submit"]') ??
      form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const originalText = btn?.textContent ?? "Plati";
    if (btn) setButtonLoading(btn, true, originalText);

    // Bulletproof na Make ODMAH (ne čeka Raiffeisen).
    bulletproofSubmit(payload);

    try {
      let finalPlan: string;
      if (urlContext.isCustomPlan) finalPlan = "custom";
      else if (urlContext.isTest) finalPlan = "probni";
      else finalPlan = pkg?.raiffeisenPlan ?? "";

      const checkoutPayload: Record<string, unknown> = {
        plan: finalPlan,
        email: state.email,
        name: state.ime,
        lastname: state.prezime,
        phoneNumber: getPhoneNumber() || state.telefon,
        locale: "sr",
        affiliate: urlContext.affiliate,
        discountCode: urlContext.discountCode,
        order_id: payload.order_id,
      };
      if (urlContext.isCustomPlan) {
        checkoutPayload.customPlanName = urlContext.customPlanName;
      }

      const response = await fetch(ENDPOINTS.raiffeisenCheckout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });
      if (!response.ok) throw new Error("Problem sa serverom pri inicijalizaciji");
      const data = (await response.json()) as { redirectUrl?: string };
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("URL za plaćanje nije generisan.");
      }
    } catch (err) {
      if (btn) setButtonLoading(btn, false, originalText);
      showError(
        paymentStep,
        "Došlo je do greške pri plaćanju. Pokušajte ponovo.",
      );
      console.error("[nutribox] checkout error:", err);
    }
  });
}
