'use client';

import { useState, useEffect, useRef } from 'react';
// next/link import removed: all auth CTAs are off the landing page in demo mode.

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'features', label: 'Features' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'use-cases', label: 'Use Cases' },
];

function AnimatedBar({ label, delay }: { label: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span className="heading-label" style={{ color: '#fff', fontSize: '11px', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span className="heading-label" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
          100%
        </span>
      </div>
      <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.08)' }}>
        <div
          className={`progress-bar-fill ${visible ? 'animate' : ''}`}
          style={{ animationDelay: `${delay}s` }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [showTopBtn, setShowTopBtn] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  // Avatar demo video: muted by default so autoplay works in all browsers,
  // user can toggle audio on with the bottom-right button.
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const [avatarMuted, setAvatarMuted] = useState(true);
  const toggleAvatarMute = () => {
    const v = avatarVideoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next) {
      // Unmuting: ensure playback continues, recover from any autoplay pause.
      v.play().catch(() => { /* ignore: user gesture should be sufficient */ });
    }
    setAvatarMuted(next);
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
      setShowTopBtn(window.scrollY > 600);

      const offsets = SECTIONS.map(s => {
        const el = sectionRefs.current[s.id];
        if (!el) return { id: s.id, top: 99999 };
        return { id: s.id, top: Math.abs(el.getBoundingClientRect().top - 100) };
      });
      offsets.sort((a, b) => a.top - b.top);
      if (offsets[0]) setActiveSection(offsets[0].id);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div style={{ background: '#000', overflowX: 'hidden' }}>
      {/* ============================================================
          STICKY HEADER
          ============================================================ */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(20px, 4vw, 50px)', height: '70px',
          transition: 'all 0.4s ease',
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        <span className="heading-section" style={{
          fontSize: '13px',
          color: scrolled ? 'var(--text)' : '#fff',
          letterSpacing: '0.02em', transition: 'color 0.4s ease',
        }}>
          Cinema <span style={{ color: scrolled ? 'var(--accent)' : '#ff2d7b' }}>Studio</span>
        </span>

        {/* Desktop nav links (Sign In removed for demo mode, access /login or /admin directly) */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '28px' }}>
          {SECTIONS.filter(s => s.id !== 'home').map(s => (
            <button key={s.id} onClick={() => scrollToSection(s.id)} className="heading-label" style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px',
              letterSpacing: '0.10em', transition: 'color 0.4s ease',
              color: activeSection === s.id
                ? (scrolled ? 'var(--gray-400)' : 'rgba(255,255,255,0.35)')
                : (scrolled ? 'var(--text)' : 'rgba(255,255,255,0.75)'),
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Mobile nav (Sign In removed for demo mode) */}
        <div className="md:hidden" />
      </nav>

      {/* ============================================================
          HERO
          ============================================================ */}
      <section
        ref={setRef('home')} id="home"
        style={{
          position: 'relative', width: '100%', height: '100vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Slow-moving gradient background */}
        <div className="hero-gradient-bg" />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1 }} />

        {/* Content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 5,
          padding: '0 clamp(20px, 5vw, 50px)', textAlign: 'center',
          maxWidth: '100%',
        }}>
          <span className="heading-label" style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '11px',
            letterSpacing: '0.20em', marginBottom: '24px',
          }}>
            Script to Screen
          </span>

          <h1 className="heading-display" style={{
            fontSize: 'clamp(48px, 10vw, 160px)', color: '#fff',
            marginBottom: '12px', lineHeight: '0.95',
          }}>
            Cinema
          </h1>
          <h1 className="heading-display" style={{
            fontSize: 'clamp(48px, 10vw, 160px)',
            color: '#ff2d7b', marginBottom: '32px', lineHeight: '0.95',
          }}>
            Studio
          </h1>

          <p className="body-text" style={{
            color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(13px, 1.2vw, 15px)',
            maxWidth: '520px', lineHeight: '1.8',
            marginBottom: 'clamp(30px, 4vh, 50px)',
          }}>
            AI-powered production pipeline. Write your script, generate shots,
            <br className="hidden sm:block" />
            direct cinematography, and render your vision into reality.
          </p>

          {/* Hero CTA removed for demo mode. Use /login or /admin to sign in. */}
          <button
            onClick={() => scrollToSection('about')}
            className="btn-wext"
            style={{ marginBottom: 'clamp(40px, 6vh, 80px)', background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', cursor: 'pointer' }}
          >
            See the Demo
          </button>
        </div>

        {/* Scroll indicator, positioned with safe spacing */}
        <div style={{
          position: 'absolute', bottom: 'clamp(16px, 3vh, 40px)', left: '50%',
          transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '8px', zIndex: 10,
        }}>
          <span className="scroll-indicator-label">Scroll</span>
          <div className="scroll-indicator-line" />
        </div>
      </section>

      {/* ============================================================
          ABOUT (White)
          ============================================================ */}
      <section ref={setRef('about')} id="about" className="section-light" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Two-column row: text left, sample script right.
              flex-wrap stacks at narrow widths; script column hidden on mobile
              (<md / 768px) since the screenplay text would render unreadably small. */}
          <div style={{
            display: 'flex',
            gap: 'clamp(40px, 5vw, 80px)',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}>

            {/* Left: main copy */}
            <div style={{ flex: '1 1 420px', textAlign: 'left' }}>
              <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: 'var(--text)', marginBottom: '24px', lineHeight: '1.05' }}>
                End-to-End <span style={{ color: '#ff2d7b' }}>Production</span>
              </h2>
              <span className="heading-label" style={{ color: 'var(--text-3)', fontSize: '11px', letterSpacing: '0.15em', display: 'inline-block' }}>
                An AI-Native Production Pipeline
              </span>

              <div style={{ marginTop: 'clamp(28px, 3vw, 40px)' }}>
                <p className="intro-text" style={{ color: 'var(--text-2)', marginBottom: '20px', fontSize: 'clamp(16px, 1.5vw, 20px)', lineHeight: '1.55' }}>
                  Cinema Studio replaces the fragmented workflow of scripts, storyboards, shot lists, and render queues with a single, unified interface. Every stage of production happens in one place, with an AI assistant at each one.
                </p>
                <p className="intro-text" style={{ color: 'var(--text-2)', fontSize: 'clamp(16px, 1.5vw, 20px)', lineHeight: '1.55' }}>
                  From the first line of dialogue to the final rendered frame, AI-assisted writing tightens your script, AI-driven shot generation builds your storyboard, and an on-demand avatar library fills your cast in seconds. No switching tools. No exporting between apps. No lost context.
                </p>

                {/* Bot illustration moved to the script column, anchored to the
                    bottom-left of the page card so it reads as a mascot
                    perched on the screenplay. */}
              </div>
            </div>

            {/* Right: sample screenplay page from the Script Writing Assistant.
                Hidden below md (768px) — the SVG body text would render at ~5px
                on a 360px viewport which is unreadable, and stacking it would
                add visual weight without communicating anything. */}
            <div className="hidden md:block" style={{ flex: '1 1 460px', maxWidth: '620px' }}>
              <div
                aria-label="Sample output from the Cinema Studio Script Writing Assistant"
                role="img"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '17 / 22',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 24px 60px -20px rgba(0,0,0,0.18), 0 8px 20px -8px rgba(0,0,0,0.08)',
                  backgroundImage: 'url(/script-page-bg.svg)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'top center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* AI suggestion callout, anchored to the highlighted dialogue
                    block in the SVG (y=850-1130 of viewBox 2200, ~40% down).
                    Floats off the right edge of the page so it reads as a UI
                    overlay sitting above the document. */}
                <div
                  style={{
                    position: 'absolute',
                    top: '38%',
                    right: '-4%',
                    width: 'clamp(220px, 58%, 320px)',
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,45,123,0.25)',
                    boxShadow: '0 18px 40px -12px rgba(255,45,123,0.35), 0 8px 18px -6px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                    zIndex: 2,
                  }}
                >
                  {/* Pointer wedge on the left edge of the card, pointing back
                      to the highlighted dialogue block on the page. */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '-8px', top: '24px',
                      width: '14px', height: '14px',
                      background: '#ffffff',
                      borderLeft: '1px solid rgba(255,45,123,0.25)',
                      borderBottom: '1px solid rgba(255,45,123,0.25)',
                      transform: 'rotate(45deg)',
                    }}
                  />

                  {/* Header: AI Assistant pill */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 16px 0 16px',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(135deg, rgba(255,45,123,0.12), rgba(255,45,123,0.04))',
                      color: '#ff2d7b',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 700,
                      fontSize: '9px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,45,123,0.2)',
                    }}>
                      {/* Sparkle icon */}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2v6" />
                        <path d="M12 16v6" />
                        <path d="M2 12h6" />
                        <path d="M16 12h6" />
                        <path d="M5 5l3 3" />
                        <path d="M16 16l3 3" />
                        <path d="M19 5l-3 3" />
                        <path d="M8 16l-3 3" />
                      </svg>
                      AI Assistant
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '10px 16px 14px 16px' }}>
                    <p style={{
                      margin: '0 0 6px 0',
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#1a1a1a',
                      lineHeight: '1.4',
                    }}>
                      Redundant dialogue detected.
                    </p>
                    <p style={{
                      margin: 0,
                      fontFamily: 'Raleway, sans-serif',
                      fontWeight: 400,
                      fontSize: '11.5px',
                      color: '#5a5a60',
                      lineHeight: '1.55',
                    }}>
                      Both exchanges establish the same dynamic between Chen and the Stranger.
                      Cutting one tightens the scene by roughly 6 seconds of screen time.
                    </p>

                    {/* Actions */}
                    <div style={{
                      display: 'flex', gap: '6px',
                      marginTop: '12px',
                    }}>
                      <button
                        type="button"
                        style={{
                          flex: '0 0 auto',
                          background: '#ff2d7b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 14px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700,
                          fontSize: '10px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase' as const,
                          cursor: 'pointer',
                        }}
                      >
                        Apply Cut
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: '0 0 auto',
                          background: 'transparent',
                          color: '#5a5a60',
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: '6px',
                          padding: '7px 14px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontWeight: 700,
                          fontSize: '10px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase' as const,
                          cursor: 'pointer',
                        }}
                      >
                        Rewrite
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Assistant bot, anchored to the bottom-left of the script
                    page so it overlaps the corner. Uses negative offsets to
                    break out of the card without affecting layout flow. */}
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/blue-peak-poc.firebasestorage.app/o/Jason%20Vazquez%2FBackgrounds%2FBot.png?alt=media&token=13d7d33a-1fcd-41ef-935e-dd1a299444fc"
                  alt="Cinema Studio AI Assistant"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width: 'clamp(280px, 36vw, 420px)',
                    height: 'auto',
                    left: '-32%',
                    bottom: '-18%',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 3,
                    filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.18))',
                  }}
                />
              </div>
            </div>

          </div>

          {/* Stats row removed per request. */}

        </div>
      </section>

      {/* ============================================================
          FEATURES (Dark) - animated bars
          ============================================================ */}
      <section ref={setRef('features')} id="features" className="section-dark" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)', position: 'relative', overflow: 'hidden' }}>
        {/* Avatar Builder hosted image, blurred, behind a dark overlay so the
            section text and the demo video stay legible. The blur layer is
            inset slightly negative so blur edges don't show as a soft border. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: '-40px',
            backgroundImage: 'url(https://firebasestorage.googleapis.com/v0/b/blue-peak-poc.firebasestorage.app/o/Jason%20Vazquez%2FBackgrounds%2FAvatar%20Builder.png?alt=media&token=e525efc5-175b-416e-a1c6-0139aa1b879d)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(6px)',
            transform: 'scale(1.02)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.95) 16%, rgba(0,0,0,0.86) 30%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.82) 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: '#fff', marginBottom: '24px' }}>
            Avatars on <span style={{ color: '#ff2d7b' }}>Demand</span>
          </h2>
          <span className="heading-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.15em' }}>
            Cast in Seconds. Hours Reclaimed.
            <span className="divider-line-light" />
          </span>

          <p className="body-text" style={{
            color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(14px, 1.2vw, 16px)',
            maxWidth: '720px', margin: '32px auto 0', lineHeight: '1.8',
          }}>
            Stop spending weeks casting, scheduling, and coordinating talent. Cinema Studio generates
            photorealistic on-demand avatars in seconds, freeing your team to focus on story, direction,
            and the creative work only humans can do.
          </p>

          {/* Stacked layout: full-width 16:9 video on top, bars in a row below.
              Video container uses aspectRatio so the source's native 16:9 frame is
              preserved exactly. objectFit: contain guarantees no cropping. */}
          <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', gap: 'clamp(40px, 5vw, 64px)' }}>
            {/* Avatar generation demo video, full width, native 16:9.
                Soft black drop shadow stack so the video edges dissolve into
                the surrounding section instead of cutting hard against the
                heading copy and the stat bars below. */}
            <div style={{
              width: '100%', aspectRatio: '16 / 9',
              background: '#000',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 60px 20px rgba(0,0,0,0.75), 0 0 140px 60px rgba(0,0,0,0.55), 0 0 260px 120px rgba(0,0,0,0.35)',
            }}>
              <video
                ref={avatarVideoRef}
                src="https://firebasestorage.googleapis.com/v0/b/blue-peak-poc.firebasestorage.app/o/Jason%20Vazquez%2FVideos%2FChen%20FInal_iris2.mp4?alt=media&token=6923008b-7a79-4647-b592-0f9705652829"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Cinema Studio avatar generation demonstration"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
              />

              {/* Mute / unmute toggle, bottom-right corner */}
              <button
                type="button"
                onClick={toggleAvatarMute}
                aria-label={avatarMuted ? 'Unmute avatar demo video' : 'Mute avatar demo video'}
                aria-pressed={!avatarMuted}
                style={{
                  position: 'absolute', bottom: '16px', right: '16px',
                  width: '40px', height: '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '999px',
                  color: '#fff',
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                  transition: 'background 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,45,123,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; }}
              >
                {avatarMuted ? (
                  // Muted icon: speaker with X
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  // Unmuted icon: speaker with sound waves
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
            </div>

            {/* Outcomes row beneath the video (narrower bars in a 4-up grid) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'clamp(20px, 3vw, 36px)',
              textAlign: 'left',
            }}>
              {[
                'Photorealistic Generation',
                'Casting Time Cut by 95%',
                'Unlimited On-Demand Talent',
                'Story-First Productions',
              ].map((label, i) => (
                <AnimatedBar key={i} label={label} delay={i * 0.4} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SHOWCASE (White, 3D cards)
          ============================================================ */}
      <section
        ref={setRef('showcase')}
        id="showcase"
        className="showcase-section lg:min-h-[1080px]"
        style={{ background: '#000', padding: 'clamp(40px, 6vw, 130px) clamp(20px, 5vw, 50px) clamp(80px, 12vw, 280px)', position: 'relative', overflow: 'hidden' }}
      >

        {/* Desktop-only background image and vignettes. Below lg (<1024px) the
            controls image renders inline beneath the text instead, so it never
            stacks on top of the copy at narrow widths. */}
        <div
          aria-hidden="true"
          className="hidden lg:block controls-desktop-layer"
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: 'url(https://firebasestorage.googleapis.com/v0/b/blue-peak-poc.firebasestorage.app/o/Jason%20Vazquez%2FBackgrounds%2FControls%205.png?alt=media&token=768d992b-83b3-45fb-821d-a2f3299ef7ff)',
            backgroundSize: '72% auto',
            backgroundPosition: '85% 78%',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%), linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 100%)',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%), linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 14%, rgba(0,0,0,1) 100%)',
            WebkitMaskComposite: 'source-in',
            maskComposite: 'intersect',
          }}
        />

        <div
          aria-hidden="true"
          className="hidden lg:block controls-desktop-layer"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'radial-gradient(ellipse 55% 38% at 15% 25%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.78) 22%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          aria-hidden="true"
          className="hidden lg:block controls-desktop-layer"
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'radial-gradient(ellipse 60% 60% at 0% 0%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 25%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '1500px', margin: '0', marginLeft: 'clamp(20px, 12vw, 240px)', position: 'relative', zIndex: 2 }}>

          {/* Text column. Caps at 580px on desktop; on mobile (<lg) it spans
              the available width naturally so paragraphs don't get squeezed. */}
          <div style={{ width: '100%', maxWidth: '580px', textAlign: 'left' }}>
            <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: '#fff', marginBottom: '24px', lineHeight: '1.05' }}>
              Production <span style={{ color: '#ff2d7b' }}>Must-Haves</span>
            </h2>
            <span className="heading-label" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.15em', display: 'inline-block' }}>
              Cameras, Lenses, Lighting. All Built In.
            </span>

            <div style={{ marginTop: 'clamp(28px, 3vw, 40px)' }}>
              <p className="intro-text" style={{ color: 'rgba(255,255,255,0.88)', marginBottom: '20px', fontSize: 'clamp(16px, 1.5vw, 20px)', lineHeight: '1.55' }}>
                Shoot on the cameras you have always dreamed of using. The Arri Alexa LF for cinematic latitude. The RED V-Raptor XL for 8K detail. The Sony VENICE 2 for skin tones that flatter every face. Then pair them with prime, anamorphic, and zoom lenses across every focal length, from intimate 14mm wides to long 200mm portraits.
              </p>
              <p className="intro-text" style={{ color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(16px, 1.5vw, 20px)', lineHeight: '1.55' }}>
                Layer in cinematic lighting and the visual style of your production, then let the AI assistant translate every choice into a precise, scene-by-scene prompt. Every frame in your project speaks the same visual language, with the look and feel of a Hollywood feature.
              </p>
            </div>

            {/* Mobile and tablet: render the controls image inline beneath the
                text. Hidden at lg+ where the bg image takes over. */}
            <img
              src="https://firebasestorage.googleapis.com/v0/b/blue-peak-poc.firebasestorage.app/o/Jason%20Vazquez%2FBackgrounds%2FControls%205.png?alt=media&token=768d992b-83b3-45fb-821d-a2f3299ef7ff"
              alt="Cinema Studio camera, lens, and lighting controls panel"
              draggable={false}
              className="block lg:hidden controls-mobile-img"
              style={{
                width: '100%',
                height: 'auto',
                marginTop: 'clamp(40px, 6vw, 70px)',
                display: 'block',
                userSelect: 'none',
              }}
            />
          </div>

        </div>
      </section>

      {/* ============================================================
          WORKFLOW (Dark, centered numbered steps)
          ============================================================ */}
      <section ref={setRef('workflow')} id="workflow" className="section-dark" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: '#fff', marginBottom: '24px' }}>
            The <span style={{ color: '#ff2d7b' }}>4-Step</span> Method
          </h2>
          <span className="heading-label" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', letterSpacing: '0.15em' }}>
            Write, Generate, Direct, Render
            <span className="divider-line-light" />
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(24px, 3vw, 48px)', marginTop: '80px', textAlign: 'center' }}>
            {[
              { step: '01', title: 'Write', label: 'Script', desc: 'Paste or write your script. Add creative direction to guide the visual tone of every frame.' },
              { step: '02', title: 'Generate', label: 'Shots', desc: 'AI analyzes your script and produces a shot list with scene breakdowns, camera notes, and timing.' },
              { step: '03', title: 'Direct', label: 'Loadout', desc: 'Equip each shot with cinematic options: lens, lighting, color grade, camera movement, and mood.' },
              { step: '04', title: 'Render', label: 'Output', desc: 'Generate frames, interpolate video, add dialogue and audio. Export your finished production.' },
            ].map((item, i) => (
              <div key={i}>
                <span className="heading-display" style={{ fontSize: 'clamp(64px, 8vw, 96px)', color: 'rgba(255,255,255,0.25)', display: 'block', lineHeight: 1 }}>
                  {item.step}
                </span>
                <h3 className="heading-section" style={{ fontSize: '16px', color: '#fff', marginTop: '12px', marginBottom: '4px' }}>
                  {item.title}
                </h3>
                <span className="heading-label" style={{ color: '#ff2d7b', fontSize: '9px', display: 'block', marginBottom: '14px' }}>
                  {item.label}
                </span>
                <p className="body-text" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: '1.8' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          USE CASES (White)
          ============================================================ */}
      <section ref={setRef('use-cases')} id="use-cases" className="section-light" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', overflow: 'visible' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(28px, 4.5vw, 68px)', color: 'var(--text)', marginBottom: '24px', padding: '0 10px' }}>
            Built for <span style={{ color: '#ff2d7b' }}>Every</span> Creator
          </h2>
          <span className="heading-label" style={{ color: 'var(--text-3)', fontSize: '11px', letterSpacing: '0.15em' }}>
            From Concept to Content
            <span className="divider-line" />
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0', marginTop: '80px', textAlign: 'left' }}>
            {[
              { title: 'Product Launch Videos', desc: 'Turn a product brief into a polished launch video with hero shots, feature callouts, and cinematic transitions.' },
              { title: 'Short Films', desc: 'Direct your narrative from script to screen. Build characters, design shots, and render scenes with visual consistency.' },
              { title: 'Social Content', desc: 'Produce scroll-stopping content at scale. Generate variations, test visual approaches, and iterate quickly.' },
              { title: 'Music Videos', desc: 'Sync your visual direction with audio. Build mood boards, design shot sequences, and create frame-by-frame breakdowns.' },
              { title: 'Commercial Spots', desc: 'Pre-visualize commercial concepts before committing to production budgets. Test creative directions affordably.' },
              { title: 'Pitch Decks', desc: 'Show clients exactly what the final product will look like. Generate concept frames and storyboard presentations.' },
            ].map((useCase, i) => (
              <div key={i} style={{ padding: 'clamp(24px, 3vw, 40px)', border: '1px solid var(--border)', transition: 'all 0.5s linear' }}>
                <h3 className="heading-section" style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '14px', letterSpacing: '0' }}>
                  {useCase.title}
                </h3>
                <p className="body-text" style={{ color: 'var(--text-3)', fontSize: '14px', lineHeight: '1.8' }}>
                  {useCase.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA section removed for demo mode (was Sign Up / Get Started).
          Restore from git history when public sign-up returns.
          ============================================================ */}

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer style={{ background: '#000', padding: '50px clamp(20px, 5vw, 50px)', textAlign: 'center' }}>
        <span className="heading-display" style={{ fontSize: '28px', color: '#fff', display: 'block', marginBottom: '16px' }}>
          CS
        </span>
        <span style={{
          fontFamily: 'Montserrat, sans-serif', fontSize: '10px', fontWeight: 600,
          color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' as const,
        }}>
          Cinema Studio &copy; {new Date().getFullYear()} All Rights Reserved.
        </span>
      </footer>

      {/* SCROLL TO TOP */}
      <button onClick={scrollToTop} className={`scroll-top-btn ${showTopBtn ? 'visible' : ''}`} aria-label="Scroll to top">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}
