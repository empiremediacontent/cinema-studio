import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * GET /api/pipeline/status?jobId=xxx
 * Returns the current status of a pipeline job and all its tasks.
 * The UI polls this endpoint to show real-time progress.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const jobId = request.nextUrl.searchParams.get('jobId');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!jobId && !projectId) {
      return NextResponse.json({ error: 'jobId or projectId required' }, { status: 400 });
    }

    // If jobId provided, get that specific job
    if (jobId) {
      const { data: job } = await supabase
        .from('pipeline_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single();

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const { data: tasks } = await supabase
        .from('pipeline_tasks')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      return NextResponse.json({ job, tasks: tasks || [] });
    }

    // If projectId, get the latest job for that project
    const { data: jobs } = await supabase
      .from('pipeline_jobs')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ job: null, tasks: [] });
    }

    const job = jobs[0];
    const { data: tasks } = await supabase
      .from('pipeline_tasks')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ job, tasks: tasks || [] });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg.substring(0, 300) }, { status: 500 });
  }
}
