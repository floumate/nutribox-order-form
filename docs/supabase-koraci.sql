-- =====================================================================
-- TRAG KROZ KORAKE FORME
--
-- Čemu služi: sve ostalo počiva na tome da kupčev telefon uspe da pošalje
-- bar jednu poruku pri kliku na "Poruči". Ako mu veza pukne baš tada, ni
-- Make ni tabela `porudzbine` ne dobiju ništa - kupac vidi grešku, ali ako
-- je zatvori i ode, mi nemamo ni ime ni telefon.
--
-- Zato forma pri svakom prelasku na sledeći korak (i pri izmeni u pregledu
-- na kraju) DODA zapis sa svim što je do tada popunjeno. Poslednji zapis
-- za jedan `order_id` je stanje u kom je kupac stao.
--
-- Samo dodavanje, nikad izmena: javni ključ ne dobija pravo da menja ili
-- briše, pa niko sa strane ne može da prepravi tuđe podatke.
--
-- ⚠️ Ovo NE pali alarm na Slack. Alarm ostaje vezan samo za stvarno
-- poslate porudžbine (tabela `porudzbine`) - inače bi stizala poruka za
-- svakog ko odustane usred forme.
--
-- Pokretanje: SQL Editor → nalepi ceo fajl → Run.
-- =====================================================================

create table if not exists public.koraci (
  id              bigint generated always as identity primary key,
  order_id        text        not null,
  korak           text,
  vreme           timestamptz not null default now(),

  ime             text,
  prezime         text,
  telefon         text,
  email           text,
  plan            text,
  paket           text,
  nacin_placanja  text,
  adresa          text,
  podaci          jsonb
);

create index if not exists koraci_order_idx on public.koraci (order_id, vreme desc);
create index if not exists koraci_vreme_idx on public.koraci (vreme desc);

-- Prava: javni ključ sme samo da doda zapis.
alter table public.koraci enable row level security;

revoke all on public.koraci from anon;
grant insert on public.koraci to anon;

drop policy if exists "upis koraka" on public.koraci;
create policy "upis koraka"
  on public.koraci for insert to anon
  with check (true);

-- ---------------------------------------------------------------------
-- Pogled: poslednje stanje po svakoj započetoj porudžbini, i to samo za
-- one koje NISU stigle do kraja. Ovo je spisak ljudi koje vredi pozvati.
-- ---------------------------------------------------------------------
create or replace view public.nezavrsene as
select distinct on (k.order_id)
  k.order_id,
  k.vreme        as poslednji_put,
  k.korak        as stao_na,
  k.ime, k.prezime, k.telefon, k.email,
  k.plan, k.paket, k.adresa
from public.koraci k
left join public.porudzbine p on p.order_id = k.order_id
where p.order_id is null
order by k.order_id, k.vreme desc;

-- ---------------------------------------------------------------------
-- Korisno posle:
--   -- ko je počeo pa odustao (najskoriji prvi)
--   select * from public.nezavrsene order by poslednji_put desc limit 50;
--
--   -- ceo put jedne porudžbine
--   select vreme, korak, ime, telefon, paket
--   from public.koraci where order_id = 'nutribox_...' order by vreme;
--
--   -- čišćenje starijeg od 90 dana (pokreni s vremena na vreme)
--   delete from public.koraci where vreme < now() - interval '90 days';
-- ---------------------------------------------------------------------
