# Povratak na kartično plaćanje (raifpay)

**Zašto je ugašeno:** firma na koju su stizale kartične uplate je zatvorena
(2026-08-02), pa se privremeno plaća uplatom na račun. Raifpay kod NIJE
obrisan — stoji na svom mestu, samo se ne poziva.

Kad se otvori nova firma, treba **tri stvari**. Redosled nije bitan.

---

## ⚠️ PRE SVEGA — dve provere koje su nas već koštale

### a) Koja firma piše na checkout stranici

Zastava je 13.08.2026. vraćena na `true` na osnovu usmene potvrde da su
uplate prebačene na novu firmu. **Nisu bile.** Na Raiffeisen stranici je i
dalje stajalo `NUTRI BOX D.O.O. ONLINE` (stara firma, račun u blokadi), pa
su 22.08. dve uplate otišle na neupotrebljiv račun:

```
ORD1787406504008y   16.000
ORD1787406816tisr   16.000
```

Merchant se podešava na raifpay strani, forma na njega ne utiče — mi samo
šaljemo šifru paketa i radimo redirect na `redirectUrl`.

**Zato: pre uključivanja obavezno uraditi test uplatu sa
`?testiranje-placanja=true` (100 RSD) i OČIMA proveriti da na checkout
stranici piše `NUTRIBOX KETERING D.O.O.`** Nije dovoljno da neko kaže da je
prebačeno.

### b) Cena za `5_day` — neusklađena

Te dve uplate su naplaćene **16.000**, a forma za 5-dnevni prikazuje
**15.000** (`src/config/pricing.ts`).

**Rešeno 23.08.2026:** tačna cena je **15.000**, i novi sistem je već ima —
test na staging-u je prikazao `15000.00 RSD` za `5_day`. Onih 16.000 je bilo
u starom prod raifpay-u.

Svejedno proveriti iznos na prod-u pre uključivanja: `redirectUrl` iz
odgovora se otvori i uporedi `amount` sa cenom iz `pricing.ts`.

---

## 1. Order forma (ovaj repo)

`src/config/flags.ts`:

```ts
export const CARD_PAYMENT_ENABLED = true;   // bilo false
```

Zatim `npm run build` i push — GitHub Actions deployuje za ~2 min.

To je sve. Kod koji zove raifpay je u `src/lib/submit.ts` (grana
`if (nacin === "Kartica")`), netaknut — dok je zastava `false` preskače ga
`return` iznad njega.

**Pre nego što se prebaci, proveriti da prod raifpay prima sve kodove:**

```bash
curl -s -X POST "https://raifpay-prod.nutribox.dev/checkout" \
  -H "Content-Type: application/json" \
  -d '{"plan":"__nepostojeci__","email":"t@t.com","name":"T","lastname":"T","phoneNumber":"+381600000000","locale":"sr","order_id":"x"}'
```

Odgovor izlistava sve validne planove. Moraju biti:
`test, 5_day, 7_day, 20_day, 28_day, probni, 5_day_max, 7_day_max,
20_day_max, 28_day_max, probni_max` (+ `custom` ako se koristi custom plan —
nedostajao je u jednom njihovom deploy-u).

Iznos se proverava otvaranjem `redirectUrl` iz odgovora — na stranici piše
`amount`, i ne sme da piše "TEST".

---

## 2. Retention forma (Webflow, nije u repo-u)

`nutribox.rs/retention-form` → Page Settings → Before `</body>` tag,
sekcija 2 (GLAVNI ENGINE):

```js
const CARD_PAYMENT_ENABLED = true;   // bilo false
```

Kompletan trenutni kod je u [`retention-form-body.html`](./retention-form-body.html).

---

## 3. Mejl u Make-u

Scenario order forme → "Obaveštenje za korisnika" (i TTT verzija) →
`switch(1.nacinPlacanja; ...)` → grana **"Kartica"**.

Sada daje podatke za uplatu na račun. Vratiti na:

```
"Nakon izvršene uplate karticom putem sajta, Vaša porudžbina će automatski
biti zvanično potvrđena."
```

---

## Šta ostaje i posle povratka

- Stranica `/hvala` i fajlovi u `public/uplatnica/` — mogu da ostanu, ne
  smetaju. Ako se situacija ponovi, dovoljno je vratiti zastave na `false`.
- `UPLATNICA_PATH` u obe forme — ostaje, koristi se samo dok je zastava
  `false`.

## Ako neko slučajno obriše kod

Sve verzije su u git istoriji. Stanje pre gašenja kartice:

```bash
git log --oneline --all -- src/lib/submit.ts
git show <commit>:src/lib/submit.ts
```

Commit koji je uveo gašenje: `feat: temporary bank-transfer checkout while
card payments are paused`.
