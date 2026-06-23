// Deljeni runtime flagovi između koraka, submita i abandoned logike.
export const runtime = {
  /** true kad korisnik stvarno posalje formu (spreci abandoned slanje). */
  submitted: false,
  /** id trenutno vidljivog koraka (za abandoned: last_completed_step). */
  currentStepId: "",
};
