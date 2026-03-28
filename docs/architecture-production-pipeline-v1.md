# Production Pipeline Architecture Spec v1.0
## AI Film Studio - Feature Branch: feature/production-pipeline
### Date: March 26, 2026

---

## Vision

A complete AI video production pipeline where a writer inputs a script, selects characters,
and the system generates a fully timed storyboard with consistent character images, cinematic
controls, and automated video generation. Think Higgsfield Cinema Studio meets a real
production shotlist tool.

---

## Pipeline Flow (End to End)

### Stage 1: Script Input + Timing
- Writer pastes or uploads script
- Writer sets target duration (e.g., "2:30" or "3:00")
- Writer selects video type: narrative, commercial, explainer, social, music video
- AI (Gemini 2.5 Flash) analyzes script and breaks into timed segments

### Stage 2: Shot Decomposition
- AI decomposes script into shots with timing allocations
- Accounts for: title cards (5-6s), full-screen graphics (variable), voiceover pacing,
  transitions (0.5-1s), end credits (5-8s)
- Each shot gets: title, description, dialogue/narration text, duration_seconds,
  shot_type (narrative/title/graphic/credits/transition), suggested focal length
- Total shot durations must sum to target duration (with tolerance of +/- 3 seconds)
- Voiceover timing calculated at ~150 words per minute for natural pacing

### Stage 3: Character Selection (Avatar Library)
- Before generation, user selects characters from the Avatar Library
- Character select screen (video game style): browse characters with preview cards
- Each character has: name, reference photos (multiple angles), description,
  gender, age range, ethnicity, style tags, mood/expression defaults
- User assigns characters to the project (up to 5 per project for v1)
- Characters are tagged per-shot (which characters appear in which shots)
- System pulls character reference sheets for image generation consistency

### Stage 4: Cinematic Controls
- Below each shot card, a collapsible "Cinematography Panel" shows:
  - Camera Body (ARRI ALEXA 65, RED KOMODO 6K, Sony FX6, etc.)
  - Focal Length (8mm to 400mm with named presets)
  - Lens Type (Anamorphic, Prime, Zoom, Macro, etc.)
  - Film Stock (Kodak Vision3 500T, 250D, Fuji Eterna, etc.)
  - Lighting Style (Rembrandt, Butterfly, Split, Natural, etc.)
  - Lighting Source (Window, Practical, Neon, Golden Hour, etc.)
  - Atmosphere (Tense, Dreamy, Intimate, Epic, etc.)
  - Environment (if not specified in script)
  - Look and Feel (Blade Runner, Dune, Arrival, Dark Knight, etc.)
  - Filter/Effect (Light Leak, Smoke, Film Grain, Lens Flare, etc.)
  - Style (Photorealistic, Oil Painting, Anime, Pencil Sketch, etc.)
- User can set "project defaults" that apply to all shots, then override per-shot
- All 251 cinematic options from Airtable imported into Supabase as seed data
- Prompt compositor formula: combines subject + environment + camera + lens + film +
  lighting + atmosphere + look + filter + style into one generation-ready prompt
- User can edit the final composed prompt directly before generation

### Stage 5: Image Generation (Start + End Frames)
- For each shot, system generates TWO images: start frame and end frame
- Start frame: opening composition of the shot
- End frame: closing composition (camera has moved, action has progressed)
- Image generation via fal.ai (Flux Pro) or Kie.ai (Nano Banana 2) per user choice
- Character reference images passed as image-to-image references for consistency
- Quality targets: ultra-realistic with texture, subtle skin flaws, no waxy look
  OR clean animation style (user selects per-project)
- Bulk generation: "Generate All" button processes all shots in sequence
- Rate limiting: 2-second delay between API calls, max 5 concurrent requests
- Progress bar shows overall generation status

### Stage 6: Review + Adjust
- User reviews all generated start/end frames in storyboard view
- Can regenerate individual frames with adjusted prompts or settings
- Can swap focal lengths per shot to break visual monotony
- Side-by-side comparison of start and end frame per shot
- Cinematic controls remain editable throughout this stage
- "Approve All" or approve individual shots to advance to video generation

### Stage 7: Video Generation (Image-to-Video Interpolation)
- Approved shots move to video generation queue
- Start frame + end frame sent to video API for interpolation
- Primary: Veo 3.1 Fast via Kie.ai (image-to-video with end frame reference)
- Fallback: Kling 3.0 via Kie.ai
- Camera motion parameters derived from cinematic controls:
  - Pan, tilt, zoom, dolly, crane, handheld shake
  - Motion intensity (subtle, moderate, dramatic)
