'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CinematicOption, CinematicOptionType, CinematicOptionsMap, CameraMovement, MotionIntensity } from '@/lib/types/database';
import { CINEMATIC_TYPE_LABELS } from '@/lib/prompt-composer';

const SLOT_ORDER: CinematicOptionType[] = [
  'style',
  'camera_body',
  'focal_length',
  'lens_type',
  'film_stock',
  'lighting_style',
  'lighting_source',
  'atmosphere',
  'environment',
  'look_and_feel',
  'filter_effect',
  'aspect_ratio',
];

const CAMERA_MOVEMENTS: CameraMovement[] = [
  'static',
  'pan_left',
  'pan_right',
  'tilt_up',
  'tilt_down',
  'dolly_in',
  'dolly_out',
  'crane_up',
  'crane_down',
  'tracking',
  'handheld',
  'orbit',
  'whip_pan',
  'rack_focus',
];

const MOTION_INTENSITIES: MotionIntensity[] = ['subtle', 'moderate', 'dramatic'];

const CAMERA_MOVEMENT_DESCRIPTIONS: Record<CameraMovement, string> = {
  static: 'static camera',
  pan_left: 'pans left',
  pan_right: 'pans right',
  tilt_up: 'tilts up',
  tilt_down: 'tilts down',
  dolly_in: 'dolly in',
  dolly_out: 'dolly out',
  crane_up: 'crane up',
  crane_down: 'crane down',
  tracking: 'tracking shot',
  handheld: 'handheld camera',
  orbit: 'orbiting camera',
  whip_pan: 'whip pan',
  rack_focus: 'rack focus',
};

let cachedOptions: CinematicOptionsMap | null = null;
let optionsFetchPromise: Promise<CinematicOptionsMap> | null = null;

const fetchCinematicOptions = async (): Promise<CinematicOptionsMap> => {
  if (cachedOptions) {
    return cachedOptions;
  }

  if (optionsFetchPromise) {
    return optionsFetchPromise;
  }

  optionsFetchPromise = fetch('/api/cinematic-options')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch cinematic options');
      return res.json();
    })
    .then((data) => {
      const opts = (data.options || data) as CinematicOptionsMap;
      cachedOptions = opts;
      optionsFetchPromise = null;
      return opts;
    })
    .catch((error) => {
      optionsFetchPromise = null;
      console.error('Error fetching cinematic options:', error);
      return {} as CinematicOptionsMap;
    });

  return optionsFetchPromise;
};

interface ShotCineQuickSelectProps {
  shotId: string;
  onSelectionsChanged?: (selections: Record<string, string | null>, cameraMovement: CameraMovement, motionIntensity: MotionIntensity) => void;
}

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  elevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
};

