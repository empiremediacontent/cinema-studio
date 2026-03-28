import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_CINEMATIC_OPTIONS } from '@/lib/data/cinematic-options-seed';

// POST /api/seed-cinematic-options
// Seeds all 251 cinematic options into Supabase.
// Safe to call multiple times; it clears existing data first.
// Only works for authenticated users.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear existing options
    const { error: deleteError } = await supabase
      .from('cinematic_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) throw deleteError;

    // Insert all 251 options in batches of 50
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < ALL_CINEMATIC_OPTIONS.length; i += batchSize) {
      const batch = ALL_CINEMATIC_OPTIONS.slice(i, i + batchSize).map(opt => ({
        name: opt.name,
        type: opt.type,
        prompt_fragment: opt.prompt_fragment,
        description: opt.description,
        sort_order: opt.sort_order,
      }));

      const { error: insertError } = await supabase
        .from('cinematic_options')
        .insert(batch);

      if (insertError) throw insertError;
      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted} cinematic options across 12 categories`,
      total: inserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to seed cinematic options';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
