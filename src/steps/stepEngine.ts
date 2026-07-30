import { runtime } from "../lib/runtime";

// =====================================================================
// Multi-step kontroler: prikaz jednog koraka, next/prev, progress bar.
// =====================================================================

export interface StepConfig {
  id: string;
  el: HTMLElement;
  /** Vrati true ako je korak validan (prikazuje sopstveni error). */
  validate?: () => boolean;
  /** Poziva se svaki put kad korak postane vidljiv. */
  onEnter?: () => void;
  /** Vrati true da se korak preskoči u navigaciji (npr. NutriChef grana). */
  skip?: () => boolean;
}

export class StepEngine {
  private steps: StepConfig[];
  private progressEl: HTMLElement | null;
  private index = 0;
  /** Prvi prikaz (mount) - bez scroll-a i bez fade animacije, da nema "flash"-a. */
  private booted = false;

  constructor(steps: StepConfig[], progressEl: HTMLElement | null) {
    this.steps = steps;
    this.progressEl = progressEl;
  }

  init(): void {
    // Delegacija next/prev klikova.
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const next = target.closest('[data-nav="next"]');
      const prev = target.closest('[data-nav="prev"]');
      if (next && this.steps[this.index]?.el.contains(next)) {
        e.preventDefault();
        this.next();
      } else if (prev && this.steps[this.index]?.el.contains(prev)) {
        e.preventDefault();
        this.prev();
      }
    });

    this.show(0);
  }

  private isSkipped(i: number): boolean {
    return this.steps[i]?.skip?.() ?? false;
  }

  private show(i: number): void {
    this.index = i;
    const first = !this.booted;
    this.steps.forEach((s, idx) => {
      s.el.classList.toggle("step--active", idx === i);
      // Fade animacija samo pri navigaciji - na prvom renderu bi izgledala
      // kao treperenje dok se forma tek učitava.
      s.el.classList.toggle("step--noanim", first && idx === i);
    });
    const step = this.steps[i];
    if (step) {
      runtime.currentStepId = step.id;
      step.onEnter?.();
    }
    this.updateProgress();
    // Ne skroluj na mount - samo kad korisnik pređe na drugi korak.
    if (!first) {
      document
        .querySelector(".form-shell")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    this.booted = true;
  }

  next(): void {
    const step = this.steps[this.index];
    if (step?.validate && !step.validate()) return;
    let i = this.index + 1;
    while (i < this.steps.length && this.isSkipped(i)) i++;
    if (i < this.steps.length) this.show(i);
  }

  prev(): void {
    let i = this.index - 1;
    while (i >= 0 && this.isSkipped(i)) i--;
    if (i >= 0) this.show(i);
  }

  /** Progress: broji samo NEpreskočene korake i poziciju trenutnog među njima. */
  private updateProgress(): void {
    if (!this.progressEl) return;
    const visible = this.steps
      .map((_, i) => i)
      .filter((i) => !this.isSkipped(i));
    const pos = visible.indexOf(this.index); // 0-based među vidljivima
    this.progressEl.innerHTML = "";
    visible.forEach((_, k) => {
      const seg = document.createElement("span");
      seg.className = "progress__seg" + (k <= pos ? " filled" : "");
      this.progressEl!.appendChild(seg);
    });
  }
}
