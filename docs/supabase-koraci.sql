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
-- Tako niko sa strane ne može da prepravi ili obriše tuđe podatke.
--
-- ⚠️ Ovo NE pali alarm na Slack. Alarm ostaje vezan samo za stvarno
-- poslate porudžbine (tabela `porudzbine`) - inače bi stizala poruka za
-- svakog ko odustane usred forme.
--
-- ⚠️ Prvi red briše postojeću tabelu `koraci`. U njoj su samo probni
-- zapisi, pa nema šta da se izgubi.
--
-- Pokretanje: SQL Editor → nalepi ceo fajl → Run.
-- =====================================================================

drop table if exists public.koraci cascade;

create table public.koraci (
  order_id        text primary key,
  korak           text,
  poceto          timestamptz not null default now(),
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
    ime, prezime, telefon, email,
    plan, paket, nacin_placanja, adresa, podaci
  )
  values (
    p_order_id, p_korak, now(), now(),
    p_podaci->>'Ime', p_podaci->>'Prezime',
    p_podaci->>'Broj-telefona', p_podaci->>'Email',
    p_podaci->>'Cilj',            -- "Cilj" u payload-u je naziv plana
    p_podaci->>'paket', p_podaci->>'nacinPlacanja',
    v_adresa, p_podaci
  )
  on conflict (order_id) do update set
    korak          = excluded.korak,
    vreme          = now(),
    ime            = excluded.ime,
    prezime        = excluded.prezime,
    telefon        = excluded.telefon,
    email          = excluded.email,
    plan           = excluded.plan,
    paket          = excluded.paket,
    nacin_placanja = excluded.nacin_placanja,
    adresa         = excluded.adresa,
    podaci         = excluded.podaci
  where k.poceto > now() - interval '6 hours';
end;
$$;

revoke all on function public.upisi_korak(text, text, jsonb) from public;
grant execute on function public.upisi_korak(text, text, jsonb) to anon;

-- ---------------------------------------------------------------------
-- Pogled: ko je počeo formu i nije je završio. Spisak za zvanje.
-- ---------------------------------------------------------------------
create or replace view public.nezavrsene as
select
  k.order_id,
  k.vreme  as poslednji_put,
  k.korak  as stao_na,
  k.ime, k.prezime, k.telefon, k.email,
  k.plan, k.paket, k.adresa
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
