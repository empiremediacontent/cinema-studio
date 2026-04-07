# Handoff v11 - Cinema Studio
**Date:** March 29, 2026
**Session Focus:** Layout restructure, AI Director prompt rewrite, PPTX redesign, pipeline fixes

---

## Starter Message

Continue working on Cinema Studio (LOCAL copy only). Read this handoff fully. IMPORTANT: This is a local development copy. Do NOT touch, deploy to, or modify the live deployed version on Netlify. All work happens locally and will be merged to the real app later when Jason gives explicit approval.

You have access to Jason's Mac via Desktop Commander MCP tools. Use `start_process` for shell commands on the Mac (starting dev servers, running git commands, etc.), and use Read/Edit/Glob tools for file operations through the mounted paths at `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio`. If the VM's internal disk fills up (ENOSPC errors), fall back to Desktop Commander for everything.

Last session we completed Phase 1 of the product evolution: moved Project Context from sidebar to first tab, rewrote the AI Director prompt with real timing logic and shot categories, redesigned PPTX export to be printer-friendly (white background), fixed the pipeline constraint error, made the pipeline panel collapsible with correct card ordering, and removed all hardcoded 8-second defaults. All changes are LOCAL only, not deployed.

The next steps are: (1) Test the full flow end-to-end on localhost (Context tab, AI shot generation with new Director prompt, PPTX export, pipeline), (2) Begin Phase 2 work on the Talent system overhaul using Avatar Generator dropdown options, (3) Start building the mood board approval gate into the pipeline.

The cinema-studio project is at `/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio` and uses git branch `main-clean`. Run with `NODE_ENV=development npm run dev`. Supabase project ID: `lrthwlwrfjeuvwlaqgah`.

---

## What Was Accomplished

### Layout Restructure: Sidebar to Tab
- Removed the Project Context sidebar entirely from ProjectWorkspace.tsx
- Added `context` as the first tab (before Script) in the WorkspaceTab union type
- Context tab renders ScriptPanel inside an 800px max-width container
- Default active tab is now `context` (was previously `shots`)
- Removed all `workspace-sidebar` CSS classes from globals.css
- Layout changed from flex-row (sidebar + main) to flex-column (full-width tabbed)
- Workspace-main now has 24px horizontal padding instead of depending on sidebar width

### Pipeline Fixes
- Fixed `shots_generation_status_check` constraint violation: changed `generation_status: 'idle'` to `'pending'` in pipeline/run/route.ts
- Fixed card ordering: added `AGENT_ORDER` sort array so Script Analysis appears at top, not bottom
- Made PipelinePanel collapsible: clickable header bar toggles content visibility, shows inline status summary when collapsed (Running X%, Complete, Failed)
- Chevron icon rotates on collapse/expand
- Error messages truncated to 80 chars in compact task rows

### AI Director Prompt Rewrite (pipeline/run/route.ts)
- Complete rewrite of `runScriptAnalysis` as an "AI Director/DP" agent
- System prompt now includes: timing rules (1 second per 2.5 words of dialogue), shot type reasoning, focal length selection (24mm to 135mm with descriptions), camera movement with purpose
- Added shot categories: `live_action`, `fsg` (Full Screen Graphic), `mogfx` (Motion Graphics), `title`, `ost` (On Screen Text), `end_credits`
- Uses `project.target_duration_seconds` (default 180, from new DB column) to guide total duration
- Stores `focal_length` and `shot_category` in shot inserts
- Duration is AI-calculated, not hardcoded; fallback is `null` instead of `8`

### Hardcoded 8-Second Default Removal
- `generate-shots/route.ts`: `duration_seconds` fallback changed from `|| 8` to `|| null`
- `export/route.ts`: total_duration fallback changed from `|| 8` to `|| 4`
- `TimelineEditor.tsx`: all `|| 8` changed to `|| 4`
- Pipeline script analysis: uses AI-calculated timing, fallback `null`

