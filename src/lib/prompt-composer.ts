// ============================================================
// Cinema Studio: Prompt Composition Engine
// Assembles cinematic selections into a single generation prompt.
// Think of this as the "spell formula" that combines all your
// equipped items into one powerful incantation.
// ============================================================

import type { CinematicOption, Avatar, CameraMovement } from '@/lib/types/database';

export interface PromptComposerInput {
  // The shot's subject/action description (from script decomposition)
  subject: string;

  // Selected cinematic options (any can be null if not chosen)
  style?: CinematicOption | null;
  camera_body?: CinematicOption | null;
  focal_length?: CinematicOption | null;
  lens_type?: CinematicOption | null;
  film_stock?: CinematicOption | null;
  lighting_style?: CinematicOption | null;
  lighting_source?: CinematicOption | null;
  atmosphere?: CinematicOption | null;
  environment?: CinematicOption | null;
  look_and_feel?: CinematicOption | null;
  filter_effect?: CinematicOption | null;
  aspect_ratio?: CinematicOption | null;

  // Camera motion
  camera_movement?: CameraMovement | null;
  motion_intensity?: 'subtle' | 'moderate' | 'dramatic';

  // Characters in the shot
  characters?: Avatar[];

  // Whether this is a start frame or end frame
  frameType?: 'start' | 'end';
}

// Quality suffix appended based on style selection
const QUALITY_SUFFIXES: Record<string, string> = {
  photorealistic: 'Natural skin texture visible, visible pores, no foundation coverage. Skin highlight hot but not blown, shadows fall to deep brown not black. Subtle film grain, organic halation around bright sources. No digital processing look.',
  cinematic_still: 'Cinematic color grading, natural film grain, professional production quality.',
  animation: 'Clean linework, consistent shading, professional animation quality. No artifacts, smooth gradients, intentional color palette.',
  default: 'High detail, professional quality, sharp focus on subject.',
};

function getQualitySuffix(styleName?: string): string {
  if (!styleName) return QUALITY_SUFFIXES.default;
  const lower = styleName.toLowerCase();
  if (lower.includes('photorealistic') || lower.includes('documentary')) return QUALITY_SUFFIXES.photorealistic;
  if (lower.includes('anime') || lower.includes('comic') || lower.includes('3d render')) return QUALITY_SUFFIXES.animation;
  if (lower.includes('cinematic')) return QUALITY_SUFFIXES.cinematic_still;
  return QUALITY_SUFFIXES.default;
}

// Camera movement descriptions for video generation prompts
const MOVEMENT_DESCRIPTIONS: Record<string, Record<string, string>> = {
  static: { subtle: 'locked off static shot', moderate: 'locked off static shot', dramatic: 'locked off static shot, perfectly still' },
  pan_left: { subtle: 'gentle slow pan to the left', moderate: 'smooth pan to the left', dramatic: 'fast sweeping pan to the left' },
  pan_right: { subtle: 'gentle slow pan to the right', moderate: 'smooth pan to the right', dramatic: 'fast sweeping pan to the right' },
  tilt_up: { subtle: 'slow subtle tilt upward', moderate: 'smooth tilt upward revealing', dramatic: 'dramatic tilt up revealing grand scale' },
  tilt_down: { subtle: 'slow subtle tilt downward', moderate: 'smooth tilt downward', dramatic: 'dramatic tilt down revealing' },
  dolly_in: { subtle: 'slow creeping dolly in', moderate: 'steady dolly push in toward subject', dramatic: 'fast dramatic dolly rush toward subject' },
  dolly_out: { subtle: 'slow gentle dolly pull back', moderate: 'steady dolly pull back revealing', dramatic: 'fast dramatic dolly out revealing grand scale' },
  crane_up: { subtle: 'slow rising crane movement', moderate: 'smooth crane rising above subject', dramatic: 'dramatic crane sweeping upward to bird eye view' },
  crane_down: { subtle: 'slow descending crane movement', moderate: 'smooth crane descending to subject', dramatic: 'dramatic crane plunging down to subject level' },
  tracking: { subtle: 'slow tracking alongside subject', moderate: 'smooth tracking shot following subject', dramatic: 'fast dynamic tracking shot chasing subject' },
  handheld: { subtle: 'slight handheld movement, natural breathing', moderate: 'handheld camera, organic movement', dramatic: 'aggressive handheld, chaotic energy, shaky cam' },
  orbit: { subtle: 'slow subtle orbit around subject', moderate: 'smooth 180-degree orbit around subject', dramatic: 'fast full 360-degree orbit around subject' },
  whip_pan: { subtle: 'quick whip pan transition', moderate: 'fast whip pan with motion blur', dramatic: 'violent whip pan, extreme motion blur' },
  rack_focus: { subtle: 'gentle rack focus shift', moderate: 'rack focus from foreground to background', dramatic: 'dramatic snap rack focus between subjects' },
};

