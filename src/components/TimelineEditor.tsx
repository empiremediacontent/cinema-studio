'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Shot } from '@/lib/types/database';

// ── Design tokens ──
const C = {
  bg: '#0a0a0a', card: '#111', surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)', text: '#fff', text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)', accent: '#ff2d7b', accentBg: 'rgba(255,45,123,0.12)',
  teal: '#00e5ff', tealBg: 'rgba(0,229,255,0.06)',
  danger: '#ff264a', dangerBg: 'rgba(255,38,74,0.08)',
  success: 'rgba(45,200,120,0.8)',
};

const LABEL: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
};

// ── Constants ──
const TRACK_HEIGHT = 64;
const COMMENT_TRACK_HEIGHT = 44;
const MIN_CLIP_PX = 30;
const MIN_DURATION = 0.5;
const MIN_AUDIO_DURATION = 0.5;
const HEADER_HEIGHT = 28;
const PIXELS_PER_SECOND_BASE = 60;
const SNAP_THRESHOLD_PX = 6;
const DRAG_DEAD_ZONE = 3; // px before drag counts as real movement

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  live_action: '#1a7a6d',
  narrative: '#1a7a6d',
  title: '#9b59b6',
  fsg: '#3498db',
  mogfx: '#1abc9c',
  ost: '#e67e22',
  end_credits: '#7f8c8d',
  credits: '#7f8c8d',
  transition: '#95a5a6',
  voiceover: '#f39c12',
  graphic: '#2ecc71',
};

const AUDIO_COLORS = {
  dialogue: '#ff264a',
  narration: '#f0a030',
};

// ── Types ──
interface TimelineComment {
  id: string;
  shotId: string | null;
  time: number;
  text: string;
}

type DragType =
  | 'move-clip'
  | 'resize-left'
  | 'resize-right'
  | 'move-audio'
  | 'resize-audio-right'
  | 'move-comment';

interface DragState {
  type: DragType;
  shotId: string;        // shot id for clip/audio drags, comment id for comment drags
  audioType?: 'dialogue' | 'narration';
  startX: number;
  origStart: number;
  origDuration: number;
}

