'use client';

import { useState, useEffect, useCallback } from 'react';

const C = {
  bg: '#0a0a0a',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
};

/**
 * ScriptEditor is the full-size script editing tab.
 * The script is the writer's sacred document. This editor
 * does NOT modify the script automatically. Only the writer types here.
 */
export default function ScriptEditor({
  projectId,
  script,
  onScriptChanged,
}: {
  projectId: string;
  script: string;
  onScriptChanged: (script: string) => void;
}) {
  const [localScript, setLocalScript] = useState(script);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Sync from parent if script changes externally
  useEffect(() => {
    setLocalScript(script);
  }, [script]);

  // Auto-save after 2 seconds of inactivity
  const saveScript = useCallback(async (text: string) => {
    setSaving(true);
    try {
      await fetch('/api/update-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, field: 'script', value: text }),
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Silent fail, user can manually save
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (localScript === script) return; // No change from initial
    const timer = setTimeout(() => {
      onScriptChanged(localScript);
      saveScript(localScript);
    }, 2000);
    return () => clearTimeout(timer);
  }, [localScript, script, onScriptChanged, saveScript]);

  const wordCount = localScript.length > 0 ? localScript.split(/\s+/).filter(Boolean).length : 0;
  const charCount = localScript.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', borderBottom: `1px solid ${C.border}`, marginBottom: '16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2,
          }}>
            {wordCount} words
          </span>
          <span style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
            letterSpacing: '0.08em', color: C.text3,
          }}>
            {charCount.toLocaleString()} characters
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saving && (
            <span style={{
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
              color: C.accent, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Saving...
            </span>
          )}
          {lastSaved && !saving && (
            <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
              Saved at {lastSaved}
            </span>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        flexShrink: 0, marginBottom: '12px', padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(255,45,123,0.2)',
      }}>
        <p style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.35)', lineHeight: '1.6', margin: 0 }}>
          This is your script. Write freely. The AI will never change what you write here.
          It reads your script to generate the storyboard, preserving your dialogue, narration, and descriptions exactly as written.
        </p>
      </div>

      {/* Main editor */}
      <textarea
        value={localScript}
        onChange={(e) => setLocalScript(e.target.value)}
        placeholder={'INT. LOCATION - TIME OF DAY\n\nScene description goes here. What does the audience see?\n\nCHARACTER NAME\nDialogue goes here.\n\nNARRATOR (V.O.)\nNarration goes here.\n\n(Camera slowly pans across the room...)'}
        style={{
          width: '100%', flex: 1, minHeight: '300px', padding: '24px',
          background: C.surface, borderWidth: '1px', borderStyle: 'solid', borderColor: C.border,
          color: '#fff', fontSize: '15px', fontFamily: 'Raleway, sans-serif', lineHeight: '2',
          resize: 'none', outline: 'none', transition: 'border-color 0.3s ease',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,45,123,0.3)')}
        onBlur={e => (e.currentTarget.style.borderColor = C.border)}
      />
    </div>
  );
}