- Two modes:
  - Manual: generate one shot at a time, review, proceed
  - Auto-Generate: queue all shots, system processes with rate limiting,
    user comes back when done
- Multi-agent parallel generation (3 concurrent video jobs max to avoid rate limits)
- Notification when batch is complete

### Stage 8: Assembly + Export
- All generated videos arranged in timeline order
- Title cards, graphics, and credits rendered as static frames or motion graphics
- Voiceover audio synced to shot timing
- Code-based video editing via FFmpeg for final assembly:
  - Concatenate shots in sequence
  - Apply transitions between shots
  - Mix audio tracks (voiceover, music, SFX)
  - Output final video at target resolution (1080p, 4K)
- Export to MP4 or MOV

---

## Higgsfield-Inspired Features (Priority Order)

### 1. Soul Cast (Avatar Library) - HIGH PRIORITY
Replicate the character builder concept:
- Character cards with preview images, metadata, and consistency reference sheets
- Assign characters to project, then tag per-shot
- System automatically includes character reference in generation prompts
- Future: allow users to create new characters by uploading 10-20 reference photos

### 2. Cinematic Controls Panel - HIGH PRIORITY
Replicate Cinema Studio's camera/lens/lighting controls:
- Dropdown selectors for each cinematic parameter
- Real-time prompt preview as user adjusts settings
- Project-level defaults with per-shot overrides
- 251 options seeded from Airtable data

### 3. Angles V2 (Multi-Angle) - MEDIUM PRIORITY
After generating a key frame, let user adjust virtual camera angle:
- Could use depth estimation + novel view synthesis
- Or simply regenerate with modified camera position prompt
- v1 approach: offer 4 angle variations per shot (front, 3/4 left, 3/4 right, over shoulder)

### 4. Relight (Post-Gen Lighting) - MEDIUM PRIORITY
Adjust lighting after image generation:
- Could integrate IC-Light or similar relighting model via fal.ai
- Directional light control (position, intensity, color temperature)
- Soft vs hard light modes
- v1 approach: offer 3 lighting variations per shot via regeneration with modified prompts

### 5. Soul Moodboard (Style References) - LOWER PRIORITY
Let users upload reference images to define visual style:
- Upload 10-80 images that share a visual style
- System extracts color palette, mood, texture patterns
- Applied as style guidance to all generations in project
- v1 approach: offer preset "looks" (Blade Runner, Dune, etc.) from cinematic options

### 6. Vibe Motion (Motion Graphics) - LOWER PRIORITY
AI-generated title cards and motion graphics:
- Text-to-motion for title sequences, lower thirds, end credits
- Template library for common formats
- v1 approach: generate static title cards as images, animate with simple zoom/fade

---

## Database Schema Additions

### Table: cinematic_options
- id (uuid, primary key)
- name (text) -- e.g., "ARRI ALEXA 65"
- type (enum) -- camera_body, focal_length, lens_type, film_stock, environment,
  lighting_source, lighting_style, atmosphere, look_and_feel, filter_effect,
  aspect_ratio, style
- prompt_fragment (text) -- the actual text injected into prompts
- description (text) -- human-readable description
- reference_image_url (text, nullable) -- visual reference
- sort_order (integer)
- created_at (timestamptz)

### Table: avatars
- id (uuid, primary key)
- user_id (uuid, foreign key to profiles)
- name (text)
- description (text)
- gender_presentation (enum) -- masculine, feminine, androgynous, other
- age_appearance (enum) -- child, teen, young_adult, adult, senior
- ethnicity_appearance (text)
- mood_expression (text) -- default mood/expression
- style_tags (text array)
- reference_images (jsonb) -- array of {url, angle, description}
- thumbnail_url (text)
- is_public (boolean, default false)
- created_at (timestamptz)

### Table: project_characters
- id (uuid, primary key)
- project_id (uuid, foreign key to projects)
- avatar_id (uuid, foreign key to avatars)
- role_name (text) -- character's role in this project
- assigned_at (timestamptz)

### Table: shot_characters
- id (uuid, primary key)
- shot_id (uuid, foreign key to shots)
- avatar_id (uuid, foreign key to avatars)
- position_hint (text) -- e.g., "foreground left", "center", "background"

