-- ============================================================
-- Cinema Studio: COMPLETE DATABASE SCHEMA
-- Combined migrations 001-005 for fresh Supabase project
-- Run this entire script in Supabase SQL Editor in one paste
-- ============================================================


-- ============================================================
-- MIGRATION 001: Initial Schema
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'creator', 'pro', 'studio', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null default 'Untitled Project',
  description text,
  script text,
  creative_direction text,
  thumbnail_url text,
  timeline_state jsonb default '{}',
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'rendering', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_updated_at on public.projects(updated_at desc);


-- 3. SHOTS
create table public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  sort_order integer not null default 0,
  title text,
  description text,
  duration_seconds numeric(6,2) default 5.0,
  shot_type text check (shot_type in ('wide', 'medium', 'medium_close_up', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'aerial', 'custom')),
  camera_movement text,
  dialogue text,
  narration text,
  nano_prompt text,
  veo_prompt text,
  contact_sheet_prompt text,
  focal_length text,
  generation_status text not null default 'pending' check (generation_status in ('pending', 'generating', 'completed', 'failed')),
  image_url text,
  video_url text,
  contact_sheet_url text,
  video_variations jsonb default '[]',
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shots enable row level security;

create policy "Users can view own shots"
  on public.shots for select
  using (auth.uid() = user_id);

create policy "Users can create own shots"
  on public.shots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shots"
  on public.shots for update
  using (auth.uid() = user_id);

create policy "Users can delete own shots"
  on public.shots for delete
  using (auth.uid() = user_id);

create index idx_shots_project_id on public.shots(project_id);
create index idx_shots_sort_order on public.shots(project_id, sort_order);


-- 4. ASSETS
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  asset_type text not null check (asset_type in ('talent', 'product', 'background', 'audio', 'lut', 'other')),
  name text not null,
  description text,
  file_url text,
  thumbnail_url text,
  reference_sheet_url text,
  tags text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "Users can view own assets"
  on public.assets for select
  using (auth.uid() = user_id);

create policy "Users can create own assets"
  on public.assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own assets"
  on public.assets for update
  using (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete
  using (auth.uid() = user_id);

create index idx_assets_user_id on public.assets(user_id);
create index idx_assets_project_id on public.assets(project_id);


-- 5. GENERATIONS
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  shot_id uuid references public.shots(id) on delete set null,
  model text not null check (model in ('nano_banana_pro', 'veo_3_1_fast', 'veo_3_1_standard', 'kling_3_0', 'elevenlabs', 'heygen', 'claude')),
  generation_type text not null check (generation_type in ('image', 'video', 'voice', 'avatar', 'script_analysis', 'contact_sheet')),
  prompt text,
  prompt_hash text,
  result_url text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  error_message text,
  cost_usd numeric(10,4) default 0,
  duration_ms integer,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

create policy "Users can view own generations"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Users can create own generations"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own generations"
  on public.generations for update
  using (auth.uid() = user_id);

create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_project_id on public.generations(project_id);
create index idx_generations_status on public.generations(status);


-- 6. EXPORTS
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text,
  resolution text not null default '1080p' check (resolution in ('720p', '1080p', '2k', '4k')),
  format text not null default 'mp4' check (format in ('mp4', 'mov', 'webm')),
  file_url text,
  file_size_bytes bigint,
  duration_seconds numeric(10,2),
  status text not null default 'queued' check (status in ('queued', 'rendering', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.exports enable row level security;

create policy "Users can view own exports"
  on public.exports for select
  using (auth.uid() = user_id);

create policy "Users can create own exports"
  on public.exports for insert
  with check (auth.uid() = user_id);

create index idx_exports_project_id on public.exports(project_id);


-- 7. UPDATED_AT TRIGGER (auto-update timestamp)
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.shots
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.assets
  for each row execute function public.update_updated_at();


-- ============================================================
-- MIGRATION 004: Storage bucket for generated media
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('generated-media', 'generated-media', true, 524288000)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for generated media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-media');

CREATE POLICY "Authenticated users upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'generated-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- MIGRATION 005: Production Pipeline Tables
-- ============================================================

-- 1. CINEMATIC OPTIONS (the "weapons/spells/potions" loadout)
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


-- 5. SHOT CINEMATOGRAPHY (the "loadout" per shot)
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


-- 7. NEW COLUMNS ON SHOTS TABLE (production pipeline fields)
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


-- ============================================================
-- DONE. All tables, policies, indexes, and triggers created.
-- ============================================================