// ══════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════
export default function TimelineEditor({
  shots,
  projectId,
  onShotsChanged,
  onShotUpdated,
}: {
  shots: Shot[];
  projectId: string;
  onShotsChanged?: (shots: Shot[]) => void;
  onShotUpdated?: (shot: Shot) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for pending edits
  const [localShots, setLocalShots] = useState<Shot[]>([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Per-clip start times (absolute position on timeline, in seconds)
  const [clipStarts, setClipStarts] = useState<Record<string, number>>({});

  // Per-clip audio offsets (seconds from parent clip start)
  const [dialogueOffsets, setDialogueOffsets] = useState<Record<string, number>>({});
  const [narrationOffsets, setNarrationOffsets] = useState<Record<string, number>>({});

  // Per-clip audio duration overrides (null = auto-compute from parent)
  const [dialogueDurations, setDialogueDurations] = useState<Record<string, number>>({});
  const [narrationDurations, setNarrationDurations] = useState<Record<string, number>>({});

  // Multi-track: number of video / dialogue layers
  const [videoTrackCount, setVideoTrackCount] = useState(1);
  const [dialogueTrackCount, setDialogueTrackCount] = useState(1);
  // Per-shot track assignment (0-based index)
  const [clipTrackAssign, setClipTrackAssign] = useState<Record<string, number>>({});
  const [dialogueTrackAssign, setDialogueTrackAssign] = useState<Record<string, number>>({});

  // Drag state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const hasMovedRef = useRef(false);
  const skipNextSyncRef = useRef(false);

  // Comments
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentShotId, setCommentShotId] = useState<string | null>(null);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const supabase = createClient();
  const pps = PIXELS_PER_SECOND_BASE * zoom;

  // ── Compute sequential start times from sorted shots ──
  function computeSequentialStarts(sortedShots: Shot[]): Record<string, number> {
    const starts: Record<string, number> = {};
    let t = 0;
    for (const s of sortedShots) {
      starts[s.id] = t;
      t += s.duration_seconds || 4;
    }
    return starts;
  }

  // ── Sync local shots from parent ──
  useEffect(() => {
    // After our own submit, skip the reset so we keep layout intact
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const sorted = [...shots].sort((a, b) => a.sort_order - b.sort_order);
    setLocalShots(sorted);

    // Read layout from shot metadata if available, otherwise compute sequential
    const starts: Record<string, number> = {};
    const dOff: Record<string, number> = {};
    const nOff: Record<string, number> = {};
    const dDur: Record<string, number> = {};
    const nDur: Record<string, number> = {};
    let hasAnyLayoutData = false;

    for (const s of sorted) {
      const meta = (s.metadata as Record<string, unknown>) || {};
      if (typeof meta.timeline_start === 'number') {
        hasAnyLayoutData = true;
      }
      dOff[s.id] = typeof meta.dialogue_offset === 'number' ? (meta.dialogue_offset as number) : 0;
      nOff[s.id] = typeof meta.narration_offset === 'number' ? (meta.narration_offset as number) : 0;
      if (typeof meta.dialogue_duration === 'number') dDur[s.id] = meta.dialogue_duration as number;
      if (typeof meta.narration_duration === 'number') nDur[s.id] = meta.narration_duration as number;
    }

    // If any shot has saved timeline_start, use those; otherwise compute sequential
    if (hasAnyLayoutData) {
      let fallbackT = 0;
      for (const s of sorted) {
        const meta = (s.metadata as Record<string, unknown>) || {};
        starts[s.id] = typeof meta.timeline_start === 'number' ? (meta.timeline_start as number) : fallbackT;
        fallbackT = starts[s.id] + (s.duration_seconds || 4);
      }
    } else {
      let t = 0;
      for (const s of sorted) {
        starts[s.id] = t;
        t += s.duration_seconds || 4;
      }
    }

    // Read track assignments from metadata
    const cTracks: Record<string, number> = {};
    const dTracks: Record<string, number> = {};
    let maxVideoTrack = 0;
    let maxDialogueTrack = 0;
    for (const s of sorted) {
      const meta = (s.metadata as Record<string, unknown>) || {};
      const vt = typeof meta.video_track === 'number' ? (meta.video_track as number) : 0;
      const dt = typeof meta.dialogue_track === 'number' ? (meta.dialogue_track as number) : 0;
      cTracks[s.id] = vt;
      dTracks[s.id] = dt;
      if (vt > maxVideoTrack) maxVideoTrack = vt;
      if (dt > maxDialogueTrack) maxDialogueTrack = dt;
    }

    setClipStarts(starts);
    setDialogueOffsets(dOff);
    setNarrationOffsets(nOff);
    setDialogueDurations(dDur);
    setNarrationDurations(nDur);
    setClipTrackAssign(cTracks);
    setDialogueTrackAssign(dTracks);
    setVideoTrackCount(Math.max(1, maxVideoTrack + 1));
    setDialogueTrackCount(Math.max(1, maxDialogueTrack + 1));
    setHasUnsaved(false);
    setDeletingId(null);
  }, [shots]);

  // ── Flash message ──
  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  }

  // ── Computed: sorted shots by their start position ──
  const sortedShots = useMemo(() =>
    [...localShots].sort((a, b) => (clipStarts[a.id] ?? 0) - (clipStarts[b.id] ?? 0)),
  [localShots, clipStarts]);

  const totalDuration = useMemo(() => {
    if (sortedShots.length === 0) return 10;
    let maxEnd = 0;
    for (const s of sortedShots) {
      const end = (clipStarts[s.id] ?? 0) + (s.duration_seconds || 4);
      if (end > maxEnd) maxEnd = end;
    }
    return maxEnd;
  }, [sortedShots, clipStarts]);

  const timelineWidth = (totalDuration + 10) * pps;

  // ── Helper: get audio clip start and duration for a shot ──
  function getAudioLayout(shot: Shot, audioType: 'dialogue' | 'narration') {
    const clipStart = clipStarts[shot.id] ?? 0;
    const clipDur = shot.duration_seconds || 4;
    const offsets = audioType === 'dialogue' ? dialogueOffsets : narrationOffsets;
    const durations = audioType === 'dialogue' ? dialogueDurations : narrationDurations;
    const offset = offsets[shot.id] ?? 0;
    const defaultDur = Math.max(clipDur - offset, MIN_AUDIO_DURATION);
    const duration = durations[shot.id] ?? defaultDur;
    return { start: clipStart + offset, duration: Math.min(duration, clipDur - offset) };
  }

  // ── Playback ──
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPlayheadTime(prev => {
          if (prev >= totalDuration) { setIsPlaying(false); return 0; }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, totalDuration]);

  // ── Delete a shot from timeline ──
  function handleDeleteShot(shotId: string) {
    setLocalShots(prev => prev.filter(s => s.id !== shotId));
    setClipStarts(prev => {
      const next = { ...prev };
      delete next[shotId];
      return next;
    });
    setDeletingId(null);
    setHasUnsaved(true);
    flash('Shot removed. Submit to save.');
  }

  // ── Snap helper ──
  function findSnapTime(shotId: string, proposedTime: number, proposedEnd: number): number | null {
    for (const s of localShots) {
      if (s.id === shotId) continue;
      const sStart = clipStarts[s.id] ?? 0;
      const sEnd = sStart + (s.duration_seconds || 4);
      if (Math.abs((proposedTime - sEnd) * pps) < SNAP_THRESHOLD_PX) return sEnd;
      if (Math.abs((proposedEnd - sStart) * pps) < SNAP_THRESHOLD_PX) return sStart - (proposedEnd - proposedTime);
      if (Math.abs((proposedTime - sStart) * pps) < SNAP_THRESHOLD_PX) return sStart;
    }
    if (Math.abs(proposedTime * pps) < SNAP_THRESHOLD_PX) return 0;
    return null;
  }

  // ── Drag handlers ──
  const handleClipDragStart = useCallback((shotId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const shot = localShots.find(s => s.id === shotId);
    if (!shot) return;
    hasMovedRef.current = false;
    setDragging({
      type: 'move-clip', shotId, startX: e.clientX,
      origStart: clipStarts[shotId] ?? 0,
      origDuration: shot.duration_seconds || 4,
    });
  }, [localShots, clipStarts]);

  const handleResizeStart = useCallback((shotId: string, side: 'resize-left' | 'resize-right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shot = localShots.find(s => s.id === shotId);
    if (!shot) return;
    hasMovedRef.current = false;
    setDragging({
      type: side, shotId, startX: e.clientX,
      origStart: clipStarts[shotId] ?? 0,
      origDuration: shot.duration_seconds || 4,
    });
  }, [localShots, clipStarts]);

  const handleAudioDragStart = useCallback((shotId: string, audioType: 'dialogue' | 'narration', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const offsets = audioType === 'dialogue' ? dialogueOffsets : narrationOffsets;
    hasMovedRef.current = false;
    setDragging({
      type: 'move-audio', shotId, audioType, startX: e.clientX,
      origStart: offsets[shotId] ?? 0, origDuration: 0,
    });
  }, [dialogueOffsets, narrationOffsets]);

  const handleAudioResizeStart = useCallback((shotId: string, audioType: 'dialogue' | 'narration', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shot = localShots.find(s => s.id === shotId);
    if (!shot) return;
    const layout = getAudioLayout(shot, audioType);
    hasMovedRef.current = false;
    setDragging({
      type: 'resize-audio-right', shotId, audioType, startX: e.clientX,
      origStart: 0, origDuration: layout.duration,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localShots, clipStarts, dialogueOffsets, narrationOffsets, dialogueDurations, narrationDurations]);

  const handleCommentDragStart = useCallback((commentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cmt = comments.find(c => c.id === commentId);
    if (!cmt) return;
    hasMovedRef.current = false;
    setDragging({
      type: 'move-comment', shotId: commentId, startX: e.clientX,
      origStart: cmt.time, origDuration: 0,
    });
  }, [comments]);

  // Global mouse move/up for all drag operations
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragging.startX;

      // Dead zone check
      if (!hasMovedRef.current && Math.abs(dx) < DRAG_DEAD_ZONE) return;
      hasMovedRef.current = true;

      const dtSec = dx / pps;

      if (dragging.type === 'move-clip') {
        let newStart = Math.max(0, dragging.origStart + dtSec);
        const snapResult = findSnapTime(dragging.shotId, newStart, newStart + dragging.origDuration);
        if (snapResult !== null) newStart = Math.max(0, snapResult);
        newStart = Math.round(newStart * 4) / 4;
        setClipStarts(prev => ({ ...prev, [dragging.shotId]: newStart }));

      } else if (dragging.type === 'resize-right') {
        const newDur = Math.max(MIN_DURATION, Math.round((dragging.origDuration + dtSec) * 4) / 4);
        setLocalShots(prev => prev.map(s =>
          s.id === dragging.shotId ? { ...s, duration_seconds: newDur } : s
        ));

      } else if (dragging.type === 'resize-left') {
        const newDur = Math.max(MIN_DURATION, Math.round((dragging.origDuration - dtSec) * 4) / 4);
        const durDelta = dragging.origDuration - newDur;
        const newStart = Math.max(0, dragging.origStart + durDelta);
        setClipStarts(prev => ({ ...prev, [dragging.shotId]: newStart }));
        setLocalShots(prev => prev.map(s =>
          s.id === dragging.shotId ? { ...s, duration_seconds: newDur } : s
        ));

      } else if (dragging.type === 'move-audio' && dragging.audioType) {
        const shot = localShots.find(s => s.id === dragging.shotId);
        if (!shot) return;
        const clipDur = shot.duration_seconds || 4;
        const newOffset = Math.max(0, Math.min(clipDur - MIN_AUDIO_DURATION, dragging.origStart + dtSec));
        const rounded = Math.round(newOffset * 4) / 4;
        if (dragging.audioType === 'dialogue') {
          setDialogueOffsets(prev => ({ ...prev, [dragging.shotId]: rounded }));
        } else {
          setNarrationOffsets(prev => ({ ...prev, [dragging.shotId]: rounded }));
        }

      } else if (dragging.type === 'resize-audio-right' && dragging.audioType) {
        const shot = localShots.find(s => s.id === dragging.shotId);
        if (!shot) return;
        const clipDur = shot.duration_seconds || 4;
        const offsets = dragging.audioType === 'dialogue' ? dialogueOffsets : narrationOffsets;
        const offset = offsets[dragging.shotId] ?? 0;
        const maxDur = clipDur - offset;
        const newDur = Math.max(MIN_AUDIO_DURATION, Math.min(maxDur, Math.round((dragging.origDuration + dtSec) * 4) / 4));
        if (dragging.audioType === 'dialogue') {
          setDialogueDurations(prev => ({ ...prev, [dragging.shotId]: newDur }));
        } else {
          setNarrationDurations(prev => ({ ...prev, [dragging.shotId]: newDur }));
        }

      } else if (dragging.type === 'move-comment') {
        const scrollLeft = containerRef.current?.scrollLeft || 0;
        const newTime = Math.max(0, dragging.origStart + dtSec);
        const rounded = Math.round(newTime * 4) / 4;
        setComments(prev => prev.map(c =>
          c.id === dragging.shotId ? { ...c, time: rounded, shotId: null } : c
        ));
      }
    };

    const handleMouseUp = () => {
      if (hasMovedRef.current) {
        if (dragging.type === 'move-clip' || dragging.type === 'resize-left' || dragging.type === 'resize-right') {
          setHasUnsaved(true);
          if (dragging.type === 'move-clip') {
            flash('Clip repositioned. Submit Changes to save.');
          } else {
            flash('Duration adjusted. Submit Changes to save.');
          }
        } else if (dragging.type === 'move-audio' || dragging.type === 'resize-audio-right') {
          setHasUnsaved(true);
          flash('Audio clip adjusted. Submit Changes to save.');
        }
        // Comment drag: no notification needed
      }
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, pps, localShots, dialogueOffsets, narrationOffsets]);

  // ── Submit changes ──
  async function submitChanges() {
    if (!onShotsChanged) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ordered = [...localShots].sort((a, b) => (clipStarts[a.id] ?? 0) - (clipStarts[b.id] ?? 0));
    const reindexed = ordered.map((s, i) => ({ ...s, sort_order: i }));

    for (const local of reindexed) {
      const original = shots.find(s => s.id === local.id);
      if (!original) continue;

      // Build changes: sort_order, duration, and timeline layout in metadata
      const changes: Record<string, unknown> = {};
      if (local.sort_order !== original.sort_order) changes.sort_order = local.sort_order;
      if (local.duration_seconds !== original.duration_seconds) changes.duration_seconds = local.duration_seconds;

      // Always persist timeline layout data in metadata
      const existingMeta = (original.metadata as Record<string, unknown>) || {};
      const layoutMeta = {
        ...existingMeta,
        timeline_start: clipStarts[local.id] ?? 0,
        dialogue_offset: dialogueOffsets[local.id] ?? 0,
        narration_offset: narrationOffsets[local.id] ?? 0,
        video_track: clipTrackAssign[local.id] ?? 0,
        dialogue_track: dialogueTrackAssign[local.id] ?? 0,
        ...(dialogueDurations[local.id] != null ? { dialogue_duration: dialogueDurations[local.id] } : {}),
        ...(narrationDurations[local.id] != null ? { narration_duration: narrationDurations[local.id] } : {}),
      };
      changes.metadata = layoutMeta;

      await supabase.from('shots').update(changes).eq('id', local.id).eq('user_id', user.id);
    }

    // Delete shots removed from timeline
    const localIds = new Set(localShots.map(s => s.id));
    for (const orig of shots) {
      if (!localIds.has(orig.id)) {
        await supabase.from('shots').delete().eq('id', orig.id).eq('user_id', user.id);
      }
    }

    // Update the local shot metadata to match what we just saved
    const updatedShots = reindexed.map(s => {
      const existingMeta = (s.metadata as Record<string, unknown>) || {};
      return {
        ...s,
        metadata: {
          ...existingMeta,
          timeline_start: clipStarts[s.id] ?? 0,
          dialogue_offset: dialogueOffsets[s.id] ?? 0,
          narration_offset: narrationOffsets[s.id] ?? 0,
          video_track: clipTrackAssign[s.id] ?? 0,
          dialogue_track: dialogueTrackAssign[s.id] ?? 0,
          ...(dialogueDurations[s.id] != null ? { dialogue_duration: dialogueDurations[s.id] } : {}),
          ...(narrationDurations[s.id] != null ? { narration_duration: narrationDurations[s.id] } : {}),
        },
      };
    });

    // Skip the next sync so our layout state stays intact
    skipNextSyncRef.current = true;
    onShotsChanged(updatedShots);
    setLocalShots(updatedShots);
    setHasUnsaved(false);
    flash('Changes saved');
  }

  // ── Discard changes ──
  function discardChanges() {
    const sorted = [...shots].sort((a, b) => a.sort_order - b.sort_order);
    setLocalShots(sorted);
    setClipStarts(computeSequentialStarts(sorted));
    setHasUnsaved(false);
    setDeletingId(null);
    flash('Changes discarded');
  }

  // ── Click on timeline ruler to seek ──
  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const time = Math.max(0, x / pps);
    setPlayheadTime(Math.min(time, totalDuration));
  }

  // ── Comment CRUD ──
  function addComment() {
    if (!commentText.trim()) return;
    const targetShot = commentShotId ? localShots.find(s => s.id === commentShotId) : null;
    const time = targetShot ? (clipStarts[targetShot.id] ?? 0) + (targetShot.duration_seconds || 4) / 2 : playheadTime;
    const newComment: TimelineComment = {
      id: `cmt-${Date.now()}`,
      shotId: commentShotId,
      time,
      text: commentText.trim(),
    };
    setComments(prev => [...prev, newComment]);
    setCommentText('');
    setCommentShotId(null);
    setAddingComment(false);
    flash('Comment added');
  }

  function deleteComment(id: string) {
    setComments(prev => prev.filter(c => c.id !== id));
    if (selectedCommentId === id) setSelectedCommentId(null);
    if (editingCommentId === id) setEditingCommentId(null);
  }

  function startEditComment(cmt: TimelineComment) {
    setEditingCommentId(cmt.id);
    setEditingCommentText(cmt.text);
    setSelectedCommentId(cmt.id);
  }

  function saveEditComment() {
    if (!editingCommentId || !editingCommentText.trim()) return;
    setComments(prev => prev.map(c =>
      c.id === editingCommentId ? { ...c, text: editingCommentText.trim() } : c
    ));
    setEditingCommentId(null);
    setEditingCommentText('');
  }

  // ── Time ticks ──
  const renderTimeTicks = () => {
    const ticks = [];
    const maxTime = totalDuration + 10;
    const interval = zoom >= 1.5 ? 1 : zoom >= 0.75 ? 2 : 5;
    for (let t = 0; t <= maxTime; t += interval) {
      const x = t * pps;
      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      ticks.push(
        <div key={t} style={{ position: 'absolute', top: 0, left: x, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', color: C.text3, marginTop: '1px', userSelect: 'none' }}>
            {mins}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      );
    }
    return ticks;
  };

  function getCatColor(shot: Shot): string {
    const cat = shot.shot_category || 'live_action';
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.live_action;
  }

  function getCatLabel(shot: Shot): string {
    const map: Record<string, string> = {
      live_action: '', narrative: '', title: 'TITLE', fsg: 'FSG',
      mogfx: 'MOGFX', ost: 'OST', end_credits: 'CREDITS', credits: 'CREDITS',
      transition: 'TRANS', voiceover: 'VO', graphic: 'GFX',
    };
    return map[shot.shot_category || 'live_action'] || '';
  }

  const playheadShotId = useMemo(() => {
    for (const s of sortedShots) {
      const start = clipStarts[s.id] ?? 0;
      const end = start + (s.duration_seconds || 4);
      if (playheadTime >= start && playheadTime < end) return s.id;
    }
    return null;
  }, [playheadTime, sortedShots, clipStarts]);

  // ── Render an audio clip (shared between dialogue/narration tracks) ──
  function renderAudioClip(shot: Shot, audioType: 'dialogue' | 'narration', text: string) {
    const layout = getAudioLayout(shot, audioType);
    const color = AUDIO_COLORS[audioType];
    const hasAudio = !!(shot.metadata as Record<string, unknown>)?.[`${audioType}_audio_url`];
    const isDragTarget = dragging?.shotId === shot.id && (dragging?.audioType === audioType);

    return (
      <div key={`${audioType[0]}-${shot.id}`}
        style={{
          position: 'absolute', top: '8px',
          left: layout.start * pps, width: Math.max(layout.duration * pps - 2, MIN_CLIP_PX),
          height: TRACK_HEIGHT - 16,
          background: hasAudio ? color : `${color}30`,
          border: `1px solid ${color}`,
          overflow: 'hidden',
          cursor: isDragTarget ? 'grabbing' : 'grab',
          opacity: isDragTarget ? 0.8 : 1,
          transition: isDragTarget ? 'none' : 'left 0.15s, width 0.15s',
          zIndex: isDragTarget ? 5 : 1,
          userSelect: 'none',
        }}>
        {/* Move handle (main body) */}
        <div
          onMouseDown={e => handleAudioDragStart(shot.id, audioType, e)}
          style={{ position: 'absolute', left: 0, right: '8px', top: 0, bottom: 0, cursor: isDragTarget ? 'grabbing' : 'grab', zIndex: 1 }}
        />
        {/* Right resize handle */}
        <div
          onMouseDown={e => handleAudioResizeStart(shot.id, audioType, e)}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'e-resize', zIndex: 3,
            background: isDragTarget && dragging?.type === 'resize-audio-right' ? 'rgba(255,255,255,0.25)' : 'transparent',
            borderLeft: `1px solid ${color}40`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { if (!(isDragTarget && dragging?.type === 'resize-audio-right')) e.currentTarget.style.background = 'transparent'; }}
        />
        <div style={{ padding: '3px 6px', pointerEvents: 'none', position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {text.substring(0, 50)}
          </span>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════
  const notesTrackHeight = notesCollapsed ? 0 : COMMENT_TRACK_HEIGHT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Toast */}
      {statusMsg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, padding: '10px 20px', background: 'rgba(45,200,120,0.08)', border: `1px solid ${C.success}`, color: C.success, ...LABEL, fontSize: '11px' }}>
          {statusMsg}
        </div>
      )}

      {/* ── Transport + Actions Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => { setPlayheadTime(0); setIsPlaying(false); }}
          style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={C.text2}><rect x="4" y="4" width="6" height="16" /><polygon points="14 4 14 20 22 12" /></svg>
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)}
          style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', border: 'none', cursor: 'pointer' }}>
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21" /></svg>
          )}
        </button>

        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: C.text2, marginLeft: '4px' }}>
          {Math.floor(playheadTime / 60)}:{String(Math.floor(playheadTime % 60)).padStart(2, '0')}.{String(Math.floor((playheadTime % 1) * 10))}
          <span style={{ color: C.text3 }}> / {Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}</span>
        </span>

        <div style={{ flex: 1 }} />

        {/* Comment button */}
        <button onClick={() => { setAddingComment(!addingComment); setCommentShotId(playheadShotId); }}
          style={{ padding: '5px 10px', ...LABEL, fontSize: '9px', background: addingComment ? C.tealBg : 'transparent', color: addingComment ? C.teal : C.text3, border: `1px solid ${addingComment ? 'rgba(0,229,255,0.2)' : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comment
        </button>

        {hasUnsaved && (
          <>
            <button onClick={discardChanges}
              style={{ padding: '5px 12px', ...LABEL, fontSize: '9px', background: C.dangerBg, color: C.danger, border: '1px solid rgba(255,38,74,0.2)', cursor: 'pointer' }}>
              Discard
            </button>
            <button onClick={submitChanges}
              style={{ padding: '5px 14px', ...LABEL, fontSize: '10px', background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Submit Changes
            </button>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            style={{ padding: '3px 8px', fontSize: '12px', color: C.text2, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer' }}>-</button>
          <span style={{ fontSize: '10px', width: '38px', textAlign: 'center', color: C.text3 }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            style={{ padding: '3px 8px', fontSize: '12px', color: C.text2, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      {/* Comment input with shot targeting */}
      {addingComment && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', padding: '8px 12px', background: C.tealBg, border: `1px solid rgba(0,229,255,0.15)`, flexWrap: 'wrap' }}>
          <span style={{ ...LABEL, fontSize: '8px', color: C.teal, flexShrink: 0 }}>Target:</span>
          <select
            value={commentShotId || ''}
            onChange={e => setCommentShotId(e.target.value || null)}
            style={{ padding: '4px 6px', fontSize: '11px', fontFamily: 'Raleway, sans-serif', background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, outline: 'none', maxWidth: '180px' }}
          >
            <option value="">Playhead position</option>
            {sortedShots.map((s, i) => (
              <option key={s.id} value={s.id}>Shot {i + 1}: {s.title || 'Untitled'}</option>
            ))}
          </select>
          <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..."
            onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
            style={{ flex: 1, minWidth: '150px', padding: '5px 8px', fontSize: '12px', fontFamily: 'Raleway, sans-serif', background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, outline: 'none' }}
            autoFocus />
          <button onClick={addComment} disabled={!commentText.trim()}
            style={{ padding: '5px 12px', ...LABEL, fontSize: '9px', background: C.accentBg, color: C.accent, border: '1px solid rgba(255,45,123,0.3)', cursor: commentText.trim() ? 'pointer' : 'default', opacity: commentText.trim() ? 1 : 0.5 }}>
            Add
          </button>
          <button onClick={() => setAddingComment(false)}
            style={{ padding: '5px 8px', ...LABEL, fontSize: '9px', background: 'transparent', color: C.text3, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            X
          </button>
        </div>
      )}

      {/* ── Timeline Area ── */}
      <div style={{ flex: 1, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ display: 'flex', height: '100%' }}>

          {/* Track labels */}
          <div style={{ width: '90px', flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ height: HEADER_HEIGHT, borderBottom: `1px solid ${C.border}` }} />

            {/* Notes track label (above video) */}
            <div style={{
              height: notesCollapsed ? 24 : COMMENT_TRACK_HEIGHT,
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', paddingLeft: '6px', gap: '4px',
              transition: 'height 0.15s',
            }}>
              <button
                onClick={() => setNotesCollapsed(!notesCollapsed)}
                style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: C.teal, flexShrink: 0 }}
                title={notesCollapsed ? 'Expand notes' : 'Collapse notes'}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                  {notesCollapsed
                    ? <polygon points="6 4 20 12 6 20" />
                    : <polygon points="4 6 20 6 12 20" />
                  }
                </svg>
              </button>
              <span style={{ ...LABEL, fontSize: '8px', color: C.teal }}>Notes</span>
              {comments.length > 0 && (
                <span style={{ fontSize: '8px', fontFamily: 'Montserrat, sans-serif', color: `${C.teal}80`, marginLeft: '2px' }}>
                  ({comments.length})
                </span>
              )}
            </div>

            {/* Video track labels (dynamic) */}
            {Array.from({ length: videoTrackCount }, (_, i) => (
              <div key={`vl-${i}`} style={{ height: TRACK_HEIGHT, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', paddingLeft: '8px', gap: '4px' }}>
                <span style={{ ...LABEL, fontSize: '9px', color: C.text2 }}>
                  {videoTrackCount > 1 ? `V${i + 1}` : 'Video'}
                </span>
                {i === videoTrackCount - 1 && (
                  <button
                    onClick={() => { setVideoTrackCount(prev => prev + 1); setHasUnsaved(true); }}
                    style={{ marginLeft: 'auto', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer', fontSize: '12px', padding: 0 }}
                    title="Add video track"
                  >+</button>
                )}
                {videoTrackCount > 1 && i === videoTrackCount - 1 && (
                  <button
                    onClick={() => {
                      // Only remove if no clips assigned to this track
                      const hasClips = Object.values(clipTrackAssign).some(t => t === i);
                      if (hasClips) { flash('Move clips off this track first.'); return; }
                      setVideoTrackCount(prev => Math.max(1, prev - 1));
                      setHasUnsaved(true);
                    }}
                    style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer', fontSize: '12px', padding: 0 }}
                    title="Remove video track"
                  >-</button>
                )}
              </div>
            ))}

            {/* Dialogue track labels (dynamic) */}
            {Array.from({ length: dialogueTrackCount }, (_, i) => (
              <div key={`dl-${i}`} style={{ height: TRACK_HEIGHT, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', paddingLeft: '8px', gap: '4px' }}>
                <span style={{ ...LABEL, fontSize: '9px', color: AUDIO_COLORS.dialogue }}>
                  {dialogueTrackCount > 1 ? `D${i + 1}` : 'Dialogue'}
                </span>
                {i === dialogueTrackCount - 1 && (
                  <button
                    onClick={() => { setDialogueTrackCount(prev => prev + 1); setHasUnsaved(true); }}
                    style={{ marginLeft: 'auto', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer', fontSize: '12px', padding: 0 }}
                    title="Add dialogue track"
                  >+</button>
                )}
                {dialogueTrackCount > 1 && i === dialogueTrackCount - 1 && (
                  <button
                    onClick={() => {
                      const hasClips = Object.values(dialogueTrackAssign).some(t => t === i);
                      if (hasClips) { flash('Move clips off this track first.'); return; }
                      setDialogueTrackCount(prev => Math.max(1, prev - 1));
                      setHasUnsaved(true);
                    }}
                    style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${C.border}`, color: C.text3, cursor: 'pointer', fontSize: '12px', padding: 0 }}
                    title="Remove dialogue track"
                  >-</button>
                )}
              </div>
            ))}

            {/* Narration track label */}
            <div style={{ height: TRACK_HEIGHT, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
              <span style={{ ...LABEL, fontSize: '9px', color: AUDIO_COLORS.narration }}>Narration</span>
            </div>
          </div>

          {/* Scrollable timeline */}
          <div ref={containerRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ position: 'relative', width: timelineWidth, minHeight: '100%' }}>

              {/* ── Ruler ── */}
              <div onClick={handleRulerClick}
                style={{ height: HEADER_HEIGHT, position: 'relative', borderBottom: `1px solid ${C.border}`, cursor: 'crosshair' }}>
                {renderTimeTicks()}
              </div>

              {/* ── Notes Track (above video, collapsible) ── */}
              <div style={{
                height: notesCollapsed ? 24 : COMMENT_TRACK_HEIGHT,
                position: 'relative',
                borderBottom: `1px solid ${C.border}`,
                overflow: notesCollapsed ? 'hidden' : 'visible',
                transition: 'height 0.15s',
              }}>
                {!notesCollapsed && comments.map(cmt => {
                  let xPos = cmt.time * pps;
                  const anchoredShot = cmt.shotId ? localShots.find(s => s.id === cmt.shotId) : null;
                  if (anchoredShot) {
                    const sStart = clipStarts[anchoredShot.id] ?? 0;
                    xPos = (sStart + (anchoredShot.duration_seconds || 4) / 2) * pps;
                  }
                  const isSelected = selectedCommentId === cmt.id;
                  const isEditing = editingCommentId === cmt.id;
                  const isDragTarget = dragging?.type === 'move-comment' && dragging?.shotId === cmt.id;

                  return (
                    <div key={cmt.id}
                      style={{
                        position: 'absolute', top: '4px', left: xPos - 6, zIndex: isSelected ? 6 : 3,
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        cursor: isDragTarget ? 'grabbing' : 'grab',
                        opacity: isDragTarget ? 0.8 : 1,
                        transition: isDragTarget ? 'none' : 'left 0.15s',
                      }}
                    >
                      {/* Comment chip */}
                      <div
                        onMouseDown={e => {
                          if (isEditing) return;
                          handleCommentDragStart(cmt.id, e);
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          if (!hasMovedRef.current) {
                            setSelectedCommentId(isSelected ? null : cmt.id);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px',
                          height: '22px',
                          background: isSelected ? 'rgba(0,229,255,0.15)' : C.tealBg,
                          border: `1px solid ${isSelected ? C.teal : 'rgba(0,229,255,0.3)'}`,
                          whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: isSelected ? '260px' : '120px',
                          transition: 'max-width 0.15s',
                        }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {isEditing ? (
                          <input
                            value={editingCommentText}
                            onChange={e => setEditingCommentText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditComment();
                              if (e.key === 'Escape') { setEditingCommentId(null); }
                            }}
                            onBlur={saveEditComment}
                            autoFocus
                            style={{ width: '140px', padding: '0 2px', fontSize: '9px', fontFamily: 'Raleway, sans-serif', background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, outline: 'none' }}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ fontSize: '9px', fontFamily: 'Raleway, sans-serif', color: C.teal, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cmt.text}
                          </span>
                        )}

                        {/* Edit / Delete buttons when selected */}
                        {isSelected && !isEditing && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); startEditComment(cmt); }}
                              onMouseDown={e => e.stopPropagation()}
                              style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                              title="Edit comment"
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteComment(cmt.id); }}
                              onMouseDown={e => e.stopPropagation()}
                              style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                              title="Delete comment"
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Vertical connector line down to video track */}
                      <div style={{ width: '1px', height: '12px', background: `${C.teal}30`, marginLeft: '6px' }} />
                    </div>
                  );
                })}

                {/* Collapsed indicator */}
                {notesCollapsed && comments.length > 0 && (
                  <div style={{ position: 'absolute', top: '4px', left: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {comments.slice(0, 8).map(cmt => {
                      let xPos = cmt.time * pps;
                      const anchoredShot = cmt.shotId ? localShots.find(s => s.id === cmt.shotId) : null;
                      if (anchoredShot) {
                        const sStart = clipStarts[anchoredShot.id] ?? 0;
                        xPos = (sStart + (anchoredShot.duration_seconds || 4) / 2) * pps;
                      }
                      return (
                        <div key={cmt.id} style={{ position: 'absolute', left: xPos - 3, top: 0 }}>
                          <div style={{ width: '6px', height: '6px', background: C.teal, opacity: 0.5 }} title={cmt.text} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Video Tracks (dynamic) ── */}
              {Array.from({ length: videoTrackCount }, (_, trackIdx) => (
                <div key={`vt-${trackIdx}`} style={{ height: TRACK_HEIGHT, position: 'relative', borderBottom: `1px solid ${C.border}` }}>
                  {sortedShots.filter(s => (clipTrackAssign[s.id] ?? 0) === trackIdx).map((shot) => {
                    const clipStart = clipStarts[shot.id] ?? 0;
                    const clipDur = shot.duration_seconds || 4;
                    const clipLeft = clipStart * pps;
                    const clipWidth = Math.max(clipDur * pps - 2, MIN_CLIP_PX);
                    const color = getCatColor(shot);
                    const catLabel = getCatLabel(shot);
                    const hasMedia = !!(shot.video_url || shot.image_url);
                    const isDragging = dragging?.shotId === shot.id && (dragging.type === 'move-clip' || dragging.type === 'resize-left' || dragging.type === 'resize-right');
                    const isDeleting = deletingId === shot.id;
                    const hasComment = comments.some(c => c.shotId === shot.id);

                    return (
                      <div key={shot.id}
                        style={{
                          position: 'absolute', top: '4px',
                          left: clipLeft, width: clipWidth, height: TRACK_HEIGHT - 8,
                          background: hasMedia ? color : `${color}30`,
                          border: `1px solid ${isDeleting ? C.danger : color}`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          opacity: isDragging && dragging?.type === 'move-clip' ? 0.7 : 1,
                          overflow: 'hidden',
                          userSelect: 'none',
                          transition: isDragging ? 'none' : 'left 0.15s, width 0.15s',
                          zIndex: isDragging ? 5 : 1,
                        }}
                      >
                        {/* Move handle */}
                        <div
                          onMouseDown={e => handleClipDragStart(shot.id, e)}
                          style={{ position: 'absolute', left: '8px', right: '8px', top: 0, bottom: 0, cursor: isDragging ? 'grabbing' : 'grab', zIndex: 1 }}
                        />
                        {/* Left resize handle */}
                        <div onMouseDown={e => handleResizeStart(shot.id, 'resize-left', e)}
                          style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'w-resize', zIndex: 3,
                            background: isDragging && dragging?.type === 'resize-left' ? 'rgba(255,255,255,0.25)' : 'transparent',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onMouseEnter={e => { if (!(isDragging && dragging?.type === 'resize-left')) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                          onMouseLeave={e => { if (!(isDragging && dragging?.type === 'resize-left')) e.currentTarget.style.background = 'transparent'; }}
                        />
                        {/* Right resize handle */}
                        <div onMouseDown={e => handleResizeStart(shot.id, 'resize-right', e)}
                          style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'e-resize', zIndex: 3,
                            background: isDragging && dragging?.type === 'resize-right' ? 'rgba(255,255,255,0.25)' : 'transparent',
                            borderLeft: '1px solid rgba(255,255,255,0.08)',
                          }}
                          onMouseEnter={e => { if (!(isDragging && dragging?.type === 'resize-right')) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                          onMouseLeave={e => { if (!(isDragging && dragging?.type === 'resize-right')) e.currentTarget.style.background = 'transparent'; }}
                        />

                        {/* Clip content */}
                        <div style={{ padding: '3px 10px', display: 'flex', flexDirection: 'column', gap: '1px', height: '100%', justifyContent: 'center', pointerEvents: 'none', position: 'relative', zIndex: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {catLabel && (
                              <span style={{ ...LABEL, fontSize: '7px', padding: '1px 4px', background: 'rgba(0,0,0,0.3)', color: '#fff', flexShrink: 0 }}>{catLabel}</span>
                            )}
                            <span style={{ fontSize: '11px', fontFamily: 'Raleway, sans-serif', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {shot.title || `Shot ${shot.sort_order + 1}`}
                            </span>
                            {hasComment && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', color: 'rgba(255,255,255,0.6)' }}>
                              {clipDur}s{!hasMedia && ' (no media)'}
                            </span>
                            {/* Track mover: small up/down arrows when multiple tracks exist */}
                            {videoTrackCount > 1 && (
                              <span style={{ display: 'flex', gap: '1px', pointerEvents: 'auto' }}>
                                {trackIdx > 0 && (
                                  <button onClick={e => { e.stopPropagation(); setClipTrackAssign(prev => ({ ...prev, [shot.id]: trackIdx - 1 })); setHasUnsaved(true); flash('Moved to V' + trackIdx); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{ width: '14px', height: '12px', fontSize: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: C.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    title={`Move to V${trackIdx}`}
                                  >
                                    <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 4 4 16 20 16" /></svg>
                                  </button>
                                )}
                                {trackIdx < videoTrackCount - 1 && (
                                  <button onClick={e => { e.stopPropagation(); setClipTrackAssign(prev => ({ ...prev, [shot.id]: trackIdx + 1 })); setHasUnsaved(true); flash('Moved to V' + (trackIdx + 2)); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{ width: '14px', height: '12px', fontSize: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: C.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    title={`Move to V${trackIdx + 2}`}
                                  >
                                    <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><polygon points="4 8 20 8 12 20" /></svg>
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (isDeleting) { handleDeleteShot(shot.id); } else {
                              setDeletingId(shot.id);
                              setTimeout(() => setDeletingId(prev => prev === shot.id ? null : prev), 3000);
                            }
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          style={{
                            position: 'absolute', top: '2px', right: '10px', zIndex: 4,
                            width: isDeleting ? 'auto' : '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDeleting ? C.dangerBg : 'rgba(0,0,0,0.4)',
                            border: isDeleting ? `1px solid ${C.danger}` : '1px solid rgba(255,255,255,0.1)',
                            color: isDeleting ? C.danger : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', padding: isDeleting ? '0 6px' : 0, pointerEvents: 'auto',
                            ...LABEL, fontSize: '8px',
                          }}
                          title={isDeleting ? 'Click again to confirm delete' : 'Delete shot'}
                        >
                          {isDeleting ? 'CONFIRM' : (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </button>

                        {shot.image_url && clipWidth > 80 && (
                          <img src={shot.image_url} alt="" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '40px', objectFit: 'cover', opacity: 0.2, pointerEvents: 'none' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* ── Dialogue Tracks (dynamic) ── */}
              {Array.from({ length: dialogueTrackCount }, (_, trackIdx) => (
                <div key={`dt-${trackIdx}`} style={{ height: TRACK_HEIGHT, position: 'relative', borderBottom: `1px solid ${C.border}` }}>
                  {sortedShots.filter(s => (dialogueTrackAssign[s.id] ?? 0) === trackIdx).map((shot) => {
                    const hasDialogue = shot.dialogue && shot.dialogue !== 'None' && shot.dialogue.trim();
                    if (!hasDialogue) return null;
                    return renderAudioClip(shot, 'dialogue', shot.dialogue!);
                  })}
                </div>
              ))}

              {/* ── Narration Track ── */}
              <div style={{ height: TRACK_HEIGHT, position: 'relative', borderBottom: `1px solid ${C.border}` }}>
                {sortedShots.map((shot) => {
                  const hasNarration = shot.narration && shot.narration !== 'None' && shot.narration.trim();
                  if (!hasNarration) return null;
                  return renderAudioClip(shot, 'narration', shot.narration!);
                })}
              </div>

              {/* ── Playhead ── */}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: playheadTime * pps, width: '1px', background: '#f04050', pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ width: '10px', height: '10px', background: '#f04050', transform: 'translateX(-4.5px) translateY(-1px)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
          {sortedShots.length} shots
          {sortedShots.filter(s => s.shot_category === 'title').length > 0 && ` / ${sortedShots.filter(s => s.shot_category === 'title').length} titles`}
          {sortedShots.filter(s => s.shot_category === 'fsg').length > 0 && ` / ${sortedShots.filter(s => s.shot_category === 'fsg').length} FSG`}
          {sortedShots.filter(s => s.shot_category === 'ost').length > 0 && ` / ${sortedShots.filter(s => s.shot_category === 'ost').length} OST`}
          {comments.length > 0 && ` / ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          {hasUnsaved && ' / unsaved changes'}
        </span>
        <span style={{ fontSize: '10px', fontFamily: 'Raleway, sans-serif', color: C.text3 }}>
          Drag clips to reposition. Drag edges to resize. Gaps allowed.
        </span>
      </div>
    </div>
  );
}