### Table: shot_cinematography
- id (uuid, primary key)
- shot_id (uuid, foreign key to shots)
- camera_body_id (uuid, nullable, foreign key to cinematic_options)
- focal_length_id (uuid, nullable, foreign key to cinematic_options)
- lens_type_id (uuid, nullable, foreign key to cinematic_options)
- film_stock_id (uuid, nullable, foreign key to cinematic_options)
- lighting_source_id (uuid, nullable, foreign key to cinematic_options)
- lighting_style_id (uuid, nullable, foreign key to cinematic_options)
- atmosphere_id (uuid, nullable, foreign key to cinematic_options)
- environment_id (uuid, nullable, foreign key to cinematic_options)
- look_and_feel_id (uuid, nullable, foreign key to cinematic_options)
- filter_effect_id (uuid, nullable, foreign key to cinematic_options)
- style_id (uuid, nullable, foreign key to cinematic_options)
- aspect_ratio_id (uuid, nullable, foreign key to cinematic_options)
- camera_movement (text) -- pan_left, tilt_up, dolly_in, crane_up, handheld, static
- motion_intensity (enum) -- subtle, moderate, dramatic
- composed_prompt (text) -- auto-generated from selections, editable by user
- created_at (timestamptz)
- updated_at (timestamptz)

### Table: generation_queue
- id (uuid, primary key)
- project_id (uuid, foreign key to projects)
- shot_id (uuid, foreign key to shots)
- generation_type (enum) -- start_frame, end_frame, video, title_card, graphic
- service (enum) -- fal_ai, kie_ai
- model (text) -- flux_pro, nano_banana_2, veo_3_1, kling_3_0
- prompt (text)
- reference_image_urls (text array)
- status (enum) -- queued, processing, completed, failed, cancelled
- priority (integer, default 0)
- result_url (text, nullable)
- error_message (text, nullable)
- retry_count (integer, default 0)
- max_retries (integer, default 3)
- created_at (timestamptz)
- started_at (timestamptz, nullable)
- completed_at (timestamptz, nullable)

### Modifications to existing shots table
- Add: start_frame_url (text, nullable)
- Add: end_frame_url (text, nullable)
- Add: shot_category (enum) -- narrative, title, graphic, credits, transition, voiceover
- Add: target_duration_seconds (float)
- Add: sequence_order (integer)
- Add: is_approved (boolean, default false)

---

## API Routes (New + Modified)

### New Routes
- POST /api/decompose-script -- takes script + duration, returns timed shot breakdown
- POST /api/generate-start-frame -- generates start frame for a shot
- POST /api/generate-end-frame -- generates end frame for a shot
- POST /api/bulk-generate-images -- queues all shots for image generation
- POST /api/bulk-generate-videos -- queues all approved shots for video generation
- POST /api/compose-prompt -- assembles prompt from cinematography selections
- GET  /api/cinematic-options -- returns all options grouped by type
- GET  /api/avatars -- returns avatar library for current user
- POST /api/avatars -- create new avatar
- POST /api/queue-status -- check generation queue progress
- POST /api/export-video -- FFmpeg assembly of final video

### Modified Routes
- POST /api/generate-image -- add fal.ai support, start/end frame mode, character refs
- POST /api/generate-video -- add start+end frame interpolation mode
- POST /api/generate-shots -- add timing allocation, shot categories, character detection

---

## UI Components (New)

### ScriptInput
- Large text area for script paste/upload
- Duration selector (slider or input, 0:30 to 5:00)
- Video type selector (narrative, commercial, explainer, social, music video)
- "Decompose Script" button

### AvatarLibrary (Character Select Screen)
- Grid of character cards with thumbnails
- Search and filter by tags, gender, age, ethnicity
- Click to view full character sheet (all reference angles, description, metadata)
- "Add to Project" button per character
- "Create New Character" flow (upload references, fill metadata)
- Video-game style selection UI with character preview on hover

### ShotCard (Enhanced)
- Shows: shot number, category badge, title, description, duration
- Start frame and end frame side by side (or placeholder if not generated)
- Character tags showing which avatars appear in this shot
- Approve/reject buttons per frame
- Regenerate button per frame
- Expand to show cinematography panel

### CinematographyPanel
- Collapsible panel below each shot card
- Dropdown for each cinematic parameter (camera, lens, focal length, etc.)
- "Apply to All Shots" option for project-level defaults
- Live prompt preview that updates as user changes selections
- Editable composed prompt text area
- Camera movement selector with visual icons
- Motion intensity slider

### GenerationQueue
- Dashboard showing all queued, processing, and completed generations
- Progress bars per shot and overall project
- Estimated time remaining
- Cancel individual or cancel all
- Retry failed generations
- Auto-refresh every 5 seconds while jobs are active

### StoryboardTimeline
- Horizontal scrollable timeline view
- Shot thumbnails (start frames) arranged in sequence
- Duration bars proportional to shot length
- Drag to reorder shots
- Total duration counter
- Play preview mode (slideshow of start frames at shot timing)

---

## Multi-Agent Generation Strategy

