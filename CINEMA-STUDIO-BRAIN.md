# Cinema Studio Brain
**Last updated:** March 29, 2026 (Session 4: Context tab simplified, duration enforcement, injection prompts, voice moved, manual-first approach)
**Update this file at the END of every session. Read it at the START of every session.**

---

## What Is Cinema Studio

Cinema Studio is a production pipeline tool for pre-production and storyboarding. It takes a written script and turns it into a visual storyboard with AI-generated shots, timing, camera direction, and exportable PPTX. It is NOT a video editor. It is NOT a script writer. It is a tool for people who already have a script and need to visualize it before production.

The target user is someone on a content team who has a script in hand and needs to: break it into shots, assign talent, get visual direction from AI, approve a mood board, and export a storyboard for the production crew.

---

## Deployment Plan

There are TWO versions of Cinema Studio:

1. **Jason's Portfolio Version**: Lives inside the portfolio site. Will be merged from local once stable. Deploys to Netlify as part of `jason-vazquez-portfolio`. This is the showcase version.

2. **Arctic Wolf Version**: A completely separate copy with its own GitHub repo, its own Netlify site, its own Supabase project (or shared, TBD). This is the production version for the Arctic Wolf content team. Must be fully independent from Jason's portfolio. Will be created by cloning the stable local version once it's ready.

**Current state:** All work is on the LOCAL copy only. Nothing is deployed. Do not push, deploy, or touch the live Netlify site without Jason's explicit approval.

---

## Tech Stack

