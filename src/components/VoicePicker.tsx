'use client';

import { useState } from 'react';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent: string;
  tone: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // Female voices
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, professional narrator', gender: 'female', accent: 'American', tone: 'professional' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, conversational', gender: 'female', accent: 'American', tone: 'warm' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant, authoritative', gender: 'female', accent: 'British', tone: 'authoritative' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm, British narrator', gender: 'female', accent: 'British', tone: 'warm' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Emily', description: 'Young, energetic', gender: 'female', accent: 'American', tone: 'energetic' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Dramatic, storytelling', gender: 'female', accent: 'American', tone: 'dramatic' },
  { id: 'z9fAnlkpzviPz146aGWa', name: 'Lucia', description: 'Smooth, Latin inflection', gender: 'female', accent: 'Spanish', tone: 'smooth' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', description: 'Crisp, news anchor', gender: 'female', accent: 'American', tone: 'crisp' },
  // Male voices
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, friendly narrator', gender: 'male', accent: 'American', tone: 'warm' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Deep, cinematic', gender: 'male', accent: 'American', tone: 'cinematic' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, conversational', gender: 'male', accent: 'American', tone: 'conversational' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative, British', gender: 'male', accent: 'British', tone: 'authoritative' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Rugged, storyteller', gender: 'male', accent: 'American', tone: 'dramatic' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', description: 'Strong, documentary', gender: 'male', accent: 'British', tone: 'professional' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Smooth, deep bass', gender: 'male', accent: 'American', tone: 'smooth' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Irish lilt, warm', gender: 'male', accent: 'Irish', tone: 'warm' },
];

export const ACCENT_OPTIONS = ['All', 'American', 'British', 'Irish', 'Spanish'];
export const TONE_OPTIONS = ['All', 'warm', 'professional', 'authoritative', 'cinematic', 'dramatic', 'conversational', 'energetic', 'smooth', 'crisp'];
export const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi'];

export interface VoiceSettings {
  voiceId: string;
  speed: number; // 0.5 to 2.0
  language: string;
  translate: boolean;
}

export default function VoicePicker({
  selectedVoiceId,
  onSelect,
  compact = false,
  speed = 1.0,
  onSpeedChange,
  language = 'English',
  onLanguageChange,
}: {
  selectedVoiceId?: string;
  onSelect: (voiceId: string) => void;
  compact?: boolean;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
  language?: string;
  onLanguageChange?: (language: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [accentFilter, setAccentFilter] = useState('All');
  const selected = VOICE_OPTIONS.find(v => v.id === selectedVoiceId);

  const filteredVoices = VOICE_OPTIONS.filter(v => {
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    if (accentFilter !== 'All' && v.accent !== accentFilter) return false;
    return true;
  });

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingTop: '5px',
            paddingBottom: '5px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: selected ? '#fff' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '140px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
            {selected ? selected.name : 'Choose Voice'}
          </span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 40,
              }}
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                marginTop: '4px',
                zIndex: 50,
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {/* Filters */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => setGenderFilter(g)} style={{
                    padding: '3px 8px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    background: genderFilter === g ? 'rgba(255,45,123,0.15)' : 'transparent',
                    color: genderFilter === g ? '#ff2d7b' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${genderFilter === g ? 'rgba(255,45,123,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                  }}>{g}</button>
                ))}
                <select value={accentFilter} onChange={e => setAccentFilter(e.target.value)} style={{
                  padding: '3px 6px', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
                  background: '#111', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', outline: 'none',
                }}>
                  {ACCENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {/* Speed control */}
              {onSpeedChange && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speed</span>
                  <input type="range" min="0.5" max="2.0" step="0.1" value={speed}
                    onChange={e => onSpeedChange(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#ff2d7b', height: '4px' }} />
                  <span style={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: '#ff2d7b', minWidth: '32px', textAlign: 'right' }}>{speed.toFixed(1)}x</span>
                </div>
              )}
              {/* Language */}
              {onLanguageChange && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lang</span>
                  <select value={language} onChange={e => onLanguageChange(e.target.value)} style={{
                    flex: 1, padding: '3px 6px', fontSize: '10px', fontFamily: 'Raleway, sans-serif',
                    background: '#111', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', outline: 'none',
                  }}>
                    {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              {/* Voice list */}
              <div style={{ paddingTop: '4px', paddingBottom: '4px' }}>
              {filteredVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => { onSelect(voice.id); setOpen(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    background: selected && voice.id === selected.id ? 'rgba(255,45,123,0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!(selected && voice.id === selected.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selected && voice.id === selected.id ? 'rgba(255,45,123,0.08)' : 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', fontFamily: 'Raleway, sans-serif' }}>{voice.name}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        paddingLeft: '6px',
                        paddingRight: '6px',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {voice.gender === 'female' ? 'F' : 'M'} / {voice.accent}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', marginTop: '3px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif' }}>
                    {voice.description}
                  </p>
                </button>
              ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        Choose Voice
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '8px',
        }}
      >
        {filteredVoices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            style={{
              textAlign: 'left',
              padding: '12px',
              border: voice.id === selectedVoiceId ? '1px solid #ff2d7b' : '1px solid rgba(255,255,255,0.08)',
              background: voice.id === selectedVoiceId ? 'rgba(255,45,123,0.05)' : '#111',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', fontFamily: 'Raleway, sans-serif' }}>{voice.name}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{voice.accent}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif' }}>{voice.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
