'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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

        {/* Desktop nav links */}
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
          <Link href="/login" className="heading-label" style={{
            fontSize: '10px', letterSpacing: '0.10em', transition: 'color 0.4s ease',
            color: scrolled ? 'var(--accent)' : '#ff2d7b',
          }}>
            Sign In
          </Link>
        </div>

        {/* Mobile: just sign in link */}
        <div className="md:hidden">
          <Link href="/login" className="heading-label" style={{
            fontSize: '10px', color: scrolled ? 'var(--accent)' : '#ff2d7b',
          }}>
            Sign In
          </Link>
        </div>
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

          <Link href="/login" className="btn-wext" style={{ marginBottom: 'clamp(40px, 6vh, 80px)' }}>
            Get Started
          </Link>
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
      <section ref={setRef('about')} id="about" className="section-light" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: 'var(--text)', marginBottom: '24px' }}>
            Cinema <span style={{ color: '#ff2d7b' }}>Studio</span>
          </h2>
          <span className="heading-label" style={{ color: 'var(--text-3)', fontSize: '11px', letterSpacing: '0.15em' }}>
            A Fully Integrated Production Pipeline
            <span className="divider-line" />
          </span>

          <div style={{ maxWidth: '800px', margin: '50px auto 0' }}>
            <p className="intro-text" style={{ color: 'var(--text-2)', marginBottom: '24px', fontSize: 'clamp(16px, 1.6vw, 21px)' }}>
              Cinema Studio replaces the fragmented workflow of scripts, storyboards, shot lists, and render queues with a single, unified interface.
            </p>
            <p className="body-text" style={{ color: 'var(--text-3)', fontSize: '15px' }}>
              From the first line of dialogue to the final rendered frame,
              every step of production happens in one place. No switching tools.
              No exporting between apps. No lost context.
            </p>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 'clamp(40px, 8vw, 120px)', marginTop: '70px', paddingTop: '50px',
            borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            {[
              { number: '6', label: 'Pipeline Stages' },
              { number: '251', label: 'Cinematic Options' },
              { number: '1', label: 'Interface' },
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <span className="heading-display" style={{ fontSize: 'clamp(40px, 5vw, 64px)', color: 'var(--gray-200)', display: 'block', lineHeight: 1 }}>
                  {stat.number}
                </span>
                <span className="heading-label" style={{ color: 'var(--text-3)', fontSize: '10px', marginTop: '8px', display: 'block', letterSpacing: '0.15em' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES (Dark) - animated bars
          ============================================================ */}
      <section ref={setRef('features')} id="features" className="section-dark" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 5vw, 72px)', color: '#fff', marginBottom: '24px' }}>
            Why <span style={{ color: '#ff2d7b' }}>Choose</span> Us?
          </h2>
          <span className="heading-label" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.15em' }}>
            Built for Creators
            <span className="divider-line-light" />
          </span>

          <div style={{ display: 'flex', gap: '0', marginTop: '80px', textAlign: 'left', flexWrap: 'wrap' }}>
            {/* Left visual */}
            <div style={{
              flex: '1 1 300px', minHeight: '400px',
              background: 'linear-gradient(135deg, #0a0a0a, #1a0030)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-radial-gradient(rgba(255,255,255,0.02) 1px, transparent 2px)', backgroundSize: '3px 3px' }} />
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '40px' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <p className="heading-display" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.1)', marginTop: '20px' }}>
                  Production
                </p>
              </div>
            </div>

            {/* Right: animated progress bars */}
            <div style={{ flex: '1 1 300px', padding: 'clamp(24px, 4vw, 50px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '28px' }}>
              {[
                'Script Analysis Engine',
                'AI Shot Generation',
                'Cinematic Direction System',
                'Character Consistency',
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
      <section ref={setRef('showcase')} id="showcase" className="section-light" style={{ padding: 'clamp(60px, 10vw, 140px) clamp(20px, 5vw, 50px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', overflow: 'visible' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(28px, 4.5vw, 68px)', color: 'var(--text)', marginBottom: '24px', padding: '0 10px' }}>
            Production <span style={{ color: '#ff2d7b' }}>Must-Haves</span>
          </h2>
          <span className="heading-label" style={{ color: 'var(--text-3)', fontSize: '11px', letterSpacing: '0.15em' }}>
            Take Your Pick
            <span className="divider-line" />
          </span>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 2vw, 32px)', marginTop: '80px', flexWrap: 'wrap' }}>
            {[
              { title: 'Script Editor', subtitle: 'Write', gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)', icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              )},
              { title: 'Actor Library', subtitle: 'Cast', gradient: 'linear-gradient(135deg, #2d1b3d, #1a1a2e)', icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              )},
              { title: 'Cinematography', subtitle: 'Direct', gradient: 'linear-gradient(135deg, #1a1a2e, #0f3460)', icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              )},
              { title: 'Timeline', subtitle: 'Arrange', gradient: 'linear-gradient(135deg, #3d1b2e, #1a1a2e)', icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="6" x2="22" y2="6" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="18" x2="22" y2="18" />
                  <rect x="4" y="4" width="8" height="4" rx="1" fill="rgba(255,255,255,0.15)" />
                  <rect x="10" y="10" width="6" height="4" rx="1" fill="rgba(255,255,255,0.15)" />
                </svg>
              )},
            ].map((card, i) => (
              <div key={i} className="card-3d-wrapper">
                <div className="card-3d" style={{ background: card.gradient }}>
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    </div>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>CS</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {card.icon}
                    <span className="heading-display" style={{ fontSize: 'clamp(14px, 1.5vw, 20px)', color: '#fff', marginTop: '24px' }}>
                      {card.title}
                    </span>
                  </div>
                  <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="heading-label" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>{card.subtitle}</span>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 900, color: 'rgba(255,255,255,0.06)' }}>CS</span>
                  </div>
                </div>
              </div>
            ))}
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
          CTA (Dark)
          ============================================================ */}
      <section style={{ position: 'relative', padding: 'clamp(80px, 12vw, 160px) clamp(20px, 5vw, 50px)', textAlign: 'center', overflow: 'hidden', background: '#000' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #000 0%, #2d0015 30%, #000 60%, #1a0033 80%, #000 100%)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

        <div style={{ position: 'relative', zIndex: 5, maxWidth: '700px', margin: '0 auto' }}>
          <h2 className="heading-display" style={{ fontSize: 'clamp(32px, 6vw, 90px)', color: '#fff', marginBottom: '24px' }}>
            <span style={{ color: '#ff2d7b' }}>Start</span> Creating
          </h2>
          <span className="heading-label" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', letterSpacing: '0.15em' }}>
            Style is Everything
            <span className="divider-line-light" />
          </span>

          <p className="body-text" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', maxWidth: '400px', margin: '40px auto 50px' }}>
            Sign up for free and bring your first production
            from script to screen.
          </p>

          <Link href="/login" className="btn-wext-accent btn-wext">
            Get Started
          </Link>
        </div>
      </section>

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
