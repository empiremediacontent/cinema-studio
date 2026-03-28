# Handoff v10 - AI Film Studio (Cinema Studio)
**Date:** March 27, 2026, 7:30 PM

---

## Starter Message

Continue working on the Cinema Studio project. Read handoffs v7, v8, v9, and v10 to get the full picture. Last session fixed multiple critical bugs: infinite render loop (v9), Kie.ai API format mismatch causing 502 errors, undefined generation_id polling loop, avatar generation missing voice_id, and the Loadout tab was completely redesigned. The Shots tab now uses 3-at-a-time pagination. Next priorities: build the cinematography quick-select inside each shot card's accordion, add "Add to Characters/Assets" features, wire up HeyGen audio-upload mode for image+MP3 sync, and test the full generation pipeline end-to-end with the ElevenLabs key now active. The Loadout tab now uses dropdowns and a sticky prompt preview; it needs testing to make sure the Lens selection properly updates the prompt.

---

## What Was Accomplished

### Bug Fixes
1. **Kie.ai API format mismatch (502 errors):** The generate-image route was using a fake model path `nano-banana-pro/image-to-image` and non-existent parameters (`imageUrl`, `strength`). Fixed to use the correct `image_input` array format per Kie.ai docs.

2. **Upgraded to Nano Banana 2:** Primary image model is now `nano-banana-2` (supports 14 reference images, 20K char prompts). Falls back to `nano-banana-pro` if the newer model errors.

3. **Supabase CHECK constraint:** The `generations` table had a model constraint that didn't include `nano_banana_2`. The insert silently failed, returning null, which caused `generation_id` to be undefined. Ran migration to add `nano_banana_2` and `kling_2_6` to the allowed values. Also added a fallback in the route code so it retries with `nano_banana_pro` if the constraint rejects the insert.

4. **Undefined generation_id polling loop:** ShotCard was calling `pollGeneration(data.generation_id, ...)` without checking if `generation_id` existed. This caused infinite 404 requests to `/api/generation-status?id=undefined`. Added guards in all three generation handlers (image, avatar, voice) and in `pollGeneration` itself. Added early bail on 404 in the poll loop.

5. **Avatar generation missing voice_id:** ShotCard's `handleGenerateAvatar` was only sending `shotId` and `text` to the API. HeyGen requires `voice_id`. Now passes `selectedVoiceId` and `avatarId` from the component state.

6. **Cascading button disable:** The stuck polling loop kept `generating` state in a non-idle value, which disabled ALL generate buttons across all accordion sections. This is why video, voice, and avatar appeared to "do nothing." Fixed by the undefined polling guard.

### UI/UX Overhaul
7. **Loadout tab redesigned:** Complete rewrite of CinematographyPanel: side-by-side layout with selectors on left and sticky prompt preview on right. All options now use dropdown selectors instead of long card lists. Category tabs across the top. Selected option details panel. Tagged prompt preview with color-coded labels. Full composed prompt text box with copy button. Clear All button. Descriptive slot counter.

8. **Shot selector in Loadout:** Replaced horizontal button row (22 buttons) with a dropdown + prev/next buttons.

9. **ShotList pagination:** Replaced infinite scroll with 3-at-a-time pagination. Previous/Next navigation at both top and bottom. Jump-to dropdown preserved.

10. **Download buttons:** Added download button next to delete button on every media preview in ShotCard.

### Database Migration
11. **Migration 006:** `006_add_nano_banana_2_model.sql` adds `nano_banana_2` and `kling_2_6` to the generations model CHECK constraint. Already applied to production Supabase.

---

## What Is Still Needed

### High Priority
1. **Test Loadout tab:** Verify Lens dropdown selection properly updates the Prompt Preview.
2. **Build cinematography quick-select in ShotCard:** The Cinematography accordion inside each shot card is still a placeholder.
3. **Global cinematography settings:** Select options once and apply to all shots.
4. **Test all generation flows end-to-end:** Image works. Need to test video, voice, and avatar.

### Medium Priority
5. **Add to Characters/Talent/Assets feature:** No UI for adding characters or assets from within the workspace.
6. **HeyGen audio-upload mode:** Upload image + MP3 and have HeyGen lip-sync them.
7. **Custom voice creation:** ElevenLabs voice cloning API.
8. **ElevenLabs API key:** Key is in `.env.local` but commented out. Remove the `#` from the line.

### Lower Priority
9. **Export to PDF:** Full storyboard export (deferred per Jason).
10. **Reference image character locking:** Kie.ai treats references as style guidance, not strict character locks.
11. **Favicon:** No favicon.ico in public/.

---

## Where We Left Off

All rewrites are done. Jason needs to: restart dev server (`cd /Users/jasonjvazquez/Documents/CLAUDES/cinema-studio && npx next dev --turbopack`), uncomment the ElevenLabs API key in `.env.local`, and test the new layouts and generation flows.

---

## Known Issues or Blockers

- Webpack console errors in dev mode: known Next.js 15 issue, non-blocking, use `--turbopack`
- Reference images don't lock character appearance in Kie.ai
- Voice buttons show "Voice Not Configured" until ElevenLabs key is uncommented
- Video generation untested this session

---

## Key Decisions Made

1. Nano Banana 2 as primary model with Pro as fallback. DB constraint updated.
2. Dropdown-based Loadout instead of card grids. Side-by-side with sticky prompt preview.
3. Paginated ShotList (3 at a time) instead of infinite scroll.
4. Download buttons on media previews.
5. Shot selector in Loadout is now a dropdown instead of horizontal button row.

---

## Files Modified

### API Routes
- `src/app/api/generate-image/route.ts` - Fixed Kie.ai API format, upgraded to nano-banana-2, added DB constraint fallback

### Components
- `src/components/CinematographyPanel.tsx` - Complete rewrite: side-by-side layout, dropdown selectors, sticky prompt preview
- `src/components/ShotCard.tsx` - Added download buttons, fixed avatar voiceId, added undefined polling guards, 404 bail
- `src/components/ShotList.tsx` - Rewritten with 3-at-a-time pagination, prev/next navigation
- `src/components/ProjectWorkspace.tsx` - Replaced shot button row with dropdown, added proper height container for Loadout

### Database
- `supabase/migrations/006_add_nano_banana_2_model.sql` - Added nano_banana_2 and kling_2_6 to generations model CHECK constraint (already applied)