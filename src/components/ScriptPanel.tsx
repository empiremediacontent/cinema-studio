'use client';

import { useState } from 'react';
import type { Shot } from '@/lib/types/database';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
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
 * ScriptPanel is the left sidebar. It handles:
 * 1. Synopsis context box (story context for the AI)
 * 2. Creative direction
 * 3. Target duration
 * 4. Generate button
 *
 * The actual script editing lives in the Script tab (ScriptEditor component).
 * This panel receives the script text as a prop so it can send it to the API.
 */
export default function ScriptPanel({
  projectId,
  script,
  initialDirection,
  onShotsGenerated,
}: {
  projectId: string;
  script: string;
  initialDirection: string | null;
  onShotsGenerated: (shots: Shot[]) => void;
}) {
  const [synopsis, setSynopsis] = useState('');
  const [direction, setDirection] = useState(initialDirection || '');
  const [targetDuration, setTargetDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!script.trim()) return;

    setLoading(true);
    setError(null);

    const durationValue = targetDuration === 'custom' ? customDuration : targetDuration;

    // Combine synopsis with creative direction for richer context
    let fullDirection = '';
    if (synopsis.trim()) fullDirection += `SYNOPSIS: ${synopsis.trim()}\n\n`;
    if (direction.trim()) fullDirection += direction.trim();

    try {
      const res = await fetch('/api/generate-shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          script: script.trim(),
          creativeDirection: fullDirection.trim() || undefined,
          targetDuration: durationValue ? Number(durationValue) : undefined,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        setError(`Server returned ${res.status}. Response: ${text.substring(0, 200) || 'empty'}`);
        return;
      }

      if (!res.ok) {
        setError(data.error || `Server returned ${res.status}`);
        return;
      }

      onShotsGenerated(data.shots);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Request failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const wordCount = script.length > 0 ? script.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <h2 style={{
          fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff',
        }}>
          Project Context
        </h2>
        {wordCount > 0 && (
          <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: C.accent }}>
            {wordCount} words in script
          </span>
        )}
      </div>

      {/* Synopsis context box */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2,
          }}>
            Synopsis
          </label>
          {/* Reset icon */}
          {synopsis.trim() && (
            <button
              onClick={() => setSynopsis('')}
              title="Clear synopsis"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.text3, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff264a')}
              onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ marginBottom: '6px', paddingLeft: '10px', borderLeft: `2px solid rgba(255,45,123,0.2)` }}>
          <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.3)', lineHeight: '1.5', margin: 0 }}>
            Story overview, character descriptions, setting, mood, tone. Helps the AI understand context without changing your script.
          </p>
        </div>
        <textarea
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          placeholder="e.g. A tense thriller set in a neon-lit Tokyo nightclub. Main character Yuki (30s, Japanese woman, sharp features) is a detective undercover as a bartender. The atmosphere is smoky, dangerous, with bass-heavy music..."
          style={{
            width: '100%', flex: 1, minHeight: '120px', padding: '14px',
            background: C.surface, borderWidth: '1px', borderStyle: 'solid', borderColor: C.border,
            color: '#fff', fontSize: '13px', fontFamily: 'Raleway, sans-serif', lineHeight: '1.7',
            resize: 'none', outline: 'none', transition: 'border-color 0.3s ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,45,123,0.4)')}
          onBlur={e => (e.currentTarget.style.borderColor = C.border)}
        />
      </div>

      {/* Creative Direction */}
      <div style={{ flexShrink: 0, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2,
          }}>
            Creative Direction <span style={{ color: C.text3, fontWeight: 500 }}>(optional)</span>
          </label>
          {direction.trim() && (
            <button
              onClick={() => setDirection('')}
              title="Clear direction"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.text3, transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff264a')}
              onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
        </div>
        <textarea
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="e.g. Blade Runner 2049 look, moody neon lighting, desaturated teal/orange grade, anamorphic lens flares..."
          rows={2}
          style={{
            width: '100%', padding: '14px',
            background: C.surface, borderWidth: '1px', borderStyle: 'solid', borderColor: C.border,
            color: '#fff', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
            resize: 'vertical', outline: 'none', transition: 'border-color 0.3s ease',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,45,123,0.4)')}
          onBlur={e => (e.currentTarget.style.borderColor = C.border)}
        />
      </div>

      {/* Target Duration */}
      <div style={{ flexShrink: 0, marginBottom: '12px' }}>
        <label style={{
          display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2, marginBottom: '6px',
        }}>
          Target Duration
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={targetDuration}
            onChange={(e) => setTargetDuration(e.target.value)}
            style={{
              flex: 1, padding: '10px 12px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="120"
                min="10"
                max="3600"
                style={{
                  width: '80px', padding: '10px 12px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
                  background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`,
                  borderRadius: 0, outline: 'none', textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3, whiteSpace: 'nowrap' }}>
                sec
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          flexShrink: 0, marginBottom: '12px', padding: '12px 16px',
          background: error.startsWith('Saved') ? 'rgba(45,200,120,0.08)' : 'rgba(255,38,74,0.08)',
          borderWidth: '1px', borderStyle: 'solid',
          borderColor: error.startsWith('Saved') ? 'rgba(45,200,120,0.2)' : 'rgba(255,38,74,0.2)',
          color: error.startsWith('Saved') ? 'rgba(45,200,120,0.8)' : '#ff264a',
          fontSize: '13px', fontFamily: 'Raleway, sans-serif',
        }}>
          {error}
        </div>
      )}

      {/* Generate button */}
      <div style={{ flexShrink: 0, paddingBottom: '24px' }}>
        <button
          onClick={handleGenerate}
          disabled={loading || !script.trim()}
          style={{
            height: '48px', width: '100%',
            fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            background: loading || !script.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ff264a, #ff2d7b)',
            color: loading || !script.trim() ? 'rgba(255,255,255,0.2)' : '#fff',
            border: 'none',
            cursor: loading || !script.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            transition: 'opacity 0.3s ease',
          }}
          onMouseEnter={e => { if (!loading && script.trim()) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {loading ? (
            <>
              <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Generating Storyboard...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {script.trim() ? 'Generate Storyboard' : 'Write Script First'}
            </>
          )}
        </button>
        {!script.trim() && (
          <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3, textAlign: 'center', marginTop: '8px' }}>
            Open the Script tab to write or paste your script
          </p>
        )}
      </div>
    </div>
  );
}
