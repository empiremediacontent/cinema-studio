# Handoff v8 - Cinema Studio (Production Pipeline Phase 1)
## March 26, 2026

---

## Starter Message

> I'm working on the Cinema Studio project at `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio/`.
> Read the handoff at `handoffs/Handoff-v8-ai-film-studio_03-26-2026_1100pm.md` and
> the architecture spec at `docs/architecture-production-pipeline-v1.md`. Phase 1 foundation
> is COMPLETE: database migration, 251 cinematic options seed data, TypeScript types,
> Avatar Library (video-game character select), Cinematography Panel (loadout screen with
> 12 equipment slots), prompt composition engine, API routes, and workspace integration.
> Build passes clean (tsc + next build). Next steps: run the migration SQL in Supabase,
> seed the 251 options via the /api/seed-cinematic-options endpoint, seed starter avatars,
> then move to Phase 2 (start/end frame generation, fal.ai integration, bulk generation queue).
> Run locally only with `npm run dev`, do NOT deploy to Netlify.

---

## What Was Accomplished (This Session)

### 1. Database Migration (005_production_pipeline.sql)
- Created 6 new tables: cinematic_options, avatars, project_characters,
  shot_characters, shot_cinematography, generation_queue
- Created 1 project-level defaults table: project_cinematography_defaults
- Added 6 new columns to existing shots table: start_frame_url, end_frame_url,
  shot_category, target_duration_seconds, sequence_order, is_approved
- Full RLS policies on every table
- Indexes on all foreign keys and query-heavy columns

### 2. TypeScript Types (database.ts)
- Added all new types: CinematicOption, Avatar, ProjectCharacter, ShotCharacter,
  ShotCinematography, GenerationQueueItem, ProjectCinematographyDefaults
- Added new enums: CinematicOptionType (12 values), GenderPresentation,
  AgeAppearance, ShotCategory, MotionIntensity, CameraMovement (14 values),
  QueueGenerationType, GenerationService
- Added CinematicOptionsMap for grouped dropdown data
- Added ReferenceImage interface for avatar reference photos
- Updated Shot interface with new production pipeline fields

### 3. Cinematic Options Seed Data (251 records)
- Created `/src/lib/data/cinematic-options-seed.ts`
- 12 categories with detailed prompt fragments and descriptions:
  - Camera Body: 20 (ARRI ALEXA 65, RED V-RAPTOR, Sony VENICE 2, etc.)
  - Focal Length: 19 (8mm ultra-wide through 400mm tele + tilt-shift)
  - Lens Type: 20 (Anamorphic, Cooke S7/i, Zeiss Master Prime, etc.)
  - Film Stock: 24 (Kodak Vision3 500T, Portra 400, CineStill 800T, etc.)
  - Lighting Source: 20 (Window, Golden Hour, Neon, Candle, UV, etc.)
  - Lighting Style: 15 (Rembrandt, Butterfly, Split, Chiaroscuro, etc.)
  - Atmosphere: 20 (Tense, Dreamy, Epic, Nostalgic, Electric, etc.)
  - Environment: 30 (Urban, Forest, Desert, Neon Alley, Space, etc.)
  - Look & Feel: 30 (Blade Runner, Dune, Dark Knight, Wong Kar-wai, etc.)
  - Filter/Effect: 30 (Film Grain, Lens Flare, Halation, VHS Glitch, etc.)
  - Aspect Ratio: 10 (2.39:1 Anamorphic through 1.43:1 IMAX)
  - Style: 13 (Photorealistic, Cinematic Still, Anime, Documentary, etc.)
- Each option has: name, type, prompt_fragment, description, sort_order

### 4. Prompt Composition Engine
- Created `/src/lib/prompt-composer.ts`
- `composePrompt()`: assembles all selections into one generation-ready prompt
- Formula: style + subject + environment + camera/lens/film + lighting + atmosphere + look + filter + characters + movement + quality suffix
- Quality suffixes tuned per style (photorealistic gets skin texture instructions, animation gets clean linework instructions)
- Camera movement descriptions with 3 intensity levels per movement type
- Character injection: builds natural language descriptions from avatar metadata
- `getPromptPreviewParts()`: returns slot status for live UI preview
- `CINEMATIC_TYPE_LABELS` and `CINEMATIC_TYPE_ICONS`: UI display helpers

### 5. Avatar Library Component (Character Select)
- Created `/src/components/AvatarLibrary.tsx`
- Video-game style character select: grid of character cards with thumbnails
- Two view modes: "All Characters" (library) and "Party" (project roster, max 5)
- Character detail sheet with RPG stat bars (Versatility, Presence, Detail, Range)
- Search and filter by name, gender, age
- Add/remove characters from project roster
- Reference image grid for each character
- Age/gender/ethnicity badge pills
- "In Party" badge on equipped characters
- Supabase integration for CRUD operations

