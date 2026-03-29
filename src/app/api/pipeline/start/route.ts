import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/pipeline/start
 * Kicks off the automation pipeline for a project.
 * Creates a pipeline_job, creates tasks, then runs them sequentially
 * (with image generation parallelized per shot).
 *
 * This does NOT modify any existing shot generation logic.
 * It writes to new tables (pipeline_jobs, pipeline_tasks) and
 * updates shots the same way the existing manual flow does.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, agents } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project ownership and get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.script || !project.script.trim()) {
      return NextResponse.json({ error: 'Project has no script. Write or paste a script first.' }, { status: 400 });
    }

    // Check for already-running pipeline
    const { data: existing } = await supabase
      .from('pipeline_jobs')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', ['pending', 'running'])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'A pipeline is already running for this project.' }, { status: 409 });
    }

    // Default agents if none specified
    const requestedAgents = agents || ['script_analysis', 'visual_direction'];

    // Calculate total steps:
    // script_analysis = 1 step
    // visual_direction = 1 step (runs after shots exist)
    // character_extraction = 1 step
    // image_generation = N steps (one per shot, calculated after script_analysis)
    const baseSteps = requestedAgents.filter(
      (a: string) => a !== 'image_generation'
    ).length;

    // Create the pipeline job
    const { data: job, error: jobError } = await supabase
      .from('pipeline_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        status: 'pending',
        agents_requested: requestedAgents,
        total_steps: baseSteps, // Will be updated after script_analysis adds shots
        completed_steps: 0,
      })
      .select()
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: `Failed to create pipeline job: ${jobError?.message}` }, { status: 500 });
    }

    // Create tasks for each requested agent
    const taskInserts = requestedAgents.map((agentType: string) => ({
      job_id: job.id,
      project_id: projectId,
      user_id: user.id,
      agent_type: agentType,
      status: 'pending',
      input_data: {},
    }));

    const { error: taskError } = await supabase
      .from('pipeline_tasks')
      .insert(taskInserts);

    if (taskError) {
      return NextResponse.json({ error: `Failed to create tasks: ${taskError.message}` }, { status: 500 });
    }

    // Start the pipeline execution in the background
    // We fire off the run endpoint and don't await it
    const origin = request.nextUrl.origin;
    fetch(`${origin}/api/pipeline/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the auth cookie so the run endpoint can authenticate
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => {
      console.error('Failed to trigger pipeline run:', err);
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      agents: requestedAgents,
      message: 'Pipeline started. Poll /api/pipeline/status for progress.',
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
