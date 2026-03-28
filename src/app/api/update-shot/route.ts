import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// Inline shot field update — allows editing prompts, dialogue, narration, and clearing media URLs
const EDITABLE_FIELDS = new Set([
  'title', 'description', 'dialogue', 'narration',
  'nano_prompt', 'veo_prompt', 'contact_sheet_prompt',
  'duration_seconds', 'shot_type', 'camera_movement', 'focal_length',
  // Media URL fields — allows deleting generated media
  'image_url', 'video_url', 'contact_sheet_url',
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { shotId, field, value } = await request.json();

    if (!shotId || !field) {
      return NextResponse.json({ error: 'Shot ID and field are required' }, { status: 400 });
    }

    if (!EDITABLE_FIELDS.has(field)) {
      return NextResponse.json({ error: `Field '${field}' is not editable` }, { status: 400 });
    }

    // Verify ownership
    const { data: shot, error: shotError } = await supabase
      .from('shots')
      .select('id')
      .eq('id', shotId)
      .eq('user_id', user.id)
      .single();

    if (shotError || !shot) {
      return NextResponse.json({ error: 'Shot not found' }, { status: 404 });
    }

    // Update the field
    const { error: updateError } = await supabase
      .from('shots')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', shotId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, field, shotId });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
