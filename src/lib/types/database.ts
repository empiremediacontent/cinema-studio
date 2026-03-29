// ============================================================
// Cinema Studio — Database Types
// ============================================================

// --- Enums ---

export type SubscriptionTier = 'free' | 'creator' | 'pro' | 'studio' | 'enterprise';
export type ProjectStatus = 'draft' | 'in_progress' | 'rendering' | 'completed' | 'archived';
export type ShotType = 'wide' | 'medium' | 'medium_close_up' | 'close_up' | 'extreme_close_up' | 'over_shoulder' | 'pov' | 'aerial' | 'custom';
export type GenerationModel = 'nano_banana_pro' | 'flux_pro' | 'veo_3_1_fast' | 'veo_3_1_standard' | 'kling_3_0' | 'elevenlabs' | 'heygen' | 'claude';
export type GenerationType = 'image' | 'video' | 'voice' | 'avatar' | 'script_analysis' | 'contact_sheet';
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AssetType = 'talent' | 'product' | 'background' | 'audio' | 'lut' | 'other';
export type ExportResolution = '720p' | '1080p' | '2k' | '4k';
export type ExportFormat = 'mp4' | 'mov' | 'webm';
export type ExportStatus = 'queued' | 'rendering' | 'completed' | 'failed';

// Production pipeline enums
export type CinematicOptionType =
  | 'camera_body' | 'focal_length' | 'lens_type' | 'film_stock'
  | 'lighting_source' | 'lighting_style' | 'atmosphere' | 'environment'
  | 'look_and_feel' | 'filter_effect' | 'aspect_ratio' | 'style';

export type GenderPresentation = 'masculine' | 'feminine' | 'androgynous' | 'other';
export type AgeAppearance = 'child' | 'teen' | 'young_adult' | 'adult' | 'senior';
export type ShotCategory = 'narrative' | 'title' | 'graphic' | 'credits' | 'transition' | 'voiceover';
export type MotionIntensity = 'subtle' | 'moderate' | 'dramatic';

export type CameraMovement =
  | 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down'
  | 'dolly_in' | 'dolly_out' | 'crane_up' | 'crane_down'
  | 'tracking' | 'handheld' | 'orbit' | 'whip_pan' | 'rack_focus';

export type QueueGenerationType = 'start_frame' | 'end_frame' | 'video' | 'title_card' | 'graphic';
export type GenerationService = 'fal_ai' | 'kie_ai';

