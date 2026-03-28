import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { persistMediaUrl, isPersistedUrl } from '@/lib/supabase/storage';

export const runtime = 'edge';

// Poll generation status for async jobs (Kie.ai, HeyGen)
// On completion, persists media to Supabase Storage for permanent URLs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const generationId = request.nextUrl.searchParams.get('id');
    if (!generationId) {
      return NextResponse.json({ error: 'Generation ID is required' }, { status: 400 });
    }

    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .eq('user_id', user.id)
      .single();

    if (error || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    const meta = (generation.metadata || {}) as Record<string, unknown>;
    const kieApiKey = process.env.KIE_API_KEY;

    // --- If already completed, check persistence ---
    if (generation.status === 'completed' && generation.result_url) {
      // If not persisted yet, attempt persistence on re-poll
      if (!isPersistedUrl(generation.result_url)) {
        const persistedUrl = await tryPersist(
          generation.result_url,
          user.id,
          generation.project_id as string,
          generation.shot_id as string,
          generation.generation_type as string,
        );
        if (persistedUrl) {
          await supabase.from('generations').update({
            result_url: persistedUrl,
            metadata: { ...meta, persisted: true },
          }).eq('id', generationId);

          if (generation.shot_id) {
            await updateShotUrl(supabase, generation.shot_id as string, user.id, generation.generation_type as string, persistedUrl);
          }

          return NextResponse.json({
            status: 'completed',
            result_url: persistedUrl,
            type: generation.generation_type,
          });
        }
      }

      return NextResponse.json({
        status: 'completed',
        result_url: generation.result_url,
        type: generation.generation_type,
      });
    }

    // --- Kie.ai Nano Banana Pro (image) polling ---
    if (meta.kie_task_id && meta.service === 'kie_nano' && kieApiKey) {
      return await pollKieUnified(
        kieApiKey,
        meta.kie_task_id as string,
        generationId,
        generation,
        supabase,
        user.id,
      );
    }

    // --- Kie.ai Video polling (Veo or Kling) ---
    if (meta.primary_task_id && kieApiKey) {
      const primaryService = meta.primary_service as string;

      if (primaryService === 'kie_veo') {
        return await pollKieVeo(
          kieApiKey,
          meta.primary_task_id as string,
          generationId,
          generation,
          meta,
          supabase,
          user.id,
        );
      }

      if (primaryService === 'kie_kling') {
        return await pollKieUnified(
          kieApiKey,
          meta.primary_task_id as string,
          generationId,
          generation,
          supabase,
          user.id,
        );
      }
    }

    // --- HeyGen async job polling ---
    if (meta.heygen_video_id) {
      const heygenKey = process.env.HEYGEN_API_KEY;
      if (heygenKey) {
        const statusRes = await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${meta.heygen_video_id}`,
          { headers: { 'X-Api-Key': heygenKey } }
        );

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const videoStatus = statusData.data?.status;

          if (videoStatus === 'completed') {
            let videoUrl = statusData.data?.video_url;

            // Persist to Supabase Storage
            const persistedUrl = await tryPersist(
              videoUrl, user.id,
              generation.project_id as string,
              generation.shot_id as string,
              'avatar',
            );
            if (persistedUrl) videoUrl = persistedUrl;

            await supabase.from('generations').update({
              status: 'completed',
              result_url: videoUrl,
              metadata: { ...meta, persisted: !!persistedUrl },
            }).eq('id', generationId);

            if (generation.shot_id) {
              await supabase.from('shots').update({
                video_url: videoUrl,
                generation_status: 'completed',
              }).eq('id', generation.shot_id).eq('user_id', user.id);
            }

            return NextResponse.json({
              status: 'completed',
              result_url: videoUrl,
              type: 'avatar',
            });
          } else if (videoStatus === 'failed') {
            await supabase.from('generations').update({
              status: 'failed',
              error_message: statusData.data?.error || 'Avatar generation failed',
            }).eq('id', generationId);

            return NextResponse.json({ status: 'failed', error: statusData.data?.error || 'Failed' });
          }

          return NextResponse.json({ status: 'processing' });
        }
      }
    }

    // Return current DB status
    return NextResponse.json({
      status: generation.status,
      result_url: generation.result_url,
      type: generation.generation_type,
      error: generation.error_message,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────

/** Try to persist a temp URL to Supabase Storage. Returns persistent URL or null. */
async function tryPersist(
  tempUrl: string,
  userId: string,
  projectId: string,
  shotId: string,
  genType: string,
): Promise<string | null> {
  if (!tempUrl || isPersistedUrl(tempUrl)) return null;

  const typeMap: Record<string, 'image' | 'video' | 'audio' | 'contact-sheet' | 'avatar'> = {
    'image': 'image',
    'video': 'video',
    'voice': 'audio',
    'avatar': 'avatar',
    'contact_sheet': 'contact-sheet',
  };

  return persistMediaUrl(tempUrl, {
    userId,
    projectId: projectId || 'unknown',
    shotId: shotId || 'unknown',
    type: typeMap[genType] || 'image',
  });
}

/** Update the correct shot URL field based on generation type */
async function updateShotUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shotId: string,
  userId: string,
  genType: string,
  url: string,
) {
  const updateData: Record<string, unknown> = { generation_status: 'completed' };

  if (genType === 'contact_sheet') {
    updateData.contact_sheet_url = url;
  } else if (genType === 'image') {
    updateData.image_url = url;
  } else if (genType === 'video' || genType === 'avatar') {
    updateData.video_url = url;
  }

  await supabase.from('shots').update(updateData)
    .eq('id', shotId)
    .eq('user_id', userId);
}

// ─── Kie.ai Veo polling ──────────────────────────────

async function pollKieVeo(
  apiKey: string,
  taskId: string,
  generationId: string,
  generation: Record<string, unknown>,
  meta: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  try {
    const statusRes = await fetch(
      `https://api.kie.ai/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!statusRes.ok) {
      return NextResponse.json({ status: 'processing', message: 'Polling Veo status...' });
    }

    const statusData = await statusRes.json();
    const successFlag = statusData.data?.successFlag;

    if (successFlag === 1) {
      // Completed — extract video URL and persist
      const resultUrls = statusData.data?.response?.resultUrls || [];
      let videoUrl = resultUrls[0] || null;

      // Persist to Supabase Storage
      if (videoUrl) {
        const persistedUrl = await tryPersist(
          videoUrl, userId,
          generation.project_id as string,
          generation.shot_id as string,
          'video',
        );
        if (persistedUrl) videoUrl = persistedUrl;
      }

      await supabase.from('generations').update({
        status: 'completed',
        result_url: videoUrl,
        metadata: { ...meta, veo_result: statusData.data, persisted: videoUrl ? isPersistedUrl(videoUrl) : false },
      }).eq('id', generationId);

      if (generation.shot_id) {
        const updateData: Record<string, unknown> = {
          video_url: videoUrl,
          generation_status: 'completed',
        };

        // Handle variations metadata
        const taskIds = (meta.kie_task_ids || []) as string[];
        if (taskIds.length > 1) {
          updateData.metadata = {
            ...(generation.metadata as Record<string, unknown> || {}),
            video_variations: [videoUrl],
            variations_pending: taskIds.slice(1).filter(t => !t.startsWith('error:')),
          };
        }

        await supabase.from('shots').update(updateData)
          .eq('id', generation.shot_id as string)
          .eq('user_id', userId);
      }

      return NextResponse.json({
        status: 'completed',
        result_url: videoUrl,
        type: generation.generation_type,
      });
    }

    if (successFlag === 2 || successFlag === 3) {
      const errorMsg = statusData.data?.errorMessage || 'Video generation failed';
      await supabase.from('generations').update({
        status: 'failed',
        error_message: errorMsg,
      }).eq('id', generationId);

      if (generation.shot_id) {
        await supabase.from('shots').update({ generation_status: 'failed' })
          .eq('id', generation.shot_id as string)
          .eq('user_id', userId);
      }

      return NextResponse.json({ status: 'failed', error: errorMsg });
    }

    // Still generating (successFlag === 0)
    return NextResponse.json({ status: 'processing', message: 'Video is being generated...' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'processing', message: `Polling error: ${msg.substring(0, 100)}` });
  }
}

