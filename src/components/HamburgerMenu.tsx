'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function HamburgerMenu({ displayName, email, dark = false }: { displayName?: string; email: string; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const barColor = dark ? '#fff' : 'var(--text)';
  const dropBg = dark ? '#141414' : 'var(--surface)';
  const dropBorder = dark ? 'rgba(255,255,255,0.08)' : 'var(--border)';
  const textPrimary = dark ? '#fff' : 'var(--text)';
  const textMuted = dark ? 'rgba(255,255,255,0.4)' : 'var(--text-3)';

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="hamburger-btn"
        aria-label="Menu"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: barColor,
            transition: 'all 0.3s ease',
            transform: open ? 'rotate(45deg) translate(2.5px, 2.5px)' : 'none',
          }}
        />
        <span
          style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: barColor,
            transition: 'all 0.3s ease',
            opacity: open ? 0 : 1,
          }}
        />
        <span
          style={{
            display: 'block',
            width: '22px',
            height: '2px',
            background: barColor,
            transition: 'all 0.3s ease',
            transform: open ? 'rotate(-45deg) translate(2.5px, -2.5px)' : 'none',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            background: dropBg,
            border: `1px solid ${dropBorder}`,
            padding: '20px 24px',
            minWidth: '220px',
            zIndex: 1000,
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          {displayName && (
            <span
              style={{
                display: 'block',
                color: textPrimary,
                fontSize: '14px',
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              {displayName}
            </span>
          )}
          <span
            className="body-text"
            style={{
              display: 'block',
              color: textMuted,
              fontSize: '11px',
              marginBottom: '20px',
              wordBreak: 'break-all',
            }}
          >
            {email}
          </span>
          <div style={{ width: '100%', height: '1px', background: dropBorder, marginBottom: '16px' }} />
          <button
            onClick={handleSignOut}
            className="heading-label transition-smooth"
            style={{
              color: textMuted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              letterSpacing: '0.12em',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff2d7b')}
            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
