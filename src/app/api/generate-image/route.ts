import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// Image generation via Kie.ai
// Primary: Nano Banana 2 (supports up to 14 reference images, 20K char prompts)
// Fallback: Nano Banana Pro (8 reference images, 10K char prompts)
// Docs: https://docs.kie.ai/market/google/nanobanana2
// Docs: https://docs.kie.ai/market/google/pro-image-to-image
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shotId, prompt, type, referenceImageUrl } = await request.json();
    // type: 'nano' | 'contact_sheet'
    // referenceImageUrl: optional user-uploaded talent image for character consistency

    if (!shotId || !prompt?.trim()) {
      return NextResponse.json({ error: 'Shot ID and prompt are required' }, { status: 400 });
    }

    // Verify shot ownership
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id, project_id, user_id')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    const kieApiKey = process.env.KIE_API_KEY;
    if (!kieApiKey) {
      return NextResponse.json({ error: 'Image generation service not configured. Set KIE_API_KEY in environment variables.' }, { status: 500 });
    }

    // Build image_input array if reference image provided
    const imageInput: string[] = [];
    if (referenceImageUrl) {
      imageInput.push(referenceImageUrl);
    }

    const hasReference = imageInput.length > 0;

    // Log the generation attempt
    // Try nano_banana_2 first; if DB constraint rejects it, fall back to nano_banana_pro
    let generation: { id: string; [key: string]: unknown } | null = null;
    const { data: gen1, error: genErr1 } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        project_id: shot.project_id,
        shot_id: shotId,
        model: 'nano_banana_2',
        generation_type: type === 'contact_sheet' ? 'contact_sheet' : 'image',
        prompt: prompt.substring(0, 5000),
        status: 'processing',
        metadata: { mode: hasReference ? 'image-to-image' : 'text-to-image', referenceImageUrl },
      })
      .select()
      .single();

    if (gen1) {
      generation = gen1;
    } else if (genErr1) {
      // DB constraint might not include nano_banana_2 yet; retry with nano_banana_pro
      const { data: gen2 } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          project_id: shot.project_id,
          shot_id: shotId,
          model: 'nano_banana_pro',
          generation_type: type === 'contact_sheet' ? 'contact_sheet' : 'image',
          prompt: prompt.substring(0, 5000),
          status: 'processing',
          metadata: { mode: hasReference ? 'image-to-image' : 'text-to-image', referenceImageUrl },
        })
        .select()
        .single();
      generation = gen2;
    }

    // Update shot generation status
    await supabase
      .from('shots')
      .update({ generation_status: 'generating' })
      .eq('id', shotId)
      .eq('user_id', user.id);

    // Build Kie.ai input payload per docs:
    // https://docs.kie.ai/market/google/nanobanana2
    const input: Record<string, unknown> = {
      prompt: prompt.trim().substring(0, 20000),
      aspect_ratio: type === 'contact_sheet' ? '1:1' : '16:9',
      resolution: '1K',
      output_format: 'png',
    };

    // Add reference images for character consistency
    if (imageInput.length > 0) {
      input.image_input = imageInput;
    }

    // Try Nano Banana 2 first, fall back to Nano Banana Pro
    let kieResponse: Response | null = null;
    let usedModel = 'nano-banana-2';

    try {
      kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${kieApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'nano-banana-2', input }),
      });

      // If Nano Banana 2 fails, try Pro as fallback
      if (!kieResponse.ok) {
        console.warn(`Nano Banana 2 returned ${kieResponse.status}, trying Pro fallback...`);
        usedModel = 'nano-banana-pro';

        // Pro has 10K char limit and 8 image limit
        const proInput: Record<string, unknown> = {
          ...input,
          prompt: prompt.trim().substring(0, 10000),
        };

        kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: 'nano-banana-pro', input: proInput }),
        });
      }
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      if (generation) {
        await supabase.from('generations').update({ status: 'failed', error_message: msg.substring(0, 500) }).eq('id', generation.id);
      }
      await supabase.from('shots').update({ generation_status: 'failed' }).eq('id', shotId).eq('user_id', user.id);
      return NextResponse.json({ error: `Image generation request failed: ${msg.substring(0, 200)}` }, { status: 502 });
    }

    if (!kieResponse || !kieResponse.ok) {
      const errBody = kieResponse ? await kieResponse.text() : 'No response';
      const status = kieResponse?.status || 500;
      if (generation) {
        await supabase.from('generations').update({ status: 'failed', error_message: errBody.substring(0, 500) }).eq('id', generation.id);
      }
      await supabase.from('shots').update({ generation_status: 'failed' }).eq('id', shotId).eq('user_id', user.id);

      // Parse common Kie.ai error codes for better user messaging
      let userMessage = `Image generation returned ${status}`;
      if (status === 401) userMessage = 'Kie.ai API key is invalid or expired. Check your KIE_API_KEY.';
      else if (status === 402) userMessage = 'Insufficient Kie.ai credits. Top up your account at kie.ai.';
      else if (status === 429) userMessage = 'Rate limited by Kie.ai. Wait a few seconds and try again.';
      else if (status === 422) userMessage = 'Invalid request parameters sent to Kie.ai.';
      else if (status >= 500) userMessage = 'Kie.ai service is temporarily unavailable. Try again in a moment.';

      return NextResponse.json({ error: userMessage }, { status: 502 });
    }

    const result = await kieResponse.json();

    // Kie.ai returns a taskId for async processing
    if (result.data?.taskId) {
      if (generation) {
        await supabase.from('generations').update({
          status: 'processing',
          model: usedModel === 'nano-banana-pro' ? 'nano_banana_pro' : 'nano_banana_2',
          metadata: {
            kie_task_id: result.data.taskId,
            service: 'kie_nano',
            model_used: usedModel,
            mode: hasReference ? 'image-to-image' : 'text-to-image',
            referenceImageUrl,
          },
        }).eq('id', generation.id);
      }

      return NextResponse.json({
        status: 'processing',
        task_id: result.data.taskId,
        generation_id: generation?.id,
        model: usedModel,
        mode: hasReference ? 'image-to-image' : 'text-to-image',
        message: 'Image generation queued. Poll /api/generation-status for results.',
      });
    }

    // Unexpected response format
    if (generation) {
      await supabase.from('generations').update({ status: 'failed', error_message: 'No taskId in Kie.ai response' }).eq('id', generation.id);
    }
    await supabase.from('shots').update({ generation_status: 'failed' }).eq('id', shotId).eq('user_id', user.id);
    return NextResponse.json({ error: 'Unexpected response from image generation service' }, { status: 502 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
