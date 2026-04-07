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

interface ReportWithProfile extends Omit<FeedbackReport, 'profile'> {
  profile?: { full_name: string | null } | null;
}

export default function FeedbackAdminClient({
  initialReports,
  adminUserId,
}: {
  initialReports: ReportWithProfile[];
  adminUserId: string;
}) {
  const supabase = createClient();
  const [reports, setReports] = useState<ReportWithProfile[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<ReportWithProfile | null>(null);
  const [replies, setReplies] = useState<(FeedbackReply & { profile?: { full_name: string | null } | null })[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<FeedbackCategory | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<FeedbackSeverity | 'all'>('all');

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    return true;
  });

  const counts = {
    total: reports.length,
    open: reports.filter(r => r.status === 'open').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    critical: reports.filter(r => r.severity === 'critical' && r.status !== 'resolved' && r.status !== 'wont_fix').length,
  };

  // Load replies when report selected
  useEffect(() => {
    if (!selectedReport) return;
    (async () => {
      const { data } = await supabase
        .from('feedback_replies')
        .select('*')
        .eq('report_id', selectedReport.id)
        .order('created_at', { ascending: true });
      // Fetch profiles for reply authors
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

  const updateStatus = async (reportId: string, newStatus: FeedbackStatus) => {
    const { error } = await supabase
      .from('feedback_reports')
      .update({ status: newStatus })
      .eq('id', reportId);
    if (!error) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const sendReply = async () => {
    if (!selectedReport || !replyText.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from('feedback_replies')
      .insert({
        report_id: selectedReport.id,
        user_id: adminUserId,
        message: replyText.trim(),
      })
      .select('*')
      .single();

    if (!error && data) {
      setReplies(prev => [...prev, { ...data, profile: { full_name: 'You' } }]);
      setReplyText('');
      // Auto-set status to "seen" if still "open"
      if (selectedReport.status === 'open') {
        await updateStatus(selectedReport.id, 'seen');
      }
    }
    setSending(false);
  };

  const deleteReport = async (reportId: string) => {
    const { error } = await supabase
      .from('feedback_reports')
      .delete()
      .eq('id', reportId);
    if (!error) {
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.4)',
  };

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: counts.total, color: '#fff' },
          { label: 'Open', value: counts.open, color: STATUS_COLORS.open },
          { label: 'In Progress', value: counts.in_progress, color: STATUS_COLORS.in_progress },
          { label: 'Resolved', value: counts.resolved, color: STATUS_COLORS.resolved },
          { label: 'Critical', value: counts.critical, color: SEVERITY_COLORS.critical },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '16px 20px',
              minWidth: '120px',
            }}
          >
            <div style={{ ...labelStyle, marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '24px', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={labelStyle}>Filters:</span>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as FeedbackStatus | 'all')}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as FeedbackCategory | 'all')}
          style={selectStyle}
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value as FeedbackSeverity | 'all')}
          style={selectStyle}
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Main layout: list + detail */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
        {/* Report list */}
        <div style={{ width: '420px', flexShrink: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
          {filteredReports.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
              No reports match these filters.
            </div>
          ) : (
            filteredReports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  background: selectedReport?.id === report.id ? '#1a1a1a' : '#111',
                  border: `1px solid ${selectedReport?.id === report.id ? '#ff2d7b' : 'rgba(255,255,255,0.06)'}`,
                  padding: '14px 16px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontSize: '13px', fontWeight: 600, flex: 1, marginRight: '8px' }}>
                    {report.title}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    background: SEVERITY_COLORS[report.severity as FeedbackSeverity],
                    color: '#000',
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    {report.severity}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    border: `1px solid ${STATUS_COLORS[report.status as FeedbackStatus]}`,
                    color: STATUS_COLORS[report.status as FeedbackStatus],
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                    fontSize: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {STATUS_LABELS[report.status as FeedbackStatus]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    {CATEGORY_LABELS[report.category as FeedbackCategory]}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    {report.page_section}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontFamily: 'Raleway, sans-serif', fontSize: '10px', marginLeft: 'auto' }}>
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                  {report.profile?.full_name || 'Unknown user'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedReport ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>
              Select a report to view details
            </div>
          ) : (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', padding: '24px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              {/* Title + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 style={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  {selectedReport.title}
                </h2>
                <button
                  onClick={() => deleteReport(selectedReport.id)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px 10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  Delete
                </button>
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', background: SEVERITY_COLORS[selectedReport.severity as FeedbackSeverity], color: '#000', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase' }}>
                  {selectedReport.severity}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '12px' }}>
                  {CATEGORY_LABELS[selectedReport.category as FeedbackCategory]}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '12px' }}>
                  {selectedReport.page_section}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                  {new Date(selectedReport.created_at).toLocaleString()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                  by {selectedReport.profile?.full_name || 'Unknown'}
                </span>
              </div>

              {/* Status changer */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {(Object.keys(STATUS_LABELS) as FeedbackStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(selectedReport.id, s)}
                    style={{
                      padding: '5px 12px',
                      background: selectedReport.status === s ? STATUS_COLORS[s] : 'transparent',
                      border: `1px solid ${STATUS_COLORS[s]}`,
                      color: selectedReport.status === s ? '#000' : STATUS_COLORS[s],
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ ...labelStyle, marginBottom: '6px' }}>Description</div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedReport.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedReport.screenshot_url && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...labelStyle, marginBottom: '6px' }}>Screenshot</div>
                  <a href={selectedReport.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedReport.screenshot_url}
                      alt="Feedback screenshot"
                      style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    />
                  </a>
                </div>
              )}

              {/* Browser info */}
              {(selectedReport.viewport_size || selectedReport.user_agent) && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...labelStyle, marginBottom: '6px' }}>Environment</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '11px' }}>
                    {selectedReport.viewport_size && <div>Viewport: {selectedReport.viewport_size}</div>}
                    {selectedReport.user_agent && <div style={{ wordBreak: 'break-all' }}>UA: {selectedReport.user_agent}</div>}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

              {/* Replies / conversation */}
              <div style={{ ...labelStyle, marginBottom: '12px' }}>
                Conversation ({replies.length})
              </div>

              {replies.map(reply => (
                <div
                  key={reply.id}
                  style={{
                    background: reply.user_id === adminUserId ? 'rgba(255,45,123,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${reply.user_id === adminUserId ? 'rgba(255,45,123,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    padding: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: reply.user_id === adminUserId ? '#ff2d7b' : 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {reply.user_id === adminUserId ? 'You' : (reply.profile?.full_name || 'Tester')}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Raleway, sans-serif', fontSize: '10px' }}>
                      {new Date(reply.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Raleway, sans-serif', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {reply.message}
                  </p>
                </div>
              ))}

              {/* Reply input */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
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
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#1a1a1a',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  fontFamily: 'Raleway, sans-serif',
  fontSize: '12px',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: 700,
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'rgba(255,255,255,0.4)',
};
