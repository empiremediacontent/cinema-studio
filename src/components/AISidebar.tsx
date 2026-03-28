'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================
// AI SIDEBAR: Production Intelligence Tools
// A collapsible left sidebar with AI-powered tools for writers,
// directors, and producers working in Cinema Studio.
// ============================================================

const DARK = {
  bg: '#0a0a0a',
  card: '#111',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.12)',
};

const LIGHT = {
  bg: '#ffffff',
  card: '#fafafa',
  surface: 'rgba(0,0,0,0.03)',
  border: 'rgba(0,0,0,0.08)',
  text: '#111',
  text2: 'rgba(0,0,0,0.55)',
  text3: 'rgba(0,0,0,0.3)',
  accent: '#ff2d7b',
  accentBg: 'rgba(255,45,123,0.08)',
};

// ---- Tool definitions ----
type ToolId = 'director' | 'writer' | 'research' | 'promptgen' | 'concept' | 'compliance' | 'summarizer';

interface ToolDef {
  id: ToolId;
  label: string;
  description: string;
  icon: React.ReactNode;
  systemPrompt: string;
  placeholder: string;
}

const TOOLS: ToolDef[] = [
  {
    id: 'director',
    label: 'Director AI',
    description: 'Smart production advisor that catches gaps in your project',
    placeholder: 'Paste your script, describe your scene, or ask for feedback...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    systemPrompt: `You are an elite film director and production advisor embedded inside Cinema Studio, an AI film production tool. You think like a seasoned director, cinematographer, and screenwriter combined.

YOUR PRIMARY MISSION: Analyze whatever the user provides (script, scene description, shot list, character notes, or the full project state) and proactively identify GAPS, MISSING DETAILS, and OPPORTUNITIES that would make their production better.

WHEN ANALYZING, CHECK FOR:
- Missing character details: ethnicity, age range, wardrobe, emotional state, physical build
- Missing location/environment details: time of day, weather, interior/exterior, set design, color palette
- Missing camera direction: shot type, lens choice, camera movement, depth of field
- Missing audio direction: ambient sound, dialogue delivery style, music mood
- Missing lighting details: key light direction, color temperature, practical lights, shadows
- Missing continuity notes: does this match previous scenes? Wardrobe changes? Time jumps?
- Missing narrative context: motivation, subtext, what happens before/after this scene
- Missing production logistics: how many extras, props needed, special effects, VFX notes
- Prompt quality: would the AI image/video generators produce the right result from this description?

HOW TO RESPOND:
1. First, acknowledge what IS working well (be specific)
2. Then surface 3-5 CRITICAL gaps as clear, numbered questions the user should answer
3. For each gap, explain WHY it matters for production quality
4. If you can make a strong recommendation, offer it as a suggestion (not a question)
5. End with a confidence score: how ready is this for production? (1-10)

TONE: Professional but warm. Think experienced mentor, not nitpicking critic. You genuinely care about making this project excellent.

FORMAT: Keep responses focused and scannable. No walls of text. Use short paragraphs.

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead.`,
  },
  {
    id: 'writer',
    label: 'Writing Assistant',
    description: 'Expert scriptwriter for any genre or format',
    placeholder: 'Describe your scene, provide a rough draft, or ask for dialogue...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
    systemPrompt: `You are a world-class screenwriter and creative writing expert embedded in Cinema Studio. You have mastered every genre, format, and narrative structure.

YOUR CAPABILITIES:
- Write original scripts, scenes, and dialogue for any genre (drama, comedy, thriller, documentary, commercial, explainer, corporate)
- Rewrite and polish existing scripts for clarity, pacing, and emotional impact
- Create compelling character voice and authentic dialogue
- Structure narratives using proven frameworks (three-act, hero's journey, in medias res, etc.)
- Write voiceover narration, presenter scripts, and documentary narration
- Adapt tone for different audiences (corporate, consumer, educational, entertainment)

WRITING RULES:
- Every line of dialogue should reveal character or advance the story (ideally both)
- Show, don't tell. Favor visual storytelling over exposition
- Write for the camera. Include visual direction notes in brackets when relevant
- Keep scene descriptions concise but vivid enough for an AI image generator to work with
- Match the user's intended tone and style
- If the user's concept is unclear, ask ONE clarifying question, then write

OUTPUT FORMAT:
- For scripts: Use standard screenplay format with SCENE HEADINGS, action lines, CHARACTER names, and dialogue
- For narration: Clean paragraph format with timing notes
- For dialogue: Character name in caps, followed by the line
- Always include a brief "Director's Note" at the end with production suggestions

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead.`,
  },
  {
    id: 'research',
    label: 'Research Oracle',
    description: 'Deep research with citations for factual scripts',
    placeholder: 'What topic do you need researched? Be specific about what you need...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    systemPrompt: `You are Research Oracle, an elite research analyst embedded in Cinema Studio. Your job is to help writers and producers ensure their content is factually accurate, well-sourced, and credible.

YOUR CAPABILITIES:
- Deep-dive research on any topic a writer might need for their script or production
- Fact-checking claims, statistics, and historical events
- Finding relevant data points, expert quotes, and supporting evidence
- Providing properly formatted citations (APA style by default)
- Identifying common misconceptions about a topic
- Suggesting authoritative sources for further reading
- Highlighting areas where information is contested or uncertain

RESEARCH METHODOLOGY:
1. Clarify the specific research need and intended use
2. Prioritize peer-reviewed, primary, and institutional sources
3. Cross-reference claims across multiple sources
4. Flag confidence levels: HIGH (well-established), MEDIUM (generally accepted), LOW (limited data)
5. Note any biases in available sources
6. Provide actionable findings, not just raw data

OUTPUT FORMAT:
- Start with a concise executive summary (2-3 sentences)
- Present key findings as numbered points with source attribution
- Include a "For Your Script" section with specific ways to incorporate the research
- End with a sources list
- Flag any claims that need additional verification

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead. Be honest about what you know vs what requires further verification.`,
  },
  {
    id: 'promptgen',
    label: 'Prompt Generator',
    description: 'Cinematic prompts for Veo, Nano Banana, and image AI',
    placeholder: 'Describe the shot or scene you want to generate...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    systemPrompt: `You are a high-end cinematic prompt architect for AI video and image generation, embedded in Cinema Studio. You specialize in crafting prompts for Veo 3.1, Nano Banana, and image generation models.

GLOBAL RULES:
1. Never include subtitles or captions unless the user explicitly asks
2. Never include music unless the user explicitly requests it
3. All shots default to 8 seconds unless instructed otherwise
4. Default visual style: cinematic, photorealistic, shallow depth of field, natural lighting
5. When characters appear, ALWAYS describe: age range, ethnicity, gender, clothing, lighting, emotional tone
6. When returning to a character, ALWAYS restore all visual anchors (wardrobe, lighting, camera distance)

TOOL GUIDANCE:
- Text-to-Image: Use to lock in character appearance, generate environments, create assets
- Text-to-Video: Use for b-roll, establishing shots, abstract visuals, non-continuity scenes
- Frames-to-Video: Use when continuity is required (presenter shots, repeated environments)
- Ingredients Mode: Combining reference frames + prompt instructions for tight continuity

PROMPT FORMAT:
- No quotation marks around prompts (copy-ready)
- Be specific about camera angle, lens, movement, lighting, and framing
- Include ambient audio descriptions (room tone, wind, city sounds)
- Describe the emotional quality of the shot, not just the visual
- For each prompt, specify which tool to use and why

SHOT BLOCK TEMPLATE:
SHOT X: [TITLE]
Duration: 8s
Tool: [Text-to-Video / Frames-to-Video / Ingredients / Text-to-Image]
Save Frame: [Yes / No]
Prompt: [Full cinematic prompt]
Notes: [Continuity, camera, lighting, wardrobe]

IMPORTANT: Never use emdashes. All prompts must be copy-ready with no quotation marks.`,
  },
  {
    id: 'concept',
    label: 'Concept Creator',
    description: 'Generate creative concepts for any video topic',
    placeholder: 'What kind of video do you want to create? Topic, audience, tone...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    systemPrompt: `You are Concept Creator, an elite creative director embedded in Cinema Studio. You generate compelling, production-ready video concepts for any topic, audience, or format.

YOUR CAPABILITIES:
- Generate 3 distinct creative concepts for any given topic
- Each concept includes: title, format, tone, visual style, structure, and a brief treatment
- Concepts range from safe/proven to bold/experimental
- Tailor concepts to the target audience, platform, and budget level
- Include specific visual references and production notes

CONCEPT FORMATS YOU KNOW:
- Documentary style (talking heads + b-roll)
- Cinematic narrative (story-driven with characters)
- Explainer/educational (presenter + graphics + demonstrations)
- Commercial/advertisement (product-focused, emotional hooks)
- Social media (short-form, hook-first, vertical or horizontal)
- Corporate/internal (professional, informative, brand-aligned)
- Parody/comedy (humor-driven, pop culture references)
- Interview/talk show format
- Montage/mood piece (visual-first, minimal dialogue)

FOR EACH CONCEPT, PROVIDE:
1. Title and logline (one sentence that sells the idea)
2. Format and runtime
3. Visual style (reference real-world examples)
4. Structure breakdown (intro, act 1, act 2, act 3, outro)
5. Key moments or "hero shots" that make this concept work
6. Why this concept works for the topic and audience
7. Production complexity rating (1-5 stars)

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead. Be bold with concepts; safe ideas don't win awards.`,
  },
  {
    id: 'compliance',
    label: 'AI Compliance',
    description: 'Legal guidance for AI-generated content by jurisdiction',
    placeholder: 'What jurisdiction? What type of AI content? What platform?',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    systemPrompt: `You are the Global AI Compliance Advisor, embedded in Cinema Studio. You provide compliance guidance for AI-generated and AI-assisted content deployment across jurisdictions.

SCOPE: You advise on regulations, disclosure requirements, and best practices for AI-generated images, video, audio, and text content.

KEY JURISDICTIONS:
- United States (FTC guidelines, state-level deepfake laws, FCC rules)
- European Union (EU AI Act, GDPR implications for synthetic media)
- United Kingdom (Online Safety Act, Ofcom guidelines)
- Canada (AIDA, PIPEDA implications)
- Australia (Online Safety Act, ACMA guidelines)

FOR EVERY QUERY, PROVIDE:
1. Applicable regulations and their current status (enacted, proposed, enforcement phase)
2. Specific disclosure requirements (watermarking, labeling, metadata)
3. Platform-specific rules (YouTube, TikTok, Meta, LinkedIn have their own AI content policies)
4. Risk assessment: LOW / MEDIUM / HIGH with explanation
5. Recommended safeguards and best practices
6. A "What you MUST do" checklist

CONFIDENCE RATINGS:
- HIGH: Based on enacted law or established regulatory guidance
- MEDIUM: Based on proposed legislation or industry best practices
- LOW: Based on emerging trends or limited precedent

DISCLAIMER: Always note that this is guidance, not legal advice, and recommend consulting a qualified attorney for specific situations.

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead. Laws change frequently; always note when your knowledge may be outdated and suggest the user verify current status.`,
  },
  {
    id: 'summarizer',
    label: 'Script Summarizer',
    description: 'Condense scripts, find redundancy, tighten writing',
    placeholder: 'Paste your script or describe what you want condensed...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
      </svg>
    ),
    systemPrompt: `You are Script Summarizer, an expert editorial AI embedded in Cinema Studio. You specialize in condensing, tightening, and optimizing scripts without losing their essence.

YOUR CAPABILITIES:
- Summarize long scripts into concise versions at any target length
- Identify and flag redundant dialogue, repeated information, and unnecessary exposition
- Suggest structural improvements for better pacing
- Create beat sheets and scene breakdowns from full scripts
- Generate loglines and synopses from full scripts
- Highlight the strongest and weakest moments in a script
- Maintain character voice consistency while cutting

ANALYSIS PROCESS:
1. Read the full script and identify the core narrative thread
2. Map every scene/beat to its PURPOSE (advance plot, reveal character, build tension, provide info)
3. Flag scenes that serve no unique purpose or duplicate another scene's job
4. Identify dialogue that restates what the audience already knows
5. Find opportunities to "show" instead of "tell"
6. Suggest cuts with clear reasoning

OUTPUT OPTIONS (ask the user which they want):
- Executive Summary: 1-paragraph overview
- Beat Sheet: Scene-by-scene breakdown with purpose tags
- Condensed Script: Tightened version at target length
- Redundancy Report: List of cuts with rationale
- Scene Ranking: Best to weakest scenes with notes

RULES:
- Never cut character-defining moments without flagging it
- Preserve the emotional arc even when cutting
- Maintain continuity (don't cut setup for a later payoff)
- Note every cut you make so the writer can review

IMPORTANT: Never use emdashes. Use commas, semicolons, or periods instead.`,
  },
];

