'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineJob, PipelineTask, PipelineAgentType } from '@/lib/types/database';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)',
  accent: '#ff2d7b',
  green: '#2dc878',
  red: '#ff264a',
  yellow: '#ffb82e',
};

// Defines execution order: index = display order (top to bottom)
const AGENT_ORDER: PipelineAgentType[] = [
  'script_analysis',
  'visual_direction',
  'character_extraction',
  'image_generation',
  'export_compile',
];

const AGENT_LABELS: Record<PipelineAgentType, { name: string; description: string }> = {
  script_analysis: {
    name: 'Script Analysis',
    description: 'Breaking script into shots with timing and direction',
  },
  visual_direction: {
    name: 'Visual Direction',
    description: 'Assigning cinematography and image prompts per shot',
  },
  character_extraction: {
    name: 'Character Extraction',
    description: 'Identifying characters and roles from script',
  },
  image_generation: {
    name: 'Image Generation',
    description: 'Generating reference frames for each shot',
  },
  export_compile: {
    name: 'Export Compile',
    description: 'Assembling storyboard into downloadable PPTX',
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: C.text3,
  running: C.yellow,
  completed: C.green,
  failed: C.red,
  skipped: C.text3,
  cancelled: C.text3,
};

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || C.text3;
  const isRunning = status === 'running';
  return (
    <span style={{
      display: 'inline-block',
      width: '8px', height: '8px',
      borderRadius: '50%',
      backgroundColor: color,
      animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }} />
  );
}

export default function PipelinePanel({
  projectId,
  onPipelineComplete,
}: {
  projectId: string;
  onPipelineComplete?: () => void;
}) {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const resetRef = useRef(false);

  // Sort tasks by defined agent execution order
  const sortedTasks = [...tasks].sort((a, b) => {
    const ai = AGENT_ORDER.indexOf(a.agent_type);
    const bi = AGENT_ORDER.indexOf(b.agent_type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // ── Poll for status updates ──
  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/pipeline/status?jobId=${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.job) setJob(data.job);
      if (data.tasks) setTasks(data.tasks);

      // Stop polling when done
      if (data.job?.status === 'completed' || data.job?.status === 'failed' || data.job?.status === 'cancelled') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (data.job.status === 'completed' && !completedRef.current) {
          completedRef.current = true;
          onPipelineComplete?.();
        }
      }
    } catch { /* silently retry on next interval */ }
  }, [onPipelineComplete]);

  // Check for existing running pipeline on mount
  useEffect(() => {
    async function checkExisting() {
      if (resetRef.current) return;
      try {
        const res = await fetch(`/api/pipeline/status?projectId=${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.job) {
          if (data.job.status === 'pending' || data.job.status === 'running') {
            setJob(data.job);
            setTasks(data.tasks || []);
            pollRef.current = setInterval(() => pollStatus(data.job.id), 2000);
          }
        }
      } catch { /* ignore */ }
    }
    checkExisting();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [projectId, pollStatus]);

  // ── Start pipeline ──
  const handleStart = async (agents: PipelineAgentType[]) => {
    setStarting(true);
    setError('');
    setCollapsed(false);
    completedRef.current = false;
    resetRef.current = false;
    try {
      const res = await fetch('/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, agents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start pipeline');
        return;
      }
      setJob({ ...data, id: data.jobId } as unknown as PipelineJob);
      pollRef.current = setInterval(() => pollStatus(data.jobId), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const isRunning = job?.status === 'pending' || job?.status === 'running';
  const isComplete = job?.status === 'completed';
  const isFailed = job?.status === 'failed';
  const progress = job && job.total_steps > 0
    ? Math.round((job.completed_steps / job.total_steps) * 100)
    : 0;

  // Summary line for collapsed state
  const statusSummary = isRunning
    ? `Running (${progress}%)`
    : isComplete
      ? 'Complete'
      : isFailed
        ? 'Failed'
        : '';

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Clickable header bar (always visible) */}
      <div
        onClick={() => { if (tasks.length > 0 || isComplete || isFailed) setCollapsed(prev => !prev); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          cursor: tasks.length > 0 || isComplete || isFailed ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text,
          }}>
            Automation Pipeline
          </span>
          {statusSummary && (
            <span style={{
              fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
              color: isRunning ? C.yellow : isComplete ? C.green : C.red,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginLeft: '4px',
            }}>
              {statusSummary}
            </span>
          )}
        </div>
        {/* Collapse chevron */}
        {(tasks.length > 0 || isComplete || isFailed) && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div style={{ padding: '0 20px 16px 20px' }}>

          {/* Not started yet */}
          {!job && !starting && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleStart(['script_analysis', 'visual_direction', 'character_extraction'])}
                style={{
                  padding: '10px 20px',
                  fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, #ff264a, #ff2d7b)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Full Pipeline
              </button>
              <button
                onClick={() => handleStart(['script_analysis'])}
                style={{
                  padding: '10px 20px',
                  fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: C.surface, color: C.text2,
                  border: `1px solid ${C.border}`, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text2; e.currentTarget.style.borderColor = C.border; }}
              >
                Script Only
              </button>
            </div>
          )}

          {/* Starting spinner */}
          {starting && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
              <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={C.accent} strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.text2 }}>
                Initializing...
              </span>
            </div>
          )}

          {/* Progress bar */}
          {isRunning && (
            <div style={{
              width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)',
              marginBottom: '12px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg, ${C.accent}, #ff264a)`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          )}

          {/* Task list (sorted by execution order) */}
          {sortedTasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sortedTasks.map(task => {
                const label = AGENT_LABELS[task.agent_type];
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px',
                    background: task.status === 'running' ? 'rgba(255,184,46,0.04)' : 'transparent',
                    border: `1px solid ${task.status === 'running' ? 'rgba(255,184,46,0.12)' : C.border}`,
                    transition: 'all 0.3s ease',
                  }}>
                    <div style={{ flexShrink: 0 }}>
                      {task.status === 'running' ? (
                        <svg style={{ width: '10px', height: '10px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke={C.yellow} strokeWidth="3" opacity="0.3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke={C.yellow} strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <StatusDot status={task.status} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                        color: task.status === 'running' ? C.text : (task.status === 'completed' ? C.green : C.text2),
                      }}>
                        {label?.name || task.agent_type}
                      </span>
                      {task.status === 'failed' && task.error_message && (
                        <span style={{
                          fontSize: '9px', fontFamily: 'Raleway, sans-serif',
                          color: C.red, marginLeft: '8px',
                        }}>
                          {task.error_message.length > 80
                            ? task.error_message.substring(0, 80) + '...'
                            : task.error_message}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                      color: STATUS_COLORS[task.status],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}>
                      {task.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {(error || isFailed) && (
            <div style={{
              marginTop: '10px', padding: '10px 12px',
              background: 'rgba(255,38,74,0.06)',
              border: `1px solid rgba(255,38,74,0.15)`,
            }}>
              <p style={{
                fontSize: '11px', fontFamily: 'Raleway, sans-serif', color: C.red,
                margin: 0,
              }}>
                {error || job?.error_message || 'Pipeline failed'}
              </p>
            </div>
          )}

          {/* Run again */}
          {(isComplete || isFailed) && (
            <button
              onClick={() => {
                resetRef.current = true;
                setJob(null);
                setTasks([]);
                setError('');
                setCollapsed(false);
              }}
              style={{
                marginTop: '10px', padding: '8px 16px',
                fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'none', color: C.text3,
                border: `1px solid ${C.border}`, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.text3; e.currentTarget.style.borderColor = C.border; }}
            >
              Run Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
