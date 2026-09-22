-- =====================================================================
-- REZERVNA EVIDENCIJA PORUDŽBINA + JAVLJANJE NA SLACK
--
-- Čemu služi: forma upiše porudžbinu OVDE u istom trenutku kad je šalje
-- Make-u. Kad Make potvrdi prijem, forma označi red kao potvrđen. Red koji
-- ostane nepotvrđen duže od 5 minuta znači da porudžbina NIJE stigla u
-- Make - i o tome stiže poruka na Slack, sa imenom i telefonom, da se
-- kupac pozove isti dan.
--
-- Zašto zaseban Supabase projekat: setter aplikacija se održava kroz
-- migracije, pa bi tabela dodata sa strane mogla da nestane pri resetu.
--
-- PRE POKRETANJA, u Supabase panelu: Database → Extensions → uključi
-- `pg_cron` i `pg_net`. Bez njih poslednji deo (javljanje) ne može.
--
-- Pokretanje: SQL Editor → nalepi ceo fajl → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabela
-- ---------------------------------------------------------------------
create table if not exists public.porudzbine (
  order_id        text primary key,
  napravljeno     timestamptz not null default now(),
  potvrdjeno      boolean     not null default false,
  potvrdjeno_u    timestamptz,
  javljeno        boolean     not null default false,

  ime             text,
  prezime         text,
  telefon         text,
  email           text,
  paket           text,
  cena            text,
  nacin_placanja  text,
  adresa          text,
  -- ceo payload, da porudžbina može ručno da se unese bez dozivanja kupca
  podaci          jsonb
);

create index if not exists porudzbine_nepotvrdjene_idx
  on public.porudzbine (napravljeno)
  where potvrdjeno = false and javljeno = false;

-- ---------------------------------------------------------------------
-- 2) Prava pristupa
--
-- Ključ koji stoji u formi je javan - svako ko otvori sajt ga vidi. Zato
-- mu se daje najmanje moguće: sme da UPIŠE porudžbinu i sme da označi da
-- je potvrđena, u roku od sat vremena. NE sme da čita tuđe porudžbine,
-- ne sme da menja podatke i ne sme da briše.
-- ---------------------------------------------------------------------
alter table public.porudzbine enable row level security;

revoke all on public.porudzbine from anon;
grant insert on public.porudzbine to anon;
grant update (potvrdjeno, potvrdjeno_u) on public.porudzbine to anon;

drop policy if exists "upis porudzbine" on public.porudzbine;
create policy "upis porudzbine"
  on public.porudzbine for insert to anon
  with check (true);

drop policy if exists "potvrda u roku od sat vremena" on public.porudzbine;
create policy "potvrda u roku od sat vremena"
  on public.porudzbine for update to anon
  using (napravljeno > now() - interval '1 hour')
  with check (napravljeno > now() - interval '1 hour');

-- ---------------------------------------------------------------------
-- 3) Slack adresa
--
-- Stoji u tabeli koju anon ne može ni da pročita (RLS uključen, bez
-- ijedne politike). Zameni tekst ispod svojom "Incoming Webhook" adresom.
-- ---------------------------------------------------------------------
create table if not exists public.podesavanja (
  kljuc    text primary key,
  vrednost text
);
alter table public.podesavanja enable row level security;
revoke all on public.podesavanja from anon;

insert into public.podesavanja (kljuc, vrednost)
values ('slack_webhook', 'OVDE_NALEPI_SLACK_WEBHOOK')
on conflict (kljuc) do update set vrednost = excluded.vrednost;

-- ---------------------------------------------------------------------
-- 4) Javljanje na Slack
--
-- Šalje najviše 20 poruka po pokretanju i svaku porudžbinu javi samo
-- jednom (kolona `javljeno`).
-- ---------------------------------------------------------------------
create or replace function public.javi_nepotvrdjene()
returns void
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  r      record;
  url    text;
  poruka text;
begin
  select vrednost into url from public.podesavanja where kljuc = 'slack_webhook';
  if url is null or url = '' or url like 'OVDE%' then
    return; -- Slack adresa još nije upisana
  end if;

  for r in
    select *
    from public.porudzbine
    where potvrdjeno = false
      and javljeno = false
      and napravljeno < now() - interval '5 minutes'
    order by napravljeno
    limit 20
  loop
    poruka := format(
      'PORUDŽBINA NIJE STIGLA U MAKE%s%s %s | tel: %s | %s | %s | %s%sBroj: %s',
      chr(10),
      coalesce(r.ime, ''), coalesce(r.prezime, ''),
      coalesce(r.telefon, ''),
      coalesce(r.paket, ''),
      coalesce(r.cena, ''),
      coalesce(r.nacin_placanja, ''),
      chr(10),
      r.order_id
    );

    perform net.http_post(
      url     := url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('text', poruka)
    );

    update public.porudzbine set javljeno = true where order_id = r.order_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Provera na svakih 5 minuta
-- ---------------------------------------------------------------------
select cron.unschedule('nutribox-nepotvrdjene')
where exists (select 1 from cron.job where jobname = 'nutribox-nepotvrdjene');

select cron.schedule(
  'nutribox-nepotvrdjene',
  '*/5 * * * *',
  $$select public.javi_nepotvrdjene();$$
);

-- ---------------------------------------------------------------------
-- Korisno posle:
--   -- šta je ostalo nepotvrđeno
--   select napravljeno, ime, prezime, telefon, paket, order_id
--   from public.porudzbine where potvrdjeno = false order by napravljeno desc;
--
--   -- proba javljanja odmah, bez čekanja
--   select public.javi_nepotvrdjene();
-- ---------------------------------------------------------------------
