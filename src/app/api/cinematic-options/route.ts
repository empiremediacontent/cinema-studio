import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/cinematic-options
// Returns all 251 cinematic options grouped by type.
// This is the "armory" endpoint that loads all available gear.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cinematic_options')
      .select('*')
      .order('type')
      .order('sort_order');

    if (error) throw error;

    // Group by type for easy consumption
    const grouped: Record<string, typeof data> = {};
    for (const option of data || []) {
      if (!grouped[option.type]) grouped[option.type] = [];
      grouped[option.type].push(option);
    }

    return NextResponse.json({ options: grouped, total: data?.length || 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cinematic options';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
