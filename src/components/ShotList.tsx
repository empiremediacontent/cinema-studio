'use client';

import { useCallback, useState } from 'react';
import ShotCard from '@/components/ShotCard';
import type { Shot } from '@/lib/types/database';

const SHOTS_PER_PAGE = 3;

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

  const sortedShots = [...shots].sort((a, b) => a.sort_order - b.sort_order);
  const totalPages = Math.max(1, Math.ceil(sortedShots.length / SHOTS_PER_PAGE));
  const startIdx = page * SHOTS_PER_PAGE;
  const visibleShots = sortedShots.slice(startIdx, startIdx + SHOTS_PER_PAGE);

  const goNext = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setPage(p => Math.max(p - 1, 0));
  }, []);

  const jumpToShot = useCallback((shotId: string) => {
    const idx = sortedShots.findIndex(s => s.id === shotId);
    if (idx >= 0) {
      setPage(Math.floor(idx / SHOTS_PER_PAGE));
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
        const newTotal = Math.ceil(newShots.length / SHOTS_PER_PAGE);
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
        const newTotal = Math.max(1, Math.ceil(newShots.length / SHOTS_PER_PAGE));
        if (page >= newTotal) setPage(newTotal - 1);
      }
    } catch {
      // Silently fail
    }
  }, [shots, onShotsChanged, page]);

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
        <p style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>Paste a script and generate</p>
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

      {/* Previous nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <NavButton onClick={goPrev} disabled={!hasPrev}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous 3
        </NavButton>
        <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
          Showing {startIdx + 1}-{Math.min(startIdx + SHOTS_PER_PAGE, sortedShots.length)} of {sortedShots.length}
        </span>
        <NavButton onClick={goNext} disabled={!hasNext}>
          Next 3
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NavButton>
      </div>

      {/* Shot cards, 3 at a time */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '24px',
        flex: 1, paddingBottom: '16px',
      }}>
        {visibleShots.map((shot, i) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            index={startIdx + i}
            totalShots={sortedShots.length}
            projectId={projectId}
            onShotUpdated={onShotUpdated}
            onDeleteShot={deleteShot}
            onResetShot={resetShot}
          />
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '16px', borderTop: `1px solid ${C.border}`,
      }}>
        <NavButton onClick={goPrev} disabled={!hasPrev}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous 3
        </NavButton>
        <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
          Page {page + 1} of {totalPages}
        </span>
        <NavButton onClick={goNext} disabled={!hasNext}>
          Next 3
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NavButton>
      </div>
    </div>
  );
}
