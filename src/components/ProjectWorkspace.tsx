'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ScriptPanel from '@/components/ScriptPanel';
import type { ProjectSettings } from '@/components/ScriptPanel';
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

type WorkspaceTab = 'context' | 'script' | 'shots' | 'characters' | 'cinematography' | 'timeline' | 'assets' | 'moodboard';

const TAB_ICON: Record<WorkspaceTab, React.ReactNode> = {
  context: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('context');
  const [scriptText, setScriptText] = useState(project.script || '');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    description: project.description || '',
    creative_direction: project.creative_direction || '',
    target_duration_seconds: project.target_duration_seconds || null as number | null,
    project_mode: (project.project_mode || 'live_action') as 'live_action' | 'animation',
    context_data: project.context_data || {},
  });
  const [cinematicOptions, setCinematicOptions] = useState<CinematicOptionsMap | null>(null);
  const [projectCharacters, setProjectCharacters] = useState<ProjectCharacter[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedShotForCine, setSelectedShotForCine] = useState<Shot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [durationWarning, setDurationWarning] = useState<{
    targetSeconds: number;
    actualSeconds: number;
    shots: Shot[];
  } | null>(null);
  const [showInjectionPrompt, setShowInjectionPrompt] = useState(false);

  // ── Generate Storyboard (break script into shots) ──
  const handleGenerateStoryboard = useCallback(async () => {
    if (generatingStoryboard || !scriptText.trim()) return;
    setGeneratingStoryboard(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    try {
      const res = await fetch('/api/generate-shots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          script: scriptText.trim(),
          creativeDirection: projectSettings.creative_direction || undefined,
          targetDuration: projectSettings.target_duration_seconds || undefined,
          projectMode: projectSettings.project_mode || undefined,
          synopsis: projectSettings.description || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({ error: 'Invalid response' }));
      if (!res.ok) {
        alert(data.error || `Generate failed: ${res.status}`);
        return;
      }
      if (data.shots) {
        // Duration enforcement: check if total exceeds target
        const targetSec = projectSettings.target_duration_seconds;
        if (targetSec && targetSec > 0) {
          const totalSec = (data.shots as Shot[]).reduce(
            (sum: number, s: Shot) => sum + (s.duration_seconds || 0), 0
          );
          if (totalSec > targetSec) {
            // Show warning, let user decide
            setDurationWarning({
              targetSeconds: targetSec,
              actualSeconds: totalSec,
              shots: data.shots,
            });
            setActiveTab('shots');
            setShots(data.shots);
            return;
          }
        }
        setShots(data.shots);
        setActiveTab('shots');
        setShowInjectionPrompt(true);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        alert('Storyboard generation timed out. Try again or reduce your script length.');
      } else {
        alert(`Generate failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setGeneratingStoryboard(false);
    }
  }, [generatingStoryboard, scriptText, project.id, projectSettings]);

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout
    try {
      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
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
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        alert('Export timed out. This can happen if shot images take too long to fetch. Try again.');
      } else {
        alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setExporting(false);
    }
  }, [exporting, shots.length, project.id, project.title]);

  const tabs: { id: WorkspaceTab; label: string; count?: number }[] = [
    { id: 'context', label: 'Context' },
    { id: 'script', label: 'Script' },
    { id: 'shots', label: 'Shots', count: shots.length },
    { id: 'characters', label: 'Avatar Builder', count: projectCharacters.length },
    { id: 'cinematography', label: 'Cinematic Controls' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'assets', label: 'Library' },
    { id: 'moodboard', label: 'Mood Board' },
  ];

  // Workflow step detection
  const hasContext = !!(projectSettings.description || projectSettings.creative_direction);
  const hasScript = !!scriptText.trim();
  const hasShots = shots.length > 0;
  const currentStep = !hasContext ? 0 : !hasScript ? 1 : !hasShots ? 2 : 3;
  const WORKFLOW_STEPS = [
    { label: '1. Set Context', tab: 'context' as WorkspaceTab, done: hasContext, hint: 'Set your production mode, target duration, and creative direction' },
    { label: '2. Add Script', tab: 'script' as WorkspaceTab, done: hasScript, hint: 'Paste or write your script' },
    { label: '3. Generate', tab: 'shots' as WorkspaceTab, done: hasShots, hint: 'Click "Generate Storyboard" to break your script into shots' },
    { label: '4. Review', tab: 'shots' as WorkspaceTab, done: false, hint: 'Review shots, assign talent, adjust timing, add title cards' },
  ];

  return (
    <div className="workspace-layout" style={{ flexDirection: 'column' }}>
      {/* Full-width tabbed workspace (no sidebar) */}
      <div className="workspace-main" style={{ paddingLeft: '24px', paddingRight: '24px' }}>

        {/* Workflow guide */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '10px 0 10px', marginBottom: '4px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {WORKFLOW_STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isDone = step.done && i < currentStep;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(step.tab)}
                title={step.hint}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px',
                  fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
                  color: isActive ? '#00e5ff' : isDone ? 'rgba(45,200,120,0.7)' : 'rgba(255,255,255,0.2)',
                  border: isActive ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isDone && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(45,200,120,0.7)" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
                {step.label}
              </button>
            );
          })}
          {/* Hint for current step */}
          {currentStep < WORKFLOW_STEPS.length && (
            <span style={{
              marginLeft: 'auto', fontSize: '11px', fontFamily: 'Raleway, sans-serif',
              color: 'rgba(255,255,255,0.25)', fontStyle: 'italic',
            }}>
              {WORKFLOW_STEPS[currentStep].hint}
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="workspace-tabs">
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
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
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
                      color: isActive ? '#ff2d7b' : 'rgba(255,255,255,0.5)',
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
        </div>

        {/* Action bar: Automate + Generate Storyboard (left) | Export PPTX (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              onClick={handleGenerateStoryboard}
              disabled={generatingStoryboard || !scriptText.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px',
                fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                background: generatingStoryboard || !scriptText.trim()
                  ? 'rgba(255,255,255,0.04)'
                  : 'linear-gradient(135deg, #ff264a, #ff2d7b)',
                color: generatingStoryboard || !scriptText.trim() ? 'rgba(255,255,255,0.2)' : '#fff',
                border: 'none',
                cursor: generatingStoryboard || !scriptText.trim() ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!generatingStoryboard && scriptText.trim()) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {generatingStoryboard ? (
                <>
                  <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="0" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                  Generate Storyboard
                </>
              )}
            </button>
          </div>
          <button
            onClick={handleExportPptx}
            disabled={exporting || shots.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              background: exporting || shots.length === 0
                ? 'rgba(255,255,255,0.04)'
                : C.surface,
              color: exporting || shots.length === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${C.border}`,
              cursor: exporting || shots.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!exporting && shots.length > 0) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = C.border; }}
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
          {activeTab === 'context' && (
            <div style={{ maxWidth: '800px' }}>
              <ScriptPanel
                projectId={project.id}
                settings={projectSettings}
                onSettingsChanged={(updated) => {
                  setProjectSettings(prev => ({ ...prev, ...updated }));
                }}
              />
            </div>
          )}

          {activeTab === 'script' && (
            <ScriptEditor
              projectId={project.id}
              script={scriptText}
              onScriptChanged={setScriptText}
            />
          )}

          {activeTab === 'shots' && (
            <>
              {/* Duration warning banner */}
              {durationWarning && (
                <div style={{
                  margin: '0 0 16px 0', padding: '16px 20px',
                  background: 'rgba(255,165,0,0.08)',
                  border: '1px solid rgba(255,165,0,0.3)',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffa500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span style={{
                      fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      color: '#ffa500', textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      Duration Exceeded
                    </span>
                  </div>
                  <p style={{
                    fontSize: '13px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.7)',
                    lineHeight: '1.5', margin: 0,
                  }}>
                    Your storyboard totals{' '}
                    <strong style={{ color: '#fff' }}>
                      {Math.floor(durationWarning.actualSeconds / 60)}:{String(Math.round(durationWarning.actualSeconds % 60)).padStart(2, '0')}
                    </strong>
                    {' '}but your target is{' '}
                    <strong style={{ color: '#fff' }}>
                      {Math.floor(durationWarning.targetSeconds / 60)}:{String(Math.round(durationWarning.targetSeconds % 60)).padStart(2, '0')}
                    </strong>.
                    That is {Math.round(durationWarning.actualSeconds - durationWarning.targetSeconds)} seconds over.
                    You can approve as-is, or review individual shot durations to trim.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setDurationWarning(null); setShowInjectionPrompt(true); }}
                      style={{
                        padding: '10px 20px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: 'rgba(45,200,120,0.12)', color: 'rgba(45,200,120,0.9)',
                        border: '1px solid rgba(45,200,120,0.3)', cursor: 'pointer',
                      }}
                    >
                      Approve As-Is
                    </button>
                    <button
                      onClick={() => { setDurationWarning(null); setShowInjectionPrompt(true); }}
                      style={{
                        padding: '10px 20px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: 'rgba(255,165,0,0.12)', color: '#ffa500',
                        border: '1px solid rgba(255,165,0,0.3)', cursor: 'pointer',
                      }}
                    >
                      I will Trim Manually
                    </button>
                  </div>
                </div>
              )}
              {/* Post-storyboard: Add Title Card or End Credits */}
              {showInjectionPrompt && !durationWarning && (
                <div style={{
                  margin: '0 0 16px 0', padding: '16px 20px',
                  background: 'rgba(0,229,255,0.06)',
                  border: '1px solid rgba(0,229,255,0.25)',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span style={{
                      fontSize: '12px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                      color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      Add Title or Credits?
                    </span>
                  </div>
                  <p style={{
                    fontSize: '13px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.7)',
                    lineHeight: '1.6', margin: 0,
                  }}>
                    Your storyboard has {shots.length} shots. Add a title card or end credits? These add time to the total duration.
                    Graphics overlays (FSG, OST, Motion Graphics) are applied to individual shots later, not as separate shots.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {/* Title Card with placement selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => {
                          const placement = 1; // Default: shot 1
                          const newShot: Partial<Shot> = {
                            id: `temp-title-${Date.now()}`,
                            project_id: project.id,
                            title: 'Title Card',
                            description: 'Opening title screen',
                            shot_category: 'title' as Shot['shot_category'],
                            duration_seconds: 5,
                            sort_order: placement === 1 ? -1 : placement - 0.5,
                          };
                          setShots(prev => {
                            const updated = [...prev, newShot as Shot];
                            updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                            return updated;
                          });
                          setShowInjectionPrompt(false);
                        }}
                        style={{
                          padding: '10px 18px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          background: 'rgba(0,229,255,0.1)',
                          color: '#00e5ff',
                          border: '1px solid rgba(0,229,255,0.3)',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        Add Title Card (Shot 1)
                      </button>
                    </div>

                    {/* End Credits */}
                    <button
                      onClick={() => {
                        const newShot: Partial<Shot> = {
                          id: `temp-credits-${Date.now()}`,
                          project_id: project.id,
                          title: 'End Credits',
                          description: 'Closing credits screen',
                          shot_category: 'end_credits' as Shot['shot_category'],
                          duration_seconds: 5,
                          sort_order: 99999,
                        };
                        setShots(prev => {
                          const updated = [...prev, newShot as Shot];
                          updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                          return updated;
                        });
                        setShowInjectionPrompt(false);
                      }}
                      style={{
                        padding: '10px 18px', fontSize: '11px', fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: 'rgba(0,229,255,0.1)',
                        color: '#00e5ff',
                        border: '1px solid rgba(0,229,255,0.3)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      Add End Credits
                    </button>
                  </div>
                  <button
                    onClick={() => setShowInjectionPrompt(false)}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '8px 16px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: 'transparent', color: 'rgba(255,255,255,0.5)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Skip for now
                  </button>
                </div>
              )}
              <ShotList
                shots={shots}
                projectId={project.id}
                onShotUpdated={handleShotUpdated}
                onShotsChanged={setShots}
              />
            </>
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
                    <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
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
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
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
