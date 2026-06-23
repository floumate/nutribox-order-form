import "./styles/main.css";
import { StepEngine } from "./steps/stepEngine";
import { buildSteps } from "./steps";
import { initPhone } from "./lib/phone";
import { attachSubmit } from "./lib/submit";
import { initAbandoned } from "./lib/abandoned";
import { startRecovery } from "./lib/bulletproof";

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

  // Enter ne submituje formu (sprečava slučajno slanje iz input polja)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT") e.preventDefault();
  });

  // Auto-visina kad je forma u iframe-u (Webflow embed) — javlja parent-u visinu.
  setupHeightReporter();
}

function setupHeightReporter(): void {
  if (window.parent === window) return; // nismo u iframe-u
  const report = () => {
    const h = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: "nutribox-height", height: h }, "*");
  };
  report();
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