### PPTX Export Redesign (export-pptx/route.ts)
- Complete rewrite from dark theme to white/printer-friendly design
- Color palette: white background, dark navy headers (#1B2A4A), professional red accent (#E63946), black/gray text
- Arial font throughout for universal compatibility
- Table format per slide: SHOT, CAM, ANIMATION MOVEMENTS, FRAME, VO/DIALOG, TIME
- Large reference image below table on left side, shot details on right
- Clean footer with project name and "Cinema Studio Export"
- Uses Node.js runtime (not edge) for pptxgenjs compatibility

### Database Migration Applied
- `ALTER TABLE projects ADD COLUMN target_duration_seconds integer DEFAULT 180;`
- Applied to Supabase project `lrthwlwrfjeuvwlaqgah`

### Action Bar
- Automate and Export PPTX buttons sit below the tab bar, above tab content
- Automate toggles PipelinePanel visibility
- Export PPTX downloads blob as `{ProjectTitle}_Storyboard.pptx`

---

## What Is Still Needed (Priority Order)

### Immediate: End-to-End Testing
1. Test Context tab renders ScriptPanel correctly on localhost
2. Test AI shot generation with new Director prompt (verify real timing, focal lengths, shot categories)
3. Test PPTX export with new white/printer-friendly design
4. Test pipeline execution (constraint fix, card ordering, collapsibility)
5. Verify no regressions in Shots, Characters, Loadout, Timeline, Assets, Mood Board tabs

### Phase 2: Characters Tab + Assets Tab Overhaul

**Characters Tab = Talent Creation Workshop**
- This tab is ONLY for building new talent. It is a creation tool, not a library.
- Uses Avatar Generator dropdown options from `/jason-vazquez-portfolio/constants.ts` (ATTRIBUTE_OPTIONS export)
- 18 dropdown fields: Race, Gender, Age, Height, Body Type, Skin Tone, Eye Color, Hair Color, Hairstyle, Outfit, Pose, Emotion, Background, Shot Type, Camera Angle, Lighting, Realism Style, plus Gender Identity
- Each talent gets sub-folders for different "looks" (e.g., "Detective outfit," "Casual at home")
- Each look has a reference image, list of attributes, and an "approved" flag
- Once a talent is created and approved, it lives in the Assets tab

**Assets Tab = The Store / Library**
- This is where all project assets live, organized by category. Users "shop" here when assigning assets to shots.
- Asset categories:
  - **Talent**: Approved talent profiles (created in Characters tab, stored here)
  - **Products**: Product assets for the project
  - **Backgrounds**: Background images/references
  - **Audio (Voice)**: Voice-over and audio assets
  - **LUT**: Not needed, skip this category
  - **Other**: Miscellaneous assets with auto-delete rule (emptied automatically every 30 days)
- The Assets tab is the prerequisite source for Automate. Before the pipeline can run, the user must have approved talent in Assets that matches every character referenced in the script.

**Automate Prerequisites (enforced before pipeline runs):**
1. All characters in the script must have approved talent profiles in Assets
2. If prerequisites are not met, show a clean notification (not a text wall) telling the user what's missing and pointing them to the right tab
3. Mood board approval gate: before image generation, AI generates style frames for user approval
4. Check existing references in the project before generating new ones

### Phase 3: Pipeline Redesign
- Enforce the talent + mood board prerequisite checks described above
- User guidance via notifications (not text walls) when prerequisites are missing
- Pipeline flow: Script Analysis -> Talent Check (are all characters covered?) -> Visual Direction -> Mood Board Approval Gate -> Image Generation -> Export

### Phase 4: DP Collaboration Mode
- Shareable project links with permissions: Owner, Editor, Viewer
- Copy-on-share: shared version is a copy, not the original
- Shot list view with focal length filters (group by focal length for efficient camera setup on set)
- Filter options: focal length, shot type, shot category, character

### Phase 5: Timeline and Graphics
- Timeline tab as real editing surface (drag shots, adjust timing, VO placement)
- Placeholder shots for FSG, MoGfx, Title, End Credits, OST (non-video graphic types)
- These appear in storyboard but skip video generation in pipeline

---

## Where We Left Off

All Phase 1 code changes are complete and saved to files. The sidebar-to-tab migration was the last code change. CSS cleanup of unused `.workspace-sidebar` rules was completed. No testing has been done on localhost yet since this was all built in the VM with file edits. Jason needs to:
1. Kill any running dev servers
2. Run `NODE_ENV=development npm run dev` in the cinema-studio directory
3. Test the full flow at http://localhost:3000

---

## Known Issues or Blockers

1. **THIS IS A LOCAL COPY ONLY**: Do NOT deploy, push, or modify the live Netlify site. All work is local. Merging to the real app happens later with Jason's explicit approval.
2. **Desktop Commander access**: You have full access to Jason's Mac via Desktop Commander MCP tools. Use `mcp__Desktop_Commander__start_process` for shell commands (starting dev servers, git, npm, etc.), `mcp__Desktop_Commander__read_file` / `mcp__Desktop_Commander__write_file` for file I/O on the Mac, and `mcp__Desktop_Commander__list_directory` to browse. Jason's Mac username is `jasonjvazquez`. All projects live at `/Users/jasonjvazquez/Documents/CLAUDES/`.
3. **VM disk full (ENOSPC)**: The Cowork VM's internal disk fills up frequently. When Bash fails with disk errors, use Desktop Commander's `start_process` for Mac shell commands, and Read/Edit/Glob tools for file operations through mounted paths.
4. **Supabase OAuth redirect**: Jason needs `http://localhost:3000/**` in Supabase redirect URLs to test locally. If login redirects to Netlify, the redirect allowlist needs updating.
5. **Multiple dev servers**: Jason's Mac sometimes has multiple Next.js dev servers running (Cinema Studio, Second Brain/thynk-web, etc.). Always verify port 3000 is running the correct project before testing. Kill stray servers with `lsof -ti:3000 | xargs kill -9` if needed.
6. **`shot_category` column**: Exists in the shots table schema but was not explicitly added this session. If inserts fail on `shot_category`, a migration may be needed: `ALTER TABLE shots ADD COLUMN shot_category text DEFAULT 'live_action';`
7. **Netlify auto-deploy disabled**: `stop_builds: true` is set. Do not deploy without Jason's explicit approval.
8. **Git branch**: Cinema Studio uses orphan branch `main-clean`. Push with `git push origin main-clean:main`. Do NOT push without Jason's say-so.

---

## Key Decisions Made

1. **Project Context is a tab, not a sidebar.** First tab position, before Script. This frees up horizontal workspace for all other tabs.
2. **AI calculates real timing.** No more hardcoded 8-second defaults. The AI Director prompt uses 1 second per 2.5 words of dialogue, plus action complexity and shot type to determine duration. Default project target is 3 minutes (180 seconds).
3. **Shot categories added.** Six types: live_action, fsg, mogfx, title, ost, end_credits. Non-live-action types will eventually get placeholder treatment in pipeline (skip video generation).
4. **PPTX export is white/printer-friendly.** No dark theme. Color images preserved. Designed to save printer ink.
5. **Pipeline runs in order: Script Analysis first.** Cards display top-to-bottom in execution order. Panel is collapsible to save screen real estate.
6. **All changes are LOCAL only.** Nothing deployed. Will merge to real app after testing.
7. **Talent system will use Avatar Generator's 18 dropdown fields.** Source: `/jason-vazquez-portfolio/constants.ts` ATTRIBUTE_OPTIONS export.
8. **Characters tab = creation only, Assets tab = the store.** Characters tab is purely a workshop for building new talent. Assets tab is the organized library where all project assets live (Talent, Products, Backgrounds, Audio/Voice, Other). Users "shop" from Assets when assigning to shots. LUT category is not needed. Other category auto-empties every 30 days.
9. **Automate requires approved talent in Assets.** Before the pipeline can run, every character in the script must have an approved talent profile in the Assets tab. If not, the user gets a notification pointing them to what's missing. No text walls.
10. **DP collaboration will use copy-on-share model.** Shared links create a copy, not direct access to originals. Three permission levels: Owner, Editor, Viewer.

---

## Files Modified

### Components
- `src/components/ProjectWorkspace.tsx` - Major restructure: sidebar removed, context tab added, full-width layout
- `src/components/PipelinePanel.tsx` - Rewritten: collapsible, sorted by AGENT_ORDER, compact rows

### API Routes
- `src/app/api/pipeline/run/route.ts` - Fixed constraint error, rewrote Script Analysis as AI Director agent
- `src/app/api/export-pptx/route.ts` - Complete redesign to white/printer-friendly format
- `src/app/api/generate-shots/route.ts` - Duration fallback changed from 8 to null
- `src/app/api/export/route.ts` - Duration fallback changed from 8 to 4

### Styles
- `src/app/globals.css` - Removed all .workspace-sidebar rules, updated .workspace-main padding

### Other
- `src/components/TimelineEditor.tsx` - Duration fallback changed from 8 to 4

### Database
- Migration applied: `projects.target_duration_seconds` column added (integer, default 180)
