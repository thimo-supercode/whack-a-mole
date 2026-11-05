-- Globale Bestenliste für Whack-A-Hamster (Supabase / Postgres)
-- Im Supabase-Dashboard unter "SQL Editor" ausführen.

-- ===== Schritt 1: Tabelle =====

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  name       text        not null
             check (char_length(trim(name)) between 1 and 15),
  -- 30 s Runde / 800 ms pro Hamster ≈ 38 Treffer maximal
  score      integer     not null
             check (score between 1 and 40),
  created_at timestamptz not null default now()
);

-- Sortierung der Top 5: mehr Punkte zuerst, bei Gleichstand früherer Eintrag
create index if not exists scores_ranking_idx
  on public.scores (score desc, created_at asc);

alter table public.scores enable row level security;

-- ===== Schritt 2: Zugriffsrechte für Gäste (anon) =====

-- Nur Lesen und Eintragen erlauben, Ändern und Löschen grundsätzlich verbieten
grant select, insert on public.scores to anon, authenticated;
revoke update, delete, truncate on public.scores from anon, authenticated;

-- Jeder darf die Bestenliste lesen
drop policy if exists "Bestenliste lesen" on public.scores;
create policy "Bestenliste lesen"
  on public.scores
  for select
  to anon, authenticated
  using (true);

-- Jeder darf einen Eintrag hinzufügen (die CHECK-Regeln oben prüfen Name und Punkte)
drop policy if exists "Eintrag hinzufuegen" on public.scores;
create policy "Eintrag hinzufuegen"
  on public.scores
  for insert
  to anon, authenticated
  with check (true);

-- ===== Schritt 3: Hamsterbilder =====

-- Optionales Hamsterbild pro Eintrag. Nur echte Bilder von hamsters.youluv.org
-- sind erlaubt, damit niemand fremde Links in die Bestenliste schmuggelt.
alter table public.scores add column if not exists image_url text;

alter table public.scores drop constraint if exists scores_image_url_check;
alter table public.scores add constraint scores_image_url_check
  check (image_url is null or image_url ~ '^https://hamsters\.youluv\.org/[0-9a-f]{32}$');

-- Die Hamster-API sendet keine CORS-Header, der Browser darf sie also nicht direkt
-- abfragen. Deshalb holt der Datenbank-Server die Bilder (http-Extension).
create extension if not exists http with schema extensions;

-- Liefert bis zu 6 verschiedene, zufällige Hamsterbild-URLs.
-- Aufruf aus dem Spiel: POST /rest/v1/rpc/random_hamsters
create or replace function public.random_hamsters()
returns setof text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  urls     text[] := '{}';
  url      text;
  response extensions.http_response;
begin
  -- Zeitlimit pro Abruf (gilt nur für diesen Aufruf)
  perform set_config('http.timeout_msec', '3000', true);
  for attempt in 1..10 loop
    exit when coalesce(array_length(urls, 1), 0) >= 6;
    begin
      response := extensions.http_get('https://hamsters.youluv.org/random_image');
      if response.status = 200 then
        url := response.content::json ->> 'uri';
        if url ~ '^https://hamsters\.youluv\.org/[0-9a-f]{32}$' and not url = any(urls) then
          urls := urls || url;
        end if;
      end if;
    exception when others then
      -- einzelner Fehlschlag (Timeout, kaputtes JSON): nächster Versuch
      null;
    end;
  end loop;
  return query select unnest(urls);
end;
$$;

revoke execute on function public.random_hamsters() from public;
grant execute on function public.random_hamsters() to anon, authenticated;
