import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'empiremediacontent@gmail.com';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, category, severity, page_section, reporter_email } = body;

    // Use Supabase's built-in email via Edge Function or a simple webhook
    // For now, we'll use a database-triggered approach:
    // Insert a notification record that can be picked up by a webhook or checked manually
    //
    // If you want real email, you can set up a Supabase Edge Function with Resend/SendGrid,
    // or use a simple fetch to an email API here.
    //
    // For immediate functionality, we'll try Resend if the API key is available
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Cinema Studio <notifications@cinemastudio.app>',
          to: ADMIN_EMAIL,
          subject: `[${severity.toUpperCase()}] New ${category} feedback: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #0a0a0a; padding: 24px; border-bottom: 2px solid #ff2d7b;">
                <h1 style="color: #fff; font-size: 16px; margin: 0; letter-spacing: 0.05em;">CINEMA STUDIO FEEDBACK</h1>
              </div>
              <div style="background: #111; padding: 24px; color: #ccc; font-size: 14px; line-height: 1.6;">
                <p style="margin: 0 0 8px;"><strong style="color: #fff;">Title:</strong> ${title}</p>
                <p style="margin: 0 0 8px;"><strong style="color: #fff;">Category:</strong> ${category}</p>
                <p style="margin: 0 0 8px;"><strong style="color: #fff;">Severity:</strong> <span style="color: ${severity === 'critical' ? '#ef4444' : severity === 'high' ? '#f97316' : severity === 'medium' ? '#facc15' : '#4ade80'};">${severity}</span></p>
                <p style="margin: 0 0 8px;"><strong style="color: #fff;">Section:</strong> ${page_section}</p>
                <p style="margin: 0 0 16px;"><strong style="color: #fff;">Reported by:</strong> ${reporter_email}</p>
                <a href="https://jv-cinema-studio.netlify.app/feedback/admin" style="display: inline-block; padding: 10px 20px; background: #ff2d7b; color: #fff; text-decoration: none; font-weight: bold; letter-spacing: 0.05em;">VIEW IN DASHBOARD</a>
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
