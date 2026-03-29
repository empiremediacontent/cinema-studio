'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ScriptPanel from '@/components/ScriptPanel';
import ScriptEditor from '@/components/ScriptEditor';
import ShotList from '@/components/ShotList';
import TimelineEditor from '@/components/TimelineEditor';
import AssetLibrary from '@/components/AssetLibrary';
import AvatarLibrary from '@/components/AvatarLibrary';
import CinematographyPanel from '@/components/CinematographyPanel';
import MoodBoard from '@/components/MoodBoard';
import PipelinePanel from '@/components/PipelinePanel';
import type { Project, Shot, CinematicOptionsMap, ProjectCharacter } from '@/lib/types/database';

const C = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
};

type WorkspaceTab = 'script' | 'shots' | 'characters' | 'cinematography' | 'timeline' | 'assets' | 'moodboard';

const TAB_ICON: Record<WorkspaceTab, React.ReactNode> = {
  script: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  shots: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  ),
  characters: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  cinematography: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  ),
  timeline: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="12" x2="22" y2="12" /><polyline points="12 2 12 22" /><polyline points="6 8 2 12 6 16" /><polyline points="18 8 22 12 18 16" />
    </svg>
  ),
  assets: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  moodboard: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
};

export default function ProjectWorkspace({
  project,
  initialShots,
}: {
  project: Project;
  initialShots: Shot[];
}) {
  const [shots, setShots] = useState<Shot[]>(initialShots);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('shots');
  const [scriptText, setScriptText] = useState(project.script || '');
  const [cinematicOptions, setCinematicOptions] = useState<CinematicOptionsMap | null>(null);
  const [projectCharacters, setProjectCharacters] = useState<ProjectCharacter[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedShotForCine, setSelectedShotForCine] = useState<Shot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);

  // Keep a ref to the selected shot so the memoized callback always has the current value
  const selectedShotRef = useRef(selectedShotForCine);
  selectedShotRef.current = selectedShotForCine;

  const handleShotUpdated = useCallback((updatedShot: Shot) => {
    setShots(prev => prev.map(s => s.id === updatedShot.id ? updatedShot : s));
  }, []);

  useEffect(() => {
    if (activeTab === 'cinematography' && !cinematicOptions && !loadingOptions) {
      setLoadingOptions(true);
      fetch('/api/cinematic-options')
        .then(res => res.json())
        .then(data => {
          if (data.options) setCinematicOptions(data.options as CinematicOptionsMap);
        })
        .catch(() => {})
        .finally(() => setLoadingOptions(false));
    }
  }, [activeTab, cinematicOptions, loadingOptions]);

  useEffect(() => {
    if (activeTab === 'cinematography' && !selectedShotForCine && shots.length > 0) {
      setSelectedShotForCine(shots[0]);
    }
  }, [activeTab, selectedShotForCine, shots]);

  // Track latest composed prompt for "Apply to All" feature
  const lastComposedPromptRef = useRef<string>('');
  const [applyingToAll, setApplyingToAll] = useState(false);

  // Stable callback for cinematography prompt changes
  const handleCinePromptChanged = useCallback((prompt: string) => {
    lastComposedPromptRef.current = prompt;
    const shot = selectedShotRef.current;
    if (shot) {
      handleShotUpdated({ ...shot, nano_prompt: prompt });
    }
  }, [handleShotUpdated]);

  // Apply the current cinematography prompt to ALL shots at once
  const handleApplyToAllShots = useCallback(async () => {
    const prompt = lastComposedPromptRef.current;
    if (!prompt) return;
    setApplyingToAll(true);
    try {
      const updatedShots = shots.map(s => ({ ...s, nano_prompt: prompt }));
      setShots(updatedShots);
      await Promise.all(
        shots.map(s =>
          fetch('/api/update-shot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shotId: s.id, field: 'nano_prompt', value: prompt }),
          }).catch(() => {})
        )
      );
    } finally {
      setApplyingToAll(false);
    }
  }, [shots]);

  // ── Export storyboard as PPTX ──
  const handleExportPptx = useCallback(async () => {
    if (exporting || shots.length === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        alert(err.error || 'Export failed');
        return;
      }
      // Download the PPTX file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9_\- ]/g, '_')}_Storyboard.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  }, [exporting, shots.length, project.id, project.title]);

  const tabs: { id: WorkspaceTab; label: string; count?: number }[] = [
    { id: 'script', label: 'Script' },
    { id: 'shots', label: 'Shots', count: shots.length },
    { id: 'characters', label: 'Characters', count: projectCharacters.length },
    { id: 'cinematography', label: 'Loadout' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'assets', label: 'Assets' },
    { id: 'moodboard', label: 'Mood Board' },
  ];

  return (
    <div className="workspace-layout">
      {/* Left: Synopsis/Context Panel */}
      <div className="workspace-sidebar">
        <ScriptPanel
          projectId={project.id}
          script={scriptText}
          initialDirection={project.creative_direction}
          onShotsGenerated={(newShots) => setShots(newShots)}
        />
      </div>

      {/* Right: Tabbed content area */}
      <div className="workspace-main">
        {/* Tab bar */}
        <div className="workspace-tabs" style={{ display: 'flex', alignItems: 'center' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 20px',
                  fontSize: '10px',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: isActive ? '#ff2d7b' : 'transparent',
                  marginBottom: '-1px',
                  background: 'none',
                  borderTopWidth: '0',
                  borderTopStyle: 'solid',
                  borderTopColor: 'transparent',
                  borderLeftWidth: '0',
                  borderLeftStyle: 'solid',
                  borderLeftColor: 'transparent',
                  borderRightWidth: '0',
                  borderRightStyle: 'solid',
                  borderRightColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'color 0.3s ease',
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.5 }}>{TAB_ICON[tab.id]}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    style={{
                      marginLeft: '4px',
                      fontSize: '9px',
                      fontWeight: 500,
                      background: isActive ? 'rgba(255,45,123,0.15)' : 'rgba(255,255,255,0.06)',
                      color: isActive ? '#ff2d7b' : 'rgba(255,255,255,0.3)',
                      padding: '2px 7px',
                      letterSpacing: '0',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Pipeline + Export buttons - pushed to far right */}
          <div style={{ marginLeft: 'auto', paddingRight: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowPipeline(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background: showPipeline ? 'rgba(255,45,123,0.12)' : C.surface,
                color: showPipeline ? '#ff2d7b' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${showPipeline ? 'rgba(255,45,123,0.3)' : C.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!showPipeline) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
              onMouseLeave={e => { if (!showPipeline) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = C.border; } }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Automate
            </button>
            <button
              onClick={handleExportPptx}
              disabled={exporting || shots.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background: exporting || shots.length === 0
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, #ff264a, #ff2d7b)',
                color: exporting || shots.length === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
                border: 'none',
                cursor: exporting || shots.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!exporting && shots.length > 0) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {exporting ? (
                <>
                  <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export PPTX
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pipeline Panel (collapsible) */}
        {showPipeline && (
          <PipelinePanel
            projectId={project.id}
            onPipelineComplete={() => {
              // Refresh shots when pipeline completes
              fetch(`/api/shots?projectId=${project.id}`)
                .then(res => res.json())
                .then(data => { if (data.shots) setShots(data.shots); })
                .catch(() => {});
            }}
          />
        )}

        {/* Tab content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {activeTab === 'script' && (
            <ScriptEditor
              projectId={project.id}
              script={scriptText}
              onScriptChanged={setScriptText}
            />
          )}

          {activeTab === 'shots' && (
            <ShotList
              shots={shots}
              projectId={project.id}
              onShotUpdated={handleShotUpdated}
              onShotsChanged={setShots}
            />
          )}

          {activeTab === 'characters' && (
            <AvatarLibrary
              projectId={project.id}
              onCharactersChanged={setProjectCharacters}
            />
          )}

          {activeTab === 'cinematography' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
              {shots.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '10px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase' as const,
                        flexShrink: 0,
                      }}
                    >
                      Equipping Shot:
                    </span>
                    <select
                      value={selectedShotForCine?.id || ''}
                      onChange={(e) => {
                        const shot = shots.find(s => s.id === e.target.value);
                        if (shot) setSelectedShotForCine(shot);
                      }}
                      style={{
                        padding: '8px 12px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
                        fontWeight: 600, background: '#1a1a1a', color: '#ff2d7b',
                        border: '1px solid rgba(255,45,123,0.3)', cursor: 'pointer',
                        outline: 'none', minWidth: '200px',
                      }}
                    >
                      {shots.map((shot, i) => (
                        <option key={shot.id} value={shot.id} style={{ background: '#1a1a1a', color: '#fff' }}>
                          {i + 1}. {shot.title || `Shot ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.3)' }}>
                      {shots.findIndex(s => s.id === selectedShotForCine?.id) + 1} of {shots.length}
                    </span>
                    {/* Apply to All + Prev/Next shot buttons */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                      <button
                        onClick={handleApplyToAllShots}
                        disabled={applyingToAll || !lastComposedPromptRef.current}
                        style={{
                          padding: '6px 14px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                          background: 'rgba(255,45,123,0.12)', border: 'none',
                          color: '#ff2d7b', cursor: applyingToAll ? 'wait' : 'pointer',
                          opacity: applyingToAll ? 0.5 : 1,
                          marginRight: '8px',
                        }}
                      >
                        {applyingToAll ? 'Applying...' : `Apply to All ${shots.length} Shots`}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => {
                          const idx = shots.findIndex(s => s.id === selectedShotForCine?.id);
                          if (idx > 0) setSelectedShotForCine(shots[idx - 1]);
                        }}
                        disabled={shots.findIndex(s => s.id === selectedShotForCine?.id) <= 0}
                        style={{
                          padding: '6px 10px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                          opacity: shots.findIndex(s => s.id === selectedShotForCine?.id) <= 0 ? 0.3 : 1,
                        }}
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => {
                          const idx = shots.findIndex(s => s.id === selectedShotForCine?.id);
                          if (idx < shots.length - 1) setSelectedShotForCine(shots[idx + 1]);
                        }}
                        disabled={shots.findIndex(s => s.id === selectedShotForCine?.id) >= shots.length - 1}
                        style={{
                          padding: '6px 10px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                          opacity: shots.findIndex(s => s.id === selectedShotForCine?.id) >= shots.length - 1 ? 0.3 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {selectedShotForCine && cinematicOptions ? (
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <CinematographyPanel
                        shotId={selectedShotForCine.id}
                        shotDescription={selectedShotForCine.description || selectedShotForCine.title || ''}
                        options={cinematicOptions}
                        onComposedPromptChanged={handleCinePromptChanged}
                      />
                    </div>
                  ) : loadingOptions ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                        Loading armory...
                      </span>
                    </div>
                  ) : !cinematicOptions ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: 'Raleway, sans-serif', marginBottom: '24px' }}>
                        Cinematic options not loaded. Have you seeded the database?
                      </p>
                      <button
                        onClick={async () => {
                          setLoadingOptions(true);
                          try {
                            await fetch('/api/seed-cinematic-options', { method: 'POST' });
                            const res = await fetch('/api/cinematic-options');
                            const data = await res.json();
                            if (data.options) setCinematicOptions(data.options as CinematicOptionsMap);
                          } catch { /* */ }
                          setLoadingOptions(false);
                        }}
                        style={{
                          padding: '14px 32px',
                          fontSize: '11px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase' as const,
                          background: 'linear-gradient(135deg, #ff264a, #ff2d7b)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.3s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        Seed 251 Cinematic Options
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontFamily: 'Raleway, sans-serif' }}>
                    Generate shots from your script first, then equip them with cinematic options.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <TimelineEditor shots={shots} projectId={project.id} />
          )}
          {activeTab === 'assets' && (
            <AssetLibrary projectId={project.id} />
          )}
          {activeTab === 'moodboard' && (
            <MoodBoard projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  );
}
