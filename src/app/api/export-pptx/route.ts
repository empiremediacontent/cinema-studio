import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PptxGenJS from 'pptxgenjs';

// Node.js runtime required for pptxgenjs (not edge)
export const runtime = 'nodejs';

// ── Color palette ──
const BG = '0a0a0a';
const CARD = '111111';
const ACCENT = 'ff2d7b';
const WHITE = 'ffffff';
const MUTED = '999999';
const TABLE_BORDER = '333333';
const FONT_TITLE = 'Montserrat';
const FONT_BODY = 'Raleway';

// ── Helpers ──

function formatTimecode(startSec: number, durationSec: number): string {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  return `${fmt(startSec)}-${fmt(startSec + durationSec)}`;
}

function formatShotType(type: string | null): string {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCameraMovement(movement: string | null): string {
  if (!movement) return '';
  return movement
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/png';
    // pptxgenjs expects the base64 string with data URI prefix
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ── Main handler ──

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch shots ordered by sort_order
    const { data: shots } = await supabase
      .from('shots')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (!shots || shots.length === 0) {
      return NextResponse.json({
        error: 'No shots found. Generate a storyboard before exporting.',
      }, { status: 400 });
    }

    // ── Build PPTX ──
    const pptx = new PptxGenJS();
    pptx.author = 'Cinema Studio';
    pptx.title = `${project.title} - Storyboard`;
    pptx.subject = 'Storyboard Export';
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

    // ════════════════════════════════════════════════
    // SLIDE 1: Title / Production Notes
    // ════════════════════════════════════════════════
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: BG };

    // Accent bar at top
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.06,
      fill: { color: ACCENT },
    });

    // Title
    titleSlide.addText(`${project.title}`, {
      x: 0.8, y: 1.2, w: 11.73, h: 0.8,
      fontSize: 36, fontFace: FONT_TITLE, color: WHITE,
      bold: true,
    });

    titleSlide.addText('STORYBOARD', {
      x: 0.8, y: 2.0, w: 11.73, h: 0.5,
      fontSize: 14, fontFace: FONT_TITLE, color: ACCENT,
      bold: true, charSpacing: 6,
    });

    // Description / synopsis
    const synopsis = project.description || '';
    if (synopsis) {
      titleSlide.addText('Production Notes', {
        x: 0.8, y: 3.2, w: 5.5, h: 0.4,
        fontSize: 11, fontFace: FONT_TITLE, color: ACCENT,
        bold: true, charSpacing: 3,
      });
      titleSlide.addText(synopsis, {
        x: 0.8, y: 3.7, w: 5.5, h: 2.5,
        fontSize: 11, fontFace: FONT_BODY, color: MUTED,
        valign: 'top', lineSpacingMultiple: 1.4,
      });
    }

    // Creative direction
    const direction = project.creative_direction || '';
    if (direction) {
      titleSlide.addText('Creative Direction', {
        x: 7.0, y: 3.2, w: 5.5, h: 0.4,
        fontSize: 11, fontFace: FONT_TITLE, color: ACCENT,
        bold: true, charSpacing: 3,
      });
      titleSlide.addText(direction, {
        x: 7.0, y: 3.7, w: 5.5, h: 2.5,
        fontSize: 11, fontFace: FONT_BODY, color: MUTED,
        valign: 'top', lineSpacingMultiple: 1.4,
      });
    }

    // Footer info
    const totalDuration = shots.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);
    const durationMin = Math.floor(totalDuration / 60);
    const durationSec = Math.floor(totalDuration % 60);
    titleSlide.addText(
      `${shots.length} shots  |  ${durationMin}:${durationSec.toString().padStart(2, '0')} total duration  |  Exported from Cinema Studio`,
      {
        x: 0.8, y: 6.6, w: 11.73, h: 0.4,
        fontSize: 9, fontFace: FONT_BODY, color: MUTED,
      }
    );

    // ════════════════════════════════════════════════
    // SHOT SLIDES: One slide per shot (matching PPTX template)
    // Table: SHOT | CAM | Animation Movements | FRAME | VO_DIALOG | Time
    // + Reference image below table
    // ════════════════════════════════════════════════

    // Pre-fetch all images in parallel
    const imagePromises = shots.map(s =>
      s.image_url ? fetchImageAsBase64(s.image_url) : Promise.resolve(null)
    );
    const images = await Promise.all(imagePromises);

    let runningTime = 0;

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const shotSlide = pptx.addSlide();
      shotSlide.background = { color: BG };

      // Accent bar at top
      shotSlide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 13.33, h: 0.04,
        fill: { color: ACCENT },
      });

      const duration = Number(shot.duration_seconds) || 8;
      const timecode = formatTimecode(runningTime, duration);
      const shotNum = String(shot.sort_order ?? i + 1);
      const camInfo = [formatShotType(shot.shot_type), formatCameraMovement(shot.camera_movement)]
        .filter(Boolean).join('\n');
      const actionDesc = shot.description || '';
      const voDialog = shot.dialogue || shot.narration || '';

      // ── Shot info table ──
      const tableRows: PptxGenJS.TableRow[] = [
        // Header row
        [
          { text: 'SHOT', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
          { text: 'CAM', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
          { text: 'ANIMATION MOVEMENTS', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
          { text: 'FRAME', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
          { text: 'VO / DIALOG', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
          { text: 'TIME', options: { fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: '1a1a1a' }, align: 'center', valign: 'middle' } },
        ],
        // Data row
        [
          { text: shotNum, options: { fontSize: 14, fontFace: FONT_TITLE, color: WHITE, bold: true, fill: { color: CARD }, align: 'center', valign: 'middle' } },
          { text: camInfo || '-', options: { fontSize: 10, fontFace: FONT_BODY, color: WHITE, fill: { color: CARD }, align: 'center', valign: 'middle' } },
          { text: actionDesc || '-', options: { fontSize: 10, fontFace: FONT_BODY, color: WHITE, fill: { color: CARD }, valign: 'top' } },
          { text: '', options: { fill: { color: CARD } } }, // Frame column - image placed separately
          { text: voDialog || '-', options: { fontSize: 10, fontFace: FONT_BODY, color: WHITE, fill: { color: CARD }, valign: 'top' } },
          { text: timecode, options: { fontSize: 10, fontFace: FONT_TITLE, color: ACCENT, bold: true, fill: { color: CARD }, align: 'center', valign: 'middle' } },
        ],
      ];

      // Column widths: SHOT(0.7) CAM(1.3) ANIMATION(4.0) FRAME(2.8) VO_DIALOG(3.2) TIME(1.0) = 13.0
      shotSlide.addTable(tableRows, {
        x: 0.17, y: 0.3, w: 13.0,
        colW: [0.7, 1.3, 4.0, 2.8, 3.2, 1.0],
        rowH: [0.35, 2.0],
        border: { type: 'solid', pt: 0.5, color: TABLE_BORDER },
        margin: [4, 6, 4, 6],
      });

      // ── Embed frame image in the FRAME column ──
      const imageData = images[i];
      if (imageData) {
        shotSlide.addImage({
          data: imageData,
          x: 6.2, y: 0.68, w: 2.7, h: 1.55,
          sizing: { type: 'contain', w: 2.7, h: 1.55 },
        });
      } else {
        // Placeholder text when no image
        shotSlide.addText('No frame\ngenerated', {
          x: 6.2, y: 0.68, w: 2.7, h: 1.55,
          fontSize: 9, fontFace: FONT_BODY, color: MUTED,
          align: 'center', valign: 'middle',
        });
      }

      // ── Large reference image below table ──
      if (imageData) {
        shotSlide.addImage({
          data: imageData,
          x: 0.17, y: 2.7, w: 7.5, h: 4.2,
          sizing: { type: 'contain', w: 7.5, h: 4.2 },
        });
      }

      // ── Shot details sidebar (right of reference image) ──
      const detailsX = 8.0;
      let detailsY = 2.7;

      // Shot title
      if (shot.title) {
        shotSlide.addText(shot.title, {
          x: detailsX, y: detailsY, w: 5.0, h: 0.4,
          fontSize: 14, fontFace: FONT_TITLE, color: WHITE, bold: true,
        });
        detailsY += 0.5;
      }

      // Notes label
      shotSlide.addText('NOTES', {
        x: detailsX, y: detailsY, w: 5.0, h: 0.3,
        fontSize: 9, fontFace: FONT_TITLE, color: ACCENT, bold: true, charSpacing: 3,
      });
      detailsY += 0.35;

      // Nano prompt / generation prompt as notes
      const notes = shot.nano_prompt || shot.veo_prompt || '';
      if (notes) {
        shotSlide.addText(notes, {
          x: detailsX, y: detailsY, w: 5.0, h: 1.5,
          fontSize: 9, fontFace: FONT_BODY, color: MUTED,
          valign: 'top', lineSpacingMultiple: 1.4,
        });
        detailsY += 1.6;
      }

      // Duration callout
      shotSlide.addText(`${duration}s`, {
        x: detailsX, y: detailsY, w: 1.0, h: 0.5,
        fontSize: 24, fontFace: FONT_TITLE, color: ACCENT, bold: true,
      });
      shotSlide.addText('duration', {
        x: detailsX + 1.0, y: detailsY + 0.1, w: 2.0, h: 0.3,
        fontSize: 9, fontFace: FONT_BODY, color: MUTED,
      });

      // Slide number footer
      shotSlide.addText(`Shot ${shotNum} of ${shots.length}`, {
        x: 0.17, y: 7.1, w: 4.0, h: 0.3,
        fontSize: 8, fontFace: FONT_BODY, color: MUTED,
      });
      shotSlide.addText(project.title, {
        x: 9.0, y: 7.1, w: 4.17, h: 0.3,
        fontSize: 8, fontFace: FONT_BODY, color: MUTED, align: 'right',
      });

      runningTime += duration;
    }

    // ════════════════════════════════════════════════
    // FINAL SLIDE: Summary
    // ════════════════════════════════════════════════
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: BG };

    summarySlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.06,
      fill: { color: ACCENT },
    });

    summarySlide.addText('STORYBOARD COMPLETE', {
      x: 0.8, y: 2.5, w: 11.73, h: 0.6,
      fontSize: 28, fontFace: FONT_TITLE, color: WHITE, bold: true,
    });

    summarySlide.addText(project.title, {
      x: 0.8, y: 3.2, w: 11.73, h: 0.5,
      fontSize: 14, fontFace: FONT_TITLE, color: ACCENT, charSpacing: 4,
    });

    summarySlide.addText(
      `${shots.length} shots  |  ${durationMin}:${durationSec.toString().padStart(2, '0')} total  |  Generated by Cinema Studio`,
      {
        x: 0.8, y: 4.2, w: 11.73, h: 0.4,
        fontSize: 11, fontFace: FONT_BODY, color: MUTED,
      }
    );

    // ── Generate and return ──
    const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const uint8 = new Uint8Array(pptxBuffer);

    const filename = `${project.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Storyboard.pptx`;

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pptxBuffer.length),
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('PPTX export error:', msg);
    return NextResponse.json({ error: `Export failed: ${msg.substring(0, 300)}` }, { status: 500 });
  }
}