// ─── Kie.ai unified polling ──────────────────────────

async function pollKieUnified(
  apiKey: string,
  taskId: string,
  generationId: string,
  generation: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  try {
    const statusRes = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    if (!statusRes.ok) {
      return NextResponse.json({ status: 'processing', message: 'Polling status...' });
    }

    const statusData = await statusRes.json();
    const state = statusData.data?.state;

    if (state === 'success') {
      // Parse resultJson to get URLs
      let resultUrl: string | null = null;
      try {
        const resultJson = JSON.parse(statusData.data?.resultJson || '{}');
        const resultUrls = resultJson.resultUrls || [];
        resultUrl = resultUrls[0] || null;
      } catch {
        resultUrl = null;
      }

      // Persist to Supabase Storage
      if (resultUrl) {
        const genType = generation.generation_type as string;
        const persistedUrl = await tryPersist(
          resultUrl, userId,
          generation.project_id as string,
          generation.shot_id as string,
          genType,
        );
        if (persistedUrl) resultUrl = persistedUrl;
      }

      await supabase.from('generations').update({
        status: 'completed',
        result_url: resultUrl,
        metadata: {
          ...(generation.metadata as Record<string, unknown> || {}),
          persisted: resultUrl ? isPersistedUrl(resultUrl) : false,
        },
      }).eq('id', generationId);

      if (generation.shot_id) {
        const genType = generation.generation_type as string;
        await updateShotUrl(supabase, generation.shot_id as string, userId, genType, resultUrl || '');
      }

      return NextResponse.json({
        status: 'completed',
        result_url: resultUrl,
        type: generation.generation_type,
      });
    }

    if (state === 'fail') {
      const errorMsg = statusData.data?.failMsg || 'Generation failed';
      await supabase.from('generations').update({
        status: 'failed',
        error_message: errorMsg,
      }).eq('id', generationId);

      if (generation.shot_id) {
        await supabase.from('shots').update({ generation_status: 'failed' })
          .eq('id', generation.shot_id as string)
          .eq('user_id', userId);
      }

      return NextResponse.json({ status: 'failed', error: errorMsg });
    }

    // Still processing (waiting, queuing, generating)
    const progress = statusData.data?.progress;
    return NextResponse.json({
      status: 'processing',
      state,
      ...(progress !== undefined ? { progress } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'processing', message: `Polling error: ${msg.substring(0, 100)}` });
  }
}
