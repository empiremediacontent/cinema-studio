import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// Video generation via Kie.ai — Veo 3.1 primary, Kling 2.6 fallback
// Veo docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
// Kling docs: https://docs.kie.ai/market/kling/text-to-video
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shotId, prompt, imageUrl, mode, variations } = await request.json();
    // mode: 'text-to-video' | 'image-to-video'
    // variations: boolean — if true, generate 4 angles

    if (!shotId || !prompt?.trim()) {
      return NextResponse.json({ error: 'Shot ID and prompt are required' }, { status: 400 });
    }

    // Verify shot ownership
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id, project_id, user_id, metadata')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    const kieApiKey = process.env.KIE_API_KEY;
    if (!kieApiKey) {
      return NextResponse.json({ error: 'Video generation service not configured. Set KIE_API_KEY in environment variables.' }, { status: 500 });
    }

    // Log generation
    const { data: generation } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        project_id: shot.project_id,
        shot_id: shotId,
        model: 'veo_3_1',
        generation_type: 'video',
        prompt: prompt.substring(0, 5000),
        status: 'processing',
        metadata: { mode, variations: !!variations },
      })
      .select()
      .single();

    await supabase.from('shots').update({ generation_status: 'generating' }).eq('id', shotId).eq('user_id', user.id);

    const numVariations = variations ? 4 : 1;
    const taskIds: string[] = [];
    const taskServices: string[] = [];

    for (let i = 0; i < numVariations; i++) {
      let variationPrompt = prompt.trim();
      if (variations && i > 0) {
        const angles = [
          'slight low angle, 3/4 view from left',
          'slight high angle, 3/4 view from right',
          'straight-on eye level, frontal view',
        ];
        variationPrompt += `. Camera angle: ${angles[i - 1]}.`;
      }

      // Try Veo 3.1 first via Kie.ai
      let taskId: string | null = null;
      let service = 'kie_veo';

      try {
        // Determine generation type for Veo
        let generationType = 'TEXT_2_VIDEO';
        const imageUrls: string[] = [];
        if (mode === 'image-to-video' && imageUrl) {
          generationType = 'REFERENCE_2_VIDEO';
          imageUrls.push(imageUrl);
        }

        const veoRes = await fetch('https://api.kie.ai/api/v1/veo/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${kieApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: variationPrompt,
            model: 'veo3_fast',
            generationType,
            aspect_ratio: '16:9',
            ...(imageUrls.length > 0 ? { imageUrls } : {}),
          }),
        });

        if (veoRes.ok) {
          const veoData = await veoRes.json();
          if (veoData.data?.taskId) {
            taskId = veoData.data.taskId;
            service = 'kie_veo';
          }
        }

        // If Veo failed, try Kling 2.6 as fallback via Kie.ai unified endpoint
        if (!taskId) {
          const klingRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${kieApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'kling-2.6/text-to-video',
              input: {
                prompt: variationPrompt,
                sound: false,
                aspect_ratio: '16:9',
                duration: '5',
              },
            }),
          });

          if (klingRes.ok) {
            const klingData = await klingRes.json();
            if (klingData.data?.taskId) {
              taskId = klingData.data.taskId;
              service = 'kie_kling';
            }
          }
        }
      } catch (fetchErr: unknown) {
        // Both services failed for this variation
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        taskIds.push(`error:${msg.substring(0, 100)}`);
        taskServices.push('error');
        continue;
      }

      if (taskId) {
        taskIds.push(taskId);
        taskServices.push(service);
      } else {
        taskIds.push('error:no_service_available');
        taskServices.push('error');
      }
    }

    // Check if we got at least one valid task
    const validTasks = taskIds.filter(t => !t.startsWith('error:'));

    if (validTasks.length === 0) {
      if (generation) {
        await supabase.from('generations').update({
          status: 'failed',
          error_message: 'All video generation attempts failed',
        }).eq('id', generation.id);
      }
      await supabase.from('shots').update({ generation_status: 'failed' }).eq('id', shotId).eq('user_id', user.id);
      return NextResponse.json({ error: 'Video generation failed. No services available.' }, { status: 502 });
    }

    // Store task IDs in generation metadata for polling
    if (generation) {
      await supabase.from('generations').update({
        status: 'processing',
        metadata: {
          mode,
          variations: !!variations,
          kie_task_ids: taskIds,
          kie_services: taskServices,
          primary_task_id: validTasks[0],
          primary_service: taskServices[taskIds.indexOf(validTasks[0])],
        },
      }).eq('id', generation.id);
    }

    return NextResponse.json({
      status: 'processing',
      task_ids: taskIds,
      services: taskServices,
      generation_id: generation?.id,
      message: 'Video generation queued. Poll /api/generation-status for results.',
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
