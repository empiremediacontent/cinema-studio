const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat,
} = require('docx');

// Design tokens
const ACCENT = 'FF2D7B';
const ACCENT_BG = 'FFF0F5';
const DARK = '111111';
const DARK_BG = 'F5F5F5';
const BORDER_COLOR = 'DDDDDD';
const TEXT_SECONDARY = '666666';

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Page dimensions (US Letter, 1-inch margins)
const PAGE_WIDTH = 12240;
const MARGINS = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS * 2; // 9360

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 }, children: [new TextRun({ text, font: 'Arial', bold: true, color: DARK })] });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    ...opts,
    children: [new TextRun({ text, font: 'Arial', size: 22, color: opts.color || '333333', ...opts.run })],
  });
}

function richPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    ...opts,
    children: runs.map(r => new TextRun({ font: 'Arial', size: 22, color: '333333', ...r })),
  });
}

function tipBox(title, body) {
  // A single-cell table styled as a callout box
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 3, color: ACCENT }, bottom: thinBorder, left: thinBorder, right: thinBorder },
            shading: { fill: ACCENT_BG, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, font: 'Arial', size: 20, bold: true, color: ACCENT })] }),
              new Paragraph({ children: [new TextRun({ text: body, font: 'Arial', size: 20, color: '555555' })] }),
            ],
          }),
        ],
      }),
    ],
  });
}

function featureTable(headers, rows) {
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const colWidths = headers.map((_, i) => i === colCount - 1 ? CONTENT_WIDTH - colWidth * (colCount - 1) : colWidth);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      // Header row
      new TableRow({
        children: headers.map((h, i) =>
          new TableCell({
            borders,
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: DARK, type: ShadingType.CLEAR },
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: h, font: 'Arial', size: 20, bold: true, color: 'FFFFFF' })] })],
          })
        ),
      }),
      // Data rows
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, i) =>
            new TableCell({
              borders,
              width: { size: colWidths[i], type: WidthType.DXA },
              shading: { fill: ri % 2 === 0 ? 'FFFFFF' : DARK_BG, type: ShadingType.CLEAR },
              margins: cellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Arial', size: 20, color: '333333' })] })],
            })
          ),
        })
      ),
    ],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: '333333' })],
  });
}

function numberItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'steps', level },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: '333333' })],
  });
}

