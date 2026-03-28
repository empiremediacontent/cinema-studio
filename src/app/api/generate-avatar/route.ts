import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// HeyGen avatar video generation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shotId, text, avatarId, voiceId } = await request.json();

    if (!shotId || !text?.trim()) {
      return NextResponse.json({ error: 'Shot ID and dialogue text are required' }, { status: 400 });
    }

    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id, project_id, user_id, metadata')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    const heygenKey = process.env.HEYGEN_API_KEY;
    if (!heygenKey) {
      return NextResponse.json({ error: 'Avatar service not configured. Set HEYGEN_API_KEY.' }, { status: 500 });
    }

    // Log generation
    const { data: generation } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        project_id: shot.project_id,
        shot_id: shotId,
        model: 'heygen',
        generation_type: 'avatar',
        prompt: text.substring(0, 2000),
        status: 'processing',
        metadata: { avatar_id: avatarId, voice_id: voiceId },
      })
      .select()
      .single();

    // Clean the spoken text
    let cleanText = text.trim();
    const prefixMatch = cleanText.match(/^(?:Presenter|Narrator|Host|Speaker)\s+says?,?\s*['"]/i);
    if (prefixMatch) {
      cleanText = cleanText.substring(prefixMatch[0].length);
      if (cleanText.endsWith("'") || cleanText.endsWith('"')) {
        cleanText = cleanText.slice(0, -1);
      }
    }

    // HeyGen API v2 — generate video
    const heygenRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId || 'default',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: cleanText,
              voice_id: voiceId || undefined,
            },
            background: {
              type: 'color',
              value: '#000000',
            },
          },
        ],
        dimension: {
          width: 1920,
          height: 1080,
        },
        aspect_ratio: '16:9',
      }),
    });

    if (!heygenRes.ok) {
      const errBody = await heygenRes.text();
      if (generation) {
        await supabase.from('generations').update({
          status: 'failed',
          error_message: errBody.substring(0, 500),
        }).eq('id', generation.id);
      }
      return NextResponse.json({
        error: `Avatar generation failed (${heygenRes.status}): ${errBody.substring(0, 200)}`,
      }, { status: 502 });
    }

    const result = await heygenRes.json();
    const videoId = result.data?.video_id;

    if (!videoId) {
      if (generation) {
        await supabase.from('generations').update({
          status: 'failed',
          error_message: 'No video_id in HeyGen response',
        }).eq('id', generation.id);
      }
      return NextResponse.json({ error: 'Avatar generation did not return a video ID' }, { status: 502 });
    }

    // HeyGen is async — video needs to be polled
    if (generation) {
      await supabase.from('generations').update({
        status: 'processing',
        metadata: { heygen_video_id: videoId, avatar_id: avatarId, voice_id: voiceId },
      }).eq('id', generation.id);
    }

    return NextResponse.json({
      status: 'processing',
      heygen_video_id: videoId,
      generation_id: generation?.id,
      message: 'Avatar video is being generated. Poll /api/generation-status for results.',
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
