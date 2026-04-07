'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ProjectContextData } from '@/lib/types/database';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
  teal: '#00e5ff',
  tealBg: 'rgba(0,229,255,0.06)',
};

const DURATION_OPTIONS = [
  { value: '', label: 'Auto (AI decides)' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '90', label: '1.5 minutes' },
  { value: '120', label: '2 minutes' },
  { value: '180', label: '3 minutes' },
  { value: '300', label: '5 minutes' },
  { value: '600', label: '10 minutes' },
  { value: '900', label: '15 minutes' },
  { value: 'custom', label: 'Custom...' },
];

/**
 * ScriptPanel (Context Tab)
 *
 * Structured to match the reference storyboard format:
 *   Section 1: Production Notes (inspiration, references, character description, casting)
 *   Section 2: Character Design (style references, animation style, notes)
 *   Section 3: Atmosphere / Tone / Direction (narration, timing, humor, sound, color, font)
 *
 * Plus: Production Mode toggle and Target Duration selector.
 * All fields auto-save on blur. Parent state is updated via onSettingsChanged callback.
 */

export interface ProjectSettings {
  description: string;
  creative_direction: string;
  target_duration_seconds: number | null;
  project_mode: 'live_action' | 'animation';
  context_data: ProjectContextData;
}

type SectionId = 'production' | 'character' | 'atmosphere';

