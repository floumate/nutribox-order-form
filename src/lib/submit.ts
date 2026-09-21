import { state } from "./state";
import { urlContext } from "./urlParams";
import { buildPayload } from "./payload";
import { bulletproofSubmit } from "./bulletproof";
import { cancelAbandoned } from "./abandoned";
import { getPackage } from "../config/packages";
import { computePrice, formatPrice } from "../config/pricing";
import { isMaxPlan } from "../config/plans";
import { ENDPOINTS } from "../config/endpoints";
import { CARD_PAYMENT_ENABLED, UPLATNICA_PATH } from "../config/flags";
import { getPhoneNumber } from "./phone";
import { EMAIL_REGEX, showError, hideError } from "./validation";

// =====================================================================
// Glavni submit handler.
//   Kartica → Raiffeisen checkout (redirect na redirectUrl)
//   Pouzeće / Firma → Make webhook + redirect na thank-you stranicu
// Sve uz bulletproof slanje na Make.
// =====================================================================

/**
 * Navigacija na TOP prozor (Raiffeisen/thank-you izlaze iz iframe-a).
 * U iframe-u: parent navigira (preko postMessage) da se sačuvaju query
 * parametri — cross-origin `window.top.location` iz iframe-a ih gubi.
 * Fallback (direktno) ako parent ne sluša.
 */
function navigateTop(url: string): void {
  const inIframe = window.parent && window.parent !== window;
  if (inIframe) {
    window.parent.postMessage({ type: "nutribox-redirect", url }, "*");
    window.setTimeout(() => {
      try {
        (window.top ?? window).location.href = url;
      } catch {
        window.location.href = url;
      }
    }, 500);
    return;
  }
  window.location.href = url;
}

function setButtonLoading(btn: HTMLButtonElement, loading: boolean, original: string) {
  btn.disabled = loading;
  btn.textContent = loading ? "Učitavanje..." : original;
}

/**
 * Koliko najduže čekamo potvrdu od Make-a pre nego što javimo grešku.
 *
 * 6s namerno: slanje pokušava tri puta (odmah, pa posle 1s, pa posle 3s),
 * i sva tri staju u ovaj prozor. Bolje da kupac sačeka nekoliko sekundi
 * nego da mu izađe greška zbog jednog lošeg trenutka na mreži.
 */
const DELIVERY_WAIT_MS = 6000;

/**
 * Isti order_id kroz sve pokušaje iste porudžbine.
 *
 * Bez ovoga bi svaki ponovni klik napravio novu porudžbinu, pa bi dedup u
 * Make-u (po order_id) prestao da radi i kupac bi ušao dvaput.
 */
let pendingOrderId = "";

/**
 * Bez broja porudžbine: kad slanje ne prođe, ona nigde nije ni upisana, pa
 * taj broj nema gde da se pronađe - kupcu bi bio samo zbunjujuć.
 */
const DELIVERY_FAILED_MESSAGE =
  "Porudžbina nije potvrđena. Proverite internet i kliknite Poruči ponovo. " +
  "Ako ni tada ne prođe, pozovite nas na 0800 001 007 i unećemo je ručno.";

/**
 * Sačekaj potvrdu prijema, ali kupca ne drži duže od DELIVERY_WAIT_MS.
 *
 * Vraća false kad potvrda ne stigne na vreme - tada pozivalac prikazuje
 * grešku i NE vodi kupca dalje. Porudžbina ostaje u localStorage redu i
 * slanje se nastavlja u pozadini, ali na to se više ne oslanjamo.
 */