### Why Multi-Agent
Image and video generation are slow (10-60 seconds per image, 30-120 seconds per video).
A serial approach for 20 shots with start+end frames = 40 images = potentially 40 minutes.
With 3-5 parallel agents, this drops to 8-13 minutes.

### Implementation
- Generation queue table in Supabase acts as the job queue
- Client-side orchestrator polls queue and dispatches jobs
- Max concurrent image generation jobs: 5 (configurable per service)
- Max concurrent video generation jobs: 3 (video APIs are stricter on rate limits)
- Staggered start: new job dispatched every 2 seconds to avoid burst rate limits
- Exponential backoff on 429 (rate limit) responses: 5s, 10s, 20s, 40s
- Failed jobs retry up to 3 times before marking as failed
- Priority system: start frames before end frames, narrative shots before titles

### Rate Limit Awareness by Service
- fal.ai: Generally permissive, 10+ concurrent OK for most plans
- Kie.ai: More restrictive, recommend max 3 concurrent, 2s between requests
- Veo 3.1: Queue-based, submit all and poll for results
- Kling 3.0: Similar queue model, slightly faster turnaround

---

## Prompt Composition Engine

### Formula
The system composes prompts by concatenating selected cinematic options:

```
{style_prefix} of {subject_and_action}.
{environment_description}.
Captured with {camera_body}, {focal_length} {lens_type}, {film_stock}.
{lighting_style} with {lighting_source}.
{atmosphere} atmosphere.
{look_and_feel}.
{filter_effect}.
{character_description_if_present}.
```

### Character Injection
When a shot has assigned characters, the system injects character descriptions:
- "A [age] [ethnicity] [gender] with [physical description], wearing [outfit]"
- Character reference images attached as image-to-image guidance
- Multiple characters: described in order of prominence (foreground first)

### Quality Suffixes (appended based on style selection)
- Photorealistic: "Natural skin texture visible, visible pores, no foundation coverage.
  Skin highlight hot but not blown, shadows fall to deep brown not black.
  Subtle film grain, organic halation around bright sources. No digital processing look."
- Animation: "Clean linework, consistent shading, professional animation quality.
  No artifacts, smooth gradients, intentional color palette."

---

## Technology Decisions

### Image Generation
- Primary: fal.ai (Flux Pro for photorealistic, SDXL for stylized)
- Secondary: Kie.ai (Nano Banana 2 when available, Nano Banana Pro as fallback)
- Character consistency: image-to-image with reference photos at 0.55-0.65 strength
- Resolution: 1920x1080 (16:9) default, 1080x1920 (9:16) for vertical

### Video Generation
- Primary: Veo 3.1 Fast via Kie.ai (best quality-to-speed ratio)
- Secondary: Kling 3.0 via Kie.ai (faster, good for action shots)
- Mode: image-to-video with start frame, end frame as reference/target
- Duration per clip: 4-6 seconds (matches typical shot duration)

### Video Assembly
- FFmpeg via server-side API route or Supabase Edge Function
- Concatenation with crossfade transitions
- Audio mixing (voiceover + background music)
- Output: MP4 H.264 at 1080p (default) or 4K

### Local Development
- npm run dev for Next.js dev server (no Netlify deploys during development)
- Supabase local or cloud (existing project, no new infra needed)
- Environment variables: FAL_API_KEY, KIE_API_KEY, GOOGLE_AI_API_KEY added to .env.local
- Hot reload for rapid iteration

---

## Build Phases

### Phase 1: Foundation (This session + next 1-2 sessions)
- Database migrations for new tables
- Seed cinematic_options from Airtable data (251 records)
- Avatar library UI and data model
- Enhanced shot decomposition with timing and categories
- Cinematography panel component
- Prompt composition engine

### Phase 2: Generation Pipeline (2-3 sessions)
- Start + end frame generation flow
- fal.ai integration for image generation
- Bulk generation with queue system
- Multi-agent parallel generation
- Generation progress dashboard
- Shot approval workflow

### Phase 3: Video + Assembly (2-3 sessions)
- Start+end frame video interpolation
- Camera motion parameters
- Auto-generate mode with rate limiting
- FFmpeg assembly pipeline
- Export to final video

### Phase 4: Polish + Advanced Features (ongoing)
- Angle variations (Angles V2 concept)
- Relighting controls
- Style moodboards
- Motion graphics for titles/credits
- Drag-and-drop timeline editing
- Sound design integration

---

## Open Questions
1. Should we support Sora or other video models as they become API-accessible?
2. Do we need a separate "Director Review" mode where someone else approves the storyboard?
3. Should the avatar library be shared across all projects or per-user only?
4. What's the budget ceiling per video generation? (cost tracking is already in the DB)
