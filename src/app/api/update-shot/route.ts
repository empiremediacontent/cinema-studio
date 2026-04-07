import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/update-shot
 * Updates a single field on a shot. Used by ShotCard inline editing
 * and Cinematic Controls apply-to-shot.
 *
 * Body: { shotId: string, field: string, value: any }
 */

const ALLOWED_FIELDS = [
  'title', 'description', 'dialogue', 'narration',
  'shot_type', 'camera_movement', 'focal_length',
  'duration_seconds', 'shot_category', 'metadata',
  'nano_prompt', 'veo_prompt', 'contact_sheet_prompt',
  'generation_status', 'image_url', 'video_url',
  'start_frame_url', 'end_frame_url',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shotId, field, value } = await request.json();

    if (!shotId || !field) {
      return NextResponse.json({ error: 'Shot ID and field are required' }, { status: 400 });
    }

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: `Field "${field}" is not allowed` }, { status: 400 });
    }

    // Verify the shot belongs to this user
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('shots')
      .update({ [field]: value })
      .eq('id', shotId)
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
