'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FeedbackReport, FeedbackReply, FeedbackStatus, FeedbackCategory, FeedbackSeverity } from '@/lib/types/database';

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: '#3b82f6',
  seen: '#a78bfa',
  in_progress: '#facc15',
  resolved: '#4ade80',
  wont_fix: 'rgba(255,255,255,0.2)',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  seen: 'Seen',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  wont_fix: "Won't Fix",
};

const SEVERITY_COLORS: Record<FeedbackSeverity, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f97316',
  critical: '#ef4444',
};

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  confusion: 'Confusing UX',
  performance: 'Performance',
  other: 'Other',
};

export default function FeedbackMyReportsClient({
  initialReports,
  userId,
}: {
  initialReports: FeedbackReport[];
  userId: string;
}) {
  const supabase = createClient();
  const [reports] = useState<FeedbackReport[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [replies, setReplies] = useState<(FeedbackReply & { profile?: { full_name: string | null } | null })[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!selectedReport) return;
    (async () => {
      const { data } = await supabase
        .from('feedback_replies')
        .select('*')
        .eq('report_id', selectedReport.id)
        .order('created_at', { ascending: true });
      const replyUserIds = [...new Set((data || []).map(r => r.user_id))];
      let replyProfiles: { id: string; full_name: string | null }[] = [];
      if (replyUserIds.length > 0) {
        const { data: pData } = await supabase.from('profiles').select('id, full_name').in('id', replyUserIds);
        replyProfiles = pData || [];
      }
      const pMap = new Map(replyProfiles.map(p => [p.id, p.full_name]));
      setReplies((data || []).map(r => ({ ...r, profile: { full_name: pMap.get(r.user_id) || null } })));
    })();
  }, [selectedReport?.id]);

  const sendReply = async () => {
    if (!selectedReport || !replyText.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from('feedback_replies')
      .insert({
        report_id: selectedReport.id,
        user_id: userId,
        message: replyText.trim(),
      })
      .select('*')
      .single();

    if (!error && data) {
      setReplies(prev => [...prev, { ...data, profile: { full_name: 'You' } }]);
      setReplyText('');
    }
    setSending(false);
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '9px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.4)',
  };

  return (
    <div>
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>
            No feedback submitted yet.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '12px', marginTop: '4px' }}>
            Use the feedback button in the bottom-right corner to report issues.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', minHeight: '400px' }}>
          {/* Report list */}
          <div style={{ width: '380px', flexShrink: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {reports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  background: selectedReport?.id === report.id ? '#1a1a1a' : '#111',
                  border: `1px solid ${selectedReport?.id === report.id ? '#ff2d7b' : 'rgba(255,255,255,0.06)'}`,
                  padding: '14px 16px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontSize: '13px', fontWeight: 600, flex: 1, marginRight: '8px' }}>
                    {report.title}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    background: SEVERITY_COLORS[report.severity as FeedbackSeverity],
                    color: '#000',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}>
                    {report.severity}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 6px',
                    border: `1px solid ${STATUS_COLORS[report.status as FeedbackStatus]}`,
                    color: STATUS_COLORS[report.status as FeedbackStatus],
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: '8px',
                    textTransform: 'uppercase',
                  }}>
                    {STATUS_LABELS[report.status as FeedbackStatus]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    {report.page_section}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontFamily: 'Raleway, sans-serif', fontSize: '10px', marginLeft: 'auto' }}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selectedReport ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>
                Select a report to see details and replies
              </div>
            ) : (
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <h2 style={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>
                  {selectedReport.title}
                </h2>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ padding: '2px 8px', background: SEVERITY_COLORS[selectedReport.severity as FeedbackSeverity], color: '#000', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase' }}>
                    {selectedReport.severity}
                  </span>
                  <span style={{ padding: '2px 6px', border: `1px solid ${STATUS_COLORS[selectedReport.status as FeedbackStatus]}`, color: STATUS_COLORS[selectedReport.status as FeedbackStatus], fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase' }}>
                    {STATUS_LABELS[selectedReport.status as FeedbackStatus]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '12px' }}>
                    {CATEGORY_LABELS[selectedReport.category as FeedbackCategory]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    {selectedReport.page_section}
                  </span>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.description}
                </p>

                {selectedReport.screenshot_url && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ ...labelStyle, marginBottom: '6px' }}>Screenshot</div>
                    <a href={selectedReport.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedReport.screenshot_url} alt="Screenshot" style={{ maxWidth: '100%', maxHeight: '250px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </a>
                  </div>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

                <div style={{ ...labelStyle, marginBottom: '12px' }}>Replies ({replies.length})</div>

                {replies.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '12px', margin: '0 0 16px' }}>
                    No replies yet. The team will respond here.
                  </p>
                )}

                {replies.map(reply => {
                  const isMe = reply.user_id === userId;
                  return (
                    <div
                      key={reply.id}
                      style={{
                        background: isMe ? 'rgba(255,255,255,0.03)' : 'rgba(255,45,123,0.06)',
                        border: `1px solid ${isMe ? 'rgba(255,255,255,0.06)' : 'rgba(255,45,123,0.15)'}`,
                        padding: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: isMe ? 'rgba(255,255,255,0.5)' : '#ff2d7b', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {isMe ? 'You' : (reply.profile?.full_name || 'Admin')}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '10px' }}>
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {reply.message}
                      </p>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Add a reply..."
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Raleway, sans-serif',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    style={{
                      padding: '8px 16px',
                      background: (sending || !replyText.trim()) ? 'rgba(255,45,123,0.3)' : '#ff2d7b',
                      border: 'none',
                      color: '#fff',
                      cursor: (sending || !replyText.trim()) ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {sending ? '...' : 'Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
