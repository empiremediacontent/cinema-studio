import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SHOT_GENERATION_SYSTEM_PROMPT, buildShotGenerationPrompt } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const { projectId, script, creativeDirection, targetDuration } = await request.json();

    if (!projectId || !script?.trim()) {
      return NextResponse.json({ error: 'Project ID and script are required' }, { status: 400 });
    }

    // 3. Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 4. Call Gemini via REST API (edge-compatible, no Node SDK needed)
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const userPrompt = SHOT_GENERATION_SYSTEM_PROMPT + '\n\n---\n\n' + buildShotGenerationPrompt(script, creativeDirection, targetDuration ? Number(targetDuration) : undefined);

    let responseText: string;
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 32768,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error('Gemini HTTP error:', geminiRes.status, errBody.substring(0, 500));
        return NextResponse.json(
          { error: `Gemini API returned ${geminiRes.status}: ${errBody.substring(0, 200)}` },
          { status: 502 }
        );
      }

      const geminiData = await geminiRes.json();
      responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!responseText) {
        console.error('Empty Gemini response:', JSON.stringify(geminiData).substring(0, 500));
        return NextResponse.json(
          { error: 'Gemini returned empty response. Try again.' },
          { status: 502 }
        );
      }

      // Extract JSON array
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        responseText = responseText.substring(startIdx, endIdx + 1);
      }
    } catch (aiError: unknown) {
      const msg = aiError instanceof Error ? aiError.message : String(aiError);
      console.error('Gemini fetch error:', msg);
      return NextResponse.json(
        { error: `Gemini request failed: ${msg.substring(0, 200)}` },
        { status: 502 }
      );
    }

    // 5. Parse the JSON response (with truncation repair)
    let shots;
    try {
      shots = JSON.parse(responseText);
      if (!Array.isArray(shots)) {
        throw new Error('Not an array');
      }
    } catch {
      // Attempt to repair truncated JSON by finding the last complete object
      try {
        const lastCompleteObj = responseText.lastIndexOf('}');
        if (lastCompleteObj > 0) {
          const repaired = responseText.substring(0, lastCompleteObj + 1) + ']';
          shots = JSON.parse(repaired);
          if (!Array.isArray(shots)) {
            throw new Error('Repaired result not an array');
          }
          console.warn(`Repaired truncated JSON: recovered ${shots.length} shots`);
        } else {
          throw new Error('No repairable content');
        }
      } catch {
        return NextResponse.json(
          { error: `AI response was truncated. Try a shorter script, or try again.` },
          { status: 502 }
        );
      }
    }

    // 6. Delete existing shots for this project (regeneration)
    await supabase
      .from('shots')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    // 7. Insert new shots — sanitize values to match DB constraints
    const VALID_SHOT_TYPES = ['wide', 'medium', 'medium_close_up', 'close_up', 'extreme_close_up', 'over_shoulder', 'pov', 'aerial', 'custom'];

    const shotRows = shots.map((shot: Record<string, unknown>, index: number) => {
      let shotType = ((shot.shot_type as string) || 'medium').toLowerCase().replace(/[-\s]/g, '_');
      if (!VALID_SHOT_TYPES.includes(shotType)) shotType = 'custom';

      return {
        project_id: projectId,
        user_id: user.id,
        sort_order: index,
        title: (shot.title as string) || `Shot ${index + 1}`,
        description: (shot.notes as string) || null,
        duration_seconds: Number(shot.duration_seconds) || null,
        shot_type: shotType,
        camera_movement: (shot.camera_movement as string) || null,
        dialogue: (shot.dialogue as string) || null,
        narration: (shot.narration as string) || null,
        nano_prompt: (shot.nano_prompt as string) || null,
        veo_prompt: (shot.veo_prompt as string) || null,
        contact_sheet_prompt: (shot.contact_sheet_prompt as string) || null,
        focal_length: (shot.focal_length as string) || '85mm',
        generation_status: 'pending',
        metadata: {
          tool: shot.tool || 'Text-to-Video',
          shot_number: shot.shot_number || index + 1,
          dialogue_type: shot.dialogue_type || 'None',
          scene_builder: shot.scene_builder || false,
          save_frame: shot.save_frame || false,
          extend_jump: shot.extend_jump || false,
          avatar_candidate: shot.avatar_candidate || false,
        },
      };
    });

    const { data: insertedShots, error: insertError } = await supabase
      .from('shots')
      .insert(shotRows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: `DB error: ${insertError.message.substring(0, 200)}` },
        { status: 500 }
      );
    }

    // 8. Update project with script and creative direction
    await supabase
      .from('projects')
      .update({
        script,
        creative_direction: creativeDirection || null,
        status: 'in_progress',
      })
      .eq('id', projectId)
      .eq('user_id', user.id);

    return NextResponse.json({ shots: insertedShots });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Unexpected: ${msg.substring(0, 300)}` },
      { status: 500 }
    );
  }
}
