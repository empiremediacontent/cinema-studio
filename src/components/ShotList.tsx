'use client';

import { useCallback, useState } from 'react';
import ShotCard from '@/components/ShotCard';
import type { Shot } from '@/lib/types/database';

const SHOTS_PER_PAGE_MAP: Record<ViewMode, number> = {
  'compact': 9999,
  'list': 3,
  'grid': 12,
  'large-grid': 6,
};

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  elevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
};

function NavButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        background: disabled ? 'transparent' : C.accentBg,
        color: disabled ? C.text3 : C.accent,
        border: disabled ? `1px solid ${C.border}` : 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

type ViewMode = 'compact' | 'list' | 'grid' | 'large-grid';

const SHOT_TYPE_LABELS: Record<string, string> = {
  wide: 'Wide', medium: 'Medium', medium_close_up: 'MCU',
  close_up: 'Close-Up', extreme_close_up: 'ECU', over_shoulder: 'OTS',
  pov: 'POV', aerial: 'Aerial', custom: 'Custom',
};

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'compact', label: 'Compact',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="4" x2="21" y2="4" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="14" x2="21" y2="14" /><line x1="3" y1="19" x2="21" y2="19" /></svg>,
  },
  {
    id: 'list', label: 'List',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  },
  {
    id: 'grid', label: 'Grid',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
  },
  {
    id: 'large-grid', label: 'Large',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="8" /><rect x="3" y="14" width="18" height="8" /></svg>,
  },
];

