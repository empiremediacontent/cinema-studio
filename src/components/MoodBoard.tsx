'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const C = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.75)',
  text3: 'rgba(255,255,255,0.5)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
};

type BoardItemType = 'image' | 'text';

interface BoardItem {
  id: string;
  type: BoardItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  text?: string;
  fontSize?: number;
  color?: string;
}

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawStroke {
  id: string;
  points: DrawPoint[];
  color: string;
  width: number;
  isEraser: boolean;
}

type Tool = 'select' | 'text' | 'draw' | 'erase';

// Module-level cache so mood board survives tab switches
const boardCache = new Map<string, { items: BoardItem[]; strokes: DrawStroke[] }>();

export default function MoodBoard({ projectId }: { projectId: string }) {
  // Restore from cache on mount
  const cached = boardCache.get(projectId);
  const [items, setItems] = useState<BoardItem[]>(cached?.items || []);
  const [strokes, setStrokes] = useState<DrawStroke[]>(cached?.strokes || []);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ itemId: string; offsetX: number; offsetY: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [drawColor, setDrawColor] = useState('#ff2d7b');
  const [drawWidth, setDrawWidth] = useState(3);
  const [history, setHistory] = useState<Array<{ items: BoardItem[]; strokes: DrawStroke[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newText, setNewText] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist to cache whenever items or strokes change
  useEffect(() => {
    boardCache.set(projectId, { items, strokes });
  }, [items, strokes, projectId]);

  // Save state to history for undo
  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ items: JSON.parse(JSON.stringify(items)), strokes: JSON.parse(JSON.stringify(strokes)) });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [items, strokes, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setItems(prev.items);
      setStrokes(prev.strokes);
      setHistoryIndex(historyIndex - 1);
    } else if (historyIndex === 0) {
      setItems([]);
      setStrokes([]);
      setHistoryIndex(-1);
    }
  }, [history, historyIndex]);

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const board = boardRef.current;
    if (!board) return;

    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.isEraser ? '#0a0a0a' : stroke.color;
      ctx.lineWidth = stroke.isEraser ? stroke.width * 3 : stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  // Image upload
  async function handleImageUpload(files: FileList | null) {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        const img = new Image();
        img.onload = () => {
          const maxWidth = 280;
          const scale = Math.min(1, maxWidth / img.width);
          const w = img.width * scale;
          const h = img.height * scale;

          const existingCount = items.length;
          const col = existingCount % 3;
          const row = Math.floor(existingCount / 3);
          const x = 20 + col * (maxWidth + 20);
          const y = 20 + row * (h + 20);

          setItems(prev => [...prev, { id, type: 'image' as const, x, y, width: w, height: h, src }]);
          pushHistory();
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  }

  // Add text note
  function addTextNote() {
    if (!newText.trim()) return;
    const id = `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setItems(prev => [...prev, {
      id, type: 'text', x: textPosition.x, y: textPosition.y,
      width: 200, height: 60, text: newText.trim(), fontSize: 14, color: '#fff',
    }]);
    setNewText('');
    setShowTextInput(false);
    pushHistory();
  }

  // Delete selected item
  function deleteSelected() {
    if (!selectedItem) return;
    setItems(prev => prev.filter(i => i.id !== selectedItem));
    setSelectedItem(null);
    pushHistory();
  }

  // Mouse handlers for dragging and drawing
  function handleMouseDown(e: React.MouseEvent) {
    // If the text input is showing, ignore board mouse events
    if (showTextInput) return;

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'draw' || activeTool === 'erase') {
      setIsDrawing(true);
      const stroke: DrawStroke = {
        id: `stroke_${Date.now()}`,
        points: [{ x, y }],
        color: drawColor,
        width: drawWidth,
        isEraser: activeTool === 'erase',
      };
      setCurrentStroke(stroke);
      return;
    }

    if (activeTool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    // Select tool: check if clicking on an item
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height) {
        setSelectedItem(item.id);
        setDragState({ itemId: item.id, offsetX: x - item.x, offsetY: y - item.y });
        setItems(prev => {
          const rest = prev.filter(p => p.id !== item.id);
          return [...rest, item];
        });
        return;
      }
    }

    setSelectedItem(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Track eraser position for cursor circle
    if (activeTool === 'erase') {
      setEraserPos({ x: e.clientX, y: e.clientY });
    }

    if (isDrawing && currentStroke) {
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
      return;
    }

    if (dragState) {
      setItems(prev => prev.map(item =>
        item.id === dragState.itemId
          ? { ...item, x: x - dragState.offsetX, y: y - dragState.offsetY }
          : item
      ));
    }
  }

  function handleMouseUp() {
    if (isDrawing && currentStroke) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
      setIsDrawing(false);
      pushHistory();
      return;
    }

    if (dragState) {
      setDragState(null);
      pushHistory();
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItem && !showTextInput) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.key === 'Escape') {
        if (showTextInput) {
          setShowTextInput(false);
          setNewText('');
        } else {
          setSelectedItem(null);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, showTextInput, handleUndo]);

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    {
      id: 'select', label: 'Select',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg>,
    },
    {
      id: 'text', label: 'Text',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
    },
    {
      id: 'draw', label: 'Draw',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
    },
    {
      id: 'erase', label: 'Erase',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16l9-9 8 8-4 5z" /><line x1="6" y1="11" x2="13" y2="18" /></svg>,
    },
  ];

  const colorPresets = ['#ff2d7b', '#ff264a', '#f0a030', '#2dc878', '#6c63ff', '#ffffff', '#888888'];
  const eraserRadius = drawWidth * 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      {/* Eraser cursor circle overlay */}
      {activeTool === 'erase' && eraserPos && (
        <div
          style={{
            position: 'fixed',
            left: eraserPos.x - eraserRadius,
            top: eraserPos.y - eraserRadius,
            width: eraserRadius * 2,
            height: eraserRadius * 2,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        />
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0',
        borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); if (tool.id !== 'erase') setEraserPos(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: activeTool === tool.id ? C.accentBg : 'transparent',
              border: activeTool === tool.id ? '1px solid rgba(255,45,123,0.3)' : '1px solid transparent',
              color: activeTool === tool.id ? C.accent : C.text2,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', background: C.border, margin: '0 4px' }} />

        {(activeTool === 'draw' || activeTool === 'erase') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeTool === 'draw' && colorPresets.map(color => (
              <button
                key={color}
                onClick={() => setDrawColor(color)}
                style={{
                  width: '18px', height: '18px', background: color,
                  border: drawColor === color ? '2px solid #fff' : `1px solid ${C.border}`,
                  cursor: 'pointer',
                }}
              />
            ))}
            <select
              value={drawWidth}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
              style={{
                padding: '4px 8px', fontSize: '11px', fontFamily: 'Raleway, sans-serif',
                background: '#1a1a1a', color: '#fff', border: `1px solid ${C.border}`, cursor: 'pointer',
              }}
            >
              <option value="1">Thin</option>
              <option value="3">Medium</option>
              <option value="6">Thick</option>
              <option value="12">Bold</option>
            </select>
          </div>
        )}

        <div style={{ width: '1px', height: '24px', background: C.border, margin: '0 4px' }} />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
            fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #ff264a, #ff2d7b)', border: 'none',
            color: '#fff', cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleImageUpload(e.target.files)}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              background: C.surface, border: `1px solid ${C.border}`,
              color: historyIndex < 0 ? C.text3 : C.text2,
              cursor: historyIndex < 0 ? 'not-allowed' : 'pointer', opacity: historyIndex < 0 ? 0.4 : 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Undo
          </button>

          {selectedItem && (
            <button
              onClick={deleteSelected}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: 'rgba(255,38,74,0.1)', border: '1px solid rgba(255,38,74,0.3)',
                color: '#ff264a', cursor: 'pointer',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Board canvas area */}
      <div
        ref={boardRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setEraserPos(null); }}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          cursor: activeTool === 'draw' ? 'crosshair' : activeTool === 'erase' ? 'none' : activeTool === 'text' ? 'text' : 'default',
          userSelect: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />

        {/* Board items */}
        {items.map(item => (
          <div
            key={item.id}
            style={{
              position: 'absolute', left: item.x, top: item.y,
              width: item.width, height: item.type === 'text' ? 'auto' : item.height,
              border: selectedItem === item.id ? '2px solid #ff2d7b' : '1px solid transparent',
              cursor: activeTool === 'select' ? 'grab' : 'default',
              transition: dragState?.itemId === item.id ? 'none' : 'border-color 0.2s',
              zIndex: selectedItem === item.id ? 10 : 1,
            }}
            onClick={(e) => { e.stopPropagation(); if (activeTool === 'select') setSelectedItem(item.id); }}
          >
            {item.type === 'image' && item.src && (
              <img
                src={item.src}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
              />
            )}
            {item.type === 'text' && (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.5)',
                color: item.color || '#fff',
                fontSize: `${item.fontSize || 14}px`,
                fontFamily: 'Raleway, sans-serif',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                minHeight: '30px',
              }}>
                {item.text}
              </div>
            )}
          </div>
        ))}

        {/* Inline text input - stops all mouse propagation to board */}
        {showTextInput && (
          <div
            style={{
              position: 'absolute', left: textPosition.x, top: textPosition.y,
              zIndex: 20, background: '#111', border: `1px solid ${C.accent}`, padding: '8px',
              display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
              placeholder="Type your note... (Enter to add, Escape to cancel)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTextNote(); }
                if (e.key === 'Escape') { setShowTextInput(false); setNewText(''); }
              }}
              style={{
                width: '100%', minHeight: '60px', padding: '8px', fontSize: '13px', fontFamily: 'Raleway, sans-serif',
                background: C.surface, border: `1px solid ${C.border}`, color: '#fff', outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowTextInput(false); setNewText(''); }}
                style={{ padding: '4px 10px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', background: C.surface, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); addTextNote(); }}
                style={{ padding: '4px 10px', fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, textTransform: 'uppercase', background: C.accent, border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && strokes.length === 0 && !showTextInput && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="1" strokeLinecap="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p style={{ fontSize: '14px', fontFamily: 'Raleway, sans-serif', color: C.text3, marginBottom: '8px' }}>
              Your mood board is empty
            </p>
            <p style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text3, opacity: 0.6 }}>
              Import images for inspiration, add text notes, or draw freely.
              <br />
              Drag items to rearrange. Use undo to revert changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
