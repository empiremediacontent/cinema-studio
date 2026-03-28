-- ============================================================
-- AI Film Studio — Initial Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
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
  shot_type text check (shot_type in ('wide', 'medium', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'aerial', 'custom')),
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
