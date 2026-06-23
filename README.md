# Nutribox — Order Form

Multi-step forma za poručivanje Nutribox paketa. Rewrite stare Webflow forme
(`nutribox.rs/28-dnevni-paket`) u samostalan projekat — **Vite + TypeScript**,
build izlazi kao čist statički sajt (hostuj bilo gde ili embeduj u iframe).

> Kalkulator (BMR iz visine/težine), prekoračenje kalorija, izbacivanje
> namirnica i VIP "Book a Call" / personal-chef redirect su **uklonjeni** —
> makro vrednosti su sada fiksne po kombinaciji Plan × Pol.

---

## Pokretanje

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # type-check + production build u dist/
npm run preview  # lokalni preview build-a
```

Za deploy je dovoljno hostovati sadržaj `dist/` foldera (Netlify, Vercel,
GitHub Pages, ili `<iframe>` na postojećem sajtu). `base` je relativan, pa radi
i iz podfoldera.

---

## Tok forme (7 koraka)

1. **Informacije** — ime, prezime, email, telefon (intl-tel-input)
2. **Plan** — NutriSlim / NutriBalance / NutriPump / High Protein
3. **Pol** — Muški / Ženski
4. **Tvoje dnevne vrednosti** — prikaz kcal / proteini / UH / masti (read-only)
5. **Tip ishrane** — Balance / Pescaterian / Vegetarian / Vegan
6. **Paket** — 28 (hero), 7, 20 i 5 (bez vikenda), probni
7. **Način plaćanja** — Kartica / Pouzeće / Firma → submit

---

## Šta treba popuniti (TODO za klijenta)

Sve je na jednom mestu, jasno označeno komentarima:

| Šta | Fajl |
| --- | --- |
| **Makro vrednosti** (kcal/proteini/uh/masti po Plan × Pol) | [`src/config/plans.ts`](src/config/plans.ts) |
| **Cene** za 20-dnevni, 5-dnevni, probni (+ potvrda default 7) | [`src/config/pricing.ts`](src/config/pricing.ts) |
| **Raiffeisen plan kodovi** za 20 i 5 dana | [`src/config/packages.ts`](src/config/packages.ts) |
| **Thank-you stranice** za 20 / 5 / probni | [`src/config/packages.ts`](src/config/packages.ts) |

Makro vrednosti su `null` → u UI-ju se prikazuju kao `—`. Cene `null` → cena se
ne prikazuje na toj kartici.

---

## Funkcije (portovane sa stare forme)

- **Telefon** — intl-tel-input, auto-detekcija zemlje (geoIP), zastavica +
  pozivni broj, validacija broja. `window.iti` izložen globalno.
- **Multi-step validacija** — po koraku, inline error poruke.
- **Enter ne submituje** formu.
- **Cena** — računa se iz izabranog paketa + URL parametara. Prioritet:
  `custom plan > discountCode > affiliate > default`.
- **Bulletproof submit** — UUID `order_id` (dedup), localStorage queue, beacon,
  fetch + retry (3× exp. backoff), recovery queue na svakom load-u.
- **Submit** — Kartica → Raiffeisen checkout; Pouzeće/Firma → Make + thank-you.
- **Firma** — polja se prikazuju samo za "Firma", uz email validaciju.
- **Abandoned cart** — timer (10 min) + sessionStorage, beacon na webhook;
  okida se samo nakon stvarne interakcije korisnika.

---

## URL parametri

| Param | Efekat |
| --- | --- |
| `affiliate` | affiliate cena + prosleđuje se u payload |
| `discountCode` | discount cena (prioritet nad affiliate) |
| `setter` | prosleđuje se u payload |
| `plan=custom` + `customPlanName=standard` | custom cena (117.000), najviši prioritet |
| `testiranje-placanja=true` | Raiffeisen plan = `probni` |

Primer: `?affiliate=thundertopteam&setter=danilo`

---

## Payload (Make webhook)

Ključevi koji se šalju: `Ime`, `Prezime`, `Email`, `Broj-telefona`,
`nutriPlan`, `pol`, `tipIshrane`, `paket`, `kcal`, `proteini`, `uh`, `masti`,
`nacinPlacanja`, `cenaPaketa`, `affiliate`, `discountCode`, `setter`,
`order_id`, `submitted_at`, `user_agent`. Za firmu još: `nazivFirme`,
`adresaFirme`, `emailFirme`, `pibFirme`, `maticniBrojFirme`. Za custom plan:
`plan`, `customPlanName`.

> Napomena: polje plana ishrane je `nutriPlan` (a NE `plan`) da se ne sudara sa
> `plan=custom` parametrom.

Endpoint-i su u [`src/config/endpoints.ts`](src/config/endpoints.ts).

---

## Struktura

```
src/
├─ main.ts              # bootstrap
├─ types.ts             # tipovi + početno stanje
├─ config/              # PODACI (ovde se popunjava)
│  ├─ plans.ts          #   planovi + makro tabela
│  ├─ dietTypes.ts      #   tipovi ishrane
│  ├─ packages.ts       #   paketi + tier + raiffeisen + TY
│  ├─ pricing.ts        #   cene + prioritet + format
│  └─ endpoints.ts      #   webhook / checkout URL-ovi
├─ steps/
│  ├─ stepEngine.ts     # multi-step kontroler + progress
│  └─ index.ts          # render kartica, selekcija, validacija po koraku
├─ lib/
│  ├─ phone.ts          # intl-tel-input
│  ├─ validation.ts     # error helperi
│  ├─ urlParams.ts      # čitanje URL parametara
│  ├─ state.ts          # deljeno stanje
│  ├─ runtime.ts        # deljeni flagovi
│  ├─ payload.ts        # gradi payload iz stanja
│  ├─ bulletproof.ts    # pouzdano slanje
│  ├─ abandoned.ts      # abandoned cart
│  └─ submit.ts         # glavni submit handler
└─ styles/main.css      # tema (CSS varijable na vrhu fajla)
```

Boje/dimenzije su CSS varijable na vrhu [`src/styles/main.css`](src/styles/main.css)
— lako za retheme.
