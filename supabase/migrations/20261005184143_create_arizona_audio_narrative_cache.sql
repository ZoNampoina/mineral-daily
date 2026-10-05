create table if not exists public.arizona_audio_narratives (
  cache_key text primary key,
  lesson_id text not null,
  mode text not null check (mode in ('short','daily','deep')),
  profile text not null default 'documentary_premium',
  source_hash text not null,
  narrative jsonb not null,
  narrative_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arizona_audio_narratives enable row level security;

revoke all on table public.arizona_audio_narratives from anon, authenticated;
grant select, insert, update, delete on table public.arizona_audio_narratives to service_role;

create index if not exists arizona_audio_narratives_lesson_mode_idx
  on public.arizona_audio_narratives (lesson_id, mode, updated_at desc);
