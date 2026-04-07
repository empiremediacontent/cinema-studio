import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/save-project-settings
 * Saves project-level settings: project_mode, target_duration, description,
 * creative_direction, and structured context_data (production notes,
 * character design, atmosphere/tone/direction).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      projectId,
      projectMode,
      targetDuration,
      description,
      creativeDirection,
      contextData,
    } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (projectMode !== undefined) updates.project_mode = projectMode;
    if (targetDuration !== undefined) updates.target_duration_seconds = Number(targetDuration);
    if (description !== undefined) updates.description = description;
    if (creativeDirection !== undefined) updates.creative_direction = creativeDirection;
    if (contextData !== undefined) updates.context_data = contextData;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
