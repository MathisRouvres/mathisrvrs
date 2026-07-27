-- MonoVomy — schéma Supabase (Phase 9 : robustesse online)
-- À exécuter dans l'éditeur SQL Supabase. Le client n'utilise QUE la clé anon
-- (jamais la service_role). La logique d'autorité reste host-authoritative ;
-- ces tables servent la persistance des snapshots et la reconnexion.

-- ── Rooms ───────────────────────────────────────────────────────────────────
create table if not exists public.mv_rooms (
  room_code   text primary key,
  host_id     text not null,
  host_epoch  int  not null default 1,
  protocol_version text not null,
  content_version  text not null,
  status      text not null default 'lobby',          -- lobby | playing | finished
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Players (membres d'une room) ─────────────────────────────────────────────
create table if not exists public.mv_players (
  room_code   text not null references public.mv_rooms(room_code) on delete cascade,
  client_id   text not null,
  player_id   text not null,
  name        text not null,
  avatar      text,
  drink_mode  text not null default 'alcohol',
  seat        int  not null,
  connected   boolean not null default true,
  last_seen_at timestamptz not null default now(),
  primary key (room_code, client_id)
);

-- ── Snapshots versionnés ─────────────────────────────────────────────────────
create table if not exists public.mv_snapshots (
  room_code        text primary key references public.mv_rooms(room_code) on delete cascade,
  snapshot         jsonb not null,
  host_epoch       int not null,
  snapshot_version int not null,
  updated_at       timestamptz not null default now()
);

-- ── Journal d'événements (optionnel — audit / rejeu déterministe) ────────────
create table if not exists public.mv_event_log (
  id          bigint generated always as identity primary key,
  room_code   text not null references public.mv_rooms(room_code) on delete cascade,
  intent_id   text not null,
  player_id   text not null,
  sequence    int  not null,
  type        text not null,
  created_at  timestamptz not null default now(),
  unique (room_code, intent_id)                         -- idempotence au niveau stockage
);

create index if not exists mv_event_log_room_seq on public.mv_event_log (room_code, sequence);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Modèle : parties de soirée éphémères, accès par code de room (secret partagé).
-- On autorise lecture/écriture aux clients anon MAIS jamais d'exposition de clé
-- privée ; l'autorité de jeu reste côté hôte (le serveur ne valide pas le contenu
-- métier, seulement l'accès). Pour durcir, remplacer par des Edge Functions
-- signées ou un JWT par room.

alter table public.mv_rooms      enable row level security;
alter table public.mv_players    enable row level security;
alter table public.mv_snapshots  enable row level security;
alter table public.mv_event_log  enable row level security;

-- Lecture ouverte (le code de room fait office de secret d'accès).
create policy mv_rooms_read      on public.mv_rooms      for select using (true);
create policy mv_players_read    on public.mv_players    for select using (true);
create policy mv_snapshots_read  on public.mv_snapshots  for select using (true);
create policy mv_event_read      on public.mv_event_log  for select using (true);

-- Écriture par clients anon (insert/update/upsert). L'idempotence est garantie
-- par les clés primaires / contraintes unique ci-dessus.
create policy mv_rooms_write     on public.mv_rooms      for all using (true) with check (true);
create policy mv_players_write   on public.mv_players    for all using (true) with check (true);
create policy mv_snapshots_write on public.mv_snapshots  for all using (true) with check (true);
create policy mv_event_write     on public.mv_event_log  for insert with check (true);

-- Nettoyage recommandé (cron / Edge Function) : supprimer les rooms inactives
-- depuis > 24h pour ne pas accumuler de données personnelles (RGPD).
-- delete from public.mv_rooms where updated_at < now() - interval '24 hours';
