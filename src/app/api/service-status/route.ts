import { NextResponse } from 'next/server';

// Returns which external services are configured (have API keys set).
// Called once on workspace load to adjust UI (disable buttons, show warnings).
export async function GET() {
  return NextResponse.json({
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    heygen: !!process.env.HEYGEN_API_KEY,
    google_ai: !!process.env.GOOGLE_AI_API_KEY,
    kie: !!process.env.KIE_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  });
}
