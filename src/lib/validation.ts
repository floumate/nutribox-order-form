// =====================================================================
// Error prikaz/skrivanje po koraku. Svaki korak ima ".error-message".
// =====================================================================

export function showError(stepEl: HTMLElement, message: string): void {
  const error = stepEl.querySelector<HTMLElement>(".error-message");
  if (!error) return;
  error.classList.add("visible");
  const text = error.querySelector<HTMLElement>(".error-message__text");
  if (text) text.textContent = message;
  else error.textContent = message;
}

export function hideError(stepEl: HTMLElement): void {
  const error = stepEl.querySelector<HTMLElement>(".error-message");
  if (error) error.classList.remove("visible");
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
