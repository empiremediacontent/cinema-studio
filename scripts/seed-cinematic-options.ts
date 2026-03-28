// Standalone seed script - run with: npx tsx scripts/seed-cinematic-options.ts
import { createClient } from '@supabase/supabase-js';
import { ALL_CINEMATIC_OPTIONS } from '../src/lib/data/cinematic-options-seed';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log(`Seeding ${ALL_CINEMATIC_OPTIONS.length} cinematic options...`);

  // Clear existing
  const { error: deleteError } = await supabase
    .from('cinematic_options')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('Delete failed:', deleteError);
    process.exit(1);
  }

  // Insert in batches of 50
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

    if (insertError) {
      console.error(`Batch ${i / batchSize + 1} failed:`, insertError);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${ALL_CINEMATIC_OPTIONS.length}`);
  }

  console.log(`Done! Seeded ${inserted} cinematic options across 12 categories.`);
}

seed();
