import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PptxGenJS from 'pptxgenjs';
import type { ProjectContextData } from '@/lib/types/database';

// Node.js runtime required for pptxgenjs (not edge)
export const runtime = 'nodejs';

// ── Printer-friendly color palette (white background) ──
const BG = 'FFFFFF';
const HEADER_BG = '1B2A4A';    // Dark navy for header rows
const ACCENT = 'E63946';       // Professional red accent
const BLACK = '1A1A1A';        // Near-black for body text
const DARK_GRAY = '333333';    // Dark gray for headings
const MID_GRAY = '666666';     // Medium gray for secondary text
const LIGHT_GRAY = 'F2F2F2';   // Light gray for alternating rows
const TABLE_BORDER = 'CCCCCC'; // Light border for tables
const CELL_BG = 'FAFAFA';      // Very light gray for data cells
const FONT_TITLE = 'Arial';
const FONT_BODY = 'Arial';

// ── Helpers ──

function formatTimecode(startSec: number, durationSec: number): string {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  return `${fmt(startSec)} - ${fmt(startSec + durationSec)}`;
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
    const timeout = setTimeout(() => controller.abort(), 8000);
    // Use Promise.race as a hard guarantee the fetch cannot hang
    const res = await Promise.race([
      fetch(url, { signal: controller.signal }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Image fetch hard timeout')), 10000)),
    ]);
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// ── Context slide builder helpers ──

function addContextSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle: string) {
  // Top accent line
  slide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 13.33, h: 0.04,
    fill: { color: ACCENT },
  });

  // Section title
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.4, w: 11.73, h: 0.5,
    fontSize: 20, fontFace: FONT_TITLE, color: DARK_GRAY,
    bold: true, charSpacing: 3,
  });

  // Subtitle
  slide.addText(subtitle, {
    x: 0.8, y: 0.95, w: 11.73, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: MID_GRAY,
  });

  // Divider
  slide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0.8, y: 1.35, w: 2.5, h: 0.015,
    fill: { color: ACCENT },
  });
}

