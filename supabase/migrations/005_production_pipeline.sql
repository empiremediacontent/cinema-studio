-- ============================================================
-- Cinema Studio: Production Pipeline Tables
-- Migration 005 - March 26, 2026
-- ============================================================

-- 1. CINEMATIC OPTIONS (the "weapons/spells/potions" loadout)
-- 251 options across 12 categories that compose into generation prompts
create table public.cinematic_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in (
    'camera_body', 'focal_length', 'lens_type', 'film_stock',
    'lighting_source', 'lighting_style', 'atmosphere', 'environment',
    'look_and_feel', 'filter_effect', 'aspect_ratio', 'style'
  )),
  prompt_fragment text not null,
  description text,
  reference_image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- RLS: cinematic_options are readable by all authenticated users
alter table public.cinematic_options enable row level security;

create policy "Authenticated users can read cinematic options"
  on public.cinematic_options for select
  using (auth.role() = 'authenticated');

create index idx_cinematic_options_type on public.cinematic_options(type);
create index idx_cinematic_options_sort on public.cinematic_options(type, sort_order);


-- 2. AVATARS (the "characters" you select for your party)
create table public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  gender_presentation text not null default 'other'
    check (gender_presentation in ('masculine', 'feminine', 'androgynous', 'other')),
  age_appearance text not null default 'adult'
    check (age_appearance in ('child', 'teen', 'young_adult', 'adult', 'senior')),
  ethnicity_appearance text,
  mood_expression text,
  style_tags text[] default '{}',
  reference_images jsonb default '[]',
  thumbnail_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.avatars enable row level security;

create policy "Users can view own avatars"
  on public.avatars for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users can create own avatars"
  on public.avatars for insert
  with check (auth.uid() = user_id);

create policy "Users can update own avatars"
  on public.avatars for update
  using (auth.uid() = user_id);

create policy "Users can delete own avatars"
  on public.avatars for delete
  using (auth.uid() = user_id);

create index idx_avatars_user_id on public.avatars(user_id);


-- 3. PROJECT CHARACTERS (assign avatars to a project, like choosing your party)
create table public.project_characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  avatar_id uuid references public.avatars(id) on delete cascade not null,
  role_name text,
  assigned_at timestamptz not null default now(),
  unique(project_id, avatar_id)
);

alter table public.project_characters enable row level security;

create policy "Users can manage project characters via project ownership"
  on public.project_characters for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_characters.project_id
      and projects.user_id = auth.uid()
    )
  );

create index idx_project_characters_project on public.project_characters(project_id);


-- 4. SHOT CHARACTERS (which avatars appear in which shots)
create table public.shot_characters (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid references public.shots(id) on delete cascade not null,
  avatar_id uuid references public.avatars(id) on delete cascade not null,
  position_hint text,
  unique(shot_id, avatar_id)
);

alter table public.shot_characters enable row level security;

create policy "Users can manage shot characters via shot ownership"
  on public.shot_characters for all
  using (
    exists (
      select 1 from public.shots
      where shots.id = shot_characters.shot_id
      and shots.user_id = auth.uid()
    )
  );

create index idx_shot_characters_shot on public.shot_characters(shot_id);


