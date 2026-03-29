import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute timeout for long pipelines

/**
 * POST /api/pipeline/run
 * Executes the pipeline agents sequentially.
 * Called internally by /api/pipeline/start (fire-and-forget).
 *
 * Agent execution order:
 * 1. script_analysis - Breaks script into shots (calls existing generate API logic)
 * 2. visual_direction - Assigns cinematography per shot
 * 3. character_extraction - Identifies characters from script
 * 4. image_generation - Generates frames for all shots (parallel)
 * 5. export_compile - Auto-exports PPTX (optional)
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(apiKey: string, system: string, userMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min per call

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
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude API ${res.status}: ${errBody.substring(0, 200)}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
    return textBlock?.text || '';
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ── Agent: Script Analysis ──
async function runScriptAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  apiKey: string,
  project: Record<string, unknown>,
  userId: string,
) {
  const script = project.script as string;
  const description = (project.description as string) || '';
  const direction = (project.creative_direction as string) || '';

  const system = `You are a professional storyboard artist and film production planner. Break down scripts into individual shots for a storyboard. Return ONLY valid JSON, no markdown fences.`;

  const prompt = `Break this script into individual storyboard shots. For each shot provide:
- title: short descriptive name (e.g. "Wren discovers AI tool")
- description: detailed action/animation description for the shot
- dialogue: any spoken dialogue in this shot (empty string if none)
- narration: any voiceover narration in this shot (empty string if none)
- shot_type: one of: wide, medium, medium_close_up, close_up, extreme_close_up, over_shoulder, pov, aerial
- camera_movement: one of: static, pan_left, pan_right, tilt_up, tilt_down, dolly_in, dolly_out, crane_up, crane_down, tracking, handheld, orbit, whip_pan, rack_focus
- duration_seconds: estimated duration in seconds

${description ? `Synopsis/Context: ${description}` : ''}
${direction ? `Creative Direction: ${direction}` : ''}

Script:
${script}

Return a JSON array of shot objects. Example:
[{"title":"Opening","description":"Wide shot of office...","dialogue":"","narration":"Meet Wren.","shot_type":"wide","camera_movement":"static","duration_seconds":8}]`;

  const result = await callClaude(apiKey, system, prompt);

  // Parse the JSON response
  let shots;
  try {
    // Try to find JSON array in the response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    shots = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse script analysis response: ${result.substring(0, 200)}`);
  }

  if (!Array.isArray(shots) || shots.length === 0) {
    throw new Error('Script analysis returned no shots');
  }

  // Insert shots into the database (same pattern as existing generate endpoint)
  const shotInserts = shots.map((s: Record<string, unknown>, i: number) => ({
    project_id: project.id,
    user_id: userId,
    sort_order: i + 1,
    title: s.title || `Shot ${i + 1}`,
    description: s.description || '',
    dialogue: s.dialogue || null,
    narration: s.narration || null,
    shot_type: s.shot_type || 'wide',
    camera_movement: s.camera_movement || 'static',
    duration_seconds: Number(s.duration_seconds) || 8,
    generation_status: 'idle',
  }));

  const { data: insertedShots, error } = await supabase
    .from('shots')
    .insert(shotInserts)
    .select();

  if (error) throw new Error(`Failed to insert shots: ${error.message}`);

  return insertedShots || [];
}

// ── Agent: Visual Direction ──
async function runVisualDirection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  apiKey: string,
  project: Record<string, unknown>,
  shots: Record<string, unknown>[],
) {
  const direction = (project.creative_direction as string) || '';
  const description = (project.description as string) || '';

  const shotSummaries = shots.map((s, i) =>
    `Shot ${i + 1} (${s.shot_type}): ${s.description}`
  ).join('\n');

  const system = `You are an expert cinematographer and visual director. Assign detailed image generation prompts to storyboard shots. Return ONLY valid JSON, no markdown fences.`;

  const prompt = `For each shot below, create a detailed image generation prompt that captures the visual feel. Consider:
- The overall creative direction and mood
- Shot type and camera angle
- Lighting, color palette, atmosphere
- Character placement and expressions
- Environment and props

${description ? `Project Synopsis: ${description}` : ''}
${direction ? `Creative Direction: ${direction}` : ''}

Shots:
${shotSummaries}

Return a JSON array where each object has:
- shot_index: (0-based index)
- nano_prompt: detailed image generation prompt (100-200 words)

Example: [{"shot_index":0,"nano_prompt":"Wide establishing shot of a modern open-plan office..."}]`;

  const result = await callClaude(apiKey, system, prompt);

  let prompts;
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    prompts = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse visual direction response: ${result.substring(0, 200)}`);
  }

  // Update each shot with its nano_prompt
  const updates = [];
  for (const p of prompts) {
    const idx = Number(p.shot_index);
    if (idx >= 0 && idx < shots.length) {
      const shotId = shots[idx].id;
      updates.push(
        supabase
          .from('shots')
          .update({ nano_prompt: p.nano_prompt })
          .eq('id', shotId)
      );
    }
  }

  await Promise.all(updates);
  return prompts;
}

// ── Agent: Character Extraction ──
async function runCharacterExtraction(
  apiKey: string,
  project: Record<string, unknown>,
) {
  const script = project.script as string;
  const description = (project.description as string) || '';

  const system = `You are a script analyst. Extract all characters mentioned in a script with their descriptions. Return ONLY valid JSON, no markdown fences.`;

  const prompt = `Extract all characters from this script. For each character provide:
- name: character name
- description: physical appearance, age, personality traits mentioned
- role: their role in the story (protagonist, antagonist, supporting, minor)

${description ? `Context: ${description}` : ''}

Script:
${script}

Return a JSON array: [{"name":"Wren","description":"30s, cheerful, eager...","role":"protagonist"}]`;

  const result = await callClaude(apiKey, system, prompt);

  let characters;
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    characters = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse character extraction: ${result.substring(0, 200)}`);
  }

  return characters || [];
}

// ── Main Pipeline Runner ──

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jobId } = await request.json();
  if (!jobId) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

  // Get the job
  const { data: job, error: jobError } = await supabase
    .from('pipeline_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Get the project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', job.project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Get Anthropic API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await supabase.from('pipeline_jobs').update({
      status: 'failed',
      error_message: 'Anthropic API key not configured',
    }).eq('id', jobId);
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Mark job as running
  await supabase.from('pipeline_jobs').update({
    status: 'running',
    started_at: new Date().toISOString(),
    current_agent: job.agents_requested[0],
  }).eq('id', jobId);

  const agents: string[] = job.agents_requested;
  let completedSteps = 0;
  let shots: Record<string, unknown>[] = [];

  try {
    // ── Run each agent sequentially ──
    for (const agent of agents) {
      // Update current agent
      await supabase.from('pipeline_jobs').update({
        current_agent: agent,
      }).eq('id', jobId);

      // Update task status to running
      await supabase.from('pipeline_tasks').update({
        status: 'running',
        started_at: new Date().toISOString(),
      }).eq('job_id', jobId).eq('agent_type', agent);

      try {
        if (agent === 'script_analysis') {
          shots = await runScriptAnalysis(supabase, apiKey, project, user.id);

          // Update total_steps now that we know shot count
          const imageSteps = agents.includes('image_generation') ? shots.length : 0;
          await supabase.from('pipeline_jobs').update({
            total_steps: agents.length + imageSteps,
          }).eq('id', jobId);
        }

        if (agent === 'visual_direction') {
          // Get shots if we don't have them (in case script_analysis was skipped)
          if (shots.length === 0) {
            const { data: existingShots } = await supabase
              .from('shots')
              .select('*')
              .eq('project_id', project.id)
              .order('sort_order', { ascending: true });
            shots = existingShots || [];
          }

          if (shots.length > 0) {
            await runVisualDirection(supabase, apiKey, project, shots);
          }
        }

        if (agent === 'character_extraction') {
          const characters = await runCharacterExtraction(apiKey, project);

          // Store characters in the task output_data
          await supabase.from('pipeline_tasks').update({
            output_data: { characters },
          }).eq('job_id', jobId).eq('agent_type', agent);
        }

        if (agent === 'image_generation') {
          // Image generation would go here when an image provider is integrated.
          // For now, mark as skipped with a note.
          await supabase.from('pipeline_tasks').update({
            status: 'skipped',
            output_data: { message: 'Image generation provider not yet configured. Shots are ready for manual generation.' },
            completed_at: new Date().toISOString(),
          }).eq('job_id', jobId).eq('agent_type', agent);

          completedSteps++;
          await supabase.from('pipeline_jobs').update({ completed_steps: completedSteps }).eq('id', jobId);
          continue; // Skip the normal completion below
        }

        // Mark task as completed
        await supabase.from('pipeline_tasks').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('job_id', jobId).eq('agent_type', agent);

        completedSteps++;
        await supabase.from('pipeline_jobs').update({ completed_steps: completedSteps }).eq('id', jobId);

      } catch (agentErr) {
        const errMsg = agentErr instanceof Error ? agentErr.message : String(agentErr);

        // Mark this task as failed
        await supabase.from('pipeline_tasks').update({
          status: 'failed',
          error_message: errMsg,
          completed_at: new Date().toISOString(),
        }).eq('job_id', jobId).eq('agent_type', agent);

        // Mark remaining tasks as skipped
        await supabase.from('pipeline_tasks').update({
          status: 'skipped',
        }).eq('job_id', jobId).eq('status', 'pending');

        throw new Error(`Agent "${agent}" failed: ${errMsg}`);
      }
    }

    // Pipeline complete
    await supabase.from('pipeline_jobs').update({
      status: 'completed',
      current_agent: null,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({ status: 'completed', jobId });

  } catch (pipelineErr) {
    const errMsg = pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);

    await supabase.from('pipeline_jobs').update({
      status: 'failed',
      error_message: errMsg,
      current_agent: null,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
