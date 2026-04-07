import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/save-asset
// Saves a generated media URL as a project asset for reuse across shots.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, assetType, thumbnailUrl, shotId } = body;

    if (!projectId || !name || !thumbnailUrl) {
      return NextResponse.json({ error: 'Missing required fields: projectId, name, thumbnailUrl' }, { status: 400 });
    }

    const { data, error } = await supabase.from('assets').insert({
      user_id: user.id,
      project_id: projectId,
      asset_type: assetType || 'talent',
      name,
      description: `Generated from shot`,
      thumbnail_url: thumbnailUrl,
      file_url: thumbnailUrl,
      linked_shots: shotId ? [shotId] : [],
    }).select().single();

    if (error) {
      console.error('Save asset error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
