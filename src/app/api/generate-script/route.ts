import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minute timeout for script generation

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * POST /api/generate-script
 * AI writes a full production script from synopsis, creative direction, and target duration.
 * The agent is an expert screenwriter who understands the full downstream pipeline
 * (shots, timing, camera, export) so the script it writes is optimized for storyboarding.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, synopsis, creativeDirection, targetDuration, projectMode } = await request.json();

    if (!projectId || !synopsis?.trim()) {
      return NextResponse.json({ error: 'Project ID and synopsis are required' }, { status: 400 });
    }

    const isAnimation = projectMode === 'animation';

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, script, description, creative_direction')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const duration = Number(targetDuration) || 180;
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = duration % 60;
    const durationLabel = durationSeconds > 0
      ? `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`
      : `${durationMinutes}:00`;

    // Word count estimation: ~2.5 words per second of dialogue/narration
    const estimatedWordCount = Math.round(duration * 2.5);

    const animationContext = isAnimation
      ? `
ANIMATION-SPECIFIC RULES:
- This script is for an ANIMATED piece (motion graphics, 2D/3D animation)
- No live talent is needed; describe characters as animated figures with clear visual traits
- Describe visual transitions that work in animation (morphing, dissolves, graphic wipes)
- Voiceover/narration is critical for animation timing; include generous V.O. lines
- Describe motion graphics elements when useful (text reveals, data visualizations, icon animations)
- Think in terms of what a motion designer needs to build each scene
- Action lines should describe animated movement, not live-action blocking`
      : '';

    const system = `You are an expert screenwriter and production-aware script writer for video content. You write scripts that are specifically designed to be broken down into storyboards for production.

You understand the FULL downstream pipeline:
- Your script will be broken into individual shots by an AI Director
- Each shot gets timing (calculated from dialogue word count: ~1 second per 2.5 words)
- Each shot gets camera direction (shot type, focal length, camera movement)
- The storyboard will be exported as a PPTX for the production crew
${isAnimation ? '- Motion designers will use the script for animation timing reference' : '- The production crew will use the storyboard on set'}

WRITING RULES:
- Write in standard screenplay format with scene headings, action lines, and dialogue
- Use clear scene headings: INT./EXT. LOCATION - TIME
- Keep action lines visual and specific (describe what the camera SEES, not abstract concepts)
- Write dialogue that sounds natural when spoken aloud
- Include parenthetical direction for delivery when important (e.g., (whispering), (excited))
- Include brief narration/voiceover when appropriate, marked as V.O.
- Pace the script so it fills approximately ${durationLabel} of screen time (~${estimatedWordCount} words total)
- Break the content into clear visual scenes that can become distinct shots
- Think about shot variety: establish locations before going into close-ups
- Include moments of visual storytelling (no dialogue) for pacing
- Do NOT include camera directions in the script (the AI Director handles that)
- Do NOT include shot numbers or technical annotations
${animationContext}

IMPORTANT: Return ONLY the script text. No preamble, no explanation, no markdown formatting, no code fences. Just the script.`;

    const userPrompt = `Write a production-ready script based on the following:

SYNOPSIS:
${synopsis.trim()}

${creativeDirection ? `CREATIVE DIRECTION:\n${creativeDirection.trim()}\n` : ''}TARGET DURATION: ${durationLabel} (${duration} seconds, approximately ${estimatedWordCount} words)

Write the complete script now.`;

    // Call Claude API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text();
        console.error('Claude API error:', res.status, errBody.substring(0, 300));
        return NextResponse.json(
          { error: `Claude API returned ${res.status}: ${errBody.substring(0, 200)}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
      const generatedScript = textBlock?.text?.trim() || '';

      if (!generatedScript) {
        return NextResponse.json(
          { error: 'Claude returned an empty response. Try again.' },
          { status: 502 }
        );
      }

      // Save the generated script to the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          script: generatedScript,
          description: synopsis.trim(),
          creative_direction: creativeDirection?.trim() || null,
          target_duration_seconds: duration,
          project_mode: isAnimation ? 'animation' : 'live_action',
        })
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to save script:', updateError.message);
        return NextResponse.json(
          { error: `Script generated but failed to save: ${updateError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ script: generatedScript });

    } catch (fetchErr) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      if (msg.includes('aborted')) {
        return NextResponse.json(
          { error: 'Script generation timed out. Try a shorter duration or simpler synopsis.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: `Claude request failed: ${msg.substring(0, 200)}` },
        { status: 502 }
      );
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Unexpected error: ${msg.substring(0, 300)}` },
      { status: 500 }
    );
  }
}