// --- Core Tables ---

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  script: string | null;
  creative_direction: string | null;
  thumbnail_url: string | null;
  timeline_state: Record<string, unknown>;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Shot {
  id: string;
  project_id: string;
  user_id: string;
  sort_order: number;
  title: string | null;
  description: string | null;
  duration_seconds: number;
  shot_type: ShotType | null;
  camera_movement: string | null;
  dialogue: string | null;
  narration: string | null;
  nano_prompt: string | null;
  veo_prompt: string | null;
  contact_sheet_prompt: string | null;
  focal_length: string | null;
  generation_status: string;
  image_url: string | null;
  video_url: string | null;
  contact_sheet_url: string | null;
  video_variations: string[];
  // Production pipeline additions
  start_frame_url: string | null;
  end_frame_url: string | null;
  shot_category: ShotCategory | null;
  target_duration_seconds: number | null;
  sequence_order: number | null;
  is_approved: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  user_id: string;
  project_id: string | null;
  asset_type: AssetType;
  name: string;
  description: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  reference_sheet_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  file_path: string | null;
  file_size: number | null;
  file_type: string | null;
  linked_shots: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  project_id: string | null;
  shot_id: string | null;
  model: GenerationModel;
  generation_type: GenerationType;
  prompt: string | null;
  prompt_hash: string | null;
  result_url: string | null;
  status: GenerationStatus;
  error_message: string | null;
  cost_usd: number;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Export {
  id: string;
  user_id: string;
  project_id: string;
  title: string | null;
  resolution: ExportResolution;
  format: ExportFormat;
  file_url: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  status: ExportStatus;
  error_message: string | null;
  created_at: string;
}

// --- Production Pipeline Tables ---

export interface CinematicOption {
  id: string;
  name: string;
  type: CinematicOptionType;
  prompt_fragment: string;
  description: string | null;
  reference_image_url: string | null;
  sort_order: number;
  created_at: string;
}

// Grouped cinematic options for the UI dropdowns
export type CinematicOptionsMap = Record<CinematicOptionType, CinematicOption[]>;

export interface ReferenceImage {
  url: string;
  angle: string;
  description: string;
}

export interface Avatar {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  gender_presentation: GenderPresentation;
  age_appearance: AgeAppearance;
  ethnicity_appearance: string | null;
  mood_expression: string | null;
  style_tags: string[];
  reference_images: ReferenceImage[];
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface ProjectCharacter {
  id: string;
  project_id: string;
  avatar_id: string;
  role_name: string | null;
  assigned_at: string;
  // Joined data
  avatar?: Avatar;
}

export interface ShotCharacter {
  id: string;
  shot_id: string;
  avatar_id: string;
  position_hint: string | null;
  // Joined data
  avatar?: Avatar;
}

export interface ShotCinematography {
  id: string;
  shot_id: string;
  camera_body_id: string | null;
  focal_length_id: string | null;
  lens_type_id: string | null;
  film_stock_id: string | null;
  lighting_source_id: string | null;
  lighting_style_id: string | null;
  atmosphere_id: string | null;
  environment_id: string | null;
  look_and_feel_id: string | null;
  filter_effect_id: string | null;
  style_id: string | null;
  aspect_ratio_id: string | null;
  camera_movement: CameraMovement | null;
  motion_intensity: MotionIntensity;
  composed_prompt: string | null;
  created_at: string;
  updated_at: string;
  // Joined cinematic option data for display
  camera_body?: CinematicOption | null;
  focal_length?: CinematicOption | null;
  lens_type?: CinematicOption | null;
  film_stock?: CinematicOption | null;
  lighting_source?: CinematicOption | null;
  lighting_style?: CinematicOption | null;
  atmosphere?: CinematicOption | null;
  environment?: CinematicOption | null;
  look_and_feel?: CinematicOption | null;
  filter_effect?: CinematicOption | null;
  style?: CinematicOption | null;
  aspect_ratio?: CinematicOption | null;
}

export interface GenerationQueueItem {
  id: string;
  project_id: string;
  shot_id: string;
  generation_type: QueueGenerationType;
  service: GenerationService;
  model: string;
  prompt: string | null;
  reference_image_urls: string[];
  status: GenerationStatus;
  priority: number;
  result_url: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// --- Automation Pipeline Tables ---

export type PipelineJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PipelineAgentType = 'script_analysis' | 'visual_direction' | 'character_extraction' | 'image_generation' | 'export_compile';
export type PipelineTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineJob {
  id: string;
  project_id: string;
  user_id: string;
  status: PipelineJobStatus;
  agents_requested: PipelineAgentType[];
  total_steps: number;
  completed_steps: number;
  current_agent: PipelineAgentType | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineTask {
  id: string;
  job_id: string;
  project_id: string;
  user_id: string;
  agent_type: PipelineAgentType;
  status: PipelineTaskStatus;
  shot_id: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectCinematographyDefaults {
  id: string;
  project_id: string;
  camera_body_id: string | null;
  focal_length_id: string | null;
  lens_type_id: string | null;
  film_stock_id: string | null;
  lighting_source_id: string | null;
  lighting_style_id: string | null;
  atmosphere_id: string | null;
  environment_id: string | null;
  look_and_feel_id: string | null;
  filter_effect_id: string | null;
  style_id: string | null;
  aspect_ratio_id: string | null;
  camera_movement: string | null;
  motion_intensity: MotionIntensity;
  created_at: string;
  updated_at: string;
}
