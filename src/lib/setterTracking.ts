import { state } from "./state";
import { urlContext } from "./urlParams";
import { getPackage } from "../config/packages";
import { computePrice } from "../config/pricing";
import { isMaxPlan } from "../config/plans";
import { SETTER_TRACKING_PROXY, TRACKED_SETTER } from "../config/tracking";

// =====================================================================
// Dva događaja za merenje AI settera:
//   visit → forma otvorena sa ?setter=asistent
//   order → porudžbina uspešno poslata
//
// Oba nose isti visit_id, pa se zna koja porudžbina pripada kom dolasku.
// Osvežavanje strane ne broji novu posetu (sessionStorage).
//
// Slanje NIKAD ne sme da obori formu ni da uspori korisnika:
// sve je u try/catch, greške se ignorišu, ništa se ne čeka.
// =====================================================================

const VISIT_KEY = "nutribox_setter_visit";
const SETTER_KEY = "nutribox_setter_name";

/** Rezerva kad je sessionStorage nedostupan (privatni prozor, blokiran). */
let memoryVisitId = "";
let memorySetter = "";

function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomId(): string {
  const c = window.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return (
    "v_" + Date.now().toString(16) + "_" + Math.random().toString(16).slice(2)
  );
}

/**
 * Vraća settera za koga se meri, ili "" kad se ne meri.
 *
 * Parametar iz URL-a ima prednost. Kad ga nema (npr. korisnik osvežio
 * stranu), pamti se iz sessionStorage da se pripis ne izgubi usred forme.
 * Drugi setter u URL-u briše zapamćenog - inače bi kasnija poseta i dalje
 * išla na račun prethodnog.
 */
function activeSetter(): string {
  const s = store();
  const fromUrl = urlContext.setter;

  if (fromUrl) {
    if (fromUrl === TRACKED_SETTER) {
      try {
        s?.setItem(SETTER_KEY, fromUrl);
      } catch {
        /* ignoriši */
      }
      memorySetter = fromUrl;
      return fromUrl;
    }
    // Neki drugi setter → ovo praćenje ga se ne tiče.
    try {
      s?.removeItem(SETTER_KEY);
      s?.removeItem(VISIT_KEY);
    } catch {
      /* ignoriši */
    }
    memorySetter = "";
    memoryVisitId = "";
    return "";
  }

  let saved = "";
  try {
    saved = s?.getItem(SETTER_KEY) ?? "";
  } catch {
    /* ignoriši */
  }
  if (!saved) saved = memorySetter;
  return saved === TRACKED_SETTER ? saved : "";
}

/** Jedan id po poseti - isti u oba događaja. */
function visitId(): string {
  const s = store();
  let id = "";
  try {
    id = s?.getItem(VISIT_KEY) ?? "";
  } catch {
    /* ignoriši */
  }
  if (!id) id = memoryVisitId;
  if (!id) {
    id = randomId();
    memoryVisitId = id;
    try {
      s?.setItem(VISIT_KEY, id);
    } catch {
      /* ignoriši */
    }
  }
  return id;
}

/**
 * Pošalji u pozadini. sendBeacon jer se `order` šalje neposredno pre
 * napuštanja strane (redirect na banku / thank-you) - običan fetch bi tada
 * bio prekinut.
 */
function send(body: Record<string, unknown>): void {
  if (!SETTER_TRACKING_PROXY) return; // praćenje ugašeno
  try {
    const json = JSON.stringify(body);
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" });
      if (navigator.sendBeacon(SETTER_TRACKING_PROXY, blob)) return;
    }
    void fetch(SETTER_TRACKING_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* praćenje nikad ne sme da obori formu */
  }
}

/** Dolazak na formu. Zove se jednom, pri učitavanju. */
export function trackVisit(): void {
  try {
    const setter = activeSetter();
    if (!setter) return;
    send({
      event: "visit",
      visit_id: visitId(),
      setter,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    /* ignoriši */
  }
}

const PAYMENT_LABEL: Record<string, string> = {
  Kartica: "kartica",
  Pouzeće: "pouzeće",
  Firma: "faktura",
};

/**
 * Porudžbina poslata.
 *
 * ⚠️ Za karticu se šalje u trenutku odlaska na Raiffeisen stranicu, jer
 * forma ne saznaje ishod plaćanja. Znači `order` = poslata porudžbina, ne
 * naplaćena. Za pouzeće i firmu je to ionako isto.
 */
export function trackOrder(orderId: string): void {
  try {
    const setter = activeSetter();
    if (!setter) return;

    const paketId = state.paket;
    if (!paketId) return;

    const max = isMaxPlan(state.plan);
    const iznos = computePrice(paketId, urlContext, max);
    if (iznos == null) return;

    const pkg = getPackage(paketId);
    const naziv = pkg ? (max ? pkg.name + " NutriMax" : pkg.name) : paketId;

    send({
      event: "order",
      order_id: orderId,
      visit_id: visitId(),
      setter,
      amount: iznos,
      currency: "RSD",
      package: naziv,
      payment_method: PAYMENT_LABEL[state.nacinPlacanja ?? ""] ?? "",
      occurred_at: new Date().toISOString(),
    });
  } catch {
    /* ignoriši */
  }
}