-- 5. SHOT CINEMATOGRAPHY (the "loadout" per shot: camera + lens + film + lighting etc.)
create table public.shot_cinematography (
  id uuid primary key default gen_random_uuid(),
  shot_id uuid references public.shots(id) on delete cascade not null unique,
  camera_body_id uuid references public.cinematic_options(id) on delete set null,
  focal_length_id uuid references public.cinematic_options(id) on delete set null,
  lens_type_id uuid references public.cinematic_options(id) on delete set null,
  film_stock_id uuid references public.cinematic_options(id) on delete set null,
  lighting_source_id uuid references public.cinematic_options(id) on delete set null,
  lighting_style_id uuid references public.cinematic_options(id) on delete set null,
  atmosphere_id uuid references public.cinematic_options(id) on delete set null,
  environment_id uuid references public.cinematic_options(id) on delete set null,
  look_and_feel_id uuid references public.cinematic_options(id) on delete set null,
  filter_effect_id uuid references public.cinematic_options(id) on delete set null,
  style_id uuid references public.cinematic_options(id) on delete set null,
  aspect_ratio_id uuid references public.cinematic_options(id) on delete set null,
  camera_movement text check (camera_movement in (
    'static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down',
    'dolly_in', 'dolly_out', 'crane_up', 'crane_down',
    'tracking', 'handheld', 'orbit', 'whip_pan', 'rack_focus'
  )),
  motion_intensity text default 'subtle' check (motion_intensity in ('subtle', 'moderate', 'dramatic')),
  composed_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shot_cinematography enable row level security;

create policy "Users can manage shot cinematography via shot ownership"
  on public.shot_cinematography for all
  using (
    exists (
      select 1 from public.shots
      where shots.id = shot_cinematography.shot_id
      and shots.user_id = auth.uid()
    )
  );

create index idx_shot_cinematography_shot on public.shot_cinematography(shot_id);

create trigger set_updated_at before update on public.shot_cinematography
  for each row execute function public.update_updated_at();


-- 6. GENERATION QUEUE (batch generation job tracker)
create table public.generation_queue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  shot_id uuid references public.shots(id) on delete cascade not null,
  generation_type text not null check (generation_type in (
    'start_frame', 'end_frame', 'video', 'title_card', 'graphic'
  )),
  service text not null check (service in ('fal_ai', 'kie_ai')),
  model text not null,
  prompt text,
  reference_image_urls text[] default '{}',

  status text not null default 'queued' check (status in (
    'queued', 'processing', 'completed', 'failed', 'cancelled'
  )),
  priority integer not null default 0,
  result_url text,
  error_message text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.generation_queue enable row level security;

create policy "Users can manage own generation queue"
  on public.generation_queue for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = generation_queue.project_id
      and projects.user_id = auth.uid()
    )
  );

create index idx_gen_queue_project on public.generation_queue(project_id);
create index idx_gen_queue_status on public.generation_queue(status);
create index idx_gen_queue_priority on public.generation_queue(status, priority desc, created_at);


-- 7. MODIFICATIONS TO EXISTING SHOTS TABLE
-- New columns for the production pipeline workflow
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS start_frame_url text;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS end_frame_url text;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS shot_category text
  default 'narrative' check (shot_category in (
    'narrative', 'title', 'graphic', 'credits', 'transition', 'voiceover'
  ));
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS target_duration_seconds numeric(6,2);
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS sequence_order integer;
ALTER TABLE public.shots ADD COLUMN IF NOT EXISTS is_approved boolean not null default false;


-- 8. PROJECT-LEVEL CINEMATOGRAPHY DEFAULTS
-- Stores the "default loadout" that applies to all shots unless overridden
create table public.project_cinematography_defaults (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null unique,
  camera_body_id uuid references public.cinematic_options(id) on delete set null,
  focal_length_id uuid references public.cinematic_options(id) on delete set null,
  lens_type_id uuid references public.cinematic_options(id) on delete set null,
  film_stock_id uuid references public.cinematic_options(id) on delete set null,
  lighting_source_id uuid references public.cinematic_options(id) on delete set null,
  lighting_style_id uuid references public.cinematic_options(id) on delete set null,
  atmosphere_id uuid references public.cinematic_options(id) on delete set null,
  environment_id uuid references public.cinematic_options(id) on delete set null,
  look_and_feel_id uuid references public.cinematic_options(id) on delete set null,

  filter_effect_id uuid references public.cinematic_options(id) on delete set null,
  style_id uuid references public.cinematic_options(id) on delete set null,
  aspect_ratio_id uuid references public.cinematic_options(id) on delete set null,
  camera_movement text,
  motion_intensity text default 'subtle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_cinematography_defaults enable row level security;

create policy "Users can manage project cinematography defaults via project ownership"
  on public.project_cinematography_defaults for all
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_cinematography_defaults.project_id
      and projects.user_id = auth.uid()
    )
  );

create trigger set_updated_at before update on public.project_cinematography_defaults
  for each row execute function public.update_updated_at();
