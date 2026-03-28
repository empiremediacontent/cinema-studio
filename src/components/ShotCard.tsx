'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Shot } from '@/lib/types/database';
import ImageLightbox from './ImageLightbox';
import VoicePicker from './VoicePicker';
import TalentSelector, { type TalentAsset } from './TalentSelector';
import ShotCineQuickSelect from './ShotCineQuickSelect';

const SHOT_TYPE_LABELS: Record<string, string> = {
  wide: 'Wide', medium: 'Medium', medium_close_up: 'MCU',
  close_up: 'Close-Up', extreme_close_up: 'ECU', over_shoulder: 'OTS',
  pov: 'POV', aerial: 'Aerial', custom: 'Custom',
};

type GeneratingState = 'idle' | 'image' | 'contact_sheet' | 'video' | 'voice_dialogue' | 'voice_narration' | 'avatar';
type AccordionSection = 'image' | 'video' | 'voice' | 'cinematography' | null;

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  elevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
  danger: '#ff264a',
  dangerBg: 'rgba(255,38,74,0.1)',
};

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg style={{ animation: 'spin 1s linear infinite' }} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function GenButton({ onClick, loading, loadingText, text, disabledText, forceDisabled, generating }: {
  onClick: () => void; loading: boolean; loadingText: string; text: string;
  disabledText?: string; forceDisabled?: boolean; generating?: GeneratingState;
}) {
  const isDisabled = forceDisabled || (generating !== undefined && generating !== 'idle');
  const label = forceDisabled && disabledText ? disabledText : loading ? loadingText : text;
  return (
    <button
      onClick={forceDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={forceDisabled && disabledText ? disabledText : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '8px 16px',
        background: forceDisabled ? C.surface : C.accentBg,
        color: forceDisabled ? C.text3 : C.accent,
        border: forceDisabled ? `1px solid ${C.elevated}` : 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !forceDisabled ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {loading && !forceDisabled && <Spinner size={12} />}
      {label}
    </button>
  );
}

/* Accordion header */
function AccordionHeader({ title, isOpen, onClick, badge, hasContent }: {
  title: string; isOpen: boolean; onClick: () => void;
  badge?: string; hasContent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: isOpen ? C.elevated : 'transparent',
        border: 'none', borderTop: `1px solid ${C.border}`,
        cursor: 'pointer', transition: 'background 0.2s',
      }}
      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = C.surface; }}
      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: isOpen ? C.accent : C.text2,
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
            padding: '2px 8px',
            background: hasContent ? C.accentBg : C.surface,
            color: hasContent ? C.accent : C.text3,
          }}>
            {badge}
          </span>
        )}
      </div>
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke={isOpen ? C.accent : C.text3} strokeWidth="2" strokeLinecap="round"
        style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

