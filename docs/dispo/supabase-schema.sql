-- Calendrier de disponibilités (/dispo) — schéma Supabase.
-- À exécuter une fois dans l'éditeur SQL Supabase (même projet que MonoVomy et /stats).
--
-- Modèle : un seul calendrier partagé, sans compte. Toute personne qui a le lien choisit
-- son profil (nom + photo facultative) puis coche ses créneaux de 30 min. Le navigateur
-- parle directement à PostgREST avec la clé publique (rôle anon) : les droits ci-dessous
-- sont donc les seules barrières.
--
-- - Profils : lecture, création, changement de photo. Ni renommage ni suppression par
--   l'API (suppression : ici, à la main ; les créneaux suivent par cascade).
-- - Créneaux : lecture, ajout (début aligné sur 30 min, du jour précédent à un an), retrait.
-- - Photo : data URL JPEG/PNG/WebP déjà réduite par le navigateur (256 px), 150 Ko max.

-- ── Profils ──────────────────────────────────────────────────────────────────
create table if not exists public.dispo_people (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  avatar     text check (
    avatar is null
    or (octet_length(avatar) <= 150000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$')
  )
);

create unique index if not exists dispo_people_name_key on public.dispo_people (lower(name));

-- Plafond de profils : sans compte, rien d'autre n'empêche de remplir la table.
create or replace function public.dispo_people_cap()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.dispo_people) >= 60 then
    raise exception 'dispo: trop de profils' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists dispo_people_cap on public.dispo_people;
create trigger dispo_people_cap before insert on public.dispo_people
  for each row execute function public.dispo_people_cap();

alter table public.dispo_people enable row level security;

drop policy if exists dispo_people_read on public.dispo_people;
create policy dispo_people_read on public.dispo_people
  for select to anon, authenticated using (true);

drop policy if exists dispo_people_insert on public.dispo_people;
create policy dispo_people_insert on public.dispo_people
  for insert to anon, authenticated with check (true);

drop policy if exists dispo_people_update on public.dispo_people;
create policy dispo_people_update on public.dispo_people
  for update to anon, authenticated using (true) with check (true);

revoke all on public.dispo_people from anon, authenticated;
grant select (id, name, avatar, created_at) on public.dispo_people to anon, authenticated;
grant insert (name, avatar) on public.dispo_people to anon, authenticated;
grant update (avatar) on public.dispo_people to anon, authenticated;

-- ── Créneaux ─────────────────────────────────────────────────────────────────
-- Une ligne = une personne disponible sur [slot_start, slot_start + 30 min).
create table if not exists public.dispo_slots (
  person_id  uuid not null references public.dispo_people (id) on delete cascade,
  slot_start timestamptz not null check (extract(epoch from slot_start)::bigint % 1800 = 0),
  primary key (person_id, slot_start)
);

create index if not exists dispo_slots_start on public.dispo_slots (slot_start);

alter table public.dispo_slots enable row level security;

drop policy if exists dispo_slots_read on public.dispo_slots;
create policy dispo_slots_read on public.dispo_slots
  for select to anon, authenticated using (true);

drop policy if exists dispo_slots_insert on public.dispo_slots;
create policy dispo_slots_insert on public.dispo_slots
  for insert to anon, authenticated
  with check (slot_start between now() - interval '1 day' and now() + interval '1 year');

drop policy if exists dispo_slots_delete on public.dispo_slots;
create policy dispo_slots_delete on public.dispo_slots
  for delete to anon, authenticated using (true);

revoke all on public.dispo_slots from anon, authenticated;
grant select, delete on public.dispo_slots to anon, authenticated;
grant insert (person_id, slot_start) on public.dispo_slots to anon, authenticated;

-- Supprimer un profil (et ses créneaux) :
-- delete from public.dispo_people where name = 'Prénom';
--
-- Ménage conseillé (de temps en temps, ou via pg_cron) :
-- delete from public.dispo_slots where slot_start < now() - interval '30 days';
