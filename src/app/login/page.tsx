'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a confirmation link.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel: dark hero with large title */}
      <div
        className="hidden lg:flex flex-col items-center justify-center relative"
        style={{
          flex: '1 1 55%',
          background: '#000',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Color gradient background matching landing page */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #000 0%, #2d0015 35%, #000 60%, #1a0033 85%, #000 100%)',
            opacity: 0.5,
          }}
        />
        {/* Pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-radial-gradient(rgba(255,255,255,0.02) 1px, transparent 2px)',
            backgroundSize: '3px 3px',
            pointerEvents: 'none',
          }}
        />
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '0 60px' }}>
          <span
            className="heading-label"
            style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '11px',
              letterSpacing: '0.20em',
              display: 'block',
              marginBottom: '30px',
            }}
          >
            Script to Screen
          </span>
          <h2
            className="heading-display"
            style={{
              fontSize: 'clamp(50px, 7vw, 120px)',
              color: '#fff',
              marginBottom: '40px',
            }}
          >
            Cinema
            <br />
            <span className="text-gradient">Studio</span>
          </h2>
          <p
            className="body-text"
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '14px',
              maxWidth: '340px',
              margin: '0 auto',
            }}
          >
            Write. Direct. Render. One interface for
            your entire production pipeline.
          </p>
        </div>

        {/* Back to landing */}
        <Link
          href="/"
          className="heading-label link-effect transition-smooth"
          style={{
            position: 'absolute',
            top: '50px',
            left: '50px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '10px',
          }}
        >
          Home
        </Link>
      </div>

      {/* Right panel: auth form */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          flex: '1 1 45%',
          minWidth: '320px',
          padding: 'clamp(30px, 5vw, 60px)',
          background: '#fff',
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Back link for mobile */}
          <Link
            href="/"
            className="heading-label transition-smooth lg:hidden"
            style={{
              color: 'var(--text-3)',
              fontSize: '10px',
              display: 'block',
              marginBottom: '40px',
            }}
          >
            &larr; Back
          </Link>

          <span
            className="heading-label"
            style={{
              color: 'var(--text-3)',
              display: 'block',
              marginBottom: '16px',
              letterSpacing: '0.15em',
            }}
          >
            {isSignUp ? 'Get started' : 'Welcome back'}
          </span>
          <h1
            className="heading-section"
            style={{
              fontSize: '36px',
              color: 'var(--text)',
              marginBottom: '50px',
            }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="btn-secondary"
              style={{
                width: '100%',
                gap: '10px',
                height: '48px',
                opacity: loading ? 0.4 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="btn-secondary"
              style={{
                width: '100%',
                gap: '10px',
                height: '48px',
                opacity: loading ? 0.4 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#111">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.33-3.74 4.25z" />
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4" style={{ marginBottom: '32px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span className="heading-label" style={{ color: 'var(--gray-300)', fontSize: '9px' }}>
              Or
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isSignUp && (
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input-field"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                marginTop: '8px',
                opacity: loading ? 0.4 : 1,
              }}
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Error / Message */}
          {error && (
            <p
              style={{
                color: 'var(--danger)',
                fontSize: '13px',
                fontFamily: 'Raleway, sans-serif',
                textAlign: 'center',
                marginTop: '20px',
              }}
            >
              {error}
            </p>
          )}
          {message && (
            <p
              style={{
                color: 'var(--success)',
                fontSize: '13px',
                fontFamily: 'Raleway, sans-serif',
                textAlign: 'center',
                marginTop: '20px',
              }}
            >
              {message}
            </p>
          )}

          {/* Toggle */}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="body-text transition-smooth"
            style={{
              color: 'var(--text-3)',
              fontSize: '13px',
              marginTop: '32px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