function addContextField(slide: PptxGenJS.Slide, label: string, value: string, x: number, y: number, w: number, h: number) {
  if (!value.trim()) return y;

  slide.addText(label.toUpperCase(), {
    x, y, w, h: 0.25,
    fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, charSpacing: 2,
  });

  slide.addText(value, {
    x, y: y + 0.28, w, h: h - 0.28,
    fontSize: 10, fontFace: FONT_BODY, color: BLACK,
    valign: 'top',
  });

  return y + h + 0.15;
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

    const totalDuration = shots.reduce((sum: number, s: Record<string, unknown>) => sum + (Number(s.duration_seconds) || 0), 0);
    const durationMin = Math.floor(totalDuration / 60);
    const durationSec = Math.floor(totalDuration % 60);
    const durationStr = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;

    const ctx = (project.context_data || {}) as ProjectContextData;
    const productionMode = project.project_mode === 'animation' ? 'Animation' : 'Live Action';

    // ════════════════════════════════════════════════
    // SLIDE 1: Title / Cover Page
    // ════════════════════════════════════════════════
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: BG };

    // Top accent line
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.05,
      fill: { color: ACCENT },
    });

    // Project title
    titleSlide.addText(project.title.toUpperCase(), {
      x: 0.8, y: 1.5, w: 11.73, h: 0.8,
      fontSize: 32, fontFace: FONT_TITLE, color: DARK_GRAY,
      bold: true,
    });

    // Subtitle
    titleSlide.addText('STORYBOARD', {
      x: 0.8, y: 2.3, w: 11.73, h: 0.5,
      fontSize: 16, fontFace: FONT_TITLE, color: ACCENT,
      bold: true, charSpacing: 4,
    });

    // Divider line
    titleSlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.1, w: 3.0, h: 0.02,
      fill: { color: ACCENT },
    });

    // Production mode + duration info
    titleSlide.addText(`${productionMode}  |  ${shots.length} Shots  |  ${durationStr} Total Duration`, {
      x: 0.8, y: 3.4, w: 11.73, h: 0.3,
      fontSize: 10, fontFace: FONT_BODY, color: MID_GRAY,
    });

    // Synopsis (from description or context)
    const synopsis = project.description || ctx.production_notes?.character_description || '';
    if (synopsis) {
      titleSlide.addText('SYNOPSIS', {
        x: 0.8, y: 4.0, w: 5.5, h: 0.3,
        fontSize: 10, fontFace: FONT_TITLE, color: DARK_GRAY,
        bold: true, charSpacing: 2,
      });
      titleSlide.addText(synopsis, {
        x: 0.8, y: 4.4, w: 5.5, h: 2.0,
        fontSize: 10, fontFace: FONT_BODY, color: MID_GRAY,
        valign: 'top',
      });
    }

    // Creative direction
    const direction = project.creative_direction || '';
    if (direction) {
      titleSlide.addText('CREATIVE DIRECTION', {
        x: 7.0, y: 4.0, w: 5.5, h: 0.3,
        fontSize: 10, fontFace: FONT_TITLE, color: DARK_GRAY,
        bold: true, charSpacing: 2,
      });
      titleSlide.addText(direction, {
        x: 7.0, y: 4.4, w: 5.5, h: 2.0,
        fontSize: 10, fontFace: FONT_BODY, color: MID_GRAY,
        valign: 'top',
      });
    }

    // Footer
    titleSlide.addText(
      `Exported from Cinema Studio`,
      {
        x: 0.8, y: 6.8, w: 11.73, h: 0.3,
        fontSize: 9, fontFace: FONT_BODY, color: TABLE_BORDER,
      }
    );

    // ════════════════════════════════════════════════
    // SLIDE 2: Production Notes
    // ════════════════════════════════════════════════
    const pn = ctx.production_notes;
    const hasProductionNotes = pn && (pn.inspiration || pn.references || pn.character_description || pn.casting_voice_talent);

    if (hasProductionNotes) {
      const pnSlide = pptx.addSlide();
      pnSlide.background = { color: BG };
      addContextSlideHeader(pnSlide, 'Production Notes', 'Inspiration, references, character descriptions, and casting direction');

      let y = 1.6;
      const leftW = 5.8;
      const rightX = 7.0;
      const rightW = 5.5;

      // Left column: Inspiration + References
      if (pn.inspiration) {
        y = addContextField(pnSlide, 'Inspiration / Concept', pn.inspiration, 0.8, y, leftW, 1.5);
      }
      if (pn.references) {
        y = addContextField(pnSlide, 'References', pn.references, 0.8, y, leftW, 1.5);
      }

      // Right column: Character Description + Casting
      let ry = 1.6;
      if (pn.character_description) {
        ry = addContextField(pnSlide, 'Character Descriptions', pn.character_description, rightX, ry, rightW, 2.5);
      }
      if (pn.casting_voice_talent) {
        ry = addContextField(pnSlide, 'Casting / Voice Talent', pn.casting_voice_talent, rightX, ry, rightW, 1.5);
      }

      // Footer
      pnSlide.addText(`${project.title}  |  Production Notes`, {
        x: 0.3, y: 7.0, w: 12.73, h: 0.3,
        fontSize: 7, fontFace: FONT_BODY, color: TABLE_BORDER,
      });
    }

    // ════════════════════════════════════════════════
    // SLIDE 3: Character Design
    // ════════════════════════════════════════════════
    const cd = ctx.character_design;
    const hasCharacterDesign = cd && (cd.style_references || cd.animation_style || cd.notes);

    if (hasCharacterDesign) {
      const cdSlide = pptx.addSlide();
      cdSlide.background = { color: BG };
      addContextSlideHeader(cdSlide, 'Character Design', 'Visual style, animation approach, and design references');

      let y = 1.6;
      if (cd.style_references) {
        y = addContextField(cdSlide, 'Style References', cd.style_references, 0.8, y, 11.73, 1.5);
      }
      if (cd.animation_style) {
        y = addContextField(cdSlide, 'Animation Style', cd.animation_style, 0.8, y, 11.73, 1.2);
      }
      if (cd.notes) {
        y = addContextField(cdSlide, 'Design Notes', cd.notes, 0.8, y, 11.73, 1.2);
      }

      cdSlide.addText(`${project.title}  |  Character Design`, {
        x: 0.3, y: 7.0, w: 12.73, h: 0.3,
        fontSize: 7, fontFace: FONT_BODY, color: TABLE_BORDER,
      });
    }

    // ════════════════════════════════════════════════
    // SLIDE 4: Atmosphere / Tone / Direction
    // ════════════════════════════════════════════════
    const atm = ctx.atmosphere;
    const hasAtmosphere = atm && (atm.narration_style || atm.timing_notes || atm.humor_notes || atm.sound_design || atm.color_palette || atm.font_preference);

    if (hasAtmosphere) {
      const atmSlide = pptx.addSlide();
      atmSlide.background = { color: BG };
      addContextSlideHeader(atmSlide, 'Atmosphere / Tone / Direction', 'Narration, pacing, sound design, color palette, and typography');

      // 2-column grid for atmosphere fields
      const leftX = 0.8;
      const leftW = 5.5;
      const rightX = 7.0;
      const rightW = 5.5;

      let ly = 1.6;
      let ry = 1.6;

      if (atm.narration_style) {
        ly = addContextField(atmSlide, 'Narration Style', atm.narration_style, leftX, ly, leftW, 1.2);
      }
      if (atm.timing_notes) {
        ry = addContextField(atmSlide, 'Timing / Pacing', atm.timing_notes, rightX, ry, rightW, 1.2);
      }
      if (atm.humor_notes) {
        ly = addContextField(atmSlide, 'Humor / Tone', atm.humor_notes, leftX, ly, leftW, 1.2);
      }
      if (atm.sound_design) {
        ry = addContextField(atmSlide, 'Sound Design', atm.sound_design, rightX, ry, rightW, 1.2);
      }
      if (atm.color_palette) {
        ly = addContextField(atmSlide, 'Color Palette', atm.color_palette, leftX, ly, leftW, 1.2);
      }
      if (atm.font_preference) {
        ry = addContextField(atmSlide, 'Typography / Font', atm.font_preference, rightX, ry, rightW, 1.2);
      }

      atmSlide.addText(`${project.title}  |  Atmosphere / Tone / Direction`, {
        x: 0.3, y: 7.0, w: 12.73, h: 0.3,
        fontSize: 7, fontFace: FONT_BODY, color: TABLE_BORDER,
      });
    }

    // ════════════════════════════════════════════════
    // SHOT SLIDES: Table format matching reference storyboard
    // SHOT | CAM | ANIMATION MOVEMENTS | FRAME | VO / DIALOG | TIME
    // ════════════════════════════════════════════════

    // Pre-fetch all images in parallel
    const imagePromises = shots.map((s: Record<string, unknown>) =>
      s.image_url ? fetchImageAsBase64(s.image_url as string) : Promise.resolve(null)
    );
    const images = await Promise.all(imagePromises);

    let runningTime = 0;

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const shotSlide = pptx.addSlide();
      shotSlide.background = { color: BG };

      const duration = Number(shot.duration_seconds) || 4;
      const timecode = formatTimecode(runningTime, duration);
      const shotNum = String(shot.sort_order ?? i + 1);
      const camType = formatShotType(shot.shot_type);
      const camMovement = formatCameraMovement(shot.camera_movement);
      const camInfo = [camType, camMovement].filter(Boolean).join('\n');
      const actionDesc = shot.description || '';
      const voDialog = shot.dialogue || shot.narration || '';
      const imageData = images[i];

      // ── Page header ──
      shotSlide.addText(`${project.title}  -  Storyboard`, {
        x: 0.3, y: 0.15, w: 9.0, h: 0.3,
        fontSize: 9, fontFace: FONT_TITLE, color: MID_GRAY,
      });
      shotSlide.addText(`Shot ${shotNum} of ${shots.length}`, {
        x: 9.3, y: 0.15, w: 3.8, h: 0.3,
        fontSize: 9, fontFace: FONT_TITLE, color: MID_GRAY, align: 'right',
      });

      // Thin line under header
      shotSlide.addShape(pptx.ShapeType.rect, {
        x: 0.3, y: 0.5, w: 12.73, h: 0.01,
        fill: { color: TABLE_BORDER },
      });

      // ── Shot info table (reference format) ──
      const headerOpts = {
        fontSize: 8,
        fontFace: FONT_TITLE,
        color: 'FFFFFF',
        bold: true,
        fill: { color: HEADER_BG },
        align: 'center' as const,
        valign: 'middle' as const,
      };

      const cellOpts = {
        fontSize: 10,
        fontFace: FONT_BODY,
        color: BLACK,
        fill: { color: CELL_BG },
        valign: 'top' as const,
      };

      const tableRows: PptxGenJS.TableRow[] = [
        // Header row
        [
          { text: 'SHOT', options: { ...headerOpts } },
          { text: 'CAM', options: { ...headerOpts } },
          { text: 'ANIMATION MOVEMENTS', options: { ...headerOpts } },
          { text: 'FRAME', options: { ...headerOpts } },
          { text: 'VO / DIALOG', options: { ...headerOpts } },
          { text: 'TIME', options: { ...headerOpts } },
        ],
        // Data row
        [
          { text: shotNum, options: { ...cellOpts, fontSize: 16, bold: true, align: 'center' as const, valign: 'middle' as const } },
          { text: camInfo || '-', options: { ...cellOpts, fontSize: 9, align: 'center' as const, valign: 'middle' as const } },
          { text: actionDesc || '-', options: { ...cellOpts, fontSize: 9 } },
          { text: '', options: { fill: { color: CELL_BG } } }, // Image placed separately
          { text: voDialog || '-', options: { ...cellOpts, fontSize: 9 } },
          { text: timecode, options: { ...cellOpts, fontSize: 9, bold: true, color: ACCENT, align: 'center' as const, valign: 'middle' as const } },
        ],
      ];

      shotSlide.addTable(tableRows, {
        x: 0.3, y: 0.65, w: 12.7,
        colW: [0.7, 1.2, 3.8, 3.0, 3.0, 1.0],
        rowH: [0.3, 2.2],
        border: { type: 'solid', pt: 0.5, color: TABLE_BORDER },
        margin: [4, 6, 4, 6],
      });

      // ── Frame image in FRAME column ──
      if (imageData) {
        shotSlide.addImage({
          data: imageData,
          x: 6.1, y: 1.0, w: 2.85, h: 1.8,
          sizing: { type: 'contain', w: 2.85, h: 1.8 },
        });
      } else {
        shotSlide.addText('No frame\ngenerated', {
          x: 6.1, y: 1.0, w: 2.85, h: 1.8,
          fontSize: 9, fontFace: FONT_BODY, color: TABLE_BORDER,
          align: 'center', valign: 'middle',
        });
      }

      // ── Large reference image below table ──
      if (imageData) {
        shotSlide.addImage({
          data: imageData,
          x: 0.3, y: 3.1, w: 7.2, h: 4.0,
          sizing: { type: 'contain', w: 7.2, h: 4.0 },
        });

        shotSlide.addShape(pptx.ShapeType.rect, {
          x: 0.3, y: 3.1, w: 7.2, h: 4.0,
          line: { color: TABLE_BORDER, width: 0.5 },
          fill: { type: 'none' },
        });
      }

      // ── Shot details (right side) ──
      const detailsX = 7.8;
      let detailsY = 3.1;

      if (shot.title) {
        shotSlide.addText(shot.title, {
          x: detailsX, y: detailsY, w: 5.2, h: 0.4,
          fontSize: 14, fontFace: FONT_TITLE, color: DARK_GRAY, bold: true,
        });
        detailsY += 0.5;
      }

      shotSlide.addShape(pptx.ShapeType.rect, {
        x: detailsX, y: detailsY, w: 2.0, h: 0.015,
        fill: { color: ACCENT },
      });
      detailsY += 0.2;

      shotSlide.addText('SHOT DETAILS', {
        x: detailsX, y: detailsY, w: 5.2, h: 0.25,
        fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, charSpacing: 2,
      });
      detailsY += 0.3;

      const detailLines = [];
      if (camType) detailLines.push(`Shot Type: ${camType}`);
      if (camMovement) detailLines.push(`Camera: ${camMovement}`);
      if (shot.focal_length) detailLines.push(`Lens: ${shot.focal_length}`);
      detailLines.push(`Duration: ${duration}s`);
      detailLines.push(`Timecode: ${timecode}`);

      shotSlide.addText(detailLines.join('\n'), {
        x: detailsX, y: detailsY, w: 5.2, h: 1.0,
        fontSize: 9, fontFace: FONT_BODY, color: MID_GRAY,
        valign: 'top',
      });
      detailsY += 1.1;

      const notes = shot.nano_prompt || shot.veo_prompt || '';
      if (notes) {
        shotSlide.addText('NOTES', {
          x: detailsX, y: detailsY, w: 5.2, h: 0.25,
          fontSize: 8, fontFace: FONT_TITLE, color: ACCENT, bold: true, charSpacing: 2,
        });
        detailsY += 0.3;

        shotSlide.addText(notes, {
          x: detailsX, y: detailsY, w: 5.2, h: 1.8,
          fontSize: 8, fontFace: FONT_BODY, color: MID_GRAY,
          valign: 'top',
        });
      }

      // Footer
      shotSlide.addShape(pptx.ShapeType.rect, {
        x: 0.3, y: 7.2, w: 12.73, h: 0.01,
        fill: { color: TABLE_BORDER },
      });
      shotSlide.addText(`${project.title}`, {
        x: 0.3, y: 7.22, w: 6.0, h: 0.2,
        fontSize: 7, fontFace: FONT_BODY, color: MID_GRAY,
      });
      shotSlide.addText(`Cinema Studio Export`, {
        x: 6.3, y: 7.22, w: 6.73, h: 0.2,
        fontSize: 7, fontFace: FONT_BODY, color: MID_GRAY, align: 'right',
      });

      runningTime += duration;
    }

    // ════════════════════════════════════════════════
    // FINAL SLIDE: Summary
    // ════════════════════════════════════════════════
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: BG };

    summarySlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.05,
      fill: { color: ACCENT },
    });

    summarySlide.addText('STORYBOARD COMPLETE', {
      x: 0.8, y: 2.5, w: 11.73, h: 0.6,
      fontSize: 28, fontFace: FONT_TITLE, color: DARK_GRAY, bold: true,
    });

    summarySlide.addText(project.title.toUpperCase(), {
      x: 0.8, y: 3.2, w: 11.73, h: 0.5,
      fontSize: 14, fontFace: FONT_TITLE, color: ACCENT, charSpacing: 4,
    });

    summarySlide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 3.9, w: 3.0, h: 0.02,
      fill: { color: ACCENT },
    });

    summarySlide.addText(
      `${shots.length} Shots  |  ${durationStr} Total Duration  |  ${productionMode}`,
      {
        x: 0.8, y: 4.3, w: 11.73, h: 0.4,
        fontSize: 12, fontFace: FONT_BODY, color: MID_GRAY,
      }
    );

    summarySlide.addText(
      'Generated by Cinema Studio',
      {
        x: 0.8, y: 5.0, w: 11.73, h: 0.3,
        fontSize: 9, fontFace: FONT_BODY, color: TABLE_BORDER,
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
