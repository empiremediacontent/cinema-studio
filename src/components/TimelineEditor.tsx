'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Shot } from '@/lib/types/database';

const TRACK_HEIGHT = 64;
const PIXELS_PER_SECOND = 60;
const TRACK_COLORS = {
  video: '#ff2d7b',
  audio_dialogue: '#ff264a',
  audio_narration: '#f0a030',
};

interface TimelineTrack {
  id: string;
  type: 'video' | 'audio_dialogue' | 'audio_narration';
  label: string;
  clips: TimelineClip[];
}

interface TimelineClip {
  id: string;
  shotId: string;
  title: string;
  startTime: number;
  duration: number;
  color: string;
  hasMedia: boolean;
}

export default function TimelineEditor({
  shots,
  projectId,
}: {
  shots: Shot[];
  projectId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Suppress unused var warning
  void scrollX;
  void projectId;

  const pps = PIXELS_PER_SECOND * zoom;

  const buildTracks = useCallback((): TimelineTrack[] => {
    let currentTime = 0;
    const videoClips: TimelineClip[] = [];
    const dialogueClips: TimelineClip[] = [];
    const narrationClips: TimelineClip[] = [];

    const sortedShots = [...shots].sort((a, b) => a.sort_order - b.sort_order);

    for (const shot of sortedShots) {
      const duration = shot.duration_seconds || 4;

      videoClips.push({
        id: `v-${shot.id}`,
        shotId: shot.id,
        title: shot.title || `Shot ${shot.sort_order + 1}`,
        startTime: currentTime,
        duration,
        color: TRACK_COLORS.video,
        hasMedia: !!(shot.video_url || shot.image_url),
      });

      const hasDialogue = shot.dialogue && shot.dialogue !== 'None';
      const hasNarration = shot.narration && shot.narration !== 'None';

      if (hasDialogue) {
        const speakStart = currentTime + 1;
        const speakDuration = Math.max(duration - 2, 2);
        dialogueClips.push({
          id: `d-${shot.id}`,
          shotId: shot.id,
          title: shot.dialogue!.substring(0, 40),
          startTime: speakStart,
          duration: speakDuration,
          color: TRACK_COLORS.audio_dialogue,
          hasMedia: !!(shot.metadata as Record<string, unknown>)?.dialogue_audio_url,
        });
      }

      if (hasNarration) {
        const speakStart = currentTime + 1;
        const speakDuration = Math.max(duration - 2, 2);
        narrationClips.push({
          id: `n-${shot.id}`,
          shotId: shot.id,
          title: shot.narration!.substring(0, 40),
          startTime: speakStart,
          duration: speakDuration,
          color: TRACK_COLORS.audio_narration,
          hasMedia: !!(shot.metadata as Record<string, unknown>)?.narration_audio_url,
        });
      }

      currentTime += duration;
    }

    return [
      { id: 'video', type: 'video', label: 'Video', clips: videoClips },
      { id: 'dialogue', type: 'audio_dialogue', label: 'Dialogue', clips: dialogueClips },
      { id: 'narration', type: 'audio_narration', label: 'Narration', clips: narrationClips },
    ];
  }, [shots]);

  const tracks = buildTracks();
  const totalDuration = shots.reduce((sum, s) => sum + (s.duration_seconds || 8), 0);
  const timelineWidth = totalDuration * pps + 200;

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPlayheadTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalDuration]);

  const renderTimeTicks = () => {
    const ticks = [];
    const interval = zoom >= 1.5 ? 1 : zoom >= 0.75 ? 2 : 5;
    for (let t = 0; t <= totalDuration + 5; t += interval) {
      const x = t * pps;
      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      ticks.push(
        <div key={t} className="absolute top-0 flex flex-col items-center" style={{ left: x }}>
          <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span className="text-[10px] mt-0.5 select-none" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {mins}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Transport controls */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <button
          onClick={() => { setPlayheadTime(0); setIsPlaying(false); }}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#8888a0">
            <rect x="4" y="4" width="6" height="16" />
            <polygon points="14 4 14 20 22 12" />
          </svg>
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ background: 'linear-gradient(135deg, #ff264a, #ff2d7b)' }}
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          )}
        </button>

        <span className="text-[12px] font-mono ml-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {Math.floor(playheadTime / 60)}:{String(Math.floor(playheadTime % 60)).padStart(2, '0')}.{String(Math.floor((playheadTime % 1) * 10))}
          <span style={{ color: 'rgba(255,255,255,0.5)' }}> / {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}</span>
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="text-[12px] px-2 py-1 transition-colors"
            style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>-</button>
          <span className="text-[11px] w-10 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="text-[12px] px-2 py-1 transition-colors"
            style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>+</button>
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex h-full">
          {/* Track labels */}
          <div className="w-24 shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center px-3"
                style={{ height: TRACK_HEIGHT, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{track.label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div
            ref={containerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={(e) => setScrollX((e.target as HTMLDivElement).scrollLeft)}
          >
            <div className="relative" style={{ width: timelineWidth, minHeight: '100%' }}>
              <div className="h-6 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {renderTimeTicks()}
              </div>

              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="relative"
                  style={{ height: TRACK_HEIGHT, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      className="absolute top-2 overflow-hidden cursor-pointer hover:brightness-110 transition-all group"
                      style={{
                        left: clip.startTime * pps,
                        width: Math.max(clip.duration * pps - 2, 20),
                        height: TRACK_HEIGHT - 16,
                        backgroundColor: clip.hasMedia ? clip.color : `${clip.color}40`,
                        border: `1px solid ${clip.color}`,
                      }}
                    >
                      <div className="px-2 py-1 truncate">
                        <span className="text-[11px] font-medium text-white drop-shadow-sm">
                          {clip.title}
                        </span>
                        <span className="text-[10px] text-white/60 ml-1">
                          {clip.duration}s
                        </span>
                      </div>
                      {!clip.hasMedia && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-white/40 font-medium">No media</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
                style={{ left: playheadTime * pps, background: '#f04050' }}
              >
                <div className="w-3 h-3 rounded-full -translate-x-1.5 -translate-y-0.5" style={{ background: '#f04050' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {shots.length} shots &middot; {tracks[0].clips.filter(c => c.hasMedia).length} with video &middot; {tracks[1].clips.length} dialogue &middot; {tracks[2].clips.length} narration
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Timeline view — drag to reorder (coming soon)
        </span>
      </div>
    </div>
  );
}