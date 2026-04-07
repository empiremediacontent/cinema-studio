import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HamburgerMenu from '@/components/HamburgerMenu';
import DashboardClient from '@/components/DashboardClient';
import AISidebar from '@/components/AISidebar';
import { getProjects } from '@/lib/actions/projects';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email || '';
  const projects = await getProjects();

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header
        className="dash-header-pad"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '80px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/">
            <span
              className="heading-section transition-smooth"
              style={{ fontSize: '14px', color: 'var(--text)', letterSpacing: '0.02em' }}
            >
              Cinema <span className="text-gradient">Studio</span>
            </span>
          </Link>
        </div>

        <HamburgerMenu displayName={displayName} email={user.email || ''} />
      </header>

      {/* Body: AI Sidebar + Main Content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Collapsible AI Tools Sidebar */}
        <div className="dash-ai-sidebar">
          <AISidebar variant="light" />
        </div>

        {/* Main content with generous padding */}
        <main className="dash-content-pad" style={{ flex: 1, minWidth: 0, maxWidth: '1200px' }}>
          <DashboardClient projects={projects} />
        </main>
      </div>
    </div>
  );
}
