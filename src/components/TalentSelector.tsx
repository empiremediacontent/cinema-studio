'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface TalentAsset {
  id: string;
  name: string;
  thumbnailUrl: string;
  referenceSheetUrl?: string;
  description?: string;
  folder?: string;
}

// Design tokens (shared with other components)
const C = {
  bg: '#0a0a0a', card: '#111', surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)', text: '#fff', text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)', accent: '#ff2d7b', accentBg: 'rgba(255,45,123,0.12)',
  teal: '#00e5ff', danger: '#ff264a',
};

const LABEL: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

const INPUT: React.CSSProperties = {
  padding: '8px 12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
  background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, outline: 'none',
};

// Multi-select talent picker.
// Opens a full modal with grid view, search, and folder filtering.
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
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const isMulti = !!onSelectMulti;
  const activeIds: string[] = isMulti
    ? (selectedTalentIds || [])
    : (selectedTalentId ? [selectedTalentId] : []);

  useEffect(() => { loadTalents(); }, [projectId]);

  // Focus search when modal opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  async function loadTalents() {
    setLoading(true);
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_type', 'talent')
      .order('created_at', { ascending: false });

    const mapped: TalentAsset[] = (data || []).map((a: Record<string, unknown>) => {
      const meta = (a.metadata || {}) as Record<string, unknown>;
      return {
        id: a.id as string,
        name: a.name as string,
        thumbnailUrl: (a.thumbnail_url as string) || '',
        referenceSheetUrl: (a.reference_sheet_url as string) || (a.thumbnail_url as string) || undefined,
        description: a.description as string | undefined,
        folder: (meta.profile_name as string) || (meta.folder_name as string) || undefined,
      };
    });

    setTalents(mapped);
    setLoading(false);
  }

  // Computed: unique folders
  const folders = useMemo(() => {
    const set = new Set<string>();
    talents.forEach(t => { if (t.folder) set.add(t.folder); });
    return Array.from(set).sort();
  }, [talents]);

  // Filtered talents
  const filteredTalents = useMemo(() => {
    let items = talents;
    if (folderFilter !== 'all') items = items.filter(t => t.folder === folderFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.folder || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [talents, folderFilter, searchQuery]);

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
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError || !uploadData) { setUploading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('generated-media').getPublicUrl(uploadData.path);
      const talentName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      const { data: asset, error: assetError } = await supabase.from('assets').insert({
        user_id: user.id,
        project_id: null,
        asset_type: 'talent',
        name: talentName || 'Uploaded Talent',
        thumbnail_url: publicUrl,
        reference_sheet_url: publicUrl,
        description: `Uploaded ${new Date().toLocaleDateString()}`,
      }).select().single();
      if (!assetError && asset) {
        const newTalent: TalentAsset = {
          id: asset.id, name: asset.name, thumbnailUrl: publicUrl,
          referenceSheetUrl: publicUrl, description: asset.description || undefined,
        };
        setTalents(prev => [newTalent, ...prev]);
        toggleTalent(newTalent);
      }
    } catch (err) { console.error('Upload error:', err); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  function toggleTalent(talent: TalentAsset) {
    if (isMulti) {
      const currentIds = selectedTalentIds || [];
      if (currentIds.includes(talent.id)) {
        const remaining = talents.filter(t => currentIds.includes(t.id) && t.id !== talent.id);
        onSelectMulti!(remaining);
      } else {
        const allSelected = talents.filter(t => currentIds.includes(t.id));
        onSelectMulti!([...allSelected, talent]);
      }
    } else {
      if (selectedTalentId === talent.id) onSelect?.(null);
      else onSelect?.(talent);
    }
  }

  function clearAll() {
    if (isMulti) onSelectMulti!([]);
    else onSelect?.(null);
  }

  function handleDone() {
    setOpen(false);
    setSearchQuery('');
    setFolderFilter('all');
  }

  const selectedTalents = talents.filter(t => activeIds.includes(t.id));

  // ============================================================
  // TRIGGER BUTTON (always visible in the shot card)
  // ============================================================
  const triggerButton = (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '11px', fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
        letterSpacing: '0.05em', textTransform: 'uppercase',
        padding: '5px 10px', background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${C.border}`,
        color: selectedTalents.length > 0 ? '#fff' : C.text3,
        cursor: 'pointer', minWidth: '140px', maxWidth: '260px',
      }}
    >
      {selectedTalents.length > 0 ? (
        <div style={{ display: 'flex', marginRight: '2px', flexShrink: 0 }}>
          {selectedTalents.slice(0, 3).map((t, i) => (
            <img key={t.id} src={t.thumbnailUrl} alt=""
              style={{ width: '20px', height: '20px', objectFit: 'cover', border: '1px solid #0a0a0a', marginLeft: i > 0 ? '-6px' : '0', zIndex: 3 - i, position: 'relative' }} />
          ))}
        </div>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
        {loading ? 'Loading...'
          : selectedTalents.length === 0 ? 'Choose Talent'
          : selectedTalents.length === 1 ? selectedTalents[0].name
          : `${selectedTalents.length} Selected`}
      </span>
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );

  // ============================================================
  // MODAL (full-screen overlay with grid)
  // ============================================================
  const modal = open ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} onClick={handleDone} />

      {/* Modal panel */}
      <div style={{
        position: 'relative', width: '90vw', maxWidth: '720px', maxHeight: '80vh',
        background: '#111', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
              Select Talent
            </h2>
            <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3, marginTop: '2px', display: 'block' }}>
              {talents.length} talent image{talents.length !== 1 ? 's' : ''} available
              {activeIds.length > 0 && ` / ${activeIds.length} selected`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeIds.length > 0 && (
              <button onClick={clearAll}
                style={{ padding: '6px 12px', ...LABEL, fontSize: '9px', background: 'rgba(255,38,74,0.08)', color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>
                Clear All
              </button>
            )}
            <button onClick={handleDone}
              style={{ padding: '6px 16px', ...LABEL, fontSize: '10px', background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Done{activeIds.length > 0 ? ` (${activeIds.length})` : ''}
            </button>
          </div>
        </div>

        {/* Search + folder filter + upload */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search talent by name, folder..."
              style={{ ...INPUT, width: '100%', paddingLeft: '32px', fontSize: '12px' }} />
          </div>

          {/* Folder filter */}
          {folders.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <button onClick={() => setFolderFilter('all')}
                style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: folderFilter === 'all' ? C.accentBg : 'transparent', color: folderFilter === 'all' ? C.accent : C.text3, border: folderFilter === 'all' ? '1px solid rgba(255,45,123,0.2)' : '1px solid transparent', cursor: 'pointer' }}>
                All
              </button>
              {folders.map(f => (
                <button key={f} onClick={() => setFolderFilter(f)}
                  style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: folderFilter === f ? C.accentBg : 'transparent', color: folderFilter === f ? C.accent : C.text3, border: folderFilter === f ? '1px solid rgba(255,45,123,0.2)' : '1px solid transparent', cursor: 'pointer', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Upload */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ padding: '6px 14px', ...LABEL, fontSize: '9px', background: uploading ? C.surface : 'rgba(0,229,255,0.08)', color: uploading ? C.text3 : C.teal, border: `1px solid ${uploading ? C.border : 'rgba(0,229,255,0.2)'}`, cursor: uploading ? 'wait' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {/* Talent grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {filteredTalents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1" strokeLinecap="round" style={{ margin: '0 auto 12px' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <p style={{ color: C.text3, fontSize: '12px', fontFamily: 'Raleway, sans-serif' }}>
                {searchQuery || folderFilter !== 'all' ? 'No talent matches your search.' : 'No talent images uploaded yet.'}
              </p>
              <p style={{ color: C.text3, fontSize: '11px', fontFamily: 'Raleway, sans-serif', marginTop: '4px' }}>
                Upload headshots from your Library to use as character references.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {filteredTalents.map(talent => {
                const isActive = activeIds.includes(talent.id);
                return (
                  <div key={talent.id} onClick={() => { toggleTalent(talent); if (!isMulti) handleDone(); }}
                    style={{
                      cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      border: `2px solid ${isActive ? C.accent : 'transparent'}`,
                      background: C.card,
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,45,123,0.3)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    {/* Image */}
                    <div style={{ width: '100%', aspectRatio: '3/4', background: '#080808', overflow: 'hidden' }}>
                      {talent.thumbnailUrl ? (
                        <img src={talent.thumbnailUrl} alt={talent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isMulti && (
                      <div style={{
                        position: 'absolute', top: '6px', left: '6px', width: '22px', height: '22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? C.accent : 'rgba(0,0,0,0.5)',
                        border: `1px solid ${isActive ? C.accent : 'rgba(255,255,255,0.3)'}`,
                      }}>
                        {isActive && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    {!isMulti && isActive && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: C.accent,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}

                    {/* Name + folder label */}
                    <div style={{ padding: '8px 8px 10px' }}>
                      <p style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {talent.name}
                      </p>
                      {talent.folder && (
                        <p style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {talent.folder}
                        </p>
                      )}
                      {talent.description && !talent.folder && (
                        <p style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {talent.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected talent strip (bottom bar) */}
        {selectedTalents.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, overflowX: 'auto' }}>
            <span style={{ ...LABEL, fontSize: '8px', color: C.text3, flexShrink: 0 }}>Selected:</span>
            {selectedTalents.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px 4px 4px', background: C.accentBg, border: '1px solid rgba(255,45,123,0.2)', flexShrink: 0 }}>
                <img src={t.thumbnailUrl} alt="" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
                <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: '#fff', whiteSpace: 'nowrap' }}>{t.name}</span>
                <button onClick={e => { e.stopPropagation(); toggleTalent(t); }}
                  style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '14px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.danger)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ============================================================
  // RENDER
  // ============================================================
  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        {triggerButton}
        {modal}
      </div>
    );
  }

  // Non-compact: just render the grid directly (no trigger needed)
  return (
    <div>
      {modal}
      <button onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '12px', ...LABEL, fontSize: '10px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.2)', cursor: 'pointer' }}>
        Select Talent ({activeIds.length} selected)
      </button>
    </div>
  );
}
