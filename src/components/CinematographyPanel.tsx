'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  CinematicOption, CinematicOptionType, CinematicOptionsMap,
  ShotCinematography, CameraMovement, MotionIntensity,
} from '@/lib/types/database';
import {
  composePrompt, getPromptPreviewParts,
  CINEMATIC_TYPE_LABELS, CINEMATIC_TYPE_ICONS,
  type PromptComposerInput,
} from '@/lib/prompt-composer';

interface CinematographyPanelProps {
  shotId: string;
  shotDescription: string;
  cinematography?: ShotCinematography | null;
  options: CinematicOptionsMap;
  onCinematographyChanged?: (cinematography: ShotCinematography) => void;
  onComposedPromptChanged?: (prompt: string) => void;
  compact?: boolean;
}

const SLOT_ORDER: CinematicOptionType[] = [
  'style', 'camera_body', 'focal_length', 'lens_type', 'film_stock',
  'lighting_style', 'lighting_source', 'atmosphere', 'environment',
  'look_and_feel', 'filter_effect', 'aspect_ratio',
];

const CAMERA_MOVEMENTS: { value: CameraMovement; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'pan_left', label: 'Pan Left' },
  { value: 'pan_right', label: 'Pan Right' },
  { value: 'tilt_up', label: 'Tilt Up' },
  { value: 'tilt_down', label: 'Tilt Down' },
  { value: 'dolly_in', label: 'Dolly In' },
  { value: 'dolly_out', label: 'Dolly Out' },
  { value: 'crane_up', label: 'Crane Up' },
  { value: 'crane_down', label: 'Crane Down' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'whip_pan', label: 'Whip Pan' },
  { value: 'rack_focus', label: 'Rack Focus' },
];

const INTENSITY_OPTIONS: { value: MotionIntensity; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'dramatic', label: 'Dramatic' },
];

type CategoryKey = 'Camera' | 'Film & Color' | 'Lighting' | 'World' | 'Style & Frame';

interface CategoryDef {
  key: CategoryKey;
  types: CinematicOptionType[];
}

const CATEGORIES: CategoryDef[] = [
  { key: 'Camera', types: ['camera_body', 'focal_length', 'lens_type'] },
  { key: 'Film & Color', types: ['film_stock', 'look_and_feel', 'filter_effect'] },
  { key: 'Lighting', types: ['lighting_style', 'lighting_source'] },
  { key: 'World', types: ['atmosphere', 'environment'] },
  { key: 'Style & Frame', types: ['style', 'aspect_ratio'] },
];

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  elevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
};

