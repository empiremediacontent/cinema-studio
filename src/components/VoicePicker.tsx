'use client';

import { useState } from 'react';

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  accent: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, professional narrator', gender: 'female', accent: 'American' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, conversational', gender: 'female', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant, authoritative', gender: 'female', accent: 'British' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm, British narrator', gender: 'female', accent: 'British' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, friendly narrator', gender: 'male', accent: 'American' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Deep, cinematic', gender: 'male', accent: 'American' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, conversational', gender: 'male', accent: 'American' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative, British', gender: 'male', accent: 'British' },
];

export default function VoicePicker({
  selectedVoiceId,
  onSelect,
  compact = false,
}: {
  selectedVoiceId?: string;
  onSelect: (voiceId: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = VOICE_OPTIONS.find(v => v.id === selectedVoiceId);

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
                width: '280px',
                maxHeight: '280px',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                paddingTop: '4px',
                paddingBottom: '4px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              {VOICE_OPTIONS.map((voice) => (
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
                        color: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {voice.gender === 'female' ? 'F' : 'M'} / {voice.accent}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', marginTop: '3px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif' }}>
                    {voice.description}
                  </p>
                </button>
              ))}
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
          color: 'rgba(255,255,255,0.6)',
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
        {VOICE_OPTIONS.map((voice) => (
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
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{voice.accent}</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif' }}>{voice.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
