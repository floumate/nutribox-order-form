// =====================================================================
// Merenje porudžbina koje dolaze preko AI settera.
//
// Forma NE zove eksterni webhook direktno - on traži tajni header
// (x-setter-secret), a ovo je statički build na GitHub Pages: sve što uđe
// u kod vidi svako ko otvori bundle. Zato forma šalje na PROXY (Make
// webhook / serverless), a proxy dodaje tajnu i prosleđuje dalje.
//
// Dok je PROXY prazan, ne šalje se ništa - praćenje je ugašeno.
// =====================================================================

/** Proxy koji prima događaje i prosleđuje ih sa tajnim headerom. */
export const SETTER_TRACKING_PROXY = "";

/** Prati se samo ova vrednost ?setter=. Sve ostalo se ignoriše. */
export const TRACKED_SETTER = "asistent";
