import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadMediaBytes } from '@/lib/supabase/storage';

export const runtime = 'edge';

// ElevenLabs voice synthesis → upload to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shotId, text, voiceId, type } = await request.json();
    // type: 'dialogue' | 'narration'
    // voiceId: ElevenLabs voice ID (optional, uses default if not provided)

    if (!shotId || !text?.trim()) {
      return NextResponse.json({ error: 'Shot ID and text are required' }, { status: 400 });
    }

    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id, project_id, user_id')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json({ error: 'Voice synthesis service not configured. Set ELEVENLABS_API_KEY.' }, { status: 500 });
    }

    // Log generation
    const { data: generation } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        project_id: shot.project_id,
        shot_id: shotId,
        model: 'elevenlabs',
        generation_type: 'voice',
        prompt: text.substring(0, 2000),
        status: 'processing',
        metadata: { voice_id: voiceId, type },
      })
      .select()
      .single();

    // Extract just the spoken text (remove "Presenter says, " prefix)
    let cleanText = text.trim();
    const prefixMatch = cleanText.match(/^(?:Presenter|Narrator|Host|Speaker)\s+says?,?\s*['"]/i);
    if (prefixMatch) {
      cleanText = cleanText.substring(prefixMatch[0].length);
      // Remove trailing quote
      if (cleanText.endsWith("'") || cleanText.endsWith('"')) {
        cleanText = cleanText.slice(0, -1);
      }
    }

    // Default voice — Rachel (professional female narrator)
    const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';

    const elevenLabsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsRes.ok) {
      const errBody = await elevenLabsRes.text();
      if (generation) {
        await supabase.from('generations').update({
          status: 'failed',
          error_message: errBody.substring(0, 500),
        }).eq('id', generation.id);
      }
      return NextResponse.json({
        error: `Voice generation failed (${elevenLabsRes.status}): ${errBody.substring(0, 200)}`,
      }, { status: 502 });
    }

    // ElevenLabs returns raw audio bytes — upload to Supabase Storage
    const audioBuffer = await elevenLabsRes.arrayBuffer();

    let audioUrl: string | null = null;

    // Try uploading to Supabase Storage for persistent URL
    audioUrl = await uploadMediaBytes(audioBuffer, {
      userId: user.id,
      projectId: shot.project_id,
      shotId: shotId,
      type: 'audio',
      contentType: 'audio/mpeg',
    });

    // Fallback: base64 data URL if Storage upload fails
    if (!audioUrl) {
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(audioBuffer))
      );
      audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    }

    // Update generation record with full URL
    if (generation) {
      await supabase.from('generations').update({
        status: 'completed',
        result_url: audioUrl,
        metadata: {
          voice_id: selectedVoiceId,
          type,
          duration_estimate_ms: cleanText.length * 65,
          persisted: !audioUrl.startsWith('data:'),
        },
      }).eq('id', generation.id);
    }

    // Update shot metadata with audio URL
    const { data: currentShot } = await supabase
      .from('shots')
      .select('metadata')
      .eq('id', shotId)
      .single();

    const currentMeta = (currentShot?.metadata || {}) as Record<string, unknown>;
    await supabase.from('shots').update({
      metadata: {
        ...currentMeta,
        [`${type}_audio_url`]: audioUrl,
      },
    }).eq('id', shotId).eq('user_id', user.id);

    return NextResponse.json({
      audio_url: audioUrl,
      type,
      generation_id: generation?.id,
      text_length: cleanText.length,
      persisted: !audioUrl.startsWith('data:'),
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
