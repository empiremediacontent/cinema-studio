'use client';

import { useState } from 'react';
import ProjectCard from '@/components/ProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import type { Project } from '@/lib/types/database';

export default function DashboardClient({ projects }: { projects: Project[] }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '60px' }}>
        <div>
          <span
            className="heading-label"
            style={{
              color: 'var(--text-3)',
              display: 'block',
              marginBottom: '16px',
              fontSize: '11px',
              letterSpacing: '0.15em',
            }}
          >
            Your Productions
          </span>
          <h1
            className="heading-display"
            style={{ fontSize: 'clamp(40px, 5vw, 80px)', color: 'var(--text)' }}
          >
            <span className="text-gradient">Projects</span>
          </h1>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            padding: '80px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="divider" style={{ marginBottom: '30px' }} />
          <h3
            className="heading-section"
            style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '12px' }}
          >
            No Projects Yet
          </h3>
          <p
            className="body-text"
            style={{
              color: 'var(--text-3)',
              fontSize: '14px',
              marginBottom: '40px',
              textAlign: 'center',
              maxWidth: '360px',
            }}
          >
            Start your first production by creating a new project.
          </p>
          <button onClick={() => setModalOpen(true)} className="btn-secondary">
            Create Your First Project
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '24px' }}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