export default function ShotCineQuickSelect({ shotId, onSelectionsChanged }: ShotCineQuickSelectProps) {
  const [options, setOptions] = useState<CinematicOptionsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('static');
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensity>('moderate');
  const [composedPrompt, setComposedPrompt] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      const opts = await fetchCinematicOptions();
      setOptions(opts);
      setLoading(false);

      const initialSelections: Record<string, string | null> = {};
      SLOT_ORDER.forEach((type) => {
        initialSelections[type] = null;
      });
      setSelections(initialSelections);
    };

    loadOptions();
  }, []);

  const updateComposedPrompt = useCallback(
    (sels: Record<string, string | null>, movement: CameraMovement, intensity: MotionIntensity) => {
      const fragments: string[] = [];

      SLOT_ORDER.forEach((type) => {
        const selectedId = sels[type];
        if (selectedId && options && options[type]) {
          const option = options[type].find((opt) => opt.id === selectedId);
          if (option && option.prompt_fragment) {
            fragments.push(option.prompt_fragment);
          }
        }
      });

      const movementDesc = CAMERA_MOVEMENT_DESCRIPTIONS[movement];
      fragments.push(movementDesc);

      const prompt = fragments.join(', ');
      setComposedPrompt(prompt);

      if (onSelectionsChanged) {
        onSelectionsChanged(sels, movement, intensity);
      }
    },
    [options, onSelectionsChanged]
  );

  const handleSelectionChange = (type: CinematicOptionType, value: string | null) => {
    const newSelections = { ...selections, [type]: value };
    setSelections(newSelections);
    updateComposedPrompt(newSelections, cameraMovement, motionIntensity);
  };

  const handleCameraMovementChange = (movement: CameraMovement) => {
    setCameraMovement(movement);
    updateComposedPrompt(selections, movement, motionIntensity);
  };

  const handleMotionIntensityChange = (intensity: MotionIntensity) => {
    setMotionIntensity(intensity);
    updateComposedPrompt(selections, cameraMovement, intensity);
  };

  const handleClear = () => {
    const newSelections: Record<string, string | null> = {};
    SLOT_ORDER.forEach((type) => {
      newSelections[type] = null;
    });
    setSelections(newSelections);
    setCameraMovement('static');
    setMotionIntensity('moderate');
    updateComposedPrompt(newSelections, 'static', 'moderate');
  };

  const handleApply = () => {
    if (onSelectionsChanged) {
      onSelectionsChanged(selections, cameraMovement, motionIntensity);
    }
  };

  const filledCount = Object.values(selections).filter((v) => v !== null).length;

  if (loading) {
    return (
      <div style={{ padding: '12px', color: C.text3, fontSize: '12px', fontFamily: 'Raleway' }}>
        Loading cinematic options...
      </div>
    );
  }

  if (!options) {
    return (
      <div style={{ padding: '12px', color: C.text3, fontSize: '12px', fontFamily: 'Raleway' }}>
        Failed to load cinematic options
      </div>
    );
  }

  const gridItems = SLOT_ORDER.slice(0, 10);
  const secondRowItems = SLOT_ORDER.slice(10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: C.card, borderRadius: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text }}>
          Cinematography
        </div>
        <div style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>
          {filledCount} of {SLOT_ORDER.length} slots
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {gridItems.map((type) => (
          <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
              {CINEMATIC_TYPE_LABELS[type] || type}
            </label>
            <select
              value={selections[type] || ''}
              onChange={(e) => handleSelectionChange(type, e.target.value || null)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: 'Raleway',
                backgroundColor: '#1a1a1a',
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 0,
                boxSizing: 'border-box',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">-- None --</option>
              {options[type]?.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {secondRowItems.map((type) => (
          <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
              {CINEMATIC_TYPE_LABELS[type] || type}
            </label>
            <select
              value={selections[type] || ''}
              onChange={(e) => handleSelectionChange(type, e.target.value || null)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '12px',
                fontFamily: 'Raleway',
                backgroundColor: '#1a1a1a',
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 0,
                boxSizing: 'border-box',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="">-- None --</option>
              {options[type]?.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
            Camera Movement
          </label>
          <select
            value={cameraMovement}
            onChange={(e) => handleCameraMovementChange(e.target.value as CameraMovement)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '12px',
              fontFamily: 'Raleway',
              backgroundColor: '#1a1a1a',
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 0,
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            {CAMERA_MOVEMENTS.map((movement) => (
              <option key={movement} value={movement}>
                {movement.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
            Motion Intensity
          </label>
          <select
            value={motionIntensity}
            onChange={(e) => handleMotionIntensityChange(e.target.value as MotionIntensity)}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '12px',
              fontFamily: 'Raleway',
              backgroundColor: '#1a1a1a',
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 0,
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            {MOTION_INTENSITIES.map((intensity) => (
              <option key={intensity} value={intensity}>
                {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '9px', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3 }}>
          Composed Prompt
        </label>
        <textarea
          readOnly
          value={composedPrompt}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontSize: '11px',
            fontFamily: 'Raleway',
            backgroundColor: '#1a1a1a',
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 0,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        <button
          onClick={handleApply}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontFamily: 'Montserrat',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backgroundColor: C.accent,
            color: '#000',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
        >
          Apply to Shot
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontFamily: 'Montserrat',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backgroundColor: 'transparent',
            color: C.text3,
            border: `1px solid ${C.border}`,
            borderRadius: 0,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.text2;
            (e.currentTarget as HTMLButtonElement).style.color = C.text2;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            (e.currentTarget as HTMLButtonElement).style.color = C.text3;
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
