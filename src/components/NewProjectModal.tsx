'use client';

import { useState, useRef, useEffect } from 'react';
import { createProject } from '@/lib/actions/projects';

export default function NewProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await createProject(formData);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '440px',
          background: '#fff',
          border: '1px solid var(--border)',
          padding: '40px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.15)',
        }}
      >
        <span
          className="heading-label"
          style={{
            color: 'var(--text-3)',
            display: 'block',
            marginBottom: '12px',
            letterSpacing: '0.15em',
          }}
        >
          New Production
        </span>
        <h2
          className="heading-section"
          style={{ fontSize: '28px', color: 'var(--text)', marginBottom: '32px' }}
        >
          Create Project
        </h2>

        <form action={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="title"
              className="heading-label"
              style={{
                color: 'var(--text-2)',
                display: 'block',
                marginBottom: '8px',
                fontSize: '10px',
              }}
            >
              Project Name
            </label>
            <input
              ref={titleRef}
              type="text"
              id="title"
              name="title"
              placeholder="e.g. Product Launch Spot"
              maxLength={100}
              required
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: '36px' }}>
            <label
              htmlFor="description"
              className="heading-label"
              style={{
                color: 'var(--text-2)',
                display: 'block',
                marginBottom: '8px',
                fontSize: '10px',
              }}
            >
              Description{' '}
              <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Brief description of your project"
              rows={3}
              maxLength={500}
              className="textarea-field"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ height: '40px', padding: '0 24px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ height: '40px', padding: '0 24px', opacity: loading ? 0.4 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