function waitForDelivery(delivered: Promise<boolean>): Promise<boolean> {
  return Promise.race([
    delivered,
    new Promise<boolean>((resolve) =>
      window.setTimeout(() => resolve(false), DELIVERY_WAIT_MS),
    ),
  ]);
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
    if (pendingOrderId) payload.order_id = pendingOrderId; // ponovni pokušaj
    const pkg = state.paket ? getPackage(state.paket) : undefined;

    const btn =
      form.querySelector<HTMLButtonElement>('[data-nav="submit"]') ??
      form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const originalText = btn?.textContent ?? "Plati";

    // ---------------- POUZEĆE / FIRMA ----------------
    if (nacin !== "Kartica") {
      const { orderId, delivered } = bulletproofSubmit(payload);

      // Pouzeće → jedinstvena /hvala-pouzece (cena stiže kao ?cena=). Firma → po paketu.
      const tyPath =
        nacin === "Pouzeće" ? "/hvala-pouzece" : (pkg?.tyFirma ?? "/hvala-pouzece");

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

      // Sačekaj da Make potvrdi prijem PRE odlaska na "hvala" stranicu.
      // Bez ovoga browser ume da prekine zahtev u letu, a beacon ne uskače
      // jer ga Make-ov CORS odbija (vidi bulletproof.ts). Dugme je u
      // međuvremenu na "Učitavanje...", da niko ne klikne dvaput.
      pendingOrderId = orderId;
      if (btn) setButtonLoading(btn, true, originalText);
      if (!(await waitForDelivery(delivered))) {
        // Bez potvrde NE vodimo kupca na "hvala" - to je bio tihi gubitak
        // porudžbine. Ponovni klik šalje isti order_id, pa dedup radi.
        if (btn) setButtonLoading(btn, false, originalText);
        showError(paymentStep, DELIVERY_FAILED_MESSAGE);
        return;
      }

      navigateTop(ENDPOINTS.thankYouBase + tyPath + "?" + tyParams.toString());
      return;
    }

    // ---------------- KARTICA ----------------
    if (btn) setButtonLoading(btn, true, originalText);

    // Bulletproof na Make ODMAH (ne čeka Raiffeisen).
    const { orderId: cardOrderId, delivered } = bulletproofSubmit(payload);
    pendingOrderId = cardOrderId;

    // PRIVREMENO (firma zatvorena): bez raifpay-a → uputstva za uplatu.
    // Sve ispod ovog bloka je raifpay kod - netaknut, samo nedostižan.
    if (!CARD_PAYMENT_ENABLED) {
      const kod = isMaxPlan(state.plan)
        ? (pkg?.raiffeisenPlanMax ?? "")
        : (pkg?.raiffeisenPlan ?? "");
      const cena = state.paket
        ? computePrice(state.paket, urlContext, isMaxPlan(state.plan))
        : null;
      const puna = state.paket
        ? computePrice(
            state.paket,
            { affiliate: "", discountCode: "", isCustomPlan: false, customPlanName: "" },
            isMaxPlan(state.plan),
          )
        : null;

      const up = new URLSearchParams();
      if (state.paket) up.set("paket", state.paket);
      if (kod) up.set("kod", kod);
      if (cena != null) up.set("cena", formatPrice(cena));
      // TY stranica po ovome bira koji QR/uplatnicu da prikaže.
      if (cena != null && puna != null && cena !== puna) up.set("popust", "1");
      up.set("order_id", payload.order_id as string);

      if (!(await waitForDelivery(delivered))) {
        if (btn) setButtonLoading(btn, false, originalText);
        showError(paymentStep, DELIVERY_FAILED_MESSAGE);
        return;
      }
      navigateTop(
        ENDPOINTS.thankYouBase + UPLATNICA_PATH + "?" + up.toString(),
      );
      return;
    }

    let finalPlan: string;
    if (urlContext.isCustomPlan) finalPlan = "custom";
    // ?testiranje-placanja=true → poseban raifpay kod "test" (100 RSD).
    // NE "probni" - to je pravi probni paket (3.500).
    else if (urlContext.isTest) finalPlan = "test";
    else if (isMaxPlan(state.plan)) finalPlan = pkg?.raiffeisenPlanMax ?? "";
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
        // Raiffeisen odvodi kupca sa stranice - i ovde prvo potvrda od Make-a.
        // Obično je već stigla dok je trajao checkout, pa se ne čeka ništa.
        //
        // Ako potvrde nema, NE puštamo kupca na plaćanje: gore je naplatiti
        // porudžbinu koju nemamo nego tražiti da klikne ponovo.
        if (!(await waitForDelivery(delivered))) {
          if (btn) setButtonLoading(btn, false, originalText);
          showError(paymentStep, DELIVERY_FAILED_MESSAGE);
          return;
        }
        navigateTop(data.redirectUrl);
      } else {
        throw new Error("Nema redirectUrl u odgovoru");
      }
    } catch (err) {
      if (btn) setButtonLoading(btn, false, originalText);
      showError(
        paymentStep,
        "Trenutno ne možemo da pokrenemo plaćanje karticom. Pokušajte ponovo " +
          "ili izaberite plaćanje pouzećem.",
      );
      // Detalji (endpoint/origin/plan) ostaju u konzoli za dijagnostiku.
      console.error("[nutribox] checkout error:", err, {
        endpoint: ENDPOINTS.raiffeisenCheckout,
        origin: location.origin,
        plan: finalPlan,
      });
    }
  });
}
