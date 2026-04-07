import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/cinematic-options
 * Returns all cinematic options grouped by type for the Cinematic Controls panel.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cinematic_options')
      .select('id, name, type, prompt_fragment, description, reference_image_url, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by type
    const grouped: Record<string, typeof data> = {};
    for (const opt of data || []) {
      if (!grouped[opt.type]) grouped[opt.type] = [];
      grouped[opt.type].push(opt);
    }

    return NextResponse.json({ options: grouped });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
