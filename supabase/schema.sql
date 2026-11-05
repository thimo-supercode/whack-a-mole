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
