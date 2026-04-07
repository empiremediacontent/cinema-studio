'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FeedbackCategory, FeedbackSeverity } from '@/lib/types/database';

const ADMIN_EMAIL = 'empiremediacontent@gmail.com';

const PAGE_SECTIONS = [
  'Dashboard',
  'Script Editor',
  'Shot List',
  'Timeline',
  'Cinematography',
  'AI Sidebar',
  'Pipeline',
  'Mood Board',
  'Avatar Library',
  'Voice Picker',
  'Asset Library',
  'Export',
  'Login / Auth',
  'General / Other',
];

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'confusion', label: 'Confusing UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: { value: FeedbackSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#facc15' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

function detectPageSection(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname.startsWith('/project/')) return 'General / Other';
  if (pathname === '/login') return 'Login / Auth';
  return 'General / Other';
}

export default function FeedbackWidget({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [annotating, setAnnotating] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium');
  const [pageSection, setPageSection] = useState('General / Other');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const isAdmin = userEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageSection(detectPageSection(window.location.pathname));
    }
  }, [open]);

  const captureScreenshot = useCallback(async () => {
    try {
      // Use html2canvas from CDN loaded dynamically
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        logging: false,
        useCORS: true,
        backgroundColor: '#0a0a0a',
      });
      setScreenshotData(canvas.toDataURL('image/png'));
      setAnnotating(true);
    } catch {
      // Fallback: no screenshot
      console.warn('Screenshot capture failed');
    }
  }, []);

  // Draw annotation on canvas
  useEffect(() => {
    if (!annotating || !screenshotData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = screenshotData;
  }, [annotating, screenshotData]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.strokeStyle = '#ff2d7b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const finishAnnotation = () => {
    if (canvasRef.current) {
      setScreenshotData(canvasRef.current.toDataURL('image/png'));
    }
    setAnnotating(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let screenshotUrl: string | null = null;

      // Upload screenshot if captured
      if (screenshotData) {
        const blob = await (await fetch(screenshotData)).blob();
        const filename = `feedback/${user.id}/${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-media')
          .upload(filename, blob, { contentType: 'image/png', upsert: false });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('generated-media')
            .getPublicUrl(uploadData.path);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('feedback_reports').insert({
        user_id: user.id,
        category,
        severity,
        page_section: pageSection,
        title: title.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl,
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      });

      if (error) throw error;

      // Trigger email notification via API route
      try {
        await fetch('/api/feedback-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            severity,
            page_section: pageSection,
            reporter_email: userEmail,
          }),
        });
      } catch {
        // Email notification is best-effort, don't block on failure
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setTitle('');
        setDescription('');
        setCategory('bug');
        setSeverity('medium');
        setScreenshotData(null);
        setAnnotating(false);
      }, 1500);
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('bug');
    setSeverity('medium');
    setScreenshotData(null);
    setAnnotating(false);
    setSuccess(false);
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!success) resetForm();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, success]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); resetForm(); }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          background: '#ff2d7b',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          boxShadow: '0 4px 20px rgba(255,45,123,0.4)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,45,123,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,45,123,0.4)';
        }}
        title="Report feedback"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
              width: '100%',
              maxWidth: annotating ? '800px' : '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
            }}
          >
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Feedback Submitted
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', marginTop: '8px' }}>
                  Thank you for helping improve Cinema Studio.
                </p>
              </div>
            ) : annotating ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Annotate Screenshot
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    Draw to highlight the issue area
                  </span>
                </div>
                <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setAnnotating(false); setScreenshotData(null); }}
                    style={{
                      padding: '8px 16px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Remove Screenshot
                  </button>
                  <button
                    onClick={finishAnnotation}
                    style={{
                      padding: '8px 16px',
                      background: '#ff2d7b',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Done Annotating
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <span style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Report Feedback
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Category + Severity row */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as FeedbackCategory)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontFamily: 'Raleway, sans-serif',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                      Severity
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {SEVERITIES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setSeverity(s.value)}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            background: severity === s.value ? s.color : '#1a1a1a',
                            border: `1px solid ${severity === s.value ? s.color : 'rgba(255,255,255,0.1)'}`,
                            color: severity === s.value ? '#000' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 700,
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Page Section */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                    Where is the issue?
                  </label>
                  <select
                    value={pageSection}
                    onChange={e => setPageSection(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {PAGE_SECTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                    Short Summary
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Timeline clips snap to wrong position"
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                    Details
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What happened? What did you expect to happen? Steps to reproduce..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Screenshot section */}
                <div style={{ marginBottom: '24px' }}>
                  {screenshotData ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={screenshotData}
                        alt="Screenshot"
                        style={{ width: '80px', height: '48px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '12px', flex: 1 }}>
                        Screenshot captured
                      </span>
                      <button
                        onClick={() => { setScreenshotData(null); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '11px', fontFamily: 'Raleway, sans-serif' }}
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setAnnotating(true)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        Annotate
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={captureScreenshot}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                      Capture Screenshot
                    </button>
                  )}
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !title.trim() || !description.trim()}
                    style={{
                      padding: '10px 20px',
                      background: (submitting || !title.trim() || !description.trim()) ? 'rgba(255,45,123,0.3)' : '#ff2d7b',
                      border: 'none',
                      color: '#fff',
                      cursor: (submitting || !title.trim() || !description.trim()) ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>

                {/* Link to my reports (non-admin) */}
                {!isAdmin && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <a
                      href="/feedback/my-reports"
                      style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff2d7b')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                    >
                      View my submitted reports
                    </a>
                  </div>
                )}

                {/* Link to admin dashboard */}
                {isAdmin && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <a
                      href="/feedback/admin"
                      style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff2d7b')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                    >
                      Open Feedback Dashboard
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
