import { FORM_LANGS } from "../config/flags";
import { DATA, UI, type DataLabels, type UiKey } from "../config/translations";
import type { Lang } from "../types";

// =====================================================================
// Jezik forme (sr / en / ru).
//
// Početni jezik stiže iz embed koda kao ?lang= (jezik Webflow stranice
// sa koje je forma otvorena). Bez njega - srpski. Posetilac ga menja
// padajućom listom gore desno; forma se prevodi odmah, bez gubljenja
// unosa.
//
// Menja se samo PRIKAZ. Vrednosti koje idu u Make/Airtable/Nikoli
// (cilj, pol, namirnice, način plaćanja...) ostaju srpske.
// =====================================================================

const LABELS: Record<Lang, string> = { sr: "SRB", en: "EN", ru: "RUS" };

/** "en", "en-US", "RU" → Lang; sve ostalo → null. */
export function parseLang(value: string | null | undefined): Lang | null {
  const code = (value ?? "").trim().slice(0, 2).toLowerCase();
  return code === "sr" || code === "en" || code === "ru" ? code : null;
}

function initialLang(): Lang {
  const fromUrl = parseLang(new URLSearchParams(window.location.search).get("lang"));
  // Jezik koji nije uključen za ovo okruženje (flags.ts) se ignoriše.
  return fromUrl && FORM_LANGS.includes(fromUrl) ? fromUrl : "sr";
}

let current: Lang = initialLang();
const listeners: Array<() => void> = [];

export function getLang(): Lang {
  return current;
}

/** Tekst interfejsa na trenutnom jeziku. */
export function t(key: UiKey): string {
  return UI[current][key];
}

/** Nazivi opcija (paketi, jelovnici, namirnice...) na trenutnom jeziku. */
export function labels(): DataLabels {
  return DATA[current];
}

/** Thank-you stranica na jeziku kupca: /hvala-pouzece → /en/hvala-pouzece. */
export function localizedPath(path: string): string {
  return current === "sr" ? path : `/${current}${path}`;
}

/** Poziva se posle svake promene jezika (ponovno iscrtavanje kartica). */
export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  applyStatic();
  listeners.forEach((fn) => fn());
}

/** Statički tekst iz index.html: data-i18n → tekst, data-i18n-ph → placeholder. */
function applyStatic(): void {
  document.documentElement.lang = current;
  const dict = UI[current] as Record<string, string | undefined>;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const s = dict[el.dataset.i18n ?? ""];
    if (s != null) el.textContent = s;
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((el) => {
    const s = dict[el.dataset.i18nPh ?? ""];
    if (s != null) el.placeholder = s;
  });
}

/** Pozvati jednom, pre iscrtavanja koraka. */
export function initLang(select: HTMLSelectElement | null): void {
  applyStatic();
  if (!select || FORM_LANGS.length < 2) return; // samo srpski - bez izbora
  select.innerHTML = FORM_LANGS.map(
    (l) => `<option value="${l}">${LABELS[l]}</option>`,
  ).join("");
  select.value = current;
  select.hidden = false;
  select.addEventListener("change", () => {
    const lang = parseLang(select.value);
    if (lang) setLang(lang);
  });
}
