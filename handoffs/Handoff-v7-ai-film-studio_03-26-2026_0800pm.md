# Handoff v7 - Cinema Studio (Production Pipeline)
## March 26, 2026

---

## Starter Message

> I'm working on the Cinema Studio project, which is a standalone AI video production
> pipeline. The project lives at `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio/`.
> Read the handoff at `handoffs/Handoff-v7-ai-film-studio_03-26-2026_0800pm.md` and
> the architecture spec at `docs/architecture-production-pipeline-v1.md`. This was
> originally branched from ai-film-studio but is now its own independent project in its
> own folder. No code changes have been made yet. This session should focus on Phase 1:
> database migrations for cinematic options, avatar library, shot cinematography, and
> generation queue tables. Seed the 251 cinematic options. Build the avatar library UI
> and cinematography panel component. Run locally only with `npm run dev`, do NOT deploy
> to Netlify. The original ai-film-studio is untouched on main branch.

---

## IMPORTANT: Project Structure

This project is a STANDALONE copy of ai-film-studio, living in its own folder:
- **This project**: `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio/`
- **Original (untouched)**: `/Users/jasonjvazquez/Documents/CLAUDES/ai-film-studio/`
- **No git remote**: Remote was removed so nothing accidentally deploys
- **Run locally**: `npm run dev` only, no Netlify pushes during development

---

## What Was Accomplished (This Session)

### 1. Airtable Data Audit
- Connected to Jason's Airtable and audited two bases:
  - **Character Consistency Prompts** (appd6rlSCV3jWVkvr): 251 cinematic options,
    51 shots in shotlist, 3 assets including character "Lea"
  - **Avatar Gallery** (applFoz7IFLBVkhwy): 5 avatars with full metadata
- Pulled 200 of 251 cinematic option records with full data. Remaining 51 need one
  more pagination call (cursor: `itrpptkwcjkuUFGt7/recmJd7817dFXbSF4`)
- Cinematic option types: Camera Body (~20), Focal Length (~19), Lens Type (~20),
  Film Stock (~24), Lighting Source (~20), Lighting Style (~15), Atmosphere (~20),
  Environment (~30), Look and Feel (~30), Filter/Effect (~30), Aspect Ratio (~10),
  Style (~13)

### 2. Higgsfield.ai Research
- Deep research on Higgsfield's feature set for inspiration:
  - **Cinema Studio 2.0/2.5**: Character-first workflow, virtual camera controls,
    post-production color grading. Uses GPT-4 mini for planning layer.
  - **Soul Cast**: AI character builder with 8 parameters (genre, budget, era,
    archetype, identity, appearance, details, outfit). Maintains consistency
    across scenes.
  - **Soul Moodboard**: Upload 10-80 reference images to create custom visual styles.
  - **Angles V2**: Multi-angle generation from single image. 360-degree virtual camera.
  - **Relight**: Depth-mapping based relighting with directional controls.
  - **Vibe Motion**: Chat-based motion graphics creation.

### 3. Project Setup
- Originally created git branch `feature/production-pipeline` on ai-film-studio
- Jason requested a standalone folder instead (easier for handoffs, no git confusion)
- Copied ai-film-studio into `/CLAUDES/cinema-studio/`
- Removed git remote so nothing accidentally deploys
- Switched original ai-film-studio back to main branch (untouched)

### 4. Architecture Spec Written
- Full spec at `docs/architecture-production-pipeline-v1.md`
- Covers: 8-stage pipeline, database schema, API routes, UI components,
  multi-agent generation, prompt composition engine, build phases

---

## What Is Still Needed (Priority Order)

### Phase 1: Foundation (Next 1-2 sessions)
1. Database migrations for new tables (cinematic_options, avatars, project_characters,
   shot_characters, shot_cinematography, generation_queue)
2. Modifications to existing shots table (start_frame_url, end_frame_url,
   shot_category, target_duration_seconds, sequence_order, is_approved)
3. Seed 251 cinematic options into Supabase
4. Seed 5 starter avatars into Supabase
5. Avatar Library UI (video-game style character select)
6. Cinematography Panel component (dropdowns, live prompt preview)
7. Prompt composition engine

### Phase 2: Generation Pipeline (2-3 sessions)
8. Enhanced script decomposition with timing and shot categories
9. Start + end frame generation (two images per shot)
10. fal.ai integration for Flux Pro image generation
11. Bulk generation with queue and progress dashboard
12. Multi-agent parallel generation (5 image, 3 video concurrent)

### Phase 3: Video + Assembly (2-3 sessions)
13. Start+end frame video interpolation via Veo 3.1 or Kling 3.0
14. Camera motion parameters from cinematography selections
15. Auto-generate mode with rate limiting
16. FFmpeg assembly pipeline
17. Export to MP4 at 1080p/4K

### Phase 4: Polish + Advanced (ongoing)
18. Angle variations, relighting controls, style moodboards
19. Motion graphics for titles/credits
20. Drag-and-drop timeline, sound design integration

---

## Where We Left Off

- Standalone project at `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio/`
- Architecture spec is complete and saved
- All Airtable data audited, 200/251 cinematic options pulled
- No code changes made yet. Ready to start Phase 1.
- Airtable base IDs for reference:
  - Character Consistency Prompts: `appd6rlSCV3jWVkvr`
  - Avatar Gallery: `applFoz7IFLBVkhwy`

---

## Known Issues or Blockers

1. **fal.ai API key** needed in .env.local (Jason has credits, key may not be set up)
2. **VM disk space** fills up often. Use Desktop Commander for file ops on Mac.
3. **DO NOT deploy to Netlify** during development. Local only with `npm run dev`.
4. **Video interpolation** needs testing: verify Veo 3.1 and Kling 3.0 support
   start+end frame mode via Kie.ai API.

---

## Key Decisions Made

1. **Standalone project folder** at `/CLAUDES/cinema-studio/` (not a git branch)
2. **No Airtable dependency** in the app. Data structure seeded into Supabase.
3. **fal.ai primary** for image gen, Kie.ai (Nano Banana 2) as secondary
4. **Start+end frame interpolation** for video (not single image-to-video)
5. **Multi-agent parallel generation** with queue (5 image, 3 video concurrent)
6. **Local development only** until stable. No Netlify pushes.
7. **Higgsfield-inspired features**: Soul Cast and Cinema Studio are HIGH priority.
   Angles V2, Relight, Moodboard, Vibe Motion are for later phases.
8. **Prompt composition formula**: style + subject + environment + camera + lens +
   film + lighting + atmosphere + look + filter
9. **Quality**: Ultra-realistic with skin texture and subtle flaws, no waxy look.
   Also clean animation style as a per-project option.
10. **FFmpeg** for code-based video editing and final assembly.

---

## Files in This Project

### Created this session
- `docs/architecture-production-pipeline-v1.md` - Full architecture spec
- `handoffs/Handoff-v7-ai-film-studio_03-26-2026_0800pm.md` - This handoff

### Inherited from ai-film-studio (already working)
- `src/app/api/generate-image/route.ts` - Kie.ai Nano Banana Pro integration
- `src/app/api/generate-video/route.ts` - Veo 3.1 + Kling via Kie.ai
- `src/app/api/generate-shots/route.ts` - Gemini 2.5 Flash shot decomposition
- `src/app/api/generate-avatar/route.ts` - HeyGen avatar video
- `src/lib/types/database.ts` - TypeScript types for all tables
- Full Next.js + Supabase + Tailwind stack ready to build on
