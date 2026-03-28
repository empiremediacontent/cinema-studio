'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface TalentAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  referenceSheetUrl?: string;
  description?: string;
}

// Multi-select talent picker for shots with multiple characters.
// Props accept either single-select (legacy) or multi-select callbacks.
export default function TalentSelector({
  projectId,
  selectedTalentId,
  selectedTalentIds,
  onSelect,
  onSelectMulti,
  compact = true,
}: {
  projectId: string;
  selectedTalentId?: string;
  selectedTalentIds?: string[];
  onSelect?: (talent: TalentAsset | null) => void;
  onSelectMulti?: (talents: TalentAsset[]) => void;
  compact?: boolean;
}) {
  const [talents, setTalents] = useState<TalentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Determine if multi-select mode is active
  const isMulti = !!onSelectMulti;
  const activeIds: string[] = isMulti
    ? (selectedTalentIds || [])
    : (selectedTalentId ? [selectedTalentId] : []);

  useEffect(() => {
    loadTalents();
  }, [projectId]);

  async function loadTalents() {
    setLoading(true);
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_type', 'talent')
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .order('created_at', { ascending: false });

    const mapped: TalentAsset[] = (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      thumbnailUrl: (a.thumbnail_url as string) || '',
      referenceSheetUrl: a.reference_sheet_url as string | undefined,
      description: a.description as string | undefined,
    }));

    setTalents(mapped);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/${projectId}/talent/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated-media')
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError || !uploadData) {
        console.error('Upload failed:', uploadError);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('generated-media')
        .getPublicUrl(uploadData.path);

      const talentName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      const { data: asset, error: assetError } = await supabase.from('assets').insert({
        user_id: user.id,
        project_id: projectId,
        asset_type: 'talent',
        name: talentName || 'Uploaded Talent',
        thumbnail_url: publicUrl,
        reference_sheet_url: publicUrl,
        description: `Uploaded ${new Date().toLocaleDateString()}`,
      }).select().single();

      if (!assetError && asset) {
        const newTalent: TalentAsset = {
          id: asset.id,
          name: asset.name,
          thumbnailUrl: publicUrl,
          referenceSheetUrl: publicUrl,
          description: asset.description || undefined,
        };
        setTalents(prev => [newTalent, ...prev]);
        // Auto-select newly uploaded talent
        toggleTalent(newTalent);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleTalent(talent: TalentAsset) {
    if (isMulti) {
      const currentIds = selectedTalentIds || [];
      if (currentIds.includes(talent.id)) {
        // Remove
        const remaining = talents.filter(t => currentIds.includes(t.id) && t.id !== talent.id);
        onSelectMulti!(remaining);
      } else {
        // Add
        const allSelected = talents.filter(t => currentIds.includes(t.id));
        onSelectMulti!([...allSelected, talent]);
      }
    } else {
      // Single-select toggle
      if (selectedTalentId === talent.id) {
        onSelect?.(null);
      } else {
        onSelect?.(talent);
      }
    }
  }

  function clearAll() {
    if (isMulti) {
      onSelectMulti!([]);
    } else {
      onSelect?.(null);
    }
  }

  const selectedTalents = talents.filter(t => activeIds.includes(t.id));

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />

        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '5px 10px',
            transition: 'all 0.2s',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: selectedTalents.length > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            minWidth: '140px',
            maxWidth: '260px',
          }}
        >
          {/* Thumbnail stack for selected talents */}
          {selectedTalents.length > 0 ? (
            <div style={{ display: 'flex', marginRight: '2px', flexShrink: 0 }}>
              {selectedTalents.slice(0, 3).map((t, i) => (
                <img
                  key={t.id}
                  src={t.thumbnailUrl}
                  alt=""
                  style={{
                    width: '20px', height: '20px', objectFit: 'cover',
                    border: '1px solid #0a0a0a',
                    marginLeft: i > 0 ? '-6px' : '0',
                    zIndex: 3 - i,
                    position: 'relative',
                  }}
                />
              ))}
            </div>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}

          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
            {loading
              ? 'Loading...'
              : selectedTalents.length === 0
                ? 'Choose Talent'
                : selectedTalents.length === 1
                  ? selectedTalents[0].name
                  : `${selectedTalents.length} Selected`}
          </span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <>
            <div style={{ position: 'fixed', inset: '0', zIndex: 40 }} onClick={() => setOpen(false)} />
            <div style={{
              position: 'absolute',
              left: '0',
              top: '100%',
              marginTop: '4px',
              zIndex: 50,
              width: '300px',
              maxHeight: '360px',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              {/* Header */}
              <div style={{
                padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                  {isMulti ? 'Select Talent (multi)' : 'Select Talent'}
                </span>
                {activeIds.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearAll(); }}
                    style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', background: 'rgba(255,38,74,0.1)', border: 'none', color: '#ff264a', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Upload button */}
              <button
                onClick={() => { fileInputRef.current?.click(); }}
                disabled={uploading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'transparent',
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(0,212,170,0.1)' }}>
                  {uploading ? (
                    <svg style={{ animation: 'spin 1s linear infinite', width: '14px', height: '14px', color: '#00d4aa' }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#00d4aa', fontFamily: 'Raleway, sans-serif' }}>
                  {uploading ? 'Uploading...' : 'Upload talent image'}
                </span>
              </button>

              {/* None / clear option (only for single-select) */}
              {!isMulti && (
                <button
                  onClick={() => { onSelect?.(null); setOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: activeIds.length === 0 ? 'rgba(255,45,123,0.05)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = activeIds.length === 0 ? 'rgba(255,45,123,0.05)' : 'transparent')}
                >
                  <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif' }}>No reference (text only)</span>
                </button>
              )}

              {/* Talent list */}
              {talents.map((talent) => {
                const isActive = activeIds.includes(talent.id);
                return (
                  <button
                    key={talent.id}
                    onClick={() => { toggleTalent(talent); if (!isMulti) setOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: isActive ? 'rgba(255,45,123,0.06)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? 'rgba(255,45,123,0.06)' : 'transparent'; }}
                  >
                    {/* Checkbox for multi, radio indicator for single */}
                    {isMulti && (
                      <div style={{
                        width: '16px', height: '16px', flexShrink: 0,
                        border: isActive ? '1px solid #ff2d7b' : '1px solid rgba(255,255,255,0.2)',
                        background: isActive ? '#ff2d7b' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isActive && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    {talent.thumbnailUrl ? (
                      <img src={talent.thumbnailUrl} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', flexShrink: 0, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                    <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', color: '#fff', fontFamily: 'Raleway, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{talent.name}</span>
                      {talent.description && (
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{talent.description}</p>
                      )}
                    </div>
                    {!isMulti && isActive && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff2d7b" strokeWidth="3" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {talents.length === 0 && !loading && (
                <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '0', fontFamily: 'Raleway, sans-serif' }}>No talent uploaded yet</p>
                  <p style={{ fontSize: '10px', margin: '4px 0 0 0', color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif' }}>Upload a headshot to anchor character identity</p>
                </div>
              )}

              {/* Done button for multi-select */}
              {isMulti && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      width: '100%', height: '32px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', border: 'none', color: '#fff', cursor: 'pointer',
                    }}
                  >
                    Done ({activeIds.length} selected)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Non-compact mode (grid)
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            border: '2px dashed rgba(255,255,255,0.12)',
            background: 'transparent',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? (
            <svg style={{ animation: 'spin 1s linear infinite', width: '24px', height: '24px', color: '#00d4aa' }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Upload</span>
        </button>

        {talents.map((talent) => {
          const isActive = activeIds.includes(talent.id);
          return (
            <button
              key={talent.id}
              onClick={() => toggleTalent(talent)}
              style={{
                aspectRatio: '1',
                overflow: 'hidden',
                transition: 'all 0.2s',
                position: 'relative',
                border: isActive ? '2px solid #ff2d7b' : '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                padding: '0',
                cursor: 'pointer',
              }}
            >
              {talent.thumbnailUrl ? (
                <img src={talent.thumbnailUrl} alt={talent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
              {/* Checkmark overlay for selected */}
              {isActive && (
                <div style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: '#ff2d7b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                padding: '8px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', fontFamily: 'Raleway, sans-serif' }}>{talent.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