// ========== BUILD DOCUMENT ==========

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: ACCENT },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }, {
          level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
        }],
      },
      {
        reference: 'steps',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  sections: [
    // ==================== COVER PAGE ====================
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGINS, right: MARGINS, bottom: MARGINS, left: MARGINS },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 3600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'CINEMA STUDIO', font: 'Arial', size: 60, bold: true, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: 'Editor Manual', font: 'Arial', size: 36, color: ACCENT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'A complete guide to every feature, tool, and workflow', font: 'Arial', size: 22, color: TEXT_SECONDARY })],
        }),
        new Paragraph({ spacing: { before: 2400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Version 1.0  |  March 2026', font: 'Arial', size: 20, color: TEXT_SECONDARY })],
        }),
      ],
    },

    // ==================== TABLE OF CONTENTS ====================
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGINS, right: MARGINS, bottom: MARGINS, left: MARGINS },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'Cinema Studio Editor Manual', font: 'Arial', size: 16, color: TEXT_SECONDARY, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Page ', font: 'Arial', size: 18, color: TEXT_SECONDARY }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: TEXT_SECONDARY })],
          })],
        }),
      },
      children: [
        heading('Table of Contents'),
        para('This manual covers every section and feature in Cinema Studio. Use this as your go-to reference when working on any project.'),
        new Paragraph({ spacing: { after: 120 } }),
        ...[
          '1. Getting Started: The Workspace',
          '2. Script Tab: Writing Your Screenplay',
          '3. Synopsis Panel: Context for AI Generation',
          '4. Shots Tab: Managing Your Storyboard',
          '5. Shot Card: Generating Images, Video, and Audio',
          '6. Loadout Tab: Cinematography Settings',
          '7. Per-Shot Cinematography Quick Select',
          '8. Characters Tab: Talent Management',
          '9. Timeline Tab: Sequence Visualization',
          '10. Assets Tab: Media Library and Organization',
          '11. Mood Board Tab: Visual Inspiration',
          '12. Best Practices for Better AI Outputs',
          '13. Workflow Cheat Sheet',
        ].map(item => bulletItem(item)),

        // ==================== 1. GETTING STARTED ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('1. Getting Started: The Workspace'),
        para('When you open a project in Cinema Studio, you land in the Workspace. This is the central hub where all production happens. The workspace is split into two parts: the Synopsis Panel on the left sidebar, and the main tabbed content area on the right.'),

        heading('Workspace Tabs', HeadingLevel.HEADING_2),
        para('The top of the main content area has seven tabs. Each tab controls a different stage of your production:'),
        featureTable(
          ['Tab', 'Purpose', 'When to Use'],
          [
            ['Script', 'Write and edit your screenplay', 'First step. Write your full script here before doing anything else.'],
            ['Shots', 'View and manage generated shot cards', 'After generating your storyboard. Edit descriptions, generate images and video.'],
            ['Characters', 'Create and assign talent/characters', 'Before generating dialogue. Set up your cast first.'],
            ['Loadout', 'Configure cinematography settings', 'Before generating images. Set your visual style globally.'],
            ['Timeline', 'Visualize shot sequence chronologically', 'After shots are generated. Review pacing and flow.'],
            ['Assets', 'Manage uploaded and generated media files', 'Ongoing. Organize your talent photos, backgrounds, audio, and generated media.'],
            ['Mood Board', 'Collect and arrange visual inspiration', 'Early in production. Gather reference images, draw notes, add text.'],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),
        tipBox('Recommended Workflow Order', 'Script > Synopsis > Generate Storyboard > Loadout > Shots (generate images/video) > Characters > Timeline review. This order gives the AI the most context at each step.'),

        // ==================== 2. SCRIPT TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('2. Script Tab: Writing Your Screenplay'),
        para('The Script tab is your full-screen writing environment. This is where you write or paste your entire screenplay. The AI will never modify what you write here; your script is treated as sacred text.'),

        heading('Features', HeadingLevel.HEADING_3),
        featureTable(
          ['Feature', 'What It Does'],
          [
            ['Script Editor', 'Large textarea for writing your screenplay. Supports standard screenplay format: INT./EXT. scene headings, CHARACTER NAMES in caps, dialogue, narration (V.O.), and action lines.'],
            ['Auto-Save', 'Your script saves automatically 2 seconds after you stop typing. You will see a "Saving..." indicator followed by a "Saved at [time]" confirmation.'],
            ['Word Count', 'Displays the total number of words in your script, updated in real time.'],
            ['Character Count', 'Displays total characters, formatted with commas for readability.'],
            ['Script Protection', 'The AI is instructed to never rewrite, rephrase, or alter your script. It decomposes your writing into shots and generates visual prompts, but your words stay exactly as written.'],
          ]
        ),

        new Paragraph({ spacing: { after: 200 } }),
        tipBox('Best Practice', 'Write your script BEFORE generating a storyboard. The more detail you include (scene descriptions, lighting notes, camera cues, dialogue), the better your generated shots will be. The AI reads your entire script to determine shot breakdowns.'),

        heading('Example Script Input', HeadingLevel.HEADING_3),
        para('Here is what a well-structured script looks like in the editor:', { spacing: { after: 80 } }),

        // Code-style box
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [new TableRow({ children: [new TableCell({
            borders,
            shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'INT. COFFEE SHOP - MORNING', font: 'Courier New', size: 20, bold: true, color: '333333' })] }),
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Warm golden light filters through rain-streaked windows.', font: 'Courier New', size: 20, color: '555555' })] }),
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'A barista wipes down the counter as MAYA (28, determined) enters.', font: 'Courier New', size: 20, color: '555555' })] }),
              new Paragraph({ spacing: { after: 60 } }),
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'MAYA', font: 'Courier New', size: 20, bold: true, color: '333333' })] }),
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'I need the biggest coffee you have. It has been a day.', font: 'Courier New', size: 20, color: '555555' })] }),
              new Paragraph({ spacing: { after: 60 } }),
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'NARRATOR (V.O.)', font: 'Courier New', size: 20, bold: true, color: '333333' })] }),
              new Paragraph({ children: [new TextRun({ text: 'Maya had no idea this coffee shop would change everything.', font: 'Courier New', size: 20, color: '555555' })] }),
            ],
          })] })],
        }),

        // ==================== 3. SYNOPSIS PANEL ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('3. Synopsis Panel: Context for AI Generation'),
        para('The Synopsis Panel lives in the left sidebar and stays visible no matter which tab you are on. It gives the AI additional context about your project so the generated shots, images, and video match your creative vision.'),

        heading('Fields', HeadingLevel.HEADING_3),
        featureTable(
          ['Field', 'What to Write', 'Example'],
          [
            ['Synopsis', 'A summary of your story, characters, setting, and arc. The more context the AI has about the overall narrative, the better it generates individual shots.', 'A burned-out detective returns to her hometown to investigate a string of disappearances linked to a local tech company. Tone: neo-noir thriller with warm amber interiors and cold blue exteriors.'],
            ['Creative Direction', 'Mood, visual style, color palette, references. Think of this as your director notes.', 'Inspired by Blade Runner 2049 and Mindhunter. Desaturated palette with selective color pops. Heavy use of silhouettes and backlit frames.'],
            ['Target Duration', 'How long the final video should be. Determines how many shots the AI generates.', 'Select from presets (30s, 1m, 2m, 3m, 5m, 10m, 15m) or enter a custom duration.'],
          ]
        ),

        new Paragraph({ spacing: { after: 200 } }),
        heading('Generate Storyboard Button', HeadingLevel.HEADING_3),
        para('Once your script is written and your synopsis/direction fields are filled in, click "Generate Storyboard" at the bottom of the Synopsis Panel. The AI will analyze your script and break it into individual shots, each with a description, shot type, and suggested visual prompt. The generated shots appear in the Shots tab.'),
        tipBox('Optimization Tip', 'The synopsis field is the single biggest lever for output quality. A detailed synopsis with character descriptions, setting details, and tonal guidance will produce dramatically better results than leaving it blank.'),

        // ==================== 4. SHOTS TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('4. Shots Tab: Managing Your Storyboard'),
        para('The Shots tab displays all generated shots as individual cards. You can browse, edit, and generate media for each shot here.'),

        heading('Shot List Controls', HeadingLevel.HEADING_3),
        featureTable(
          ['Control', 'What It Does'],
          [
            ['Pagination (Prev / Next)', 'Shots are displayed 3 per page. Use these buttons to navigate between pages.'],
            ['Page Indicator', 'Shows "Page X of Y" so you know where you are in the sequence.'],
            ['Jump to Shot', 'Dropdown that lets you jump directly to any shot by number.'],
            ['Add Shot', 'Creates a new blank shot at the end of the sequence. Use this to manually add shots the AI did not generate.'],
            ['Shot Count', 'Displays total number of shots and how many have generated images.'],
            ['Total Duration', 'Sums all shot durations to show estimated project length.'],
          ]
        ),

        // ==================== 5. SHOT CARD ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('5. Shot Card: Generating Images, Video, and Audio'),
        para('Each shot card is an expandable panel with four accordion sections. Click any section header to expand or collapse it.'),

        heading('Shot Card Header', HeadingLevel.HEADING_3),
        para('The header shows the shot number, shot type badge (Wide, Medium, Close-Up, etc.), title, and description. Click any text field to edit it inline. The shot type determines framing and can be changed at any time.'),

        heading('Image Section', HeadingLevel.HEADING_3),
        para('Click the Image accordion to expand it. If no image has been generated, you will see a "Generate Image" button. Click it and the AI will create a cinematic still frame based on the shot description and your Loadout cinematography settings.'),
        richPara([
          { text: 'Once an image is generated, you get three action buttons: ' },
          { text: 'Download', bold: true },
          { text: ' (saves the file to your computer), ' },
          { text: 'Delete', bold: true },
          { text: ' (removes the generated image), and ' },
          { text: 'Save to Assets', bold: true },
          { text: ' (saves it to your project asset library with a classification picker).' },
        ]),
        para('Click any generated image to open it in a full-screen lightbox. Press Escape or click outside to close.'),

        heading('Video Section', HeadingLevel.HEADING_3),
        para('After generating an image, expand the Video section and click "Generate Video." The AI uses your generated image as the start frame and animates it into a short video clip. The video inherits all cinematography settings (camera movement, motion intensity, etc.).'),

        heading('Voice Section', HeadingLevel.HEADING_3),
        para('Expand the Voice section to generate dialogue and narration audio. You can select a voice from the voice picker dropdown, assign talent (characters you created in the Characters tab), and generate spoken audio for both dialogue lines and narration/voiceover.'),

        heading('Cinematography Section', HeadingLevel.HEADING_3),
        para('Expand this to see the per-shot Cinematography Quick Select. This lets you override the global Loadout settings for an individual shot. See Section 7 for details.'),

        heading('Save to Assets', HeadingLevel.HEADING_3),
        para('When you click the green Save to Assets button on any generated image or video, a modal appears where you can:'),
        bulletItem('Edit the asset name'),
        bulletItem('Choose a classification: Talent, Background, Product, Audio, LUT, or Other'),
        bulletItem('Click "Save Asset" to add it to your project library'),
        new Paragraph({ spacing: { after: 100 } }),
        tipBox('Best Practice', 'Always classify your saved assets correctly. If you generate a close-up of a character, save it as "Talent," not "Background." Correct classification makes it easier to find and assign assets to shots later.'),

        // ==================== 6. LOADOUT TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('6. Loadout Tab: Cinematography Settings'),
        para('The Loadout tab (labeled "Loadout" in the workspace) is your global cinematography control panel. It contains 12 cinematic option slots organized into five categories. Selections made here are included in every image and video generation request, giving your entire project a consistent visual style.'),

        heading('Cinematic Categories and Slots', HeadingLevel.HEADING_2),
        featureTable(
          ['Category', 'Slot', 'What It Controls'],
          [
            ['Camera', 'Camera Body', 'Camera brand/model (affects image character and rendering style)'],
            ['Camera', 'Focal Length', 'Lens mm (24mm wide, 50mm standard, 85mm portrait, 135mm telephoto)'],
            ['Camera', 'Lens Type', 'Prime, zoom, macro, fisheye, anamorphic'],
            ['Camera', 'Camera Movement', 'Static, pan, tilt, dolly, crane, tracking, handheld, orbit, whip pan, rack focus'],
            ['Film & Color', 'Film Stock', 'Kodak, Fujifilm, digital stocks (affects color science and grain)'],
            ['Film & Color', 'Filter Effect', 'Sepia, black & white, vintage, VHS, film grain'],
            ['Lighting', 'Lighting Style', 'Three-point, key light, backlighting, practical, neon, candlelight'],
            ['Lighting', 'Lighting Source', 'Natural, tungsten, HMI, LED, practical sources'],
            ['Lighting', 'Atmosphere', 'Clear, foggy, smoky, dusty, underwater'],
            ['World', 'Environment', 'Interior, exterior, nighttime, daytime, weather conditions'],
            ['Style & Frame', 'Look and Feel', 'Color grading / mood (warm, cool, muted, vibrant)'],
            ['Style & Frame', 'Style', 'Film noir, sci-fi, documentary, action, drama, horror, comedy, romance, fantasy'],
            ['Style & Frame', 'Aspect Ratio', '16:9, 4:3, 1:1, anamorphic, ultrawide'],
          ]
        ),

        new Paragraph({ spacing: { after: 200 } }),
        heading('Motion Intensity', HeadingLevel.HEADING_3),
        para('Below the camera movement dropdown, you will find the Motion Intensity selector with three options: Subtle, Moderate, and Dramatic. This controls how pronounced the camera movement is in generated video.'),

        heading('Shot Selector and Apply to All', HeadingLevel.HEADING_3),
        para('At the top of the Loadout tab, a dropdown lets you select which shot you are equipping. The "Apply to All X Shots" button copies the current cinematography settings to every shot in the project. Use this when you want a uniform look across the entire production.'),

        tipBox('Optimization Tip', 'Set your Loadout BEFORE generating images. The Loadout settings are baked into the generation prompt. If you generate an image, then change the Loadout, the existing image will not update. You would need to regenerate it. Plan your visual style first, then generate.'),

        // ==================== 7. PER-SHOT CINEMATOGRAPHY ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('7. Per-Shot Cinematography Quick Select'),
        para('Inside each shot card, the Cinematography accordion contains a compact version of the Loadout panel. This lets you override global settings for a specific shot without changing the project-wide defaults.'),

        para('The Quick Select shows a 2-column grid of dropdown selectors for all 12 cinematic options, plus camera movement and motion intensity. Any changes here apply only to that individual shot.'),

        heading('When to Use Per-Shot Overrides', HeadingLevel.HEADING_3),
        bulletItem('A flashback scene that needs different film stock and color grading'),
        bulletItem('A dream sequence with a specific atmosphere and filter effect'),
        bulletItem('An action shot that needs dramatic camera movement while the rest of the film is static'),
        bulletItem('A close-up that needs a different focal length than your default'),

        // ==================== 8. CHARACTERS TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('8. Characters Tab: Talent Management'),
        para('The Characters tab is your cast management system. Create characters here before assigning them to shots for dialogue generation.'),

        heading('Creating a Character', HeadingLevel.HEADING_3),
        numberItem('Click the "Create Character" button'),
        numberItem('Fill in the character name, description, and attributes (age, gender presentation, ethnicity, mood/expression)'),
        numberItem('Save the character. They appear in the library grid.'),

        new Paragraph({ spacing: { after: 120 } }),
        heading('View Modes', HeadingLevel.HEADING_3),
        para('Toggle between "Library" (all characters you have ever created) and "Project Roster" (characters assigned to the current project). The project roster helps you keep track of who is in this specific production.'),

        tipBox('Best Practice', 'Create all your characters before you start generating dialogue. When you expand the Voice section in a shot card, you assign characters to dialogue lines. Having your cast ready first streamlines this process.'),

        // ==================== 9. TIMELINE TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('9. Timeline Tab: Sequence Visualization'),
        para('The Timeline tab gives you a chronological view of your entire project. It displays three tracks:'),

        featureTable(
          ['Track', 'What It Shows'],
          [
            ['Video Track', 'Shot clips displayed in sequence order with thumbnails and duration'],
            ['Dialogue Track', 'Audio clips for character dialogue, positioned under their corresponding shots'],
            ['Narration Track', 'Voiceover/narration audio clips aligned to their shots'],
          ]
        ),

        new Paragraph({ spacing: { after: 160 } }),
        para('Use the zoom controls (+/-) to zoom in and out on the timeline. The playhead can be dragged to scrub through the sequence. Total project duration is calculated automatically from all shot durations.'),
        para('The Timeline is primarily a review and pacing tool. Use it to evaluate whether your cuts feel right, whether shots are too long or too short, and whether the overall rhythm of the piece works.'),

        // ==================== 10. ASSETS TAB ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('10. Assets Tab: Media Library and Organization'),
        para('The Assets tab is your central media library. Every image, video, audio file, and generated asset lives here. You can upload new files, organize them into folders, assign them to shots, and manage classifications.'),

        heading('Uploading Assets', HeadingLevel.HEADING_3),
        numberItem('Click "Add Asset" in the top-right corner'),
        numberItem('Drag and drop a file onto the dropzone, or click to browse your computer'),
        numberItem('Enter a name, select the asset type (Talent, Product, Background, Audio, LUT, Other), and add an optional description'),
        numberItem('Click "Upload." The asset appears in the grid.'),

        new Paragraph({ spacing: { after: 120 } }),
        heading('Editing Classification', HeadingLevel.HEADING_3),
        para('Click the type badge on any asset card (the colored label that says "Talent," "Background," etc.) to expand an inline type picker. Select a new classification and it saves immediately.'),

        heading('Folders', HeadingLevel.HEADING_3),
        para('Click "Folder" in the header to create a named folder. Folders appear as a horizontal row of cards with cover images. Click a folder to filter the grid to only show assets in that folder. Click "Show All" to return to the unfiltered view.'),
        bulletItem('Add assets to a folder using the folder icon on each asset card'),
        bulletItem('Set a folder cover by navigating into the folder and clicking the image icon on any asset'),
        bulletItem('Delete a folder by clicking the X on the folder card. Assets are not deleted, just unlinked.'),

        heading('Assigning Assets to Shots', HeadingLevel.HEADING_3),
        para('Click any asset card to open the Shot Assignment modal. Here you can select one or more shots using checkboxes, use "Select All" for bulk assignment, and click "Assign." Already-linked shots are marked with a green "Linked" badge.'),

        heading('Project and Folder Covers', HeadingLevel.HEADING_3),
        para('Each asset card has two special action icons:'),
        bulletItem('Star icon: Set as Project Cover. This sets the asset image as the project thumbnail visible on your dashboard.'),
        bulletItem('Image icon (inside a folder): Set as Folder Cover. This sets the asset as the visual thumbnail for the folder.'),

        // ==================== 11. MOOD BOARD ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('11. Mood Board Tab: Visual Inspiration'),
        para('The Mood Board is a freeform canvas for collecting visual inspiration. Import reference images, add text annotations, and draw directly on the board.'),

        heading('Tools', HeadingLevel.HEADING_3),
        featureTable(
          ['Tool', 'How It Works'],
          [
            ['Select', 'Click and drag items to reposition them on the canvas. Click an item to select it (highlighted with pink border). Selected items can be deleted.'],
            ['Text', 'Click anywhere on the canvas to place a text note. A text input appears. Type your note and press Enter or click "Add." Use Shift+Enter for multi-line notes.'],
            ['Draw', 'Click and drag to freehand draw on the canvas. Choose from 7 color presets and 4 brush sizes (Thin, Medium, Thick, Bold).'],
            ['Erase', 'Click and drag to erase drawn strokes. The eraser is 3x wider than the draw brush for easier cleanup.'],
          ]
        ),

        new Paragraph({ spacing: { after: 160 } }),
        heading('Actions', HeadingLevel.HEADING_3),
        featureTable(
          ['Action', 'How to Trigger'],
          [
            ['Import Images', 'Click the "Import" button in the toolbar. Select one or more images from your computer. They are placed on the canvas automatically.'],
            ['Undo', 'Click the "Undo" button in the toolbar, or press Ctrl+Z (Cmd+Z on Mac). Reverts the last action.'],
            ['Delete Item', 'Select an item with the Select tool, then click the "Delete" button or press the Delete/Backspace key.'],
            ['Reorder Items', 'Drag items with the Select tool. Items clicked are brought to the front automatically.'],
          ]
        ),

        tipBox('Best Practice', 'Use the Mood Board early in pre-production to establish your visual language. Import reference stills from films you admire, add text notes about color palette and mood, and draw connections between ideas. Share the board with your team before generating any shots.'),

        // ==================== 12. BEST PRACTICES ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('12. Best Practices for Better AI Outputs'),

        heading('Script Quality', HeadingLevel.HEADING_2),
        bulletItem('Include scene headings (INT./EXT.), character names in caps, and clear action lines'),
        bulletItem('Write visual descriptions. "Warm golden light filters through rain-streaked windows" generates better shots than "Coffee shop scene"'),
        bulletItem('Include camera direction in your script when it matters: "CLOSE ON Maya\'s hands trembling" gives the AI explicit framing guidance'),
        bulletItem('Specify time of day and weather in scene headings: "EXT. ROOFTOP - NIGHT (RAIN)"'),

        heading('Synopsis and Creative Direction', HeadingLevel.HEADING_2),
        bulletItem('The Synopsis field has the biggest impact on output quality. Write at least 3-4 sentences describing the story, characters, and tone'),
        bulletItem('In Creative Direction, reference real films or shows: "Inspired by the color palette of Euphoria and the framing of Mr. Robot"'),
        bulletItem('Include specific color palette notes: "Desaturated blues and greens with occasional warm amber highlights"'),
        bulletItem('Mention the intended audience and platform: "Short-form content for social media" vs. "Feature film opening sequence"'),

        heading('Cinematography Settings', HeadingLevel.HEADING_2),
        bulletItem('Set your Loadout BEFORE generating any images. Changing it after does not retroactively update existing generations'),
        bulletItem('Use "Apply to All Shots" for visual consistency across the project'),
        bulletItem('Override per-shot only for scenes that need to feel distinctly different (flashbacks, dream sequences, transitions)'),
        bulletItem('Match your film stock to your era: Kodak for warm and organic, digital for clean and modern'),
        bulletItem('Camera movement should serve the story. Static for tension, tracking for energy, handheld for intimacy'),

        heading('Character and Voice', HeadingLevel.HEADING_2),
        bulletItem('Create characters with detailed descriptions before generating dialogue'),
        bulletItem('Specify mood and expression; these influence how the AI voices the character'),
        bulletItem('Preview voices before committing; the voice picker lets you audition different options'),

        heading('Asset Organization', HeadingLevel.HEADING_2),
        bulletItem('Classify assets correctly when saving: Talent for character images, Background for environments'),
        bulletItem('Use folders to group related assets: one folder per character, one for environments, one for props'),
        bulletItem('Set folder covers to make your library visually scannable'),
        bulletItem('Assign assets to all relevant shots early; it helps maintain visual consistency'),

        // ==================== 13. WORKFLOW CHEAT SHEET ====================
        new Paragraph({ children: [new PageBreak()] }),
        heading('13. Workflow Cheat Sheet'),
        para('Follow this sequence for the best results on any new project:'),

        new Paragraph({ spacing: { after: 120 } }),
        featureTable(
          ['Step', 'Tab', 'Action', 'Why'],
          [
            ['1', 'Script', 'Write or paste your full screenplay', 'The script is the foundation. Everything flows from it.'],
            ['2', 'Sidebar', 'Fill in Synopsis with story summary, characters, and tone', 'Gives the AI the big picture context it needs.'],
            ['3', 'Sidebar', 'Add Creative Direction with visual style, references, and color notes', 'Steers the AI toward your vision.'],
            ['4', 'Sidebar', 'Set Target Duration', 'Determines how many shots the AI generates.'],
            ['5', 'Sidebar', 'Click "Generate Storyboard"', 'AI breaks your script into individual shots.'],
            ['6', 'Characters', 'Create character profiles for your cast', 'Needed for dialogue generation.'],
            ['7', 'Loadout', 'Configure all 12 cinematic slots', 'Sets the visual identity for the entire project.'],
            ['8', 'Loadout', 'Click "Apply to All Shots"', 'Ensures consistent look across every shot.'],
            ['9', 'Shots', 'Review and edit shot descriptions', 'Refine before generating images.'],
            ['10', 'Shots', 'Generate Image for each shot', 'Creates the visual stills.'],
            ['11', 'Shots', 'Generate Video for key shots', 'Animates stills into motion.'],
            ['12', 'Shots', 'Generate Dialogue and Narration', 'Creates audio tracks.'],
            ['13', 'Assets', 'Organize generated media into folders', 'Keeps your project clean.'],
            ['14', 'Timeline', 'Review the full sequence', 'Check pacing and flow before export.'],
          ]
        ),

        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'End of Manual', font: 'Arial', size: 24, bold: true, color: TEXT_SECONDARY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Cinema Studio v1.0  |  For questions, contact your project lead.', font: 'Arial', size: 20, color: TEXT_SECONDARY })],
        }),
      ],
    },
  ],
});

// Generate the file
const outputPath = '/Users/jasonjvazquez/Documents/CLAUDES/cinema-studio/Cinema_Studio_Editor_Manual.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Manual generated at: ' + outputPath);
}).catch(err => {
  console.error('Error generating document:', err);
});