### 6. Cinematography Panel Component (Loadout Screen)
- Created `/src/components/CinematographyPanel.tsx`
- 12 dropdown "slots" in a grid, each showing category icon, selection state
- Equipped slots glow green, empty slots show "Not equipped"
- Clear button on each slot to unequip
- Camera Movement selector: 14 movement types with SVG icons
- Motion Intensity toggle: Subtle / Moderate / Dramatic
- Live Prompt Preview panel:
  - Slot status dots (green = filled, gray = empty)
  - Status pills showing each slot's selection
  - Auto-composed prompt updates in real time
  - Manual edit mode to override the auto-composed prompt
  - Character count display
- "X/13 equipped" counter with color coding (red < 5, orange 5-8, green > 8)

### 7. API Routes
- `GET /api/cinematic-options`: Returns all options grouped by type
- `GET /api/avatars`: Returns user's avatar library (own + public)
- `POST /api/avatars`: Create new character with full metadata
- `POST /api/seed-cinematic-options`: Seeds all 251 options into Supabase (safe to re-run)

### 8. Workspace Integration
- Updated `ProjectWorkspace.tsx` with 5 tabs: Shots, Characters, Loadout, Timeline, Assets
- Each tab has an SVG icon
- Characters tab shows AvatarLibrary component
- Loadout tab shows shot selector + CinematographyPanel
- Loadout tab has "Seed 251 Cinematic Options" button if DB is empty
- Lazy-loads cinematic options only when Loadout tab is opened

---

## What Is Still Needed (Priority Order)

### Immediate Next Steps (before testing the UI)
1. **Run migration SQL** in Supabase SQL Editor (005_production_pipeline.sql)
2. **Seed cinematic options** via POST /api/seed-cinematic-options (or the UI button)
3. **Seed starter avatars** into Supabase (5 from Airtable Avatar Gallery base)

### Phase 2: Generation Pipeline (Next 2-3 sessions)
4. Enhanced script decomposition with timing and shot categories
5. Start + end frame generation (two images per shot)
6. fal.ai integration for Flux Pro image generation
7. Bulk generation with queue and progress dashboard
8. Multi-agent parallel generation (5 image, 3 video concurrent)
9. Shot approval workflow

### Phase 3: Video + Assembly (2-3 sessions)
10. Start+end frame video interpolation via Veo 3.1 or Kling 3.0
11. Camera motion parameters from cinematography selections
12. Auto-generate mode with rate limiting
13. FFmpeg assembly pipeline
14. Export to MP4 at 1080p/4K

### Phase 4: Polish + Advanced (ongoing)
15. Angle variations, relighting controls, style moodboards
16. Motion graphics for titles/credits
17. Drag-and-drop timeline, sound design integration

---

## Where We Left Off

- All Phase 1 foundation code is written and compiles clean
- Build passes: `npx tsc --noEmit` (0 errors) and `npx next build` (success)
- Migration SQL is written but NOT yet run in Supabase
- Cinematic options are in seed file but NOT yet in the database
- No starter avatars seeded yet
- Ready to run migration, seed data, and test the UI locally

---

## Known Issues or Blockers

1. **Migration not yet applied**: Run `005_production_pipeline.sql` in Supabase SQL Editor
2. **fal.ai API key** needed in .env.local for Phase 2
3. **VM disk space** fills up. Use Desktop Commander for file ops on Mac.
4. **DO NOT deploy to Netlify** during development. Local only with `npm run dev`.
5. **Airtable avatar data** still needs to be pulled (5 avatars from `applFoz7IFLBVkhwy`)

---

## Key Decisions Made

1. **Video game metaphor** carried through the entire UI:
   - Characters = "Party" (max 5 per project)
   - Cinematic options = "Loadout" with "equip/unequip" language
   - Each slot shows "equipped" or "Not equipped"
   - Character stats use RPG-style stat bars
2. **12 cinematic option categories** (not just camera/lens, includes atmosphere, look & feel, style)
3. **Project-level defaults table** created for "Apply to All Shots" functionality
4. **Prompt composition formula** is modular: each slot contributes a fragment, concatenated with connecting phrases
5. **Quality suffixes** are style-dependent (photorealistic gets skin texture instructions)
6. **Camera movement** has 14 types with 3 intensity levels each = 42 possible movement descriptions
7. **Lazy loading** for cinematic options (only fetched when Loadout tab opened)
8. **Seed endpoint** is safe to re-run (clears and re-inserts)

---

## Files Modified/Created

### Created This Session
- `supabase/migrations/005_production_pipeline.sql` - All new tables + shots modifications
- `src/lib/types/database.ts` - Complete rewrite with all new types
- `src/lib/data/cinematic-options-seed.ts` - 251 options across 12 categories
- `src/lib/prompt-composer.ts` - Prompt composition engine
- `src/components/AvatarLibrary.tsx` - Character select screen
- `src/components/CinematographyPanel.tsx` - Shot loadout panel
- `src/app/api/cinematic-options/route.ts` - GET endpoint
- `src/app/api/avatars/route.ts` - GET + POST endpoints
- `src/app/api/seed-cinematic-options/route.ts` - POST seed endpoint
- `handoffs/Handoff-v8-ai-film-studio_03-26-2026_1100pm.md` - This handoff

### Modified This Session
- `src/components/ProjectWorkspace.tsx` - Added Characters + Loadout tabs, new imports
