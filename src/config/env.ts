// =====================================================================
// OKRUŽENJE (prod / staging).
//
// Forma živi u iframe-u na floumate.github.io, pa `location.hostname` NIKAD
// nije domen roditelja - uvek je github.io. Zato se okruženje ne može
// detektovati po hostname-u; prosleđuje se iz embed koda kao ?env=staging.
//
//   nutribox.rs            → embed BEZ parametra   → prod
//   vuksanvasic.webflow.io → embed sa ?env=staging → staging
//
// Zaštita: ako je roditelj nutribox.rs, forsira se prod čak i kad neko ručno
// doda ?env=staging u URL. Kupac ne sme da završi u testnom okruženju.
// (document.referrer u iframe-u = URL roditeljske stranice.)
// =====================================================================

export type Env = "prod" | "staging";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function detectEnv(): Env {
  const roditelj = hostOf(document.referrer);

  // 1) Live domen je uvek prod - nema nadjačavanja preko URL-a.
  if (/(^|\.)nutribox\.rs$/.test(roditelj)) return "prod";

  // 2) U iframe-u smo, a ne znamo ko nas je embedovao (referrer prazan ili
  //    blokiran politikom) → prod.
  //
  //    Namerno na sigurnu stranu: ako pogrešimo ka prod-u, greška je vidljiva
  //    (kartica ne radi na test sajtu, neko odmah prijavi). Ako pogrešimo ka
  //    staging-u, greška je tiha - pravi kupac završi u testnom okruženju i
  //    porudžbina se izgubi.
  //
  //    Van iframe-a (direktno otvaranje github.io adrese) ovo ne važi, da bi
  //    testiranje sa ?env=staging i dalje radilo.
  if (!roditelj && window.parent !== window) return "prod";

  // 3) Inače odlučuje ?env= iz embed koda.
  const q = new URLSearchParams(window.location.search).get("env");
  return q === "staging" ? "staging" : "prod";
}

export const ENV: Env = detectEnv();

export const IS_STAGING = ENV === "staging";
