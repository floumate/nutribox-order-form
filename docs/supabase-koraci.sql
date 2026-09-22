-- =====================================================================
-- TRAG KROZ KORAKE FORME - jedan red po kupcu, dopunjava se u hodu
--
-- Čemu služi: sve ostalo počiva na tome da kupčev telefon uspe da pošalje
-- bar jednu poruku pri kliku na "Poruči". Ako mu veza pukne baš tada, ni
-- Make ni tabela `porudzbine` ne dobiju ništa - kupac vidi grešku, ali ako
-- je zatvori i ode, mi nemamo ni ime ni telefon.
--
-- Zato forma pri svakom prelasku na sledeći korak (i pri izmeni u pregledu
-- na kraju) dopuni red sa svim što je do tada popunjeno. Kolona `korak`
-- kaže dokle je kupac stigao, `vreme` kad je poslednji put nešto uradio.
--
-- Ključ iz forme NE DIRA tabelu: nema ni upis, ni izmenu, ni čitanje.
-- Sme samo da pozove funkciju `upisi_korak()`, koja posao obavi iznutra.
--
-- ⚠️ Ovo NE pali alarm na Slack. Alarm ostaje vezan samo za stvarno
-- poslate porudžbine (tabela `porudzbine`).
--
-- Bezbedno za ponovno pokretanje - ništa se ne briše.
-- Pokretanje: SQL Editor → nalepi ceo fajl → Run.
-- =====================================================================

create table if not exists public.koraci (
  order_id        text primary key,
  korak           text,
  poceto          timestamptz not null default now(),
  vreme           timestamptz not null default now(),
  podaci          jsonb
);

-- Svaki odgovor iz forme dobija svoju kolonu, da se sve vidi u tabeli bez
-- otvaranja `podaci`. `if not exists` - može se pokretati više puta.
alter table public.koraci add column if not exists ime             text;
alter table public.koraci add column if not exists prezime         text;
alter table public.koraci add column if not exists telefon         text;
alter table public.koraci add column if not exists email           text;
alter table public.koraci add column if not exists datum_rodjenja  text;
alter table public.koraci add column if not exists cilj            text;
alter table public.koraci add column if not exists plan            text;
alter table public.koraci add column if not exists pol             text;
alter table public.koraci add column if not exists tip_ishrane     text;
alter table public.koraci add column if not exists bez_namirnica   text;
alter table public.koraci add column if not exists paket           text;
alter table public.koraci add column if not exists cena            text;
alter table public.koraci add column if not exists datum_dostave   text;
alter table public.koraci add column if not exists adresa          text;
alter table public.koraci add column if not exists naselje         text;
alter table public.koraci add column if not exists ulica           text;
alter table public.koraci add column if not exists kucni_broj      text;
alter table public.koraci add column if not exists sprat           text;
alter table public.koraci add column if not exists stan            text;
alter table public.koraci add column if not exists sifra_vrata     text;
alter table public.koraci add column if not exists instrukcije     text;
alter table public.koraci add column if not exists kalorije        text;
alter table public.koraci add column if not exists nacin_placanja  text;
alter table public.koraci add column if not exists setter          text;
alter table public.koraci add column if not exists popust_kod      text;

create index if not exists koraci_vreme_idx on public.koraci (vreme desc);

-- Ključ iz forme nema nikakvo pravo nad tabelom.
alter table public.koraci enable row level security;
revoke all on public.koraci from anon;

