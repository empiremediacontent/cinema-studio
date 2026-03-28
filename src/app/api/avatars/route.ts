import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/avatars
// Returns the user's avatar library (their character roster).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ avatars: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch avatars';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/avatars
// Create a new character in the avatar library.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, gender_presentation, age_appearance, ethnicity_appearance, mood_expression, style_tags, reference_images, thumbnail_url } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('avatars')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        gender_presentation: gender_presentation || 'other',
        age_appearance: age_appearance || 'adult',
        ethnicity_appearance: ethnicity_appearance || null,
        mood_expression: mood_expression || null,
        style_tags: style_tags || [],
        reference_images: reference_images || [],
        thumbnail_url: thumbnail_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ avatar: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create avatar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
