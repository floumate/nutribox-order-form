# Legacy Make HTTP body (backup)

**Status:** ZASTARELO / obsolete. Zamenjeno sa `{{1.registrationJson}}` (forma
sad gradi ceo Nikolin registration payload u `src/lib/registration.ts`).

Ovo je stari field-by-field body iz Make HTTP modula (`POST /webhooks/customer/registration`),
sačuvan "za svaki slučaj". NE koristiti direktno na novom endpointu — Nikolin
novi contract je drugačiji (nema `visina`/`tezina`/`kalorije`/`cena`/`checkbox`/
`affiliate`...; `pol`/`cilj`/`paket`/`nacinPlacanja` moraju biti enum kodovi;
`namirniceZaIskljucivanje` mora biti niz). Sirove `{{1.Cilj}}` itd. vrednosti bi
pale na validaciji.

```
{
  "ime": "{{1.Ime}}",
  "prezime": "{{1.Prezime}}",
  "email": "{{1.Email}}",
  "brojTelefona": "{{1.`Broj-telefona`}}",
  "paket": "{{1.paket}}",
  "cilj": "{{1.Cilj}}",
  "tipIshrane": "{{1.`Tip-ishrane`}}",
  "nivoFizickeAktivnosti": "{{1.Aktivnost}}",
  "vremeAktivnostiNedeljno": "{{1.Sati}}",
  "visina": "{{1.Visina}}",
  "tezina": "{{1.Tezina}}",
  "datumRodjenja": "{{1.`datum-rodjenja`}}",
  "pol": "{{1.Pol}}",
  "brojKalorija": {{1.UkupneKalorije}},
  "proteini": {{1.Proteini}},
  "hidrati": {{1.Hidrati}},
  "masti": {{1.Masti}},
  "namirniceZaIskljucivanje": "{{1.NamirniceZalzbacivanje}}",
  "naselje": "{{1.Naselje}}",
  "adresa": "{{1.Adresa}}",
  "brojStana": "{{1.`Broj-stana`}}",
  "brojSprata": "{{1.`Broj-sprata`}}",
  "sifraUlaznihVrata": "{{1.`Sifra-ulaznih-vrata`}}",
  "instrukcijeZaVozaca": "{{1.`Instrukcije-za-vozaca`}}",
  "nacinPlacanja": "{{1.nacinPlacanja}}",
  "cena": "{{1.cenaPaketa}}",
  "nazivFirme": "{{1.nazivFirme}}",
  "adresaFirme": "{{1.adresaFirme}}",
  "pib": "{{1.pibFirme}}",
  "mb": "{{1.maticniBrojFirme}}",
  "Dan": "{{1.Dan}}",
  "datumPocetka": "{{1.`datum-dostave`}}",
  "emailFirme": "{{1.emailFirme}}",
  "checkbox": "{{1.checkbox}}",
  "affiliate": "{{1.affiliate}}",
  "discountCode": "{{1.discountCode}}",
  "setter": "{{1.setter}}",
  "plan": "{{1.plan}}",
  "customPlanName": "{{1.customPlanName}}",
  "preporucenOd": "{{1.preporucenOd}}",
  "promoKod": "{{1.promoKod}}",
  "motivacija": "{{1.motivacija}}",
  "kucniBroj": "{{1.`Kucni-broj`}}",
  "nutriChef": "{{1.nutriChef}}",
  "order_id": "{{1.order_id}}",
  "submitted_at": "{{1.submitted_at}}",
  "user_agent": "{{1.user_agent}}",
  "attempt_source": "{{1.attempt_source}}"
}
```
