-- Analytics du site — schéma Supabase.
-- À exécuter une fois dans l'éditeur SQL Supabase (même projet que MonoVomy).
--
-- Modèle : le site n'envoie que des événements anonymes (id visiteur aléatoire
-- tiré dans le navigateur, ni IP, ni cookie). Les visiteurs (clé anon) peuvent
-- seulement INSÉRER ; personne ne peut relire la table par l'API. Le dashboard
-- `/stats` passe par la fonction `analytics_stats`, qui vérifie une clé secrète
-- dont seule l'empreinte SHA-256 est stockée.

-- ── Événements ───────────────────────────────────────────────────────────────
create table if not exists public.site_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event       text not null check (event in ('page_view', 'page_time', 'game_start', 'room_create', 'room_join')),
  visitor_id  text not null check (char_length(visitor_id) between 8 and 64),
  session_id  text not null check (char_length(session_id) between 8 and 64),
  path        text not null check (char_length(path) <= 200),
  section     text not null check (char_length(section) <= 40),
  game        text check (char_length(game) <= 60),
  duration_ms int  check (duration_ms between 0 and 14400000),
  referrer    text check (char_length(referrer) <= 120),
  device      text check (device in ('mobile', 'tablet', 'desktop'))
);

create index if not exists site_events_created_at on public.site_events (created_at);

alter table public.site_events enable row level security;

-- Insertion seule, horodatée par le serveur (pas d'événement antidaté).
drop policy if exists site_events_insert on public.site_events;
create policy site_events_insert on public.site_events
  for insert to anon, authenticated
  with check (created_at between now() - interval '5 minutes' and now() + interval '1 minute');

revoke all on public.site_events from anon, authenticated;
grant insert (event, visitor_id, session_id, path, section, game, duration_ms, referrer, device)
  on public.site_events to anon, authenticated;

-- ── Clé du dashboard ─────────────────────────────────────────────────────────
-- Une seule ligne, jamais exposée par l'API (RLS sans policy + aucun droit).
create table if not exists public.analytics_config (
  id       int primary key default 1 check (id = 1),
  key_hash text not null
);

alter table public.analytics_config enable row level security;
revoke all on public.analytics_config from anon, authenticated;

-- Définir (ou changer) la clé : remplacer CHANGE-MOI par une longue phrase secrète.
-- insert into public.analytics_config (id, key_hash)
-- values (1, encode(sha256(convert_to('CHANGE-MOI', 'UTF8')), 'hex'))
-- on conflict (id) do update set key_hash = excluded.key_hash;

-- ── Statistiques agrégées pour le dashboard ──────────────────────────────────
-- Tous les regroupements par jour / heure se font à l'heure de Paris.
create or replace function public.analytics_stats(p_key text, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tz     constant text := 'Europe/Paris';
  days   int := least(greatest(coalesce(p_days, 30), 1), 365);
  since  timestamptz;
  prev   timestamptz;
  result jsonb;
begin
  if p_key is null or not exists (
    select 1 from analytics_config
    where key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
  ) then
    perform pg_sleep(1); -- freine les essais en série
    raise exception 'invalid analytics key' using errcode = '28000';
  end if;

  -- Fenêtre : les `days` derniers jours calendaires (aujourd'hui inclus), heure de Paris.
  since := (date_trunc('day', now() at time zone tz) - make_interval(days => days - 1)) at time zone tz;
  prev  := since - make_interval(days => days);

  with ev as (
    select * from site_events where created_at >= since
  ),
  sessions as (
    select session_id, coalesce(sum(duration_ms) filter (where event = 'page_time'), 0) as time_ms
    from ev group by session_id
  )
  select jsonb_build_object(
    'days', days,
    'timezone', tz,
    'generatedAt', now(),
    'totals', (
      select jsonb_build_object(
        'pageViews', count(*) filter (where event = 'page_view'),
        'visitors', count(distinct visitor_id),
        'sessions', count(distinct session_id),
        'timeMs', coalesce(sum(duration_ms) filter (where event = 'page_time'), 0),
        'avgSessionMs', (select coalesce(round(avg(time_ms)), 0) from sessions),
        'gameStarts', count(*) filter (where event = 'game_start' or (event = 'page_view' and game is not null))
      ) from ev
    ),
    'previous', (
      select jsonb_build_object(
        'pageViews', count(*) filter (where event = 'page_view'),
        'visitors', count(distinct visitor_id),
        'sessions', count(distinct session_id),
        'gameStarts', count(*) filter (where event = 'game_start' or (event = 'page_view' and game is not null))
      ) from site_events where created_at >= prev and created_at < since
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day::date, 'pageViews', coalesce(x.pv, 0), 'visitors', coalesce(x.v, 0)) order by d.day), '[]'::jsonb)
      from generate_series((since at time zone tz)::date, (now() at time zone tz)::date, interval '1 day') as d(day)
      left join (
        select (created_at at time zone tz)::date as day,
               count(*) filter (where event = 'page_view') as pv,
               count(distinct visitor_id) as v
        from ev group by 1
      ) x on x.day = d.day::date
    ),
    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'n', n)), '[]'::jsonb)
      from (
        select extract(isodow from created_at at time zone tz)::int as dow,
               extract(hour from created_at at time zone tz)::int as hour,
               count(*) as n
        from ev where event = 'page_view' group by 1, 2
      ) h
    ),
    'sections', (
      select coalesce(jsonb_agg(jsonb_build_object('section', section, 'pageViews', pv, 'visitors', v, 'timeMs', t) order by pv desc, t desc), '[]'::jsonb)
      from (
        select section,
               count(*) filter (where event = 'page_view') as pv,
               count(distinct visitor_id) as v,
               coalesce(sum(duration_ms) filter (where event = 'page_time'), 0) as t
        from ev group by section
      ) s
    ),
    'games', (
      select coalesce(jsonb_agg(jsonb_build_object('game', game, 'starts', st, 'visitors', v, 'rooms', r, 'timeMs', t) order by st desc, t desc), '[]'::jsonb)
      from (
        select game,
               count(*) filter (where event in ('page_view', 'game_start')) as st,
               count(distinct visitor_id) filter (where event in ('page_view', 'game_start')) as v,
               count(*) filter (where event in ('room_create', 'room_join')) as r,
               coalesce(sum(duration_ms) filter (where event = 'page_time'), 0) as t
        from ev where game is not null group by game
      ) g
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', device, 'visitors', n) order by n desc), '[]'::jsonb)
      from (select coalesce(device, 'desktop') as device, count(distinct visitor_id) as n from ev group by 1) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('referrer', referrer, 'visits', n) order by n desc), '[]'::jsonb)
      from (
        select referrer, count(*) as n from ev
        where event = 'page_view' and referrer is not null
        group by referrer order by n desc limit 10
      ) t
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'event', event, 'path', path, 'section', section, 'game', game, 'device', device) order by created_at desc), '[]'::jsonb)
      from (
        select created_at, event, path, section, game, device from site_events
        where event <> 'page_time'
        order by created_at desc limit 40
      ) t
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.analytics_stats(text, int) from public;
grant execute on function public.analytics_stats(text, int) to anon, authenticated;

-- Rétention conseillée (à lancer de temps en temps, ou via pg_cron) :
-- delete from public.site_events where created_at < now() - interval '400 days';