-- ---------------------------------------------------------------------
-- Funkcija koja dopunjava red
--
-- Prvi poziv napravi red, svaki sledeći ga dopuni. Vraćanje unazad i
-- promena odgovora prosto prepišu polja novim vrednostima.
--
-- Dopuna važi 6 sati od početka: posle toga se red više ne dira, da se
-- stariji zapisi ne bi mogli prepraviti.
-- ---------------------------------------------------------------------
create or replace function public.upisi_korak(
  p_order_id text,
  p_korak    text,
  p_podaci   jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adresa text;
begin
  v_adresa := trim(both ', ' from
    coalesce(p_podaci->>'Naselje', '') || ', ' ||
    trim(coalesce(p_podaci->>'Adresa', '') || ' ' || coalesce(p_podaci->>'Kucni-broj', ''))
  );

  insert into public.koraci as k (
    order_id, korak, poceto, vreme,
    ime, prezime, telefon, email, datum_rodjenja,
    cilj, plan, pol, tip_ishrane, bez_namirnica,
    paket, cena, datum_dostave,
    adresa, naselje, ulica, kucni_broj, sprat, stan, sifra_vrata, instrukcije,
    kalorije, nacin_placanja, setter, popust_kod, podaci
  )
  values (
    p_order_id, p_korak, now(), now(),
    p_podaci->>'Ime',
    p_podaci->>'Prezime',
    p_podaci->>'Broj-telefona',
    p_podaci->>'Email',
    p_podaci->>'datum-rodjenja',
    p_podaci->>'motivacija',        -- odgovor na "Izaberi cilj..."
    p_podaci->>'Cilj',              -- naziv plana (NutriSlim, NutriBalance...)
    p_podaci->>'Pol',
    p_podaci->>'Tip-ishrane',
    p_podaci->>'NamirniceZalzbacivanje',
    p_podaci->>'paket',
    p_podaci->>'cenaPaketa',
    p_podaci->>'datum-dostave',
    v_adresa,
    p_podaci->>'Naselje',
    p_podaci->>'Adresa',
    p_podaci->>'Kucni-broj',
    p_podaci->>'Broj-sprata',
    p_podaci->>'Broj-stana',
    p_podaci->>'Sifra-ulaznih-vrata',
    p_podaci->>'Instrukcije-za-vozaca',
    p_podaci->>'UkupneKalorije',
    p_podaci->>'nacinPlacanja',
    p_podaci->>'setter',
    p_podaci->>'discountCode',
    p_podaci
  )
  on conflict (order_id) do update set
    korak          = excluded.korak,
    vreme          = now(),
    ime            = excluded.ime,
    prezime        = excluded.prezime,
    telefon        = excluded.telefon,
    email          = excluded.email,
    datum_rodjenja = excluded.datum_rodjenja,
    cilj           = excluded.cilj,
    plan           = excluded.plan,
    pol            = excluded.pol,
    tip_ishrane    = excluded.tip_ishrane,
    bez_namirnica  = excluded.bez_namirnica,
    paket          = excluded.paket,
    cena           = excluded.cena,
    datum_dostave  = excluded.datum_dostave,
    adresa         = excluded.adresa,
    naselje        = excluded.naselje,
    ulica          = excluded.ulica,
    kucni_broj     = excluded.kucni_broj,
    sprat          = excluded.sprat,
    stan           = excluded.stan,
    sifra_vrata    = excluded.sifra_vrata,
    instrukcije    = excluded.instrukcije,
    kalorije       = excluded.kalorije,
    nacin_placanja = excluded.nacin_placanja,
    setter         = excluded.setter,
    popust_kod     = excluded.popust_kod,
    podaci         = excluded.podaci
  where k.poceto > now() - interval '6 hours';
end;
$$;

revoke all on function public.upisi_korak(text, text, jsonb) from public;
grant execute on function public.upisi_korak(text, text, jsonb) to anon;

-- ---------------------------------------------------------------------
-- Pogled: ko je počeo formu i nije je završio. Spisak za zvanje.
-- ---------------------------------------------------------------------
-- Prvo se uklanja stari: `create or replace` ne ume da promeni redosled
-- ni nazive kolona pogleda. Brisanje pogleda ne dira nikakve podatke.
drop view if exists public.nezavrsene;

create view public.nezavrsene as
select
  k.vreme  as poslednji_put,
  k.korak  as stao_na,
  k.ime, k.prezime, k.telefon, k.email,
  k.plan, k.paket, k.cena,
  k.tip_ishrane, k.datum_dostave, k.adresa,
  k.order_id
from public.koraci k
left join public.porudzbine p on p.order_id = k.order_id
where p.order_id is null;

-- ---------------------------------------------------------------------
-- Korisno posle:
--   -- ko je počeo pa odustao (najskoriji prvi)
--   select * from public.nezavrsene order by poslednji_put desc limit 50;
--
--   -- sve što je forma videla za jednu porudžbinu
--   select * from public.koraci where order_id = 'nutribox_...';
--
--   -- čišćenje starijeg od 90 dana (pokreni s vremena na vreme)
--   delete from public.koraci where vreme < now() - interval '90 days';
-- ---------------------------------------------------------------------