export default function ScriptPanel({
  projectId,
  settings,
  onSettingsChanged,
}: {
  projectId: string;
  settings: ProjectSettings;
  onSettingsChanged: (updated: Partial<ProjectSettings>) => void;
}) {
  const [projectMode, setProjectMode] = useState<'live_action' | 'animation'>(settings.project_mode);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set(['production']));

  // Duration state
  const initDurVal = settings.target_duration_seconds
    ? (DURATION_OPTIONS.find(o => o.value === String(settings.target_duration_seconds)) ? String(settings.target_duration_seconds) : 'custom')
    : '';
  const [targetDuration, setTargetDuration] = useState(initDurVal);
  const [customDuration, setCustomDuration] = useState(
    settings.target_duration_seconds && !DURATION_OPTIONS.find(o => o.value === String(settings.target_duration_seconds))
      ? String(settings.target_duration_seconds)
      : ''
  );

  // Context data fields - flattened for easy form binding
  const ctx = settings.context_data || {};
  const [inspiration, setInspiration] = useState(ctx.production_notes?.inspiration || '');
  const [references, setReferences] = useState(ctx.production_notes?.references || '');
  const [characterDescription, setCharacterDescription] = useState(ctx.production_notes?.character_description || '');
  const [castingVoice, setCastingVoice] = useState(ctx.production_notes?.casting_voice_talent || '');
  const [styleReferences, setStyleReferences] = useState(ctx.character_design?.style_references || '');
  const [animationStyle, setAnimationStyle] = useState(ctx.character_design?.animation_style || '');
  const [designNotes, setDesignNotes] = useState(ctx.character_design?.notes || '');
  const [narrationStyle, setNarrationStyle] = useState(ctx.atmosphere?.narration_style || '');
  const [timingNotes, setTimingNotes] = useState(ctx.atmosphere?.timing_notes || '');
  const [humorNotes, setHumorNotes] = useState(ctx.atmosphere?.humor_notes || '');
  const [soundDesign, setSoundDesign] = useState(ctx.atmosphere?.sound_design || '');
  const [colorPalette, setColorPalette] = useState(ctx.atmosphere?.color_palette || '');
  const [fontPreference, setFontPreference] = useState(ctx.atmosphere?.font_preference || '');

  // Sync from parent settings when they change
  useEffect(() => {
    setProjectMode(settings.project_mode);
    const durVal = settings.target_duration_seconds
      ? (DURATION_OPTIONS.find(o => o.value === String(settings.target_duration_seconds)) ? String(settings.target_duration_seconds) : 'custom')
      : '';
    setTargetDuration(durVal);
    if (settings.target_duration_seconds && !DURATION_OPTIONS.find(o => o.value === String(settings.target_duration_seconds))) {
      setCustomDuration(String(settings.target_duration_seconds));
    }
    const c = settings.context_data || {};
    setInspiration(c.production_notes?.inspiration || '');
    setReferences(c.production_notes?.references || '');
    setCharacterDescription(c.production_notes?.character_description || '');
    setCastingVoice(c.production_notes?.casting_voice_talent || '');
    setStyleReferences(c.character_design?.style_references || '');
    setAnimationStyle(c.character_design?.animation_style || '');
    setDesignNotes(c.character_design?.notes || '');
    setNarrationStyle(c.atmosphere?.narration_style || '');
    setTimingNotes(c.atmosphere?.timing_notes || '');
    setHumorNotes(c.atmosphere?.humor_notes || '');
    setSoundDesign(c.atmosphere?.sound_design || '');
    setColorPalette(c.atmosphere?.color_palette || '');
    setFontPreference(c.atmosphere?.font_preference || '');
  }, [settings]);

  // Refs for all fields so saveSettings always reads current values
  const inspirationRef = useRef(inspiration);
  const referencesRef = useRef(references);
  const characterDescriptionRef = useRef(characterDescription);
  const castingVoiceRef = useRef(castingVoice);
  const styleReferencesRef = useRef(styleReferences);
  const animationStyleRef = useRef(animationStyle);
  const designNotesRef = useRef(designNotes);
  const narrationStyleRef = useRef(narrationStyle);
  const timingNotesRef = useRef(timingNotes);
  const humorNotesRef = useRef(humorNotes);
  const soundDesignRef = useRef(soundDesign);
  const colorPaletteRef = useRef(colorPalette);
  const fontPreferenceRef = useRef(fontPreference);
  const targetDurationRef = useRef(targetDuration);
  const customDurationRef = useRef(customDuration);
  const projectModeRef = useRef(projectMode);

  useEffect(() => { inspirationRef.current = inspiration; }, [inspiration]);
  useEffect(() => { referencesRef.current = references; }, [references]);
  useEffect(() => { characterDescriptionRef.current = characterDescription; }, [characterDescription]);
  useEffect(() => { castingVoiceRef.current = castingVoice; }, [castingVoice]);
  useEffect(() => { styleReferencesRef.current = styleReferences; }, [styleReferences]);
  useEffect(() => { animationStyleRef.current = animationStyle; }, [animationStyle]);
  useEffect(() => { designNotesRef.current = designNotes; }, [designNotes]);
  useEffect(() => { narrationStyleRef.current = narrationStyle; }, [narrationStyle]);
  useEffect(() => { timingNotesRef.current = timingNotes; }, [timingNotes]);
  useEffect(() => { humorNotesRef.current = humorNotes; }, [humorNotes]);
  useEffect(() => { soundDesignRef.current = soundDesign; }, [soundDesign]);
  useEffect(() => { colorPaletteRef.current = colorPalette; }, [colorPalette]);
  useEffect(() => { fontPreferenceRef.current = fontPreference; }, [fontPreference]);
  useEffect(() => { targetDurationRef.current = targetDuration; }, [targetDuration]);
  useEffect(() => { customDurationRef.current = customDuration; }, [customDuration]);
  useEffect(() => { projectModeRef.current = projectMode; }, [projectMode]);

  // Build context_data from current refs
  function buildContextData(): ProjectContextData {
    return {
      production_notes: {
        inspiration: inspirationRef.current.trim(),
        references: referencesRef.current.trim(),
        character_description: characterDescriptionRef.current.trim(),
        casting_voice_talent: castingVoiceRef.current.trim(),
      },
      character_design: {
        style_references: styleReferencesRef.current.trim(),
        animation_style: animationStyleRef.current.trim(),
        notes: designNotesRef.current.trim(),
      },
      atmosphere: {
        narration_style: narrationStyleRef.current.trim(),
        timing_notes: timingNotesRef.current.trim(),
        humor_notes: humorNotesRef.current.trim(),
        sound_design: soundDesignRef.current.trim(),
        color_palette: colorPaletteRef.current.trim(),
        font_preference: fontPreferenceRef.current.trim(),
      },
    };
  }

  // Build a synopsis string from the structured context for backward compatibility
  function buildDescription(): string {
    const parts: string[] = [];
    if (characterDescriptionRef.current.trim()) parts.push(characterDescriptionRef.current.trim());
    if (inspirationRef.current.trim()) parts.push(inspirationRef.current.trim());
    return parts.join('\n\n');
  }

  // Build creative_direction from atmosphere fields for backward compatibility
  function buildCreativeDirection(): string {
    const parts: string[] = [];
    if (narrationStyleRef.current.trim()) parts.push(`Narration: ${narrationStyleRef.current.trim()}`);
    if (colorPaletteRef.current.trim()) parts.push(`Color Palette: ${colorPaletteRef.current.trim()}`);
    if (soundDesignRef.current.trim()) parts.push(`Sound: ${soundDesignRef.current.trim()}`);
    if (styleReferencesRef.current.trim()) parts.push(`Style: ${styleReferencesRef.current.trim()}`);
    return parts.join('. ');
  }

  const saveSettings = useCallback(async (overrides?: Record<string, unknown>) => {
    const dur = targetDurationRef.current === 'custom' ? customDurationRef.current : targetDurationRef.current;
    const contextData = buildContextData();

    const payload: Record<string, unknown> = {
      projectId,
      projectMode: projectModeRef.current,
      targetDuration: dur ? Number(dur) : undefined,
      description: buildDescription(),
      creativeDirection: buildCreativeDirection(),
      contextData,
      ...overrides,
    };

    // Update parent state
    const parentUpdate: Partial<ProjectSettings> = {
      project_mode: (overrides?.projectMode as 'live_action' | 'animation') ?? projectModeRef.current,
      target_duration_seconds: (overrides?.targetDuration !== undefined ? overrides.targetDuration : (dur ? Number(dur) : null)) as number | null,
      description: buildDescription(),
      creative_direction: buildCreativeDirection(),
      context_data: contextData,
    };
    onSettingsChanged(parentUpdate);

    try {
      const res = await fetch('/api/save-project-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        setError(null);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save settings');
    }
  }, [projectId, onSettingsChanged]);

  function handleModeChange(mode: 'live_action' | 'animation') {
    setProjectMode(mode);
    projectModeRef.current = mode;
    saveSettings({ projectMode: mode });
  }

  function toggleSection(id: SectionId) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Reusable textarea field
  function ContextField({
    label,
    value,
    setValue,
    setRef,
    placeholder,
    rows = 2,
  }: {
    label: string;
    value: string;
    setValue: (v: string) => void;
    setRef: React.MutableRefObject<string>;
    placeholder: string;
    rows?: number;
  }) {
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text3, marginBottom: '6px',
        }}>
          {label}
        </label>
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setRef.current = e.target.value; }}
          onBlur={() => saveSettings()}
          placeholder={placeholder}
          rows={rows}
          style={{
            width: '100%', padding: '12px 14px',
            background: C.surface, borderWidth: '1px', borderStyle: 'solid', borderColor: C.border,
            color: '#fff', fontSize: '13px', fontFamily: 'Raleway, sans-serif', lineHeight: '1.6',
            resize: 'vertical', outline: 'none', transition: 'border-color 0.3s ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,45,123,0.4)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
        />
      </div>
    );
  }

  // Section accordion header
  function SectionHeader({ id, title, subtitle, icon }: { id: SectionId; title: string; subtitle: string; icon: React.ReactNode }) {
    const isOpen = expandedSections.has(id);
    return (
      <button
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          background: isOpen ? 'rgba(255,45,123,0.04)' : C.surface,
          border: `1px solid ${isOpen ? 'rgba(255,45,123,0.15)' : C.border}`,
          borderBottom: isOpen ? 'none' : `1px solid ${C.border}`,
          cursor: 'pointer', transition: 'all 0.2s',
          marginTop: '8px',
        }}
      >
        <span style={{ color: isOpen ? C.accent : C.text3, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span style={{
            display: 'block', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isOpen ? '#fff' : C.text2,
          }}>
            {title}
          </span>
          <span style={{
            display: 'block', fontSize: '10px', fontFamily: 'Raleway, sans-serif',
            color: C.text3, marginTop: '2px',
          }}>
            {subtitle}
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOpen ? C.accent : C.text3}
          strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', flexShrink: 0,
      }}>
        <h2 style={{
          fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Project Context
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saved && (
            <span style={{
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
              color: 'rgba(45,200,120,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Saved
            </span>
          )}
          {error && (
            <span style={{
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
              color: '#ff264a', letterSpacing: '0.08em',
            }}>
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Guidance note */}
      <div style={{
        marginBottom: '16px', padding: '12px 14px',
        background: 'rgba(255,45,123,0.04)',
        borderLeft: '3px solid rgba(255,45,123,0.3)',
      }}>
        <p style={{
          fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text2,
          lineHeight: '1.6', margin: 0,
        }}>
          Fill in your project context below. This information exports directly to your storyboard
          PPTX as the first 3 slides (Production Notes, Character Design, Atmosphere).
          Write your script in the Script tab, then hit Generate Storyboard.
        </p>
      </div>

      {/* Production Mode + Duration row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexShrink: 0 }}>
        {/* Production Mode */}
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2, marginBottom: '8px',
          }}>
            Production Mode
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['live_action', 'animation'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                style={{
                  flex: 1, padding: '10px 16px',
                  fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: projectMode === mode ? 'rgba(255,45,123,0.12)' : C.surface,
                  color: projectMode === mode ? C.accent : C.text3,
                  border: `1px solid ${projectMode === mode ? 'rgba(255,45,123,0.3)' : C.border}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {mode === 'live_action' ? 'Live Action' : 'Animation'}
              </button>
            ))}
          </div>
        </div>

        {/* Target Duration */}
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2, marginBottom: '8px',
          }}>
            Target Duration
          </label>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={targetDuration}
              onChange={(e) => {
                setTargetDuration(e.target.value);
                targetDurationRef.current = e.target.value;
                if (e.target.value !== 'custom') {
                  saveSettings({ targetDuration: e.target.value ? Number(e.target.value) : undefined });
                }
              }}
              style={{
                flex: 1, padding: '10px 12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
                background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`,
                borderRadius: 0, cursor: 'pointer', outline: 'none',
              }}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: '#1a1a1a', color: '#fff' }}>
                  {opt.label}
                </option>
              ))}
            </select>
            {targetDuration === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => { setCustomDuration(e.target.value); customDurationRef.current = e.target.value; }}
                  onBlur={() => saveSettings()}
                  placeholder="120"
                  min="10"
                  max="3600"
                  style={{
                    width: '70px', padding: '10px 8px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
                    background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`,
                    borderRadius: 0, outline: 'none', textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>sec</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable section area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '80px' }}>

        {/* ═══ SECTION 1: PRODUCTION NOTES ═══ */}
        <SectionHeader
          id="production"
          title="Production Notes"
          subtitle="Inspiration, references, character descriptions, casting"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        {expandedSections.has('production') && (
          <div style={{
            padding: '20px',
            border: `1px solid rgba(255,45,123,0.15)`,
            borderTop: 'none',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <ContextField
              label="Inspiration / Concept"
              value={inspiration}
              setValue={setInspiration}
              setRef={inspirationRef}
              placeholder="What inspired this project? Key concept or theme. e.g., 'Inspired by Apple product launches, clean and minimal with emotional storytelling.'"
              rows={2}
            />
            <ContextField
              label="References"
              value={references}
              setValue={setReferences}
              setRef={referencesRef}
              placeholder="Reference films, videos, commercials, or visual styles. e.g., 'Blade Runner 2049 color grading, Her (2013) intimate framing.'"
              rows={2}
            />
            <ContextField
              label="Character Descriptions"
              value={characterDescription}
              setValue={setCharacterDescription}
              setRef={characterDescriptionRef}
              placeholder="Describe each character: appearance, personality, wardrobe, distinguishing features. e.g., 'Dr. Sarah Chen, 40s, silver-streaked hair pulled back, lab coat over black turtleneck.'"
              rows={4}
            />
            <ContextField
              label="Casting / Voice Talent"
              value={castingVoice}
              setValue={setCastingVoice}
              setRef={castingVoiceRef}
              placeholder="Voice talent notes, casting direction, accent preferences. e.g., 'Narrator: warm male voice, mid-30s, slight British accent. Think David Attenborough but younger.'"
              rows={2}
            />
          </div>
        )}

        {/* ═══ SECTION 2: CHARACTER DESIGN ═══ */}
        <SectionHeader
          id="character"
          title="Character Design"
          subtitle="Visual style, animation approach, design references"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
        {expandedSections.has('character') && (
          <div style={{
            padding: '20px',
            border: `1px solid rgba(255,45,123,0.15)`,
            borderTop: 'none',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <ContextField
              label="Style References"
              value={styleReferences}
              setValue={setStyleReferences}
              setRef={styleReferencesRef}
              placeholder="Visual style for characters. e.g., '3D rendered corporate figures, clean edges, subtle shadows, Pixar-adjacent but more professional.'"
              rows={3}
            />
            <ContextField
              label="Animation Style"
              value={animationStyle}
              setValue={setAnimationStyle}
              setRef={animationStyleRef}
              placeholder="How characters move and express. e.g., 'Smooth motion graphics style transitions, characters appear as clean vector illustrations with minimal animation.'"
              rows={2}
            />
            <ContextField
              label="Design Notes"
              value={designNotes}
              setValue={setDesignNotes}
              setRef={designNotesRef}
              placeholder="Additional design constraints or notes. e.g., 'All characters use the same simplified face style. No photorealistic features. Brand colors only for wardrobe.'"
              rows={2}
            />
            <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3, lineHeight: '1.5', marginTop: '4px' }}>
              Upload character reference images in the Library tab. Talent linked there will be available for shot assignment.
            </p>
          </div>
        )}

        {/* ═══ SECTION 3: ATMOSPHERE / TONE / DIRECTION ═══ */}
        <SectionHeader
          id="atmosphere"
          title="Atmosphere / Tone / Direction"
          subtitle="Narration, timing, sound design, color palette, typography"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          }
        />
        {expandedSections.has('atmosphere') && (
          <div style={{
            padding: '20px',
            border: `1px solid rgba(255,45,123,0.15)`,
            borderTop: 'none',
            background: 'rgba(255,255,255,0.01)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <ContextField
                label="Narration Style"
                value={narrationStyle}
                setValue={setNarrationStyle}
                setRef={narrationStyleRef}
                placeholder="e.g., 'Conversational, warm, educational but not condescending.'"
                rows={2}
              />
              <ContextField
                label="Timing / Pacing"
                value={timingNotes}
                setValue={setTimingNotes}
                setRef={timingNotesRef}
                placeholder="e.g., 'Moderate pace, 3-5 second pauses between sections. Build energy toward conclusion.'"
                rows={2}
              />
              <ContextField
                label="Humor / Tone"
                value={humorNotes}
                setValue={setHumorNotes}
                setRef={humorNotesRef}
                placeholder="e.g., 'Light humor, occasional visual gags. Never sarcastic.'"
                rows={2}
              />
              <ContextField
                label="Sound Design"
                value={soundDesign}
                setValue={setSoundDesign}
                setRef={soundDesignRef}
                placeholder="e.g., 'Ambient electronic underscore, whoosh transitions, subtle UI sounds on text reveals.'"
                rows={2}
              />
              <ContextField
                label="Color Palette"
                value={colorPalette}
                setValue={setColorPalette}
                setRef={colorPaletteRef}
                placeholder="e.g., 'Navy #1B2A4A, Coral #E63946, White #FFFFFF. Dark backgrounds, bright accent highlights.'"
                rows={2}
              />
              <ContextField
                label="Typography / Font"
                value={fontPreference}
                setValue={setFontPreference}
                setRef={fontPreferenceRef}
                placeholder="e.g., 'Montserrat Bold for titles, Raleway for body. All caps headers.'"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed save button at bottom */}
      <div style={{
        position: 'sticky', bottom: 0, flexShrink: 0,
        paddingTop: '12px', paddingBottom: '16px',
        background: 'linear-gradient(to top, #0a0a0a 80%, transparent)',
      }}>
        <button
          onClick={() => saveSettings()}
          style={{
            height: '42px', width: '100%',
            fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            background: C.surface,
            color: C.text2,
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,45,123,0.3)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.text2;
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Context
        </button>
      </div>
    </div>
  );
}