export default function ShotCard({
  shot: initialShot,
  index,
  totalShots,
  projectId,
  onShotUpdated,
  onDeleteShot,
  onResetShot,
}: {
  shot: Shot;
  index: number;
  totalShots: number;
  projectId: string;
  onShotUpdated?: (shot: Shot) => void;
  onDeleteShot?: (shotId: string) => void;
  onResetShot?: (shotId: string) => void;
}) {
  const [shot, setShot] = useState(initialShot);
  const [generating, setGenerating] = useState<GeneratingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [variationsEnabled, setVariationsEnabled] = useState(false);
  const [openSection, setOpenSection] = useState<AccordionSection>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM');
  const [selectedTalents, setSelectedTalents] = useState<TalentAsset[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');
  const [serviceStatus, setServiceStatus] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSaveAssetPicker, setShowSaveAssetPicker] = useState<{ url: string; name: string } | null>(null);
  const [saveAssetType, setSaveAssetType] = useState<string>('talent');

  useEffect(() => {
    fetch('/api/service-status').then(r => r.json()).then(setServiceStatus).catch(() => {});
  }, []);

  const voiceConfigured = serviceStatus.elevenlabs === true;

  const meta = (shot.metadata || {}) as Record<string, unknown>;
  const tool = (meta.tool as string) || 'Text-to-Video';
  const avatarCandidate = (meta.avatar_candidate as boolean) || false;
  const videoVariations = (meta.video_variations as string[]) || [];
  const hasDialogue = shot.dialogue && shot.dialogue !== 'None';
  const hasNarration = shot.narration && shot.narration !== 'None';

  const toggleSection = useCallback((section: AccordionSection) => {
    setOpenSection(prev => prev === section ? null : section);
  }, []);

  const updateShot = useCallback((updates: Partial<Shot>) => {
    const updated = { ...shot, ...updates };
    setShot(updated);
    onShotUpdated?.(updated);
  }, [shot, onShotUpdated]);

  function startEditing(field: string, currentValue: string) {
    setEditingField(field);
    setEditBuffer(currentValue || '');
  }

  async function saveEdit(field: string) {
    setEditingField(null);
    const value = editBuffer.trim();
    if (value === (shot as unknown as Record<string, unknown>)[field]) return;
    updateShot({ [field]: value } as Partial<Shot>);
    try {
      const res = await fetch('/api/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, field, value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save');
      }
    } catch { setError('Failed to save edit'); }
  }

  function cancelEdit() { setEditingField(null); setEditBuffer(''); }

  async function deleteMedia(field: 'image_url' | 'video_url' | 'contact_sheet_url') {
    updateShot({ [field]: null } as Partial<Shot>);
    try {
      await fetch('/api/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, field, value: null }),
      });
    } catch { setError('Failed to delete media'); }
  }

  async function handleGenerateImage(type: 'nano' | 'contact_sheet') {
    const prompt = type === 'contact_sheet' ? shot.contact_sheet_prompt : shot.nano_prompt;
    if (!prompt) { setError(`No ${type === 'contact_sheet' ? 'contact sheet' : 'nano'} prompt available`); return; }
    setGenerating(type === 'contact_sheet' ? 'contact_sheet' : 'image');
    setError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, prompt, type, referenceImageUrl: selectedTalents[0]?.referenceSheetUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); setGenerating('idle'); return; }
      if (data.status === 'processing' && data.generation_id) { pollGeneration(data.generation_id, type === 'contact_sheet' ? 'contact_sheet' : 'image'); return; }
      if (data.status === 'processing' && !data.generation_id) { setError('Generation started but no tracking ID returned. Check Supabase connection.'); setGenerating('idle'); return; }
      if (type === 'contact_sheet') updateShot({ contact_sheet_url: data.result_url, generation_status: 'completed' });
      else updateShot({ image_url: data.result_url, generation_status: 'completed' });
      setGenerating('idle');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); setGenerating('idle'); }
  }

  async function handleGenerateVideo() {
    if (!shot.veo_prompt) { setError('No Veo prompt available'); return; }
    setGenerating('video'); setError(null);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, prompt: shot.veo_prompt, imageUrl: shot.image_url || selectedTalents[0]?.referenceSheetUrl || undefined, mode: (shot.image_url || selectedTalents[0]?.referenceSheetUrl) ? 'image-to-video' : 'text-to-video', variations: variationsEnabled }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); setGenerating('idle'); return; }
      if (data.status === 'processing' && data.generation_id) { pollGeneration(data.generation_id, 'video'); return; }
      updateShot({ video_url: data.video_url, generation_status: data.video_url ? 'completed' : 'failed' });
      setGenerating('idle');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); setGenerating('idle'); }
  }

  async function handleGenerateVoice(type: 'dialogue' | 'narration') {
    const text = type === 'dialogue' ? shot.dialogue : shot.narration;
    if (!text || text === 'None') { setError(`No ${type} text available`); return; }
    setGenerating(type === 'dialogue' ? 'voice_dialogue' : 'voice_narration');
    setError(null);
    try {
      const res = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, text, type, voiceId: selectedVoiceId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); setGenerating('idle'); return; }
      updateShot({ metadata: { ...meta, [`${type}_audio_url`]: data.audio_url } });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setGenerating('idle'); }
  }

  async function handleGenerateAvatar() {
    if (!hasDialogue) { setError('Avatar shots require dialogue'); return; }
    setGenerating('avatar'); setError(null);
    try {
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId: shot.id, text: shot.dialogue, voiceId: selectedVoiceId, avatarId: selectedTalents[0]?.id || 'default' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); setGenerating('idle'); return; }
      if (data.status === 'processing' && data.generation_id) { pollGeneration(data.generation_id, 'avatar'); return; }
      if (data.status === 'processing' && !data.generation_id) { setError('Generation started but no tracking ID returned.'); setGenerating('idle'); return; }
      setGenerating('idle');
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); setGenerating('idle'); }
  }

  async function pollGeneration(generationId: string, type: string) {
    if (!generationId) { setError('No generation ID to poll'); setGenerating('idle'); return; }
    const maxAttempts = 60;
    const baseDelay = 5000;
    const maxDelay = 20000;
    for (let i = 0; i < maxAttempts; i++) {
      const delay = Math.min(baseDelay * Math.pow(1.5, i), maxDelay);
      await new Promise(r => setTimeout(r, delay));
      try {
        const res = await fetch(`/api/generation-status?id=${generationId}`);
        if (res.status === 404) { setError('Generation record not found. It may have expired.'); setGenerating('idle'); return; }
        const data = await res.json();
        if (data.status === 'completed') {
          if (type === 'contact_sheet') updateShot({ contact_sheet_url: data.result_url, generation_status: 'completed' });
          else if (type === 'image') updateShot({ image_url: data.result_url, generation_status: 'completed' });
          else updateShot({ video_url: data.result_url, generation_status: 'completed' });
          setGenerating('idle'); return;
        }
        if (data.status === 'failed') { setError(data.error || 'Generation failed'); setGenerating('idle'); return; }
      } catch { /* Network error, continue */ }
    }
    setError('Generation timed out. Check back later.'); setGenerating('idle');
  }

  /* --- Editable Text Area --- */
  function EditableTextArea({ field, value, rows = 3, italic = false }: { field: string; value: string | null; rows?: number; italic?: boolean }) {
    if (editingField === field) {
      return (
        <div>
          <textarea
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            rows={Math.max(rows, 4)}
            autoFocus
            style={{
              width: '100%', padding: '12px', background: C.surface,
              borderWidth: '1px', borderStyle: 'solid', borderColor: C.accent,
              color: C.text, fontSize: '13px', fontFamily: 'Raleway, sans-serif',
              fontStyle: italic ? 'italic' : 'normal', lineHeight: '1.7',
              resize: 'vertical', outline: 'none', minHeight: '100px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button onClick={cancelEdit} style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', background: C.elevated, color: C.text2, border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => saveEdit(field)} style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', background: `linear-gradient(135deg, ${C.danger}, ${C.accent})`, color: '#fff', border: 'none', cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      );
    }
    return (
      <div
        style={{
          fontSize: '13px', fontFamily: 'Raleway, sans-serif',
          fontStyle: italic ? 'italic' : 'normal', lineHeight: '1.7',
          padding: '12px', background: C.surface, color: C.text2,
          cursor: 'pointer', transition: 'background 0.2s',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          maxHeight: '180px', overflowY: 'auto',
        }}
        onClick={() => startEditing(field, value || '')}
        onMouseEnter={e => (e.currentTarget.style.background = C.elevated)}
        onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
      >
        {value || <span style={{ color: C.text3, fontStyle: 'normal' }}>Click to add</span>}
      </div>
    );
  }

  /* --- Save generated media as a project asset --- */
  async function saveToAssets(url: string, name: string, assetType: string) {
    try {
      const res = await fetch('/api/save-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name,
          assetType,
          thumbnailUrl: url,
          shotId: shot.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save asset');
        return;
      }
      setError(null);
      setShowSaveAssetPicker(null);
      // Brief visual confirmation
      const prevError = error;
      setError(`Saved "${name}" as ${assetType} to Assets`);
      setTimeout(() => setError(prevError), 2000);
    } catch { setError('Failed to save to assets'); }
  }

  /* --- Media Preview --- */
  function MediaPreview({ src, type, label, mediaField }: {
    src: string; type: 'image' | 'video'; label: string; mediaField?: 'image_url' | 'video_url' | 'contact_sheet_url';
  }) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div
          style={{ overflow: 'hidden', cursor: 'pointer', border: `1px solid ${C.border}` }}
          onClick={() => { setLightboxSrc(src); setLightboxType(type); }}
        >
          {type === 'video' ? (
            <video src={src} style={{ height: '160px', width: 'auto', minWidth: '180px', objectFit: 'cover' }} muted />
          ) : (
            <img src={src} alt={label} style={{ height: '160px', width: 'auto', minWidth: '180px', objectFit: 'cover' }} />
          )}
        </div>
        <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
          {/* Download button - fetch blob for cross-origin support */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const resp = await fetch(src);
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${label.replace(/\s+/g, '_').toLowerCase()}.${type === 'video' ? 'mp4' : 'png'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Download failed:', err);
              }
            }}
            style={{
              width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.85)', border: 'none', cursor: 'pointer',
            }}
            title={`Download ${label}`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {/* Delete button */}
          {mediaField && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteMedia(mediaField); }}
              style={{
                width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,38,74,0.85)', border: 'none', cursor: 'pointer',
              }}
              title={`Delete ${label}`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          {/* Save to Assets button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSaveAssetPicker({ url: src, name: `${shot.title || `Shot ${index + 1}`} - ${label}` });
              setSaveAssetType('talent');
            }}
            style={{
              width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(45,200,120,0.85)', border: 'none', cursor: 'pointer',
            }}
            title="Save to Assets"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </div>
        <span style={{ display: 'block', marginTop: '6px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
    );
  }

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} type={lightboxType} onClose={() => setLightboxSrc(null)} />}

      {/* Save to Assets type picker modal */}
      {showSaveAssetPicker && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
          }}
          onClick={() => setShowSaveAssetPicker(null)}
        >
          <div
            style={{ background: '#111', border: `1px solid ${C.border}`, padding: '24px', maxWidth: '360px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', marginBottom: '4px' }}>
              Save to Assets
            </h3>
            <p style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3, marginBottom: '16px' }}>
              Choose the classification for this asset.
            </p>

            {/* Thumbnail preview */}
            <div style={{ marginBottom: '16px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <img src={showSaveAssetPicker.url} alt="Preview" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
            </div>

            {/* Asset name */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2, marginBottom: '4px' }}>Name</label>
              <input
                type="text"
                defaultValue={showSaveAssetPicker.name}
                onChange={(e) => setShowSaveAssetPicker(prev => prev ? { ...prev, name: e.target.value } : null)}
                style={{
                  width: '100%', height: '36px', padding: '0 12px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
                  background: C.surface, border: `1px solid ${C.border}`, color: '#fff', outline: 'none',
                }}
              />
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2, marginBottom: '6px' }}>Classification</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(['talent', 'background', 'product', 'audio', 'lut', 'other'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSaveAssetType(t)}
                    style={{
                      padding: '8px 14px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                      background: saveAssetType === t ? C.accentBg : C.surface,
                      border: saveAssetType === t ? '1px solid rgba(255,45,123,0.4)' : `1px solid ${C.border}`,
                      color: saveAssetType === t ? C.accent : C.text2,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowSaveAssetPicker(null)}
                style={{
                  flex: 1, height: '36px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: C.surface, border: `1px solid ${C.border}`, color: '#fff', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showSaveAssetPicker) {
                    saveToAssets(showSaveAssetPicker.url, showSaveAssetPicker.name, saveAssetType);
                  }
                }}
                style={{
                  flex: 1, height: '36px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', border: 'none', color: '#fff', cursor: 'pointer',
                }}
              >
                Save Asset
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        transition: 'border-color 0.3s', overflow: 'hidden',
      }}>
        {/* === CARD HEADER: Always visible === */}
        <div style={{ padding: '20px 24px' }}>
          {/* Top row: shot number + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                background: C.surface, border: `1px solid ${C.border}`, color: C.text2,
              }}>
                {index + 1}
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
                of {totalShots}
              </span>

              {/* Status badges */}
              {generating !== 'idle' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, padding: '3px 10px', background: 'rgba(240,160,48,0.1)', color: '#f0a030' }}>
                  <Spinner size={10} /> Generating
                </span>
              )}
              {shot.image_url && <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, padding: '3px 10px', background: C.accentBg, color: C.accent }}>IMG</span>}
              {shot.video_url && <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, padding: '3px 10px', background: C.accentBg, color: C.accent }}>VID</span>}
              {avatarCandidate && <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, padding: '3px 10px', background: C.dangerBg, color: C.danger }}>Avatar</span>}
            </div>

            {/* Actions: reset + delete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => onResetShot?.(shot.id)}
                title="Reset shot (clear generated media)"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                  padding: '5px 10px', background: 'transparent',
                  border: `1px solid ${C.border}`, color: C.text3,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.text2; e.currentTarget.style.color = C.text2; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Reset
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete shot"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                    padding: '5px 10px', background: 'transparent',
                    border: `1px solid ${C.border}`, color: C.text3,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.danger; e.currentTarget.style.color = C.danger; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => { onDeleteShot?.(shot.id); setConfirmDelete(false); }}
                    style={{
                      fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      padding: '5px 10px', background: C.danger, color: '#fff',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                      padding: '5px 10px', background: C.elevated, color: C.text2,
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title (editable) */}
          <div
            style={{
              fontSize: '18px', fontFamily: 'Raleway, sans-serif', fontWeight: 600,
              color: C.text, lineHeight: '1.4', marginBottom: '8px',
              cursor: 'pointer',
            }}
            onClick={() => startEditing('title', shot.title || '')}
          >
            {editingField === 'title' ? (
              <input
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                onBlur={() => saveEdit('title')}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit('title'); if (e.key === 'Escape') cancelEdit(); }}
                autoFocus
                style={{
                  width: '100%', padding: '4px 8px', fontSize: '18px', fontFamily: 'Raleway, sans-serif',
                  fontWeight: 600, background: C.surface, border: `1px solid ${C.accent}`,
                  color: C.text, outline: 'none',
                }}
              />
            ) : (
              shot.title || `Shot ${index + 1}`
            )}
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
              {shot.duration_seconds}s
            </span>
            <span style={{ fontSize: '12px', color: C.text3 }}>&middot;</span>
            <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
              {SHOT_TYPE_LABELS[shot.shot_type || 'medium'] || shot.shot_type}
            </span>
            <span style={{ fontSize: '12px', color: C.text3 }}>&middot;</span>
            <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
              {shot.focal_length || '85mm'}
            </span>
            {shot.camera_movement && (
              <>
                <span style={{ fontSize: '12px', color: C.text3 }}>&middot;</span>
                <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>{shot.camera_movement}</span>
              </>
            )}
            <span style={{ fontSize: '12px', color: C.text3 }}>&middot;</span>
            <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>{tool}</span>
          </div>

          {/* Description (always visible, editable) */}
          <EditableTextArea field="description" value={shot.description} rows={2} />

          {/* Talent selector row */}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TalentSelector projectId={projectId} selectedTalentIds={selectedTalents.map(t => t.id)} onSelectMulti={setSelectedTalents} compact />
            <VoicePicker selectedVoiceId={selectedVoiceId} onSelect={setSelectedVoiceId} compact />
          </div>
        </div>

        {/* === ACCORDION SECTIONS === */}

        {/* IMAGE GENERATION */}
        <AccordionHeader
          title="Image Generation"
          isOpen={openSection === 'image'}
          onClick={() => toggleSection('image')}
          badge={shot.image_url ? 'Generated' : shot.nano_prompt ? 'Ready' : 'No Prompt'}
          hasContent={!!shot.image_url}
        />
        {openSection === 'image' && (
          <div style={{ padding: '20px 24px', borderTop: `1px solid ${C.border}` }}>
            {/* Media previews */}
            {(shot.image_url || shot.contact_sheet_url) && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {shot.image_url && <MediaPreview src={shot.image_url} type="image" label="Nano Image" mediaField="image_url" />}
                {shot.contact_sheet_url && <MediaPreview src={shot.contact_sheet_url} type="image" label="Contact Sheet" mediaField="contact_sheet_url" />}
              </div>
            )}

            {/* Nano prompt */}
            {shot.nano_prompt && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2 }}>Nano Prompt</span>
                  <GenButton onClick={() => handleGenerateImage('nano')} loading={generating === 'image'} loadingText="Generating..." text={selectedTalents.length > 0 ? 'Generate w/ Reference' : 'Generate Image'} generating={generating} />
                </div>
                <EditableTextArea field="nano_prompt" value={shot.nano_prompt} rows={4} />
              </div>
            )}

            {/* Contact sheet prompt */}
            {shot.contact_sheet_prompt && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2 }}>Contact Sheet</span>
                  <GenButton onClick={() => handleGenerateImage('contact_sheet')} loading={generating === 'contact_sheet'} loadingText="Generating..." text="Generate Sheet" generating={generating} />
                </div>
                <EditableTextArea field="contact_sheet_prompt" value={shot.contact_sheet_prompt} rows={3} />
              </div>
            )}
          </div>
        )}

        {/* VIDEO GENERATION */}
        <AccordionHeader
          title="Video Generation"
          isOpen={openSection === 'video'}
          onClick={() => toggleSection('video')}
          badge={shot.video_url ? 'Generated' : shot.veo_prompt ? 'Ready' : 'No Prompt'}
          hasContent={!!shot.video_url}
        />
        {openSection === 'video' && (
          <div style={{ padding: '20px 24px', borderTop: `1px solid ${C.border}` }}>
            {/* Video preview */}
            {(shot.video_url || videoVariations.length > 0) && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {shot.video_url && <MediaPreview src={shot.video_url} type="video" label="Video" mediaField="video_url" />}
                {videoVariations.filter(v => v && !v.startsWith('error:')).map((v, i) => (
                  <MediaPreview key={i} src={v} type="video" label={`Variation ${i + 1}`} />
                ))}
              </div>
            )}

            {shot.veo_prompt && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2 }}>Veo Prompt</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: C.text3 }}>4 angles</span>
                      <div
                        onClick={(e) => { e.preventDefault(); setVariationsEnabled(!variationsEnabled); }}
                        style={{
                          width: '32px', height: '18px', borderRadius: '9px',
                          transition: 'background 0.2s', position: 'relative', cursor: 'pointer',
                          background: variationsEnabled ? C.accent : C.borderHover,
                        }}
                      >
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '7px', background: '#fff',
                          position: 'absolute', top: '2px', transition: 'transform 0.2s',
                          transform: variationsEnabled ? 'translateX(14px)' : 'translateX(2px)',
                        }} />
                      </div>
                    </label>
                    <GenButton onClick={handleGenerateVideo} loading={generating === 'video'} loadingText="Generating..." text={variationsEnabled ? 'Generate 4 Videos' : 'Generate Video'} generating={generating} />
                  </div>
                </div>
                <EditableTextArea field="veo_prompt" value={shot.veo_prompt} rows={4} />
              </div>
            )}
          </div>
        )}

        {/* VOICE & AUDIO */}
        <AccordionHeader
          title="Voice & Audio"
          isOpen={openSection === 'voice'}
          onClick={() => toggleSection('voice')}
          badge={
            (meta.dialogue_audio_url || meta.narration_audio_url)
              ? 'Generated'
              : (hasDialogue || hasNarration) ? 'Ready' : 'Empty'
          }
          hasContent={!!(meta.dialogue_audio_url || meta.narration_audio_url)}
        />
        {openSection === 'voice' && (
          <div style={{ padding: '20px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Dialogue */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2 }}>Dialogue</span>
                {hasDialogue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {avatarCandidate && <GenButton onClick={handleGenerateAvatar} loading={generating === 'avatar'} loadingText="Generating..." text="Generate Avatar" generating={generating} />}
                    <GenButton onClick={() => handleGenerateVoice('dialogue')} loading={generating === 'voice_dialogue'} loadingText="Generating..." text="Generate Voice" forceDisabled={!voiceConfigured} disabledText="Voice Not Configured" generating={generating} />
                  </div>
                )}
              </div>
              <EditableTextArea field="dialogue" value={hasDialogue ? shot.dialogue : null} rows={2} italic />
              {(meta.dialogue_audio_url as string) && (
                <audio src={meta.dialogue_audio_url as string} controls style={{ marginTop: '8px', height: '32px', width: '100%' }} />
              )}
            </div>

            {/* Narration */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2 }}>Narration</span>
                {hasNarration && <GenButton onClick={() => handleGenerateVoice('narration')} loading={generating === 'voice_narration'} loadingText="Generating..." text="Generate Voice" forceDisabled={!voiceConfigured} disabledText="Voice Not Configured" generating={generating} />}
              </div>
              <EditableTextArea field="narration" value={hasNarration ? shot.narration : null} rows={2} italic />
              {(meta.narration_audio_url as string) && (
                <audio src={meta.narration_audio_url as string} controls style={{ marginTop: '8px', height: '32px', width: '100%' }} />
              )}
            </div>
          </div>
        )}

        {/* CINEMATOGRAPHY (quick select placeholder for now) */}
        <AccordionHeader
          title="Cinematography"
          isOpen={openSection === 'cinematography'}
          onClick={() => toggleSection('cinematography')}
          badge="Quick Select"
        />
        {openSection === 'cinematography' && (
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            <ShotCineQuickSelect
              shotId={shot.id}
              onSelectionsChanged={(selections, cameraMovement, motionIntensity) => {
                // Store cinematography selections in shot metadata for downstream use
                updateShot({
                  metadata: {
                    ...meta,
                    cine_selections: selections,
                    cine_camera_movement: cameraMovement,
                    cine_motion_intensity: motionIntensity,
                  },
                  camera_movement: cameraMovement,
                });
              }}
            />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={{
            margin: '0 24px 16px', padding: '12px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.dangerBg, border: `1px solid rgba(255,38,74,0.2)`, color: C.danger,
          }}>
            <span style={{ wordBreak: 'break-word' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: '8px', fontSize: '16px', lineHeight: 1, flexShrink: 0, opacity: 0.6, background: 'none', border: 'none', color: C.danger, cursor: 'pointer' }}>&times;</button>
          </div>
        )}
      </div>
    </>
  );
}
