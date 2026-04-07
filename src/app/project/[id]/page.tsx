import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { getProject } from '@/lib/actions/projects';
import HamburgerMenu from '@/components/HamburgerMenu';
import ProjectWorkspace from '@/components/ProjectWorkspace';
import Link from 'next/link';
import type { Shot } from '@/lib/types/database';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email || '';

  const project = await getProject(id);
  if (!project) notFound();

  const { data: shots } = await supabase
    .from('shots')
    .select('*')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', height: '100%' }}>
      {/* Top Bar */}
      <header
        className="workspace-header-pad"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/dashboard"
            className="transition-smooth"
            style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="heading-label" style={{ fontSize: '10px' }}>Back</span>
          </Link>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)' }} />
          <span
            className="heading-section"
            style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.02em' }}
          >
            {project.title}
          </span>
        </div>

        <HamburgerMenu displayName={displayName} email={user.email || ''} dark />
      </header>

      {/* Workspace */}
      <main className="workspace-header-pad" style={{ paddingTop: '24px', paddingBottom: '24px' }}>
        <ProjectWorkspace project={project} initialShots={(shots as Shot[]) || []} />
      </main>
    </div>
  );
}