function getMovementDescription(movement?: CameraMovement | null, intensity?: string): string {
  if (!movement || movement === 'static') return '';
  const intensityLevel = intensity || 'subtle';
  const descriptions = MOVEMENT_DESCRIPTIONS[movement];
  if (!descriptions) return '';
  return descriptions[intensityLevel] || descriptions.subtle || '';
}

function buildCharacterDescription(avatar: Avatar): string {
  const parts: string[] = [];
  if (avatar.age_appearance && avatar.age_appearance !== 'adult') {
    parts.push(avatar.age_appearance.replace('_', ' '));
  }
  if (avatar.ethnicity_appearance) {
    parts.push(avatar.ethnicity_appearance);
  }
  if (avatar.gender_presentation && avatar.gender_presentation !== 'other') {
    parts.push(avatar.gender_presentation);
  }
  if (avatar.description) {
    parts.push(avatar.description);
  }
  if (avatar.mood_expression) {
    parts.push(`expression: ${avatar.mood_expression}`);
  }
  return parts.length > 0 ? parts.join(', ') : avatar.name;
}

/**
 * Composes a full generation prompt from cinematic selections.
 * This is the core "spell formula" of Cinema Studio.
 *
 * Formula:
 * {style_prefix} of {subject_and_action}.
 * {environment_description}.
 * Captured with {camera_body}, {focal_length} {lens_type}, {film_stock}.
 * {lighting_style} with {lighting_source}.
 * {atmosphere} atmosphere.
 * {look_and_feel}.
 * {filter_effect}.
 * {character_descriptions}.
 * {quality_suffix}
 */
export function composePrompt(input: PromptComposerInput): string {
  const segments: string[] = [];

  // 1. Style prefix + subject
  const styleFragment = input.style?.prompt_fragment || '';
  if (styleFragment) {
    segments.push(`${styleFragment} of ${input.subject}`);
  } else {
    segments.push(input.subject);
  }

  // 2. Environment
  if (input.environment?.prompt_fragment) {
    segments.push(input.environment.prompt_fragment);
  }

  // 3. Camera + Lens + Film (the "weapon loadout")
  const cameraFragments: string[] = [];
  if (input.camera_body?.prompt_fragment) cameraFragments.push(input.camera_body.prompt_fragment);
  if (input.focal_length?.prompt_fragment) cameraFragments.push(input.focal_length.prompt_fragment);
  if (input.lens_type?.prompt_fragment) cameraFragments.push(input.lens_type.prompt_fragment);
  if (input.film_stock?.prompt_fragment) cameraFragments.push(input.film_stock.prompt_fragment);
  if (cameraFragments.length > 0) {
    segments.push(`Captured with ${cameraFragments.join(', ')}`);
  }

  // 4. Lighting (the "magic/spells")
  const lightingFragments: string[] = [];
  if (input.lighting_style?.prompt_fragment) lightingFragments.push(input.lighting_style.prompt_fragment);
  if (input.lighting_source?.prompt_fragment) lightingFragments.push(input.lighting_source.prompt_fragment);
  if (lightingFragments.length > 0) {
    segments.push(lightingFragments.join(' with '));
  }

  // 5. Atmosphere
  if (input.atmosphere?.prompt_fragment) {
    segments.push(input.atmosphere.prompt_fragment);
  }

  // 6. Look and Feel (the "character class")
  if (input.look_and_feel?.prompt_fragment) {
    segments.push(input.look_and_feel.prompt_fragment);
  }

  // 7. Filter/Effect (the "potion")
  if (input.filter_effect?.prompt_fragment) {
    segments.push(input.filter_effect.prompt_fragment);
  }

  // 8. Aspect Ratio
  if (input.aspect_ratio?.prompt_fragment) {
    segments.push(input.aspect_ratio.prompt_fragment);
  }

  // 9. Characters
  if (input.characters && input.characters.length > 0) {
    const charDescriptions = input.characters.map(c => buildCharacterDescription(c));
    if (charDescriptions.length === 1) {
      segments.push(`Featuring ${charDescriptions[0]}`);
    } else {
      segments.push(`Featuring ${charDescriptions.join(' and ')}`);
    }
  }

  // 10. Camera movement (for video prompts)
  const movementDesc = getMovementDescription(input.camera_movement, input.motion_intensity);
  if (movementDesc) {
    segments.push(`Camera: ${movementDesc}`);
  }

  // 11. Frame type indicator
  if (input.frameType === 'start') {
    segments.push('Opening composition of the shot');
  } else if (input.frameType === 'end') {
    segments.push('Closing composition after action has progressed');
  }

  // 12. Quality suffix
  segments.push(getQualitySuffix(input.style?.name));

  return segments.join('. ').replace(/\.\./g, '.').replace(/\. \./g, '.').trim();
}

