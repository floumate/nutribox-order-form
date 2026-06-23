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
}

export class StepEngine {
  private steps: StepConfig[];
  private progressEl: HTMLElement | null;
  private index = 0;

  constructor(steps: StepConfig[], progressEl: HTMLElement | null) {
    this.steps = steps;
    this.progressEl = progressEl;
  }

  init(): void {
    this.buildSegments();

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

  private show(i: number): void {
    this.index = i;
    this.steps.forEach((s, idx) => {
      s.el.classList.toggle("step--active", idx === i);
    });
    const step = this.steps[i];
    if (step) {
      runtime.currentStepId = step.id;
      step.onEnter?.();
    }
    this.updateProgress();
    document
      .querySelector(".form-shell")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  next(): void {
    const step = this.steps[this.index];
    if (step?.validate && !step.validate()) return;
    if (this.index < this.steps.length - 1) this.show(this.index + 1);
  }

  prev(): void {
    if (this.index > 0) this.show(this.index - 1);
  }

  private buildSegments(): void {
    if (!this.progressEl) return;
    this.progressEl.innerHTML = "";
    this.steps.forEach(() => {
      const seg = document.createElement("span");
      seg.className = "progress__seg";
      this.progressEl!.appendChild(seg);
    });
  }

  private updateProgress(): void {
    const segs = this.progressEl?.querySelectorAll(".progress__seg");
    segs?.forEach((s, i) => s.classList.toggle("filled", i <= this.index));
  }
}