export default function ShotList({
  shots,
  projectId,
  onShotUpdated,
  onShotsChanged,
}: {
  shots: Shot[];
  projectId: string;
  onShotUpdated?: (shot: Shot) => void;
  onShotsChanged?: (shots: Shot[]) => void;
}) {
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showVideo, setShowVideo] = useState(false);
  const [doneShots, setDoneShots] = useState<Set<string>>(new Set());
  const [expandedShots, setExpandedShots] = useState<Set<string>>(new Set());
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const toggleExpanded = useCallback((shotId: string) => {
    setExpandedShots(prev => {
      const next = new Set(prev);
      if (next.has(shotId)) next.delete(shotId);
      else next.add(shotId);
      return next;
    });
  }, []);

  const toggleDone = useCallback((shotId: string) => {
    setDoneShots(prev => {
      const next = new Set(prev);
      if (next.has(shotId)) next.delete(shotId);
      else next.add(shotId);
      return next;
    });
  }, []);

  const shotsPerPage = SHOTS_PER_PAGE_MAP[viewMode];
  const sortedShots = [...shots].sort((a, b) => a.sort_order - b.sort_order);
  const totalPages = Math.max(1, Math.ceil(sortedShots.length / shotsPerPage));
  const startIdx = page * shotsPerPage;
  const visibleShots = sortedShots.slice(startIdx, startIdx + shotsPerPage);

  const goNext = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setPage(p => Math.max(p - 1, 0));
  }, []);

  const jumpToShot = useCallback((shotId: string) => {
    const idx = sortedShots.findIndex(s => s.id === shotId);
    if (idx >= 0) {
      setPage(Math.floor(idx / shotsPerPage));
    }
  }, [sortedShots]);

  const addPlaceholder = useCallback(async () => {
    const maxOrder = sortedShots.length > 0
      ? Math.max(...sortedShots.map(s => s.sort_order))
      : 0;

    try {
      const res = await fetch('/api/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'create_placeholder',
          sortOrder: maxOrder + 1,
        }),
      });
      const data = await res.json();
      if (data.shot && onShotsChanged) {
        const newShots = [...shots, data.shot];
        onShotsChanged(newShots);
        // Jump to the last page where the new shot will be
        const newTotal = Math.ceil(newShots.length / shotsPerPage);
        setPage(newTotal - 1);
      }
    } catch {
      // Silently fail
    }
  }, [sortedShots, projectId, shots, onShotsChanged]);

  const deleteShot = useCallback(async (shotId: string) => {
    try {
      await fetch('/api/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId, action: 'delete' }),
      });
      if (onShotsChanged) {
        const newShots = shots.filter(s => s.id !== shotId);
        onShotsChanged(newShots);
        // If we're past the last page now, go back
        const newTotal = Math.max(1, Math.ceil(newShots.length / shotsPerPage));
        if (page >= newTotal) setPage(newTotal - 1);
      }
    } catch {
      // Silently fail
    }
  }, [shots, onShotsChanged, page]);

  const toggleSelectForDelete = useCallback((shotId: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev);
      if (next.has(shotId)) next.delete(shotId);
      else next.add(shotId);
      return next;
    });
  }, []);

  const bulkDelete = useCallback(async () => {
    if (selectedForDelete.size === 0) return;
    if (!confirm(`Delete ${selectedForDelete.size} shot${selectedForDelete.size > 1 ? 's' : ''}?`)) return;
    for (const shotId of selectedForDelete) {
      try {
        await fetch('/api/update-shot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shotId, action: 'delete' }),
        });
      } catch { /* continue */ }
    }
    if (onShotsChanged) {
      const remaining = shots.filter(s => !selectedForDelete.has(s.id));
      onShotsChanged(remaining);
    }
    setSelectedForDelete(new Set());
    setBulkMode(false);
  }, [selectedForDelete, shots, onShotsChanged]);

  const resetShot = useCallback(async (shotId: string) => {
    try {
      const res = await fetch('/api/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotId, action: 'reset' }),
      });
      const data = await res.json();
      if (data.shot) {
        onShotUpdated?.(data.shot);
      }
    } catch {
      // Silently fail
    }
  }, [onShotUpdated]);

  if (shots.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '64px 0' }}>
        <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', background: C.surface }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <p style={{ fontSize: '14px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>No shots yet</p>
        <p style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Paste a script and generate</p>
      </div>
    );
  }

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const completedShots = shots.filter(s => s.image_url || s.video_url).length;
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sticky toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0 16px', borderBottom: `1px solid ${C.border}`,
        marginBottom: '16px', position: 'sticky', top: 0,
        background: C.bg, zIndex: 10, flexWrap: 'wrap', gap: '10px',
      }}>
        {/* Left: title + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{
            fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text, margin: 0,
          }}>
            Storyboard
          </h2>
          <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
            {shots.length} shots
          </span>
          {completedShots > 0 && (
            <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.accent }}>
              {completedShots}/{shots.length} generated
            </span>
          )}
          <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
            {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}
          </span>
        </div>

        {/* Center: view mode + video toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '2px', background: C.surface, padding: '2px' }}>
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                title={mode.label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '28px',
                  background: viewMode === mode.id ? 'rgba(255,45,123,0.15)' : 'transparent',
                  color: viewMode === mode.id ? C.accent : C.text3,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {mode.icon}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowVideo(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: showVideo ? 'rgba(255,45,123,0.12)' : C.surface,
              color: showVideo ? C.accent : C.text3,
              border: `1px solid ${showVideo ? 'rgba(255,45,123,0.3)' : C.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="0" />
            </svg>
            Video {showVideo ? 'ON' : 'OFF'}
          </button>
          {/* Done counter */}
          {doneShots.size > 0 && (
            <span style={{
              fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '4px 10px',
              background: 'rgba(0,255,100,0.08)',
              color: '#00ff64',
              border: '1px solid rgba(0,255,100,0.2)',
            }}>
              {doneShots.size}/{sortedShots.length} Done
            </span>
          )}
          {/* Bulk select toggle */}
          <button
            onClick={() => {
              if (bulkMode) {
                setBulkMode(false);
                setSelectedForDelete(new Set());
              } else {
                setBulkMode(true);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: bulkMode ? 'rgba(255,38,74,0.12)' : C.surface,
              color: bulkMode ? '#ff264a' : C.text3,
              border: `1px solid ${bulkMode ? 'rgba(255,38,74,0.3)' : C.border}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {bulkMode ? `${selectedForDelete.size} Selected` : 'Bulk Delete'}
          </button>
          {bulkMode && selectedForDelete.size > 0 && (
            <button
              onClick={bulkDelete}
              style={{
                padding: '4px 12px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'rgba(255,38,74,0.15)', color: '#ff264a',
                border: '1px solid rgba(255,38,74,0.4)',
                cursor: 'pointer',
              }}
            >
              Delete {selectedForDelete.size}
            </button>
          )}
          {bulkMode && (
            <button
              onClick={() => {
                if (selectedForDelete.size === sortedShots.length) {
                  setSelectedForDelete(new Set());
                } else {
                  setSelectedForDelete(new Set(sortedShots.map(s => s.id)));
                }
              }}
              style={{
                padding: '4px 10px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: C.surface, color: C.text3,
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
              }}
            >
              {selectedForDelete.size === sortedShots.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Right: jump-to + add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value=""
            onChange={(e) => { if (e.target.value) jumpToShot(e.target.value); }}
            style={{
              padding: '6px 10px', fontSize: '11px', fontFamily: 'Raleway, sans-serif', fontWeight: 500,
              background: '#1a1a1a', color: C.text2, border: `1px solid ${C.border}`,
              cursor: 'pointer', outline: 'none', minWidth: '140px',
            }}
          >
            <option value="" style={{ background: '#1a1a1a', color: C.text2 }}>Jump to shot...</option>
            {sortedShots.map((shot, i) => (
              <option key={shot.id} value={shot.id} style={{ background: '#1a1a1a', color: C.text }}>
                {i + 1}. {shot.title || `Shot ${i + 1}`}
              </option>
            ))}
          </select>
          <button
            onClick={addPlaceholder}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: C.accentBg, color: C.accent,
              border: 'none', cursor: 'pointer', transition: 'opacity 0.2s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Shot
          </button>
        </div>
      </div>

      {/* Previous/Next nav (hidden in compact mode since all shots are visible) */}
      {viewMode !== 'compact' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <NavButton onClick={goPrev} disabled={!hasPrev}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous {shotsPerPage}
          </NavButton>
          <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
            Showing {startIdx + 1}-{Math.min(startIdx + shotsPerPage, sortedShots.length)} of {sortedShots.length}
          </span>
          <NavButton onClick={goNext} disabled={!hasNext}>
            Next {shotsPerPage}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NavButton>
        </div>
      )}

      {/* Compact view: expandable rows */}
      {viewMode === 'compact' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingBottom: '16px', overflowY: 'auto' }}>
          {sortedShots.map((shot, i) => {
            const isExpanded = expandedShots.has(shot.id);
            const meta = (shot.metadata || {}) as Record<string, unknown>;
            const dur = shot.duration_seconds ? `${shot.duration_seconds}s` : '?s';
            const type = SHOT_TYPE_LABELS[shot.shot_type || ''] || shot.shot_type || '?';
            const fl = shot.focal_length || '?';
            const cam = shot.camera_movement || 'static';
            const borderColor = i % 2 === 0 ? '#ffffff' : '#00e5ff';
            return (
              <div key={shot.id}>
                <button
                  onClick={() => toggleExpanded(shot.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px',
                    background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: `1px solid ${borderColor}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    opacity: doneShots.has(shot.id) ? 0.5 : 1,
                  }}
                >
                  {/* Done checkbox */}
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleDone(shot.id); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '20px', height: '20px', flexShrink: 0,
                      background: doneShots.has(shot.id) ? 'rgba(0,255,100,0.12)' : 'transparent',
                      border: `2px solid ${doneShots.has(shot.id) ? '#00ff64' : 'rgba(255,255,255,0.2)'}`,
                    }}
                  >
                    {doneShots.has(shot.id) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00ff64" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {/* Shot number */}
                  <span style={{
                    fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                    color: C.accent, minWidth: '24px',
                  }}>
                    #{i + 1}
                  </span>
                  {/* Title */}
                  <span style={{
                    fontSize: '13px', fontFamily: 'Raleway, sans-serif', fontWeight: 600,
                    color: C.text, flex: 1, textAlign: 'left',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {shot.title || `Shot ${i + 1}`}
                  </span>
                  {/* Metadata pills */}
                  <span style={{
                    fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3,
                    whiteSpace: 'nowrap',
                  }}>
                    {dur} · {type} · {fl} · {cam}
                  </span>
                  {/* Expand arrow */}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke={C.text3} strokeWidth="2" strokeLinecap="round"
                    style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {/* Expanded: full ShotCard */}
                {isExpanded && (
                  <div style={{ marginBottom: '8px' }}>
                    <ShotCard
                      shot={shot}
                      index={i}
                      totalShots={sortedShots.length}
                      projectId={projectId}
                      onShotUpdated={onShotUpdated}
                      onDeleteShot={deleteShot}
                      onResetShot={resetShot}
                      onToggleDone={toggleDone}
                      isDone={doneShots.has(shot.id)}
                      hideCheckbox={true}
                      compact={false}
                      showVideo={showVideo}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
      /* Standard views: list, grid, large-grid */
      <div style={{
        display: viewMode === 'list' ? 'flex' : 'grid',
        flexDirection: viewMode === 'list' ? 'column' : undefined,
        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : viewMode === 'large-grid' ? 'repeat(auto-fill, minmax(480px, 1fr))' : undefined,
        gap: viewMode === 'list' ? '24px' : '16px',
        flex: 1, paddingBottom: '16px',
      }}>
        {visibleShots.map((shot, i) => (
          <div key={shot.id} style={{ position: 'relative' }}>
            {bulkMode && (
              <div
                onClick={() => toggleSelectForDelete(shot.id)}
                style={{
                  position: 'absolute', top: '8px', left: '8px', zIndex: 5,
                  width: '24px', height: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selectedForDelete.has(shot.id) ? '#ff264a' : 'rgba(0,0,0,0.6)',
                  border: `2px solid ${selectedForDelete.has(shot.id) ? '#ff264a' : 'rgba(255,255,255,0.5)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {selectedForDelete.has(shot.id) && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
            )}
            <ShotCard
              shot={shot}
              index={startIdx + i}
              totalShots={sortedShots.length}
              projectId={projectId}
              onShotUpdated={onShotUpdated}
              onDeleteShot={deleteShot}
              onResetShot={resetShot}
              onToggleDone={toggleDone}
              isDone={doneShots.has(shot.id)}
              compact={viewMode === 'grid'}
              showVideo={showVideo}
            />
          </div>
        ))}
      </div>
      )}

      {/* Bottom nav (hidden in compact mode) */}
      {viewMode !== 'compact' && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '16px', borderTop: `1px solid ${C.border}`,
      }}>
        <NavButton onClick={goPrev} disabled={!hasPrev}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous {shotsPerPage}
        </NavButton>
        <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
          Page {page + 1} of {totalPages}
        </span>
        <NavButton onClick={goNext} disabled={!hasNext}>
          Next {shotsPerPage}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NavButton>
      </div>
      )}
    </div>
  );
}
