'use client';

import { useState } from 'react';
import { deleteProject } from '@/lib/actions/projects';
import type { Project } from '@/lib/types/database';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--text-3)' },
  in_progress: { label: 'In Progress', color: 'var(--accent)' },
  rendering: { label: 'Rendering', color: 'var(--warning)' },
  completed: { label: 'Completed', color: 'var(--success)' },
  archived: { label: 'Archived', color: 'var(--text-3)' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ProjectCard({ project }: { project: Project }) {
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_LABELS[project.status] ?? STATUS_LABELS.draft;

  async function handleDelete() {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    setDeleting(true);
    await deleteProject(project.id);
  }

  return (
    <div className="group card-elevated" style={{ overflow: 'hidden' }}>
      {/* Thumbnail */}
      <Link href={`/project/${project.id}`}>
        <div
          style={{
            aspectRatio: '16 / 10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--bg-alt)',
            transition: 'all 0.5s linear',
          }}
        >
          {project.thumbnail_url ? (
            <img
              src={project.thumbnail_url}
              alt={project.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <Link href={`/project/${project.id}`} style={{ flex: 1, minWidth: 0 }}>
            <h3
              className="heading-section transition-smooth"
              style={{
                fontSize: '13px',
                color: 'var(--text)',
                letterSpacing: '0',
                textTransform: 'none',
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {project.title}
            </h3>
          </Link>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }}
              className="group-hover:!opacity-100"
              aria-label="Project options"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-3)">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setShowMenu(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '32px',
                    zIndex: 20,
                    width: '160px',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    padding: '4px 0',
                  }}
                >
                  <Link
                    href={`/project/${project.id}`}
                    style={{
                      display: 'block',
                      padding: '10px 16px',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontFamily: 'Raleway, sans-serif',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => setShowMenu(false)}
                  >
                    Open
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      fontFamily: 'Raleway, sans-serif',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: deleting ? 0.5 : 1,
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {project.description && (
          <p
            className="body-text"
            style={{
              color: 'var(--text-3)',
              fontSize: '13px',
              marginTop: '6px',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span
            className="heading-label"
            style={{ color: status.color, fontSize: '10px' }}
          >
            {status.label}
          </span>
          <span
            className="heading-label"
            style={{
              color: 'var(--text-3)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              textTransform: 'none',
            }}
          >
            {timeAgo(project.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
