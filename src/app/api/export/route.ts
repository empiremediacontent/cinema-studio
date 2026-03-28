import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// Export pipeline — combines generated shots into final video
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, resolution, format, title } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all shots with video URLs
    const { data: shots } = await supabase
      .from('shots')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .not('video_url', 'is', null)
      .order('sort_order', { ascending: true });

    if (!shots || shots.length === 0) {
      return NextResponse.json({
        error: 'No generated videos found. Generate video for at least one shot before exporting.',
      }, { status: 400 });
    }

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('exports')
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: title || `${project.title} - Export`,
        resolution: resolution || '1080p',
        format: format || 'mp4',
        status: 'queued',
      })
      .select()
      .single();

    if (exportError) {
      return NextResponse.json({ error: `Failed to create export: ${exportError.message}` }, { status: 500 });
    }

    // In production, this would queue an FFmpeg job on a backend worker
    // that stitches all video_urls together with audio tracks.
    // For now, we return the export record and a summary of what would be combined.

    const exportManifest = {
      export_id: exportRecord.id,
      status: 'queued',
      resolution: resolution || '1080p',
      format: format || 'mp4',
      total_shots: shots.length,
      total_duration: shots.reduce((sum, s) => sum + (Number(s.duration_seconds) || 8), 0),
      shots: shots.map((s, i) => ({
        order: i + 1,
        title: s.title,
        duration: s.duration_seconds,
        has_video: !!s.video_url,
        has_dialogue_audio: !!(s.metadata as Record<string, unknown>)?.dialogue_audio_url,
        has_narration_audio: !!(s.metadata as Record<string, unknown>)?.narration_audio_url,
      })),
      message: 'Export queued. Server-side rendering with FFmpeg will combine all shots into a single video. This feature requires a backend worker service to be configured.',
    };

    return NextResponse.json(exportManifest);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}

// Get export status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const { data: exports } = await supabase
      .from('exports')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ exports: exports || [] });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