/* Custom dropdown component */
function SlotDropdown({
  label,
  options: typeOptions,
  selectedId,
  onSelect,
}: {
  label: string;
  options: CinematicOption[];
  selectedId: string | null;
  onSelect: (option: CinematicOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = typeOptions.find(o => o.id === selectedId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{
          fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3,
        }}>
          {label}
        </span>
      </div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif', fontWeight: 500,
          background: selected ? C.card : C.surface,
          border: selected ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
          color: selected ? C.accent : C.text2,
          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 24px)' }}>
          {selected ? selected.name : `Select ${label.toLowerCase()}...`}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke={selected ? C.accent : C.text3} strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: '4px', maxHeight: '240px', overflowY: 'auto',
          background: '#1a1a1a', border: `1px solid ${C.borderHover}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}>
          {/* Clear option */}
          {selected && (
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                fontSize: '11px', fontFamily: 'Raleway, sans-serif', fontWeight: 500,
                color: C.text3, fontStyle: 'italic',
                background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
              }}
            >
              Clear selection
            </button>
          )}
          {typeOptions.map(option => (
            <button
              key={option.id}
              onClick={() => { onSelect(option); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                background: option.id === selectedId ? C.accentBg : 'transparent',
                border: 'none', borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (option.id !== selectedId) e.currentTarget.style.background = C.elevated; }}
              onMouseLeave={e => { if (option.id !== selectedId) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                fontSize: '12px', fontWeight: 600, fontFamily: 'Raleway, sans-serif',
                color: option.id === selectedId ? C.accent : C.text,
                marginBottom: option.description ? '2px' : 0,
              }}>
                {option.name}
              </div>
              {option.description && (
                <div style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3, lineHeight: 1.3 }}>
                  {option.description.length > 100 ? option.description.substring(0, 100) + '...' : option.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CinematographyPanel({
  shotId,
  shotDescription,
  cinematography,
  options,
  onCinematographyChanged,
  onComposedPromptChanged,
  compact = false,
}: CinematographyPanelProps) {
  const [selections, setSelections] = useState<Record<string, string | null>>({
    camera_body_id: cinematography?.camera_body_id || null,
    focal_length_id: cinematography?.focal_length_id || null,
    lens_type_id: cinematography?.lens_type_id || null,
    film_stock_id: cinematography?.film_stock_id || null,
    lighting_source_id: cinematography?.lighting_source_id || null,
    lighting_style_id: cinematography?.lighting_style_id || null,
    atmosphere_id: cinematography?.atmosphere_id || null,
    environment_id: cinematography?.environment_id || null,
    look_and_feel_id: cinematography?.look_and_feel_id || null,
    filter_effect_id: cinematography?.filter_effect_id || null,
    style_id: cinematography?.style_id || null,
    aspect_ratio_id: cinematography?.aspect_ratio_id || null,
  });

  const [cameraMovement, setCameraMovement] = useState<CameraMovement>(
    cinematography?.camera_movement || 'static'
  );
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>(
    cinematography?.motion_intensity || 'subtle'
  );
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [manualPrompt, setManualPrompt] = useState(cinematography?.composed_prompt || '');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('Camera');

  const onComposedPromptChangedRef = useRef(onComposedPromptChanged);
  onComposedPromptChangedRef.current = onComposedPromptChanged;
  const onCinematographyChangedRef = useRef(onCinematographyChanged);
  onCinematographyChangedRef.current = onCinematographyChanged;

  const typeToFieldKey = useCallback((type: CinematicOptionType): string => {
    return `${type}_id`;
  }, []);

  const findOption = useCallback((type: CinematicOptionType, id: string | null): CinematicOption | null => {
    if (!id) return null;
    const typeOptions = options[type];
    if (!typeOptions) return null;
    return typeOptions.find(o => o.id === id) || null;
  }, [options]);

  const composerInput: PromptComposerInput = useMemo(() => {
    return {
      subject: shotDescription || '',
      style: findOption('style', selections.style_id),
      camera_body: findOption('camera_body', selections.camera_body_id),
      focal_length: findOption('focal_length', selections.focal_length_id),
      lens_type: findOption('lens_type', selections.lens_type_id),
      film_stock: findOption('film_stock', selections.film_stock_id),
      lighting_style: findOption('lighting_style', selections.lighting_style_id),
      lighting_source: findOption('lighting_source', selections.lighting_source_id),
      atmosphere: findOption('atmosphere', selections.atmosphere_id),
      environment: findOption('environment', selections.environment_id),
      look_and_feel: findOption('look_and_feel', selections.look_and_feel_id),
      filter_effect: findOption('filter_effect', selections.filter_effect_id),
      aspect_ratio: findOption('aspect_ratio', selections.aspect_ratio_id),
      camera_movement: cameraMovement,
      motion_intensity: motionIntensity,
    };
  }, [selections, cameraMovement, motionIntensity, shotDescription, findOption]);

  const composedPrompt = useMemo(() => composePrompt(composerInput), [composerInput]);
  const previewParts = useMemo(() => getPromptPreviewParts(composerInput), [composerInput]);
  const filledCount = previewParts.filter(p => p.filled).length;
  const totalSlots = previewParts.length;

  useEffect(() => {
    const promptToUse = editingPrompt ? manualPrompt : composedPrompt;
    onComposedPromptChangedRef.current?.(promptToUse);
  }, [composedPrompt, manualPrompt, editingPrompt]);

  function handleSlotChange(type: CinematicOptionType, option: CinematicOption | null) {
    const fieldKey = typeToFieldKey(type);
    const newSelections = { ...selections, [fieldKey]: option?.id || null };
    setSelections(newSelections);

    if (onCinematographyChangedRef.current) {
      onCinematographyChangedRef.current({
        id: cinematography?.id || '',
        shot_id: shotId,
        ...newSelections,
        camera_movement: cameraMovement,
        motion_intensity: motionIntensity,
        composed_prompt: composedPrompt,
        created_at: cinematography?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ShotCinematography);
    }
  }

  function handleClearAll() {
    const cleared: Record<string, string | null> = {};
    SLOT_ORDER.forEach(type => { cleared[typeToFieldKey(type)] = null; });
    setSelections(cleared);
    setCameraMovement('static');
    setMotionIntensity('subtle');
  }

  const currentCategory = CATEGORIES.find(cat => cat.key === activeCategory);
  const currentCategoryTypes = currentCategory?.types || [];

  return (
    <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ===== TOP BAR: Category tabs + stats ===== */}
      <div style={{
        padding: '12px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {CATEGORIES.map(cat => {
            const catFilledCount = cat.types.filter(type => selections[typeToFieldKey(type)] !== null).length;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  fontSize: '10px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '8px 14px',
                  background: isActive ? C.accentBg : 'transparent',
                  color: isActive ? C.accent : C.text2,
                  border: isActive ? `1px solid ${C.accent}` : `1px solid transparent`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {cat.key}
                {catFilledCount > 0 && (
                  <span style={{ marginLeft: '6px', fontSize: '9px', opacity: 0.7 }}>
                    {catFilledCount}/{cat.types.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '11px', fontFamily: 'Raleway, sans-serif', fontWeight: 600,
            padding: '4px 10px',
            background: filledCount > 8 ? C.accentBg : filledCount > 4 ? 'rgba(240,160,48,0.15)' : C.surface,
            color: filledCount > 8 ? C.accent : filledCount > 4 ? '#f0a030' : C.text3,
          }}>
            {filledCount} of {totalSlots} slots filled
          </span>
          <button
            onClick={handleClearAll}
            style={{
              fontSize: '10px', fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '6px 12px', background: 'transparent',
              border: `1px solid ${C.border}`, color: C.text3,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff264a'; e.currentTarget.style.color = '#ff264a'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT: Selectors (left) + Prompt Preview (right) ===== */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* LEFT PANEL: Dropdowns for current category + camera movement */}
        <div style={{
          flex: '1 1 55%', padding: '20px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {/* Category dropdowns in a responsive grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: currentCategoryTypes.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {currentCategoryTypes.map(type => {
              const typeOptions = options[type] || [];
              const fieldKey = typeToFieldKey(type);
              const selectedId = selections[fieldKey];
              const label = CINEMATIC_TYPE_LABELS[type] || type;
              return (
                <SlotDropdown
                  key={type}
                  label={label}
                  options={typeOptions}
                  selectedId={selectedId}
                  onSelect={(option) => handleSlotChange(type, option)}
                />
              );
            })}
          </div>

          {/* Selected option details (show description of what's selected) */}
          {currentCategoryTypes.some(type => selections[typeToFieldKey(type)] !== null) && (
            <div style={{
              padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
                Selected Details
              </span>
              {currentCategoryTypes.map(type => {
                const option = findOption(type, selections[typeToFieldKey(type)]);
                if (!option) return null;
                return (
                  <div key={type} style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text2, lineHeight: 1.4 }}>
                    <span style={{ color: C.accent, fontWeight: 600 }}>{CINEMATIC_TYPE_LABELS[type] || type}:</span>{' '}
                    {option.name} {option.description ? ` \u2014 ${option.description}` : ''}
                  </div>
                );
              })}
            </div>
          )}

          {/* Camera Movement section */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
            <span style={{
              fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3,
              display: 'block', marginBottom: '8px',
            }}>
              Camera Movement
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CAMERA_MOVEMENTS.map(cm => (
                <button
                  key={cm.value}
                  onClick={() => setCameraMovement(cm.value)}
                  style={{
                    padding: '6px 12px', fontSize: '11px', fontWeight: 600, fontFamily: 'Raleway, sans-serif',
                    background: cameraMovement === cm.value ? C.accentBg : 'transparent',
                    border: cameraMovement === cm.value ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                    color: cameraMovement === cm.value ? C.accent : C.text2,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {cm.label}
                </button>
              ))}
            </div>

            {cameraMovement !== 'static' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'Raleway, sans-serif', color: C.text3 }}>Intensity</span>
                <div style={{ display: 'flex', border: `1px solid ${C.border}` }}>
                  {INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMotionIntensity(opt.value)}
                      style={{
                        padding: '5px 14px', fontSize: '11px', fontWeight: 600, fontFamily: 'Raleway, sans-serif',
                        background: motionIntensity === opt.value ? C.accentBg : 'transparent',
                        color: motionIntensity === opt.value ? C.accent : C.text3,
                        border: 'none',
                        borderRight: opt.value !== INTENSITY_OPTIONS[INTENSITY_OPTIONS.length - 1].value ? `1px solid ${C.border}` : 'none',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Sticky Prompt Preview (always visible) */}
        <div style={{
          flex: '1 1 45%', borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, alignSelf: 'flex-start',
          maxHeight: '100%',
        }}>
          {/* Prompt header */}
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3,
            }}>
              Prompt Preview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
                {(editingPrompt ? manualPrompt : composedPrompt).length} chars
              </span>
              <button
                onClick={() => {
                  if (!editingPrompt) setManualPrompt(composedPrompt);
                  setEditingPrompt(!editingPrompt);
                }}
                style={{
                  fontSize: '10px', fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '4px 10px',
                  background: editingPrompt ? C.accentBg : C.elevated,
                  color: editingPrompt ? C.accent : C.text2,
                  border: 'none', cursor: 'pointer',
                }}
              >
                {editingPrompt ? 'Auto Mode' : 'Edit'}
              </button>
            </div>
          </div>

          {/* Prompt content */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {editingPrompt ? (
              <textarea
                value={manualPrompt}
                onChange={e => setManualPrompt(e.target.value)}
                style={{
                  width: '100%', height: '100%', minHeight: '200px',
                  padding: '12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif', lineHeight: 1.6,
                  background: C.card, border: `1px solid ${C.accent}`, color: C.text,
                  outline: 'none', resize: 'none',
                }}
              />
            ) : (
              <>
                {/* Tagged preview: show each part with color coding */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {previewParts.map((part, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      fontSize: '11px', fontFamily: 'Raleway, sans-serif', lineHeight: 1.4,
                    }}>
                      <span style={{
                        flexShrink: 0, fontSize: '8px', fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '2px 6px', marginTop: '2px',
                        background: part.filled ? C.accentBg : C.surface,
                        color: part.filled ? C.accent : C.text3,
                      }}>
                        {part.label}
                      </span>
                      <span style={{ color: part.filled ? C.text : C.text3, fontStyle: part.filled ? 'normal' : 'italic' }}>
                        {part.filled ? part.value : 'Not selected'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Full composed prompt text */}
                <div style={{
                  padding: '12px', background: C.surface, border: `1px solid ${C.border}`,
                }}>
                  <span style={{
                    fontSize: '8px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3,
                    display: 'block', marginBottom: '8px',
                  }}>
                    Full Prompt
                  </span>
                  <p style={{
                    fontSize: '12px', fontFamily: 'Raleway, sans-serif', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', margin: 0,
                    color: composedPrompt ? C.text2 : C.text3,
                  }}>
                    {composedPrompt || 'Select cinematic options to compose your prompt...'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Copy prompt button */}
          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <button
              onClick={() => {
                const text = editingPrompt ? manualPrompt : composedPrompt;
                if (text) navigator.clipboard.writeText(text);
              }}
              style={{
                width: '100%', padding: '10px', fontSize: '10px', fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em',
                background: composedPrompt ? C.accentBg : C.surface,
                color: composedPrompt ? C.accent : C.text3,
                border: 'none', cursor: composedPrompt ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              Copy Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
