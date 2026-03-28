import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/update-project
// Updates a single field on a project (script, creative_direction, etc.)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, field, value } = await req.json();

    if (!projectId || !field) {
      return NextResponse.json({ error: 'Missing projectId or field' }, { status: 400 });
    }

    // Only allow updating safe fields
    const allowedFields = ['script', 'creative_direction', 'title', 'description', 'thumbnail_url'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: `Field "${field}" is not updatable` }, { status: 400 });
    }

    const { error } = await supabase
      .from('projects')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
