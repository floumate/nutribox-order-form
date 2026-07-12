import { state } from "./state";
import { urlContext } from "./urlParams";
import { buildPayload } from "./payload";
import { bulletproofSubmit } from "./bulletproof";
import { cancelAbandoned } from "./abandoned";
import { getPackage } from "../config/packages";
import { computePrice, formatPrice } from "../config/pricing";
import { isMaxPlan } from "../config/plans";
import { ENDPOINTS } from "../config/endpoints";
import { getPhoneNumber } from "./phone";
import { EMAIL_REGEX, showError, hideError } from "./validation";
import { runtime } from "./runtime";
import { NUTRICHEF_URL } from "./nutrichef";

// =====================================================================
// Glavni submit handler.
//   Kartica → Raiffeisen checkout (redirect na redirectUrl)
//   Pouzeće / Firma → Make webhook + redirect na thank-you stranicu
// Sve uz bulletproof slanje na Make.
// =====================================================================

/** Navigacija na TOP prozor (da Raiffeisen/thank-you izađu iz iframe-a na Webflow-u). */
function navigateTop(url: string): void {
  try {
    (window.top ?? window).location.href = url;
  } catch {
    window.location.href = url;
  }
}

function setButtonLoading(btn: HTMLButtonElement, loading: boolean, original: string) {
  btn.disabled = loading;
  btn.textContent = loading ? "Učitavanje..." : original;
}

/**
 * NutriChef grana: nema plaćanja. Šalje payload (sa nutriChef flagom) na Make
 * i vodi korisnika na personal-chef stranicu (zakazivanje poziva).
 */
function submitNutriChef(step: HTMLElement): void {
  const checkboxes = step.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"].consent',
  );
  const allChecked = Array.from(checkboxes).every((c) => c.checked);
  if (!allChecked) {
    showError(step, "Morate prihvatiti uslove da biste nastavili.");
    return;
  }
  if (!state.email) {
    showError(step, "Email je obavezan.");
    return;
  }
  hideError(step);
  cancelAbandoned();

  const orderId = bulletproofSubmit(buildPayload());

  const params = new URLSearchParams();
  params.set("order_id", orderId);
  if (state.email) params.set("email", state.email);
  navigateTop(NUTRICHEF_URL + "?" + params.toString());
}

export function attachSubmit(form: HTMLFormElement): void {
  const paymentStep = form.querySelector<HTMLElement>('[data-step="placanje"]');
  const nutriChefStep = form.querySelector<HTMLElement>('[data-step="nutrichef"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // NutriChef grana ima svoj submit (webhook + redirect na personal-chef).
    if (runtime.currentStepId === "nutrichef") {
      if (nutriChefStep) submitNutriChef(nutriChefStep);
      return;
    }

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

      // Relativni slug → ostaje na trenutnom domenu (staging ili prod).
      // Pouzeće → jedinstvena /hvala-order (cena stiže kao ?cena=). Firma → po paketu.
      const tyPath =
        nacin === "Pouzeće" ? "/hvala-order" : (pkg?.tyFirma ?? "/hvala-order");

      const tyParams = new URLSearchParams();
      if (urlContext.affiliate) tyParams.set("affiliate", urlContext.affiliate);
      if (urlContext.discountCode)
        tyParams.set("discountCode", urlContext.discountCode);
      if (state.paket) tyParams.set("paket", state.paket);
      if (urlContext.isCustomPlan) {
        tyParams.set("plan", "custom");
        tyParams.set("customPlanName", urlContext.customPlanName);
      }
      // Konačna cena (uključuje NutriMax + paket + popust) → TY samo prikaže.
      const tyCena = state.paket
        ? computePrice(state.paket, urlContext, isMaxPlan(state.plan))
        : null;
      if (tyCena != null) tyParams.set("cena", formatPrice(tyCena));
      tyParams.set("order_id", orderId);

      navigateTop(ENDPOINTS.thankYouBase + tyPath + "?" + tyParams.toString());
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

    let finalPlan: string;
    if (urlContext.isCustomPlan) finalPlan = "custom";
    else if (urlContext.isTest) finalPlan = "probni";
    else finalPlan = pkg?.raiffeisenPlan ?? "";

    const phoneNumber = getPhoneNumber() || state.telefon;

    try {
      const checkoutPayload: Record<string, unknown> = {
        plan: finalPlan,
        email: state.email,
        name: state.ime,
        lastname: state.prezime,
        phoneNumber,
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
      if (!response.ok) {
        const t = await response.text().catch(() => "");
        throw new Error("HTTP " + response.status + " - " + t);
      }
      const data = (await response.json()) as { redirectUrl?: string };
      if (data.redirectUrl) {
        navigateTop(data.redirectUrl);
      } else {
        throw new Error("Nema redirectUrl u odgovoru");
      }
    } catch (err) {
      if (btn) setButtonLoading(btn, false, originalText);
      const msg = err instanceof Error ? err.message : String(err);
      // DEBUG (privremeno) — pokaži tačan uzrok + koji endpoint/origin.
      showError(
        paymentStep,
        "DEBUG: " + msg + " | endpoint:" + ENDPOINTS.raiffeisenCheckout +
          " | origin:" + location.origin + " | plan:" + finalPlan,
      );
      console.error("[nutribox] checkout error:", err);
    }
  });
}
