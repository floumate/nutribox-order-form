import { urlContext } from "./urlParams";
import { VISIT_WEBHOOK, TRACKED_SETTER } from "../config/tracking";

// =====================================================================
// Događaj "visit" - forma otvorena sa ?setter=asistent.
//
// visit_id se pravi jednom po poseti i čuva u sessionStorage, pa
// osvežavanje strane ne broji novi dolazak. Isti id kasnije koristi Make
// kad šalje "order", da se zna koja porudžbina pripada kom dolasku.
//
// Slanje NIKAD ne sme da obori formu ni da uspori učitavanje: sve je u
// try/catch, ništa se ne čeka, greške i odgovor se ignorišu.
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
 * Parametar iz URL-a ima prednost. Kad ga nema (korisnik osvežio stranu),
 * uzima se zapamćeni iz sessionStorage da se pripis ne izgubi. Drugi setter
 * u URL-u briše zapamćenog - inače bi kasnija poseta i dalje išla na račun
 * prethodnog.
 */
function activeSetter(): string {
  const s = store();
  const fromUrl = urlContext.setter;

  if (fromUrl) {
    if (fromUrl === TRACKED_SETTER) {
      memorySetter = fromUrl;
      try {
        s?.setItem(SETTER_KEY, fromUrl);
      } catch {
        /* ignoriši */
      }
      return fromUrl;
    }
    // Neki drugi setter → ovo merenje ga se ne tiče.
    memorySetter = "";
    memoryVisitId = "";
    try {
      s?.removeItem(SETTER_KEY);
      s?.removeItem(VISIT_KEY);
    } catch {
      /* ignoriši */
    }
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

/** Jedan id po poseti. Preživljava osvežavanje strane. */
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
 * visit_id za Make payload - da Make može da spoji "order" sa "visit".
 *
 * Za razliku od visitId(), ovo NIŠTA ne pravi: vraća "" kad poseta nije
 * vezana za praćenog settera. Radi i kad je VISIT_WEBHOOK prazan, jer id
 * postoji čim je ?setter=asistent, nezavisno od toga da li se šalje.
 */
export function peekVisitId(): string {
  try {
    if (!activeSetter()) return "";
    return visitId();
  } catch {
    return "";
  }
}

/** Dolazak na formu. Zove se jednom, pri učitavanju. */
export function trackVisit(): void {
  if (!VISIT_WEBHOOK) return; // merenje ugašeno

  try {
    const setter = activeSetter();
    if (!setter) return;

    const json = JSON.stringify({ visit_id: visitId(), setter });

    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" });
      if (navigator.sendBeacon(VISIT_WEBHOOK, blob)) return;
    }

    void fetch(VISIT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* merenje nikad ne sme da obori formu */
  }
}
