import "./styles/main.css";
import { StepEngine } from "./steps/stepEngine";
import { buildSteps } from "./steps";
import { initPhone } from "./lib/phone";
import { attachSubmit } from "./lib/submit";
import { initAbandoned } from "./lib/abandoned";
import { startRecovery } from "./lib/bulletproof";
import { trackVisit } from "./lib/setterTracking";

function boot(): void {
  const form = document.querySelector<HTMLFormElement>("#nutribox-form");
  if (!form) return;

  // Telefon (intl-tel-input)
  const phone = document.querySelector<HTMLInputElement>("#telefon");
  if (phone) initPhone(phone);

  // Koraci + engine
  const steps = buildSteps(form);
  const progress = document.querySelector<HTMLElement>("[data-progress]");
  new StepEngine(steps, progress).init();

  // Submit + abandoned + recovery queue
  attachSubmit(form);
  initAbandoned();
  startRecovery();

  // Merenje AI settera - šalje samo kad je ?setter=asistent i kad je
  // proxy podešen; inače ne radi ništa.
  trackVisit();

  // Enter ne submituje formu (sprečava slučajno slanje iz input polja)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT") e.preventDefault();
  });

  // Auto-visina kad je forma u iframe-u (Webflow embed) - javlja parent-u visinu.
  setupHeightReporter();
}

function setupHeightReporter(): void {
  if (window.parent === window) return; // nismo u iframe-u

  let last = 0;
  let queued = false;
  const send = () => {
    queued = false;
    const h = document.documentElement.scrollHeight;
    if (h === last) return; // ne spamuj parent istom vrednošću
    last = h;
    window.parent.postMessage({ type: "nutribox-height", height: h }, "*");
  };
  // Skupi rafal promena (fontovi/ikonice) u jedan poziv.
  // NE requestAnimationFrame - on se ne pokreće dok iframe nije iscrtan
  // (pozadinski tab, iframe van ekrana), pa visina nikad ne bi ni stigla.
  const report = () => {
    if (queued) return;
    queued = true;
    window.setTimeout(send, 50);
  };

  report();
  // Font swap i učitavanje ikonica menjaju visinu - bez ovoga parent nakratko
  // dobije premalu visinu i forma izgleda "presečena".
  document.fonts?.ready.then(report).catch(() => {});
  window.addEventListener("load", report);
  if ("ResizeObserver" in window) {
    new ResizeObserver(report).observe(document.body);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
