import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import HamburgerMenu from '@/components/HamburgerMenu';
import FeedbackAdminClient from '@/components/FeedbackAdminClient';

const ADMIN_EMAIL = 'empiremediacontent@gmail.com';

export default async function FeedbackAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email || '';

  // Fetch all reports
  const { data: rawReports } = await supabase
    .from('feedback_reports')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch profiles for all unique user_ids
  const userIds = [...new Set((rawReports || []).map(r => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
  const reports = (rawReports || []).map(r => ({
    ...r,
    profile: { full_name: profileMap.get(r.user_id) || null },
  }));

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/dashboard"
            style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Dashboard</span>
          </Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Feedback Dashboard
          </span>
        </div>
        <HamburgerMenu displayName={displayName} email={user.email || ''} dark />
      </header>

      <main style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <FeedbackAdminClient initialReports={reports || []} adminUserId={user.id} />
      </main>
    </div>
  );
}