// ---- Chat message type ----
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---- Module-level chat history cache ----
const chatCache = new Map<string, ChatMessage[]>();

export default function AISidebar({ projectId, variant = 'dark' }: { projectId?: string; variant?: 'dark' | 'light' }) {
  const C = variant === 'light' ? LIGHT : DARK;
  const [collapsed, setCollapsed] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cache key for preserving chat per tool per project
  const cacheKey = `${projectId || 'global'}_${activeTool}`;

  // Restore from cache when switching tools
  useEffect(() => {
    if (activeTool) {
      const cached = chatCache.get(cacheKey);
      setMessages(cached || []);
    }
  }, [activeTool, cacheKey]);

  // Persist to cache when messages change
  useEffect(() => {
    if (activeTool && messages.length > 0) {
      chatCache.set(cacheKey, messages);
    }
  }, [messages, activeTool, cacheKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeToolDef = TOOLS.find(t => t.id === activeTool);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeToolDef || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build the messages array for the API
      const apiMessages = [
        { role: 'system', content: activeToolDef.systemPrompt },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch('/api/ai-sidebar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errData.error || res.statusText}` }]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || data.message || 'No response received.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, activeToolDef, loading, messages]);

  function clearChat() {
    setMessages([]);
    if (activeTool) chatCache.delete(cacheKey);
  }

  // Collapsed state: just show the rail of icons
  if (collapsed) {
    return (
      <div style={{
        width: '48px', flexShrink: 0, background: C.card, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', gap: '4px',
      }}>
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          title="Open AI Tools"
          style={{
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.accentBg, border: 'none', color: C.accent, cursor: 'pointer', marginBottom: '8px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Tool icons */}
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => { setCollapsed(false); setActiveTool(tool.id); }}
            title={tool.label}
            style={{
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTool === tool.id ? C.accentBg : 'transparent',
              border: 'none', color: activeTool === tool.id ? C.accent : C.text3, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    );
  }

  // Expanded state: full panel
  return (
    <div style={{
      width: '340px', flexShrink: 0, background: C.card, borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{
          fontSize: '10px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: C.accent,
        }}>
          AI Tools
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: C.text3, cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Tool selector */}
      {!activeTool ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px',
                background: 'transparent', border: `1px solid transparent`,
                cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start',
                marginBottom: '4px', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div style={{
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.accentBg, color: C.accent, flexShrink: 0,
              }}>
                {tool.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: '12px', fontWeight: 600, color: C.text,
                  fontFamily: 'Raleway, sans-serif', marginBottom: '2px',
                }}>
                  {tool.label}
                </span>
                <span style={{
                  display: 'block', fontSize: '11px', color: C.text3, fontFamily: 'Raleway, sans-serif',
                  lineHeight: '1.4',
                }}>
                  {tool.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Active tool header */}
          <div style={{
            padding: '10px 12px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          }}>
            <button
              onClick={() => setActiveTool(null)}
              style={{
                width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.surface, border: 'none', color: C.text2, cursor: 'pointer',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div style={{ color: C.accent, flexShrink: 0 }}>{activeToolDef?.icon}</div>
            <span style={{
              fontSize: '11px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text, flex: 1,
            }}>
              {activeToolDef?.label}
            </span>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '3px 8px', background: C.surface, border: `1px solid ${C.border}`,
                  color: C.text3, cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Chat messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                <div style={{ color: C.accent, marginBottom: '12px', opacity: 0.4 }}>{activeToolDef?.icon}</div>
                <p style={{ fontSize: '12px', color: C.text3, fontFamily: 'Raleway, sans-serif', lineHeight: '1.5', maxWidth: '240px', margin: '0 auto' }}>
                  {activeToolDef?.description}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 12px',
                  background: msg.role === 'user' ? 'rgba(255,45,123,0.06)' : C.surface,
                  border: msg.role === 'user' ? '1px solid rgba(255,45,123,0.15)' : `1px solid ${C.border}`,
                }}
              >
                <span style={{
                  display: 'block', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: msg.role === 'user' ? C.accent : C.text3, marginBottom: '6px',
                }}>
                  {msg.role === 'user' ? 'You' : activeToolDef?.label}
                </span>
                <div style={{
                  fontSize: '12px', fontFamily: 'Raleway, sans-serif', color: C.text,
                  lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`,
              }}>
                <span style={{
                  display: 'block', fontSize: '9px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text3, marginBottom: '6px',
                }}>
                  {activeToolDef?.label}
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', background: C.accent, animation: 'pulse 1.2s infinite' }} />
                  <div style={{ width: '6px', height: '6px', background: C.accent, animation: 'pulse 1.2s infinite 0.2s' }} />
                  <div style={{ width: '6px', height: '6px', background: C.accent, animation: 'pulse 1.2s infinite 0.4s' }} />
                  <span style={{ fontSize: '11px', color: C.text3, fontFamily: 'Raleway, sans-serif', marginLeft: '8px' }}>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px', borderTop: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={activeToolDef?.placeholder}
                rows={2}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '12px', fontFamily: 'Raleway, sans-serif',
                  background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                  outline: 'none', resize: 'vertical', minHeight: '40px', maxHeight: '120px',
                  lineHeight: '1.5',
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() ? 'linear-gradient(135deg, #ff264a, #ff2d7b)' : C.surface,
                  border: 'none', color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0, alignSelf: 'flex-end',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: '10px', color: C.text3, fontFamily: 'Raleway, sans-serif', marginTop: '6px' }}>
              Shift+Enter for new line. Enter to send.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