- Next.js 15 with App Router
- React 19
- Supabase (auth, database, storage)
- Tailwind CSS 4
- Anthropic Claude API (claude-sonnet-4-20250514) for pipeline agents
- pptxgenjs for server-side PPTX generation (requires Node.js runtime, not edge)
- Git branch: `main-clean` (orphan branch, push with `git push origin main-clean:main`)
- Dev command: `NODE_ENV=development npm run dev` (Jason's Mac has global NODE_ENV=production)
- Use `--turbopack` flag for dev mode (avoids webpack hydration bug in Next.js 15.5.12)
- Supabase project ID: `lrthwlwrfjeuvwlaqgah`

---

## Design Language (Wext)

- Zero border-radius on everything
- Montserrat 700 uppercase for labels, Raleway for body text
- Dark theme: #0a0a0a background, #111 card surfaces
- Accent: #ff2d7b (pink), gradient: #ff264a to #ff2d7b
- All icons must be SVG (no emojis as icons)
- Borders: rgba(255,255,255,0.06) to rgba(255,255,255,0.08)
- Text hierarchy: white > rgba(255,255,255,0.4) > rgba(255,255,255,0.3)

---

## Tab Architecture

The workspace has 8 tabs in this exact order:

1. **Context** (default tab): Project setup ONLY. Production Mode (Live Action vs Animation), Target Duration, Synopsis/Story Context, and Creative Direction. This tab does NOT generate scripts. There is no "Generate Script" button. The user writes or pastes their script in the Script tab. All fields auto-save on blur and persist to Supabase via `/api/save-project-settings`. If the generated storyboard exceeds the target duration, a warning banner appears on the Shots tab with "Approve As-Is" or "I'll Trim Manually" options.

2. **Script**: Script editor with word/character count. The "Generate Storyboard" button lives here (moved from Context). This is where the user triggers shot breakdown from their script.

3. **Shots**: The generated shot list. Each shot has: title, description, shot type, camera movement, focal length, shot category, duration, dialogue, narration, image URL. View options: Compact List, List View, Grid View, Large Grid View. Alternating borders: white (#ffffff) and bright teal (#00e5ff). Done checkbox per shot (green checkmark, dims card when checked). After storyboard generation, an "Add Special Shots?" prompt appears offering: Title Card, Full Screen Graphic, On-Screen Text, Motion Graphics, End Credits. These are injected as placeholder shots. The AI does not auto-generate title cards; the user decides when and where to place them. Voice dropdown lives INSIDE the Voice & Audio accordion per shot (not in the talent row).

4. **Avatar Builder** (was "Characters"): Currently broken. Does not have the dropdown features from the portfolio Avatar Generator. Will be fixed later. Primary use cases: (1) Create placeholder talent when no real talent images exist. (2) Reposition/restyle existing talent images (change clothing, pose, etc.). The Avatar Builder is NOT the primary way talent enters the system. Most talent comes from uploading real images directly to the Library tab. Avatar Builder is supplementary.

5. **Cinematic Controls** (was "Loadout"/"Cinematography"): Camera settings, movements, prompt preview. Per-shot or apply-to-all. The dropdown inside Shots that shows cinematography options must also be called "Cinematic Controls" for consistency.

6. **Timeline**: Visual timeline with tracks, playback controls, zoom. Will evolve into a real editing surface (drag shots, adjust timing, VO placement).

7. **Library** (was "Assets"): The primary hub for all project assets. This is where talent images are UPLOADED (not just created via Avatar Builder). Users upload photos of real talent here. Categories: Talent, Product, Background, Audio (Voice), DELETED. Layout needs full redesign; current version is a mess. The redesign should make it obvious how to upload talent, organize by character, and assign to shots. This is the #1 priority for the next session.

8. **Mood Board**: Drawing tools, import, reference images. Will become an approval gate in the pipeline.

### Action Bar Layout
- Left side: "Automate" button (toggles pipeline panel), "Generate Storyboard" button (was in Context, now next to Automate)
- Right side: "Export PPTX" button (isolated on right)
- Full Pipeline and Script Only buttons inside the pipeline panel need to be narrower (currently too wide)

### Animation Mode
When the user selects "Animation" mode in the Context tab, the AI switches gears. The storyboard is still generated with all the same fields (shots, timing, camera, etc.) but the AI knows the output is for motion designers, not live-action crews. Animated pieces still need everything a normal storyboard needs, but the AI adjusts its thinking: no live talent needed, graphic placeholders instead of photo-real images, and voice generation becomes critical for animation timing.

---

## Pipeline Architecture

The Automate button triggers the pipeline. Pipeline agents run sequentially:

**Current flow:**
Script Analysis > Visual Direction > Character Extraction > Image Generation > Export Compile

**Target flow (being built):**
Script Analysis > Talent Check (are all characters covered in Assets?) > Visual Direction > Mood Board Approval Gate > Image Generation > Export

**Automate prerequisites (must be enforced):**
1. All characters in the script must have approved talent profiles in the Library tab (created via Avatar Builder)
2. If prerequisites are not met, show a clean notification (not a text wall) pointing user to what's missing, e.g. "3 characters in your script don't have approved looks yet."
3. Mood board approval gate: AI generates style frames, user approves before image generation proceeds
4. Check existing project references before generating new ones

**Pipeline panel:**
- Collapsible (saves screen real estate)
- Cards display in execution order (Script Analysis at top)
- Status summary shown inline when collapsed
- Run Again resets state

**AI Director prompt (Script Analysis agent):**
- Thinks like a Director/DP
- Timing: 1 second per 2.5 words of dialogue, plus action complexity and shot type
- Focal lengths: 24mm to 135mm with purpose-driven selection
- Camera movement must have a reason
- Shot categories: live_action, fsg (Full Screen Graphic), mogfx (Motion Graphics), title, ost (On Screen Text), end_credits
- Uses project target_duration_seconds (default 180) to guide total duration
- No hardcoded defaults for timing

---

## PPTX Export

- White/printer-friendly design (not dark theme)
- Color images preserved
- Arial font throughout
- Table format: SHOT, CAM, ANIMATION MOVEMENTS, FRAME, VO/DIALOG, TIME
- Large reference image below table, shot details on right
- Footer: project name + "Cinema Studio Export"
- Uses pptxgenjs (Node.js runtime required)

---

## Database Schema (Key Tables)

**shots table columns:**
id, project_id, user_id, sort_order, title, description, duration_seconds, shot_type, camera_movement, dialogue, narration, nano_prompt, veo_prompt, contact_sheet_prompt, focal_length, generation_status, image_url, video_url, contact_sheet_url, video_variations (jsonb), metadata (jsonb), created_at, updated_at, start_frame_url, end_frame_url, shot_category, target_duration_seconds, sequence_order, is_approved

**shots constraint:** generation_status must be one of: pending, generating, completed, failed

**projects table:** includes target_duration_seconds (integer, default 180), project_mode (text, default 'live_action', CHECK: 'live_action' or 'animation')

---

## API Routes

| Route | Runtime | Purpose |
|-------|---------|---------|
| `/api/generate-script` | Node.js | AI screenwriter agent (Claude Sonnet). Takes synopsis, creative direction, target duration, project mode. Writes a full production-ready script optimized for storyboard breakdown. Saves script + settings to project. Animation-aware. |
| `/api/generate-shots` | Edge | Shot breakdown from finished script (Gemini). Parses script into individual shots with timing, camera, dialogue. |
| `/api/pipeline/run` | Node.js | Full pipeline orchestrator (Claude Sonnet). Runs Script Analysis agent as AI Director/DP. Animation-aware via project_mode. |
| `/api/save-project-settings` | Node.js | Lightweight settings saver. Accepts projectMode, targetDuration, description, creativeDirection. Partial updates (only saves provided fields). |
| `/api/save-asset` | Node.js | Saves/classifies assets. Default type changed from 'other' to 'talent'. |
| `/api/export-pptx` | Node.js | PPTX generation via pptxgenjs. White/printer-friendly. Requires Node runtime. |
| `/api/update-shot` | Node.js | Updates a single field on a shot. Used by inline editing and Cinematic Controls apply-to-shot. Allowed fields whitelist. |
| `/api/cinematic-options` | Node.js | Returns all cinematic options from DB grouped by type (251 options across 12 types). |

---

## Avatar Generator Dropdown Source

The dropdown options for talent creation come from `/jason-vazquez-portfolio/constants.ts`, exported as `ATTRIBUTE_OPTIONS`. 18 fields total. Read that file when building the Characters tab overhaul.

---

## Future Phases (Priority Order)

### Phase 2: Avatar Builder + Library Tab Overhaul
**DONE (code changes applied):**
- Characters tab renamed to "Avatar Builder" in UI
- Assets tab renamed to "Library" in UI
- Loadout tab renamed to "Cinematic Controls" in UI
- Cinematography dropdown in ShotCard renamed to "Cinematic Controls"
- OTHER category replaced with DELETED in AssetType and AssetLibrary
- LUT category removed
- Shot view options added to Shots tab: List, Grid, Large Grid
- Animation mode toggle added to Context tab (Live Action vs. Animation)
- Generate Storyboard moved to action bar (next to Automate, left side)
- Generate Script button added to Context tab
- Export PPTX moved to right side of action bar
- Video Generation is now a toggle in Shots (hidden when off)
- Generate Avatar moved from Voice & Audio to Video Generation section
- Voice options expanded: 16 voices (8M/8F), gender/accent filters, speed control slider (0.5x-2x), language selector (11 languages)
- Full Pipeline and Script Only buttons narrowed (no longer full-width)

- /api/generate-script endpoint created (Claude API, expert screenwriter agent, pipeline-aware)
- /api/save-project-settings endpoint created (saves project_mode, target_duration, etc.)
- Animation mode wired through to generate-script API and pipeline AI Director prompt
- Database migration applied: `projects.project_mode` column added (text, default 'live_action', CHECK constraint)
- All routes compile clean on localhost with Turbopack (zero errors)
- Fixed pipeline constraint error: `shots_shot_category_check` updated to accept pipeline categories (live_action, fsg, mogfx, title, ost, end_credits)
- Rewrote `prompts.ts` (generate-shots prompt): removed hardcoded 8s duration, removed 85mm lens lock, added proper timing rules, focal length must match shot type, varied camera movement
- Fixed background color: CSS variables changed from white to dark theme (#0a0a0a bg, #111 surfaces), page container uses full height
- Shot cards now have alternating white/teal borders
- Added "done" checkbox (top-right of each card, fluorescent green checkmark, dims card when checked)
- Done counter in toolbar (shows X/Y Done)
- Removed red "Avatar" badge from shots (was noise from old Veo-focused prompt)
- Added compact expandable list view: all shots on one page as rows showing #, title, metadata (duration, type, focal length, movement), click to expand full ShotCard
- Created `/api/update-shot` endpoint (was missing, caused all inline edits and Cinematic Controls to silently fail)
- Created `/api/cinematic-options` endpoint (was missing, caused Cinematic Controls to show "Failed to load")
- Fixed Cinematic Controls "Apply to Shot": now persists camera_movement and metadata to database via update-shot API

**STILL NEEDED (Priority Order):**
1. **Library tab full redesign** (next session priority). Current layout is unusable. Needs clean upload flow for talent images, clear category organization, and obvious path from Library to shot assignment.
2. **Multi-character per shot**: ability to assign multiple talent + voices to a single shot.
3. **Avatar Builder fix**: Port dropdown options from portfolio Avatar Generator (18 fields). Lower priority since talent primarily enters via Library upload.
4. **Auto-delete DELETED assets** after 30 days (Supabase cron).
5. **Talent approval flow**: approved talent in Library can be auto-applied to shots they appear in.

### Phase 3: Pipeline Redesign (MANUAL FIRST)
Jason's directive: Get the manual workflow solid before touching automation. The Automate Pipeline is on hold until:
- Library tab works properly (talent upload + assignment)
- Manual storyboard generation is reliable
- Title card / FSG / MoGFX injection is working smoothly
Once manual is solid, then fix pipeline:
- Enforce talent prerequisites before Automate runs
- Remove "Create Image" / "Text-to-Video" tool suggestions from pipeline output
- Sync pipeline prompt with prompts.ts rules (timing, lens, categories)
- Pipeline respects target duration

### Phase 4: DP Collaboration Mode
- Shareable project links with permissions: Owner, Editor, Viewer
- Copy-on-share (shared version is a copy, not the original)
- Shot list view with focal length filters (group same focal lengths for efficient shooting)
- Filter options: focal length, shot type, shot category, character

### Phase 5: Timeline and Graphics
- Timeline as real editing surface (drag shots, adjust timing, VO placement)

---

## Known Gotchas

- VM disk fills up (ENOSPC). Use Desktop Commander for Mac shell commands when this happens.
- Jason's Mac username is `jasonjvazquez` (extra "j")
- Multiple Next.js dev servers can run simultaneously. Kill strays: `lsof -ti:3000 | xargs kill -9`
- Supabase OAuth may redirect to Netlify instead of localhost. Fix: add `http://localhost:3000/**` to Supabase redirect URLs.
- Netlify auto-deploy disabled (`stop_builds: true`). Never deploy without Jason's approval.
- Turbopack dev mode works; webpack dev mode has hydration bugs in Next.js 15.5.12
- `shot_category` constraint was updated to accept: live_action, fsg, mogfx, title, ost, end_credits, narrative, graphic, credits, transition, voiceover
- `prompts.ts` is the generate-shots prompt (Gemini path); `pipeline/run/route.ts` has the pipeline prompt (Claude path). Both must stay in sync on timing/lens/category rules.
- `/api/update-shot` and `/api/cinematic-options` were missing for a long time. If any new feature calls an API that 404s, check if the route file actually exists.

---

## Session Checklist

Every session working on Cinema Studio:
1. Read the `jasons-project-context` skill (general rules)
2. Read THIS file (Cinema Studio state)
3. Check `handoffs/` for the latest handoff if continuing from a previous session
4. Confirm what we're working on before writing code
5. At end of session: UPDATE THIS FILE with any new decisions, completed work, or changed plans
6. Write a handoff if context is getting long (50K+ tokens)

---

## Session Log

### Session 1 (March 29, 2026)
Phase 1 completed: Sidebar-to-tab migration, AI Director prompt rewrite, PPTX export redesign, pipeline fixes, hardcoded 8s duration removal. Created Handoff-v11.

### Session 2 (March 29, 2026)
Phase 2 UI overhaul: Tab renames (Avatar Builder, Cinematic Controls, Library), action bar restructure, shot view modes (List/Grid/Large Grid), Animation mode toggle, Video toggle, voice expansion (16 voices, gender/accent/speed/language filters), Generate Script button, asset type cleanup (removed LUT, replaced Other with DELETED). Created CINEMA-STUDIO-BRAIN.md. Updated project-map.md.

### Session 3 (March 29, 2026)
Created `/api/generate-script` endpoint (Claude Sonnet, expert screenwriter, animation-aware). Created `/api/save-project-settings` endpoint. Wired Animation mode end-to-end. Added `project_mode` column to projects table.

Then tackled Jason's full feedback list:
- Fixed pipeline crash: `shots_shot_category_check` constraint was rejecting pipeline's categories. Updated constraint to accept both old and new values.
- Rewrote `prompts.ts`: removed all Veo-centric hardcoding (8s durations, 85mm lens lock, avatar candidate logic). New prompt uses proper timing rules (word count based), requires focal length to match shot type, varies camera movement.
- Fixed white background bleed: CSS `:root` variables changed from white to dark theme. Page container uses full height.
- Shot cards: alternating white (#ffffff) / bright teal (#00e5ff) borders, "done" checkbox with fluorescent green check, done counter in toolbar.
- Removed red "Avatar" badge (old Veo noise).
- Added compact expandable list view (4th view mode): all shots on one page as collapsible rows.
- Created `/api/update-shot` (was missing; all inline edits and Cinematic Controls were silently failing).
- Created `/api/cinematic-options` (was missing; Cinematic Controls couldn't load dropdown options).
- Fixed Cinematic Controls "Apply to Shot": now persists to DB.

Files modified: `src/lib/ai/prompts.ts`, `src/app/globals.css`, `src/app/project/[id]/page.tsx`, `src/components/ShotCard.tsx`, `src/components/ShotList.tsx`, `src/app/api/update-shot/route.ts` (new), `src/app/api/cinematic-options/route.ts` (new), `src/app/api/generate-script/route.ts` (new), `src/app/api/save-project-settings/route.ts` (new), `src/components/ScriptPanel.tsx`, `src/app/api/pipeline/run/route.ts`, `CINEMA-STUDIO-BRAIN.md`.

### Session 4 (March 29, 2026)
Major direction change based on Jason's feedback. Manual-first approach; automation is on hold.

Changes made:
- **Context tab completely rewritten**: Removed "Generate Script" button and all AI script generation. Context is now purely for project direction: Production Mode, Target Duration, Synopsis, Creative Direction. Auto-saves on blur. Guidance note tells user to write script in Script tab.
- **Duration enforcement**: After Generate Storyboard, if total shot duration exceeds target, an orange warning banner appears with "Approve As-Is" or "I'll Trim Manually" buttons.
- **Post-storyboard injection prompt**: After storyboard generates (and duration is approved), a teal prompt asks if user wants to insert special shots: Title Card, Full Screen Graphic, On-Screen Text, Motion Graphics, End Credits. Adds placeholder shots. "Skip for now" dismisses.
- **Voice dropdown moved**: Removed from talent row in ShotCard body. Now lives inside the Voice & Audio accordion section with its own "VOICE" label. Asked for twice, finally done.
- **Duplicate checkbox fixed**: Compact list view was showing a checkbox in the row AND inside the expanded ShotCard. Added `hideCheckbox` prop to ShotCard; compact view passes `hideCheckbox={true}`.
- **Alternating borders finalized**: White (#ffffff) and bright teal (#00e5ff). No more rgba transparency, no more dull colors.
- **Project type interface updated**: Added `target_duration_seconds` and `project_mode` to the TypeScript `Project` interface (were in DB but missing from types).
- **Generate Storyboard now sends more context**: Passes targetDuration, projectMode, and synopsis to the API alongside script and creativeDirection.
- **Brain updated** with revised tab descriptions, manual-first directive, Library redesign as next priority.

Key decisions:
- Avatar Builder is supplementary, not primary. Talent enters via Library upload.
- No AI script generation in the Context tab. User writes their own script.
- Title cards and FSG are NOT auto-generated by AI. User manually injects them post-storyboard.
- Pipeline automation is frozen until manual workflow is solid.
- Library tab redesign is the #1 priority for next session.

Files modified: `src/components/ScriptPanel.tsx` (full rewrite), `src/components/ShotCard.tsx`, `src/components/ShotList.tsx`, `src/components/ProjectWorkspace.tsx`, `src/lib/types/database.ts`, `CINEMA-STUDIO-BRAIN.md`.
