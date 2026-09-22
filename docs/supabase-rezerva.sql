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

drop policy if exists "upis porudzbine" on public.porudzbine;
create policy "upis porudzbine"
  on public.porudzbine for insert to anon
  with check (true);

-- Potvrda ide kroz FUNKCIJU, ne kroz izmenu tabele.
--
-- Zašto: Postgres pri `update ... where` prvo mora da VIDI red, a ključ
-- nema pravo čitanja - pa je izmena tiho pogađala nula redova i vraćala
-- 204 kao da je uspela (viđeno 22.09.2026). Ovako ključ nema nikakvo
-- pravo nad tabelom osim upisa, a potvrdu obavlja funkcija iznutra.
--
-- Prozor od sat vremena: stara porudžbina ne može naknadno da se "utiša".
drop policy if exists "potvrda u roku od sat vremena" on public.porudzbine;
revoke update on public.porudzbine from anon;
revoke select on public.porudzbine from anon;

create or replace function public.potvrdi_porudzbinu(p_order_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.porudzbine
  set potvrdjeno = true,
      potvrdjeno_u = now()
  where order_id = p_order_id
    and napravljeno > now() - interval '1 hour';
$$;

revoke all on function public.potvrdi_porudzbinu(text) from public;
grant execute on function public.potvrdi_porudzbinu(text) to anon;

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

-- `do nothing`: ako je adresa već upisana, ponovno pokretanje fajla je NE
-- gazi. Za izmenu: update public.podesavanja set vrednost = '...' where
-- kljuc = 'slack_webhook';
insert into public.podesavanja (kljuc, vrednost)
values ('slack_webhook', 'OVDE_NALEPI_SLACK_WEBHOOK')
on conflict (kljuc) do nothing;

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
    -- Ovo je tekst koji Slack pokaže u obaveštenju na telefonu i na traci
    -- kanala, pa u njemu odmah stoje ime i telefon. <!channel> tera Slack
    -- da oglasi poruku - javlja se retko i ne sme da prođe neprimećeno.
    poruka := format(
      '<!channel> :rotating_light: PORUDŽBINA NIJE STIGLA U MAKE - %s %s, tel %s, %s',
      coalesce(r.ime, ''), coalesce(r.prezime, ''),
      coalesce(r.telefon, ''), coalesce(r.paket, '')
    );

    -- `attachments` sa bojom daje crvenu traku sa strane, a `header` veliki
    -- naslov - poruka se izdvaja od svega ostalog u kanalu.
    -- Bez imena šeme: `pg_net` može da bude instaliran u `net` ili u
    -- `extensions`, a oba su u search_path-u funkcije (vidi `set` gore).
    perform http_post(
      url     := url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
        'text', poruka,
        'attachments', jsonb_build_array(
          jsonb_build_object(
            'color', '#D72638',
            'blocks', jsonb_build_array(
              jsonb_build_object(
                'type', 'header',
                'text', jsonb_build_object(
                  'type', 'plain_text',
                  'text', ':rotating_light: PORUDŽBINA NIJE STIGLA U MAKE',
                  'emoji', true
                )
              ),
              jsonb_build_object(
                'type', 'section',
                'fields', jsonb_build_array(
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Kupac*' || chr(10) || coalesce(r.ime, '') || ' ' || coalesce(r.prezime, '')),
                  -- Telefon kao tel: link - na telefonu se zove jednim dodirom.
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Telefon*' || chr(10) ||
                    case
                      when coalesce(r.telefon, '') = '' then '-'
                      else '<tel:' || r.telefon || '|' || r.telefon || '>'
                    end),
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Paket*' || chr(10) || coalesce(r.paket, '')),
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Cena*' || chr(10) || coalesce(r.cena, '')),
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Plaćanje*' || chr(10) || coalesce(r.nacin_placanja, '')),
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    '*Adresa*' || chr(10) || coalesce(r.adresa, ''))
                )
              ),
              -- Dva puta do istog cilja: ili se porudžbina unese ručno iz
              -- podataka koji već stoje u tabeli, ili kupac dobije link i
              -- sam je ponovo pošalje.
              jsonb_build_object(
                'type', 'section',
                'text', jsonb_build_object('type', 'mrkdwn', 'text',
                  '*Šta sad:*' || chr(10) ||
                  ':telephone_receiver: pozovi kupca i unesi porudžbinu ručno — svi podaci su u Supabase tabeli `porudzbine`' || chr(10) ||
                  ':link: ili mu pošalji formu ponovo: https://nutribox.rs/order-form')
              ),
              jsonb_build_object(
                'type', 'actions',
                'elements', jsonb_build_array(
                  jsonb_build_object(
                    'type', 'button',
                    'text', jsonb_build_object('type', 'plain_text', 'text', 'Otvori formu', 'emoji', true),
                    'url', 'https://nutribox.rs/order-form'
                  )
                )
              ),
              jsonb_build_object(
                'type', 'context',
                'elements', jsonb_build_array(
                  jsonb_build_object('type', 'mrkdwn', 'text',
                    'stigla ' || to_char(r.napravljeno at time zone 'Europe/Belgrade', 'DD.MM. HH24:MI') ||
                    '  ·  broj: `' || r.order_id || '`')
                )
              )
            )
          )
        )
      )
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

-- ---------------------------------------------------------------------
-- KAD PORUKA NE STIGNE - pokreni ovo redom, odgovor kaže gde je zapelo:
--
--   -- 1) da li je Slack adresa upisana (ne sme da piše OVDE_NALEPI...)
--   select kljuc, left(vrednost, 40) from public.podesavanja;
--
--   -- 2) ima li uopšte nepotvrđenih redova starijih od 5 minuta
--   select order_id, ime, napravljeno, potvrdjeno, javljeno
--   from public.porudzbine order by napravljeno desc limit 10;
--
--   -- 3) da li je posao zakazan i da li se izvršava
--   select jobid, jobname, schedule, active from cron.job;
--   select status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 5;
--
--   -- 4) u kojoj šemi je pg_net (zato se zove bez imena šeme)
--   select extname, extnamespace::regnamespace as sema
--   from pg_extension where extname in ('pg_net', 'pg_cron');
--
--   -- 5) šta je Slack odgovorio na poslatu poruku
--   select id, status_code, left(content, 200) as odgovor, created
--   from net._http_response order by created desc limit 5;
-- ---------------------------------------------------------------------
