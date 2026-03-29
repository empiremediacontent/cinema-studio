'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineJob, PipelineTask, PipelineAgentType } from '@/lib/types/database';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  green: '#2dc878',
  red: '#ff264a',
  yellow: '#ffb82e',
};

const AGENT_LABELS: Record<PipelineAgentType, { name: string; description: string }> = {
  script_analysis: {
    name: 'Script Analysis',
    description: 'Breaking script into individual shots with timing and dialogue',
  },
  visual_direction: {
    name: 'Visual Direction',
    description: 'Assigning cinematography, lighting, and image prompts per shot',
  },
  character_extraction: {
    name: 'Character Extraction',
    description: 'Identifying characters, descriptions, and roles from script',
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

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
      try {
        const res = await fetch(`/api/pipeline/status?projectId=${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.job) {
          setJob(data.job);
          setTasks(data.tasks || []);
          if (data.job.status === 'pending' || data.job.status === 'running') {
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
    completedRef.current = false;
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
      // Start polling
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

  return (
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <h3 style={{
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text, margin: 0,
          }}>
            Automation Pipeline
          </h3>
        </div>
        {isRunning && (
          <span style={{
            fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
            color: C.yellow, textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {progress}% complete
          </span>
        )}
      </div>

      {/* Not started yet - show start options */}
      {!job && !starting && (
        <div>
          <p style={{
            fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text2,
            lineHeight: '1.6', margin: '0 0 16px 0',
          }}>
            Run the automation pipeline to break your script into shots and assign visual direction automatically.
            Your existing work will not be affected.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleStart(['script_analysis', 'visual_direction', 'character_extraction'])}
              style={{
                flex: 1, padding: '12px 16px',
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
                flex: 1, padding: '12px 16px',
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
        </div>
      )}

      {/* Starting spinner */}
      {starting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
          <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={C.accent} strokeWidth="2" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text2 }}>
            Initializing pipeline...
          </span>
        </div>
      )}

      {/* Progress bar */}
      {isRunning && (
        <div style={{
          width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)',
          marginBottom: '16px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${C.accent}, #ff264a)`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map(task => {
            const label = AGENT_LABELS[task.agent_type];
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '10px 12px',
                background: task.status === 'running' ? 'rgba(255,184,46,0.04)' : C.surface,
                border: `1px solid ${task.status === 'running' ? 'rgba(255,184,46,0.15)' : C.border}`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{ paddingTop: '3px' }}>
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
                  <div style={{
                    fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                    color: task.status === 'running' ? C.text : (task.status === 'completed' ? C.green : C.text2),
                    marginBottom: '2px',
                  }}>
                    {label?.name || task.agent_type}
                  </div>
                  <div style={{
                    fontSize: '10px', fontFamily: 'Raleway, sans-serif',
                    color: C.text3,
                  }}>
                    {task.status === 'running'
                      ? label?.description || 'Processing...'
                      : task.status === 'failed'
                        ? task.error_message || 'Failed'
                        : task.status === 'skipped'
                          ? (task.output_data as Record<string, string>)?.message || 'Skipped'
                          : task.status === 'completed'
                            ? 'Done'
                            : 'Waiting...'}
                  </div>
                </div>
                <div style={{
                  fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                  color: STATUS_COLORS[task.status],
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}>
                  {task.status}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div style={{
          marginTop: '12px', padding: '12px 16px',
          background: 'rgba(45,200,120,0.06)',
          border: `1px solid rgba(45,200,120,0.15)`,
        }}>
          <p style={{
            fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.green,
            margin: 0,
          }}>
            Pipeline complete. Your shots and visual direction are ready. Switch to the Shots tab to review.
          </p>
        </div>
      )}

      {/* Error */}
      {(error || isFailed) && (
        <div style={{
          marginTop: '12px', padding: '12px 16px',
          background: 'rgba(255,38,74,0.06)',
          border: `1px solid rgba(255,38,74,0.15)`,
        }}>
          <p style={{
            fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.red,
            margin: 0,
          }}>
            {error || job?.error_message || 'Pipeline failed'}
          </p>
        </div>
      )}

      {/* Run again after completion or failure */}
      {(isComplete || isFailed) && (
        <button
          onClick={() => {
            setJob(null);
            setTasks([]);
            setError('');
          }}
          style={{
            marginTop: '12px', padding: '8px 16px',
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
  );
}