/**
 * Generates a quick preview of what the prompt will look like,
 * showing which "slots" are filled and which are empty.
 * Used in the CinematographyPanel live preview.
 */
export function getPromptPreviewParts(input: PromptComposerInput): { label: string; value: string; filled: boolean }[] {
  return [
    { label: 'Style', value: input.style?.name || 'Not set', filled: !!input.style },
    { label: 'Subject', value: input.subject || 'No subject', filled: !!input.subject },
    { label: 'Environment', value: input.environment?.name || 'Not set', filled: !!input.environment },
    { label: 'Camera', value: input.camera_body?.name || 'Not set', filled: !!input.camera_body },
    { label: 'Focal Length', value: input.focal_length?.name || 'Not set', filled: !!input.focal_length },
    { label: 'Lens', value: input.lens_type?.name || 'Not set', filled: !!input.lens_type },
    { label: 'Film Stock', value: input.film_stock?.name || 'Not set', filled: !!input.film_stock },
    { label: 'Lighting Style', value: input.lighting_style?.name || 'Not set', filled: !!input.lighting_style },
    { label: 'Lighting Source', value: input.lighting_source?.name || 'Not set', filled: !!input.lighting_source },
    { label: 'Atmosphere', value: input.atmosphere?.name || 'Not set', filled: !!input.atmosphere },
    { label: 'Look & Feel', value: input.look_and_feel?.name || 'Not set', filled: !!input.look_and_feel },
    { label: 'Filter', value: input.filter_effect?.name || 'Not set', filled: !!input.filter_effect },
    { label: 'Aspect Ratio', value: input.aspect_ratio?.name || 'Not set', filled: !!input.aspect_ratio },
  ];
}

/**
 * Human-readable labels for cinematic option types.
 * Used in dropdowns and UI labels.
 */
export const CINEMATIC_TYPE_LABELS: Record<string, string> = {
  camera_body: 'Camera Body',
  focal_length: 'Focal Length',
  lens_type: 'Lens Type',
  film_stock: 'Film Stock',
  lighting_source: 'Light Source',
  lighting_style: 'Lighting Style',
  atmosphere: 'Atmosphere',
  environment: 'Environment',
  look_and_feel: 'Look & Feel',
  filter_effect: 'Filter / Effect',
  aspect_ratio: 'Aspect Ratio',
  style: 'Style',
};

/**
 * SVG icon paths for each cinematic type (used in the UI as category icons).
 * Viewbox: 0 0 24 24, stroke-based, no fill.
 */
export const CINEMATIC_TYPE_ICONS: Record<string, string> = {
  camera_body: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  focal_length: 'M2 12h5 M17 12h5 M12 2v5 M12 17v5 M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  lens_type: 'M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0 M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0 M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  film_stock: 'M7 2v20 M17 2v20 M2 12h20 M2 7h5 M2 17h5 M17 7h5 M17 17h5',
  lighting_source: 'M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41 M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
  lighting_style: 'M13 2L3 14h9l-1 8 10-12h-9l1-8',
  atmosphere: 'M8 19a4 4 0 0 1-4-4c0-2.2 1.8-4 4-4 .7-2.8 3.2-5 6.2-5C17 6 19.5 8.3 20 11.2 21.7 11.7 23 13.2 23 15a4 4 0 0 1-4 4H8z',
  environment: 'M3 21l7-7 4 4 7-10 3 3V3h-7l3 3-6 8.5-4-4-7 7',
  look_and_feel: 'M12 20l-7-7 7-7 7 7-7 7z',
  filter_effect: 'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z',
  aspect_ratio: 'M2 4h20v16H2V4z M6 4v16 M18 4v16',
  style: 'M12 19l-7-7c-1.5-1.5-1.5-4 0-5.5 1.5-1.5 4-1.5 5.5 0L12 8l1.5-1.5c1.5-1.5 4-1.5 5.5 0s1.5 4 0 5.5L12 19z',
};
