import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

// AI Sidebar: routes chat messages to Anthropic Claude for each tool
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length < 2) {
      return NextResponse.json({ error: 'Messages array with system and user messages is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY.' }, { status: 500 });
    }

    // Separate the system prompt from the conversation messages
    const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
    const conversationMessages = messages
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    if (conversationMessages.length === 0) {
      return NextResponse.json({ error: 'At least one user message is required' }, { status: 400 });
    }

    // 60-second timeout to prevent infinite hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemMessage?.content || '',
          messages: conversationMessages,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
      return NextResponse.json({
        error: isAbort ? 'Request timed out after 60 seconds. Try a shorter message.' : `Connection failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
      }, { status: isAbort ? 504 : 502 });
    }
    clearTimeout(timeoutId);

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errBody);
      return NextResponse.json({
        error: `AI request failed (${anthropicRes.status}): ${errBody.substring(0, 200)}`,
      }, { status: 502 });
    }

    const result = await anthropicRes.json();

    // Extract text content from Anthropic's response format
    const textBlocks = result.content?.filter((block: { type: string }) => block.type === 'text') || [];
    const content = textBlocks.map((block: { text: string }) => block.text).join('\n\n');

    return NextResponse.json({
      content: content || 'No response generated.',
      model: result.model,
      usage: result.usage,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI Sidebar error:', msg);
    return NextResponse.json({ error: `Unexpected: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
