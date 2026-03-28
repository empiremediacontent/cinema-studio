// ============================================================
// Cinema Studio: 251 Cinematic Options Seed Data
// These are the "weapons, spells, and potions" of filmmaking.
// Each option injects a prompt fragment into the generation prompt.
// ============================================================

import type { CinematicOptionType } from '@/lib/types/database';

export interface SeedOption {
  name: string;
  type: CinematicOptionType;
  prompt_fragment: string;
  description: string;
  sort_order: number;
}

// --- CAMERA BODIES (~20) ---
const cameraBodies: SeedOption[] = [
  { name: 'ARRI ALEXA 65', type: 'camera_body', prompt_fragment: 'shot on ARRI ALEXA 65', description: 'Large format cinema camera. Unmatched dynamic range and color science.', sort_order: 1 },
  { name: 'ARRI ALEXA Mini LF', type: 'camera_body', prompt_fragment: 'shot on ARRI ALEXA Mini LF', description: 'Compact large format cinema camera. Industry standard for narrative.', sort_order: 2 },
  { name: 'RED V-RAPTOR XL 8K', type: 'camera_body', prompt_fragment: 'shot on RED V-RAPTOR XL 8K VV', description: '8K Vista Vision sensor. Extreme resolution with global shutter.', sort_order: 3 },
  { name: 'RED KOMODO 6K', type: 'camera_body', prompt_fragment: 'shot on RED KOMODO 6K', description: 'Compact cinema camera. Great for handheld and gimbal work.', sort_order: 4 },
  { name: 'Sony VENICE 2', type: 'camera_body', prompt_fragment: 'shot on Sony VENICE 2 8.6K', description: 'Full frame 8.6K sensor with dual base ISO. Excellent low light.', sort_order: 5 },
  { name: 'Sony FX6', type: 'camera_body', prompt_fragment: 'shot on Sony FX6', description: 'Full frame cinema line. Compact run-and-gun documentary camera.', sort_order: 6 },
  { name: 'Canon EOS C500 Mark II', type: 'camera_body', prompt_fragment: 'shot on Canon EOS C500 Mark II', description: 'Full frame 5.9K with Cinema RAW Light. Canon color science.', sort_order: 7 },
  { name: 'Blackmagic URSA Mini Pro 12K', type: 'camera_body', prompt_fragment: 'shot on Blackmagic URSA Mini Pro 12K', description: '12K Super 35 sensor. Extreme detail and reframing flexibility.', sort_order: 8 },
  { name: 'Blackmagic Pocket 6K Pro', type: 'camera_body', prompt_fragment: 'shot on Blackmagic Pocket 6K Pro', description: 'Super 35 pocket cinema camera. Built-in ND filters.', sort_order: 9 },
  { name: 'Panasonic VariCam LT', type: 'camera_body', prompt_fragment: 'shot on Panasonic VariCam LT', description: 'Super 35 cinema camera. Dual native ISO (800/5000).', sort_order: 10 },
  { name: 'Panasonic Lumix S1H', type: 'camera_body', prompt_fragment: 'shot on Panasonic Lumix S1H', description: 'Full frame mirrorless hybrid. 6K with V-Log/V-Gamut.', sort_order: 11 },
  { name: 'IMAX MSM 9802', type: 'camera_body', prompt_fragment: 'shot on IMAX 65mm', description: 'IMAX large format 65mm. Maximum resolution and immersion.', sort_order: 12 },
  { name: 'Panavision Millennium DXL2', type: 'camera_body', prompt_fragment: 'shot on Panavision Millennium DXL2', description: 'RED sensor with Panavision optics. Light Iron color pipeline.', sort_order: 13 },
  { name: 'Bolex H16', type: 'camera_body', prompt_fragment: 'shot on Bolex H16 16mm', description: 'Classic 16mm film camera. Experimental and retro texture.', sort_order: 14 },
  { name: 'Super 8 Camera', type: 'camera_body', prompt_fragment: 'shot on Super 8mm film camera', description: 'Home movie aesthetic. Heavy grain, warm tones, nostalgic.', sort_order: 15 },
  { name: 'iPhone 16 Pro Max', type: 'camera_body', prompt_fragment: 'shot on iPhone 16 Pro Max', description: 'Smartphone cinema. Clean digital, wide dynamic range.', sort_order: 16 },
  { name: 'GoPro HERO 13', type: 'camera_body', prompt_fragment: 'shot on GoPro HERO 13', description: 'Ultra-wide action camera. Barrel distortion, POV feel.', sort_order: 17 },
  { name: 'DJI Mavic 3 Cine', type: 'camera_body', prompt_fragment: 'shot on DJI Mavic 3 Cine drone', description: 'Hasselblad aerial camera. Overhead and sweeping drone shots.', sort_order: 18 },
  { name: 'Hasselblad X2D 100C', type: 'camera_body', prompt_fragment: 'shot on Hasselblad X2D 100C', description: 'Medium format 100MP. Fashion and portrait perfection.', sort_order: 19 },
  { name: 'Leica SL3', type: 'camera_body', prompt_fragment: 'shot on Leica SL3', description: 'Full frame rangefinder. Leica color and rendering character.', sort_order: 20 },
];

// --- FOCAL LENGTHS (~19) ---
const focalLengths: SeedOption[] = [
  { name: '8mm Ultra-Wide', type: 'focal_length', prompt_fragment: '8mm ultra-wide angle', description: 'Extreme fisheye distortion. Surreal, immersive.', sort_order: 1 },
  { name: '14mm Wide', type: 'focal_length', prompt_fragment: '14mm wide angle lens', description: 'Extreme wide. Environmental establishing shots.', sort_order: 2 },
  { name: '18mm Wide', type: 'focal_length', prompt_fragment: '18mm wide angle lens', description: 'Wide with manageable distortion. Interior spaces.', sort_order: 3 },
  { name: '24mm Wide', type: 'focal_length', prompt_fragment: '24mm wide angle lens', description: 'Classic wide. Spielberg and Kubrick favorite.', sort_order: 4 },
  { name: '28mm Moderate Wide', type: 'focal_length', prompt_fragment: '28mm lens', description: 'Natural wide perspective. Street photography classic.', sort_order: 5 },
  { name: '35mm Standard Wide', type: 'focal_length', prompt_fragment: '35mm lens', description: 'Human eye equivalent. Natural storytelling lens.', sort_order: 6 },
  { name: '40mm Standard', type: 'focal_length', prompt_fragment: '40mm lens', description: 'Between wide and normal. Subtle intimacy.', sort_order: 7 },
  { name: '50mm Normal', type: 'focal_length', prompt_fragment: '50mm lens', description: 'The "nifty fifty." Most natural field of view.', sort_order: 8 },
  { name: '65mm Portrait', type: 'focal_length', prompt_fragment: '65mm lens', description: 'Slight compression. Flattering for faces.', sort_order: 9 },
  { name: '75mm Medium Tele', type: 'focal_length', prompt_fragment: '75mm lens', description: 'Classic portrait length. Subject isolation begins.', sort_order: 10 },
  { name: '85mm Portrait', type: 'focal_length', prompt_fragment: '85mm lens', description: 'The portrait king. Beautiful bokeh and compression.', sort_order: 11 },
  { name: '100mm Tele', type: 'focal_length', prompt_fragment: '100mm telephoto lens', description: 'Medium telephoto. Strong subject isolation.', sort_order: 12 },
  { name: '135mm Tele', type: 'focal_length', prompt_fragment: '135mm telephoto lens', description: 'Compression and separation. Intimate close-ups.', sort_order: 13 },
  { name: '200mm Long Tele', type: 'focal_length', prompt_fragment: '200mm telephoto lens', description: 'Heavy compression. Surveillance, voyeur feel.', sort_order: 14 },
  { name: '300mm Super Tele', type: 'focal_length', prompt_fragment: '300mm super telephoto lens', description: 'Extreme compression. Stacking, flattened planes.', sort_order: 15 },
  { name: '400mm Ultra Tele', type: 'focal_length', prompt_fragment: '400mm ultra telephoto lens', description: 'Maximum compression. Heat haze, isolation.', sort_order: 16 },
  { name: '24-70mm Zoom', type: 'focal_length', prompt_fragment: '24-70mm zoom lens', description: 'Versatile zoom range. Documentary workhorse.', sort_order: 17 },
  { name: '70-200mm Zoom', type: 'focal_length', prompt_fragment: '70-200mm zoom lens', description: 'Telephoto zoom. Sports, events, compressed shots.', sort_order: 18 },
  { name: 'Tilt-Shift', type: 'focal_length', prompt_fragment: 'tilt-shift lens, miniature effect', description: 'Selective focus plane. Miniature world effect.', sort_order: 19 },
];

// --- LENS TYPES (~20) ---
const lensTypes: SeedOption[] = [
  { name: 'Anamorphic', type: 'lens_type', prompt_fragment: 'anamorphic lens, horizontal lens flares, oval bokeh', description: 'Classic widescreen cinema. Oval bokeh, blue flares, 2.39:1 feel.', sort_order: 1 },
  { name: 'Spherical Prime', type: 'lens_type', prompt_fragment: 'spherical prime lens, sharp and clean', description: 'Standard cinema prime. Sharp, predictable, consistent.', sort_order: 2 },
  { name: 'Vintage Anamorphic', type: 'lens_type', prompt_fragment: 'vintage anamorphic lens, warm flares, organic aberrations', description: 'Character-rich anamorphic. Warm streaks, breathing, imperfections.', sort_order: 3 },
  { name: 'Cooke S7/i Full Frame', type: 'lens_type', prompt_fragment: 'Cooke S7/i lens, warm Cooke Look', description: 'The "Cooke Look." Warm, creamy skin tones and gentle roll-off.', sort_order: 4 },
  { name: 'Zeiss Master Prime', type: 'lens_type', prompt_fragment: 'Zeiss Master Prime, clinical sharpness', description: 'Ultra-sharp with zero distortion. Clean, precise, clinical.', sort_order: 5 },
  { name: 'Panavision C-Series', type: 'lens_type', prompt_fragment: 'Panavision C-Series anamorphic, gentle flares', description: 'Classic Hollywood anamorphic. Used on countless features.', sort_order: 6 },
  { name: 'Leica Summilux-C', type: 'lens_type', prompt_fragment: 'Leica Summilux-C cinema lens, buttery rendering', description: 'Leica rendering for cinema. Smooth transitions, beautiful focus fall-off.', sort_order: 7 },
  { name: 'Canon K35', type: 'lens_type', prompt_fragment: 'Canon K35 vintage cinema lens, soft and warm', description: 'Vintage 1970s look. Soft, warm, gently flawed. Used on Alien, Barry Lyndon.', sort_order: 8 },
  { name: 'Helios 44-2', type: 'lens_type', prompt_fragment: 'Helios 44-2 lens, swirly bokeh', description: 'Soviet vintage lens. Signature swirly bokeh, dreamy.', sort_order: 9 },
  { name: 'Petzval Lens', type: 'lens_type', prompt_fragment: 'Petzval lens, swirly background blur, sharp center', description: 'Dramatic swirl bokeh with sharp center. Artistic, dreamy.', sort_order: 10 },
  { name: 'Macro Lens', type: 'lens_type', prompt_fragment: 'macro lens, extreme close-up detail', description: '1:1 magnification. Insect eyes, water drops, texture details.', sort_order: 11 },
  { name: 'Lensbaby', type: 'lens_type', prompt_fragment: 'Lensbaby selective focus lens, tilt blur', description: 'Selective focus creative lens. One point sharp, edges melt.', sort_order: 12 },
  { name: 'Fisheye', type: 'lens_type', prompt_fragment: 'fisheye lens, barrel distortion, 180-degree field of view', description: '180-degree field of view. Extreme barrel distortion.', sort_order: 13 },
  { name: 'Soft Focus', type: 'lens_type', prompt_fragment: 'soft focus lens, dreamy glow, diffused highlights', description: 'Built-in diffusion. Dreamy halation around highlights.', sort_order: 14 },
  { name: 'Uncoated Vintage', type: 'lens_type', prompt_fragment: 'uncoated vintage lens, heavy flare, low contrast', description: 'No lens coating. Aggressive flaring, reduced contrast, ethereal.', sort_order: 15 },
  { name: 'Cine Zoom (Angenieux)', type: 'lens_type', prompt_fragment: 'Angenieux cinema zoom lens', description: 'Cinema-grade zoom. Smooth zoom pulls, consistent exposure.', sort_order: 16 },
  { name: 'T1.0 Ultra-Fast', type: 'lens_type', prompt_fragment: 'T1.0 ultra-fast aperture lens, extreme shallow depth of field', description: 'Maximum light gathering. Paper-thin depth of field.', sort_order: 17 },
  { name: 'Split Diopter', type: 'lens_type', prompt_fragment: 'split diopter lens, dual focus planes', description: 'Two focal planes simultaneously. De Palma signature.', sort_order: 18 },
  { name: 'Infrared Lens', type: 'lens_type', prompt_fragment: 'infrared photography lens, false color vegetation', description: 'Infrared spectrum capture. White foliage, surreal tones.', sort_order: 19 },
  { name: 'Pinhole', type: 'lens_type', prompt_fragment: 'pinhole lens, infinite depth of field, soft dreamy', description: 'No glass, just a tiny hole. Everything in focus, soft, ethereal.', sort_order: 20 },
];

// --- FILM STOCKS (~24) ---
const filmStocks: SeedOption[] = [
  { name: 'Kodak Vision3 500T', type: 'film_stock', prompt_fragment: 'Kodak Vision3 500T 5219 film stock, tungsten balanced, rich warm tones', description: 'Tungsten-balanced high-speed. Rich shadows, warm tones. The modern cinema standard.', sort_order: 1 },
  { name: 'Kodak Vision3 250D', type: 'film_stock', prompt_fragment: 'Kodak Vision3 250D 5207 film stock, daylight balanced, fine grain', description: 'Daylight-balanced medium speed. Fine grain, vivid colors. Exterior favorite.', sort_order: 2 },
  { name: 'Kodak Vision3 200T', type: 'film_stock', prompt_fragment: 'Kodak Vision3 200T 5213 film stock, low grain, clean highlights', description: 'Low-speed tungsten. Cleanest shadows, finest grain. Controlled lighting.', sort_order: 3 },
  { name: 'Kodak Vision3 50D', type: 'film_stock', prompt_fragment: 'Kodak Vision3 50D 5203 film stock, extremely fine grain, maximum sharpness', description: 'Ultra-fine grain daylight. Maximum sharpness and color saturation.', sort_order: 4 },
  { name: 'Kodak Ektachrome 100D', type: 'film_stock', prompt_fragment: 'Kodak Ektachrome reversal film, vivid saturated colors', description: 'Reversal (slide) film. Punchy saturation, strong contrast. Music videos.', sort_order: 5 },
  { name: 'Kodak Portra 400', type: 'film_stock', prompt_fragment: 'Kodak Portra 400, soft pastel tones, beautiful skin rendering', description: 'Portrait legend. Soft pastels, creamy skin, forgiving exposure latitude.', sort_order: 6 },
  { name: 'Kodak Portra 800', type: 'film_stock', prompt_fragment: 'Kodak Portra 800, visible grain, warm muted tones', description: 'High-speed portrait. More grain, muted warmth, evening and night.', sort_order: 7 },
  { name: 'Kodak Gold 200', type: 'film_stock', prompt_fragment: 'Kodak Gold 200, warm golden tones, nostalgic color', description: 'Consumer warmth. Golden highlights, nostalgic summer feel.', sort_order: 8 },
  { name: 'Kodak Tri-X 400', type: 'film_stock', prompt_fragment: 'Kodak Tri-X 400 black and white film, dramatic contrast, rich grain', description: 'Iconic black and white. Gritty grain, deep blacks. Photojournalism DNA.', sort_order: 9 },
  { name: 'Kodak T-Max 3200', type: 'film_stock', prompt_fragment: 'Kodak T-Max 3200 black and white, extreme grain, high contrast', description: 'Ultra-high speed B&W. Heavy grain, pushed in darkness.', sort_order: 10 },
  { name: 'Fuji Eterna 500T', type: 'film_stock', prompt_fragment: 'Fuji Eterna 500T film stock, neutral tones, subtle green-cyan cast', description: 'Japanese cinema staple. Neutral with subtle cool cast. Understated elegance.', sort_order: 11 },
  { name: 'Fuji Eterna Vivid 250D', type: 'film_stock', prompt_fragment: 'Fuji Eterna Vivid 250D, punchy saturated colors', description: 'Saturated daylight Fuji. Vivid greens and blues. Vibrant exteriors.', sort_order: 12 },
  { name: 'Fuji Pro 400H', type: 'film_stock', prompt_fragment: 'Fuji Pro 400H, soft pastel tones, muted greens', description: 'Discontinued legend. Soft, pastel, muted. Fashion photography icon.', sort_order: 13 },
  { name: 'Fuji Superia 400', type: 'film_stock', prompt_fragment: 'Fuji Superia 400, cool tones, green cast, consumer film', description: 'Consumer Fuji. Cool greens, everyday nostalgia.', sort_order: 14 },
  { name: 'Fuji Velvia 50', type: 'film_stock', prompt_fragment: 'Fuji Velvia 50, extreme color saturation, deep blacks', description: 'Maximum saturation slide film. Landscape legend. Punchy beyond real.', sort_order: 15 },
  { name: 'CineStill 800T', type: 'film_stock', prompt_fragment: 'CineStill 800T, halation around lights, red glow, night photography', description: 'Cinema film for stills. Red halation halos around lights. Night icon.', sort_order: 16 },
  { name: 'Ilford HP5 Plus 400', type: 'film_stock', prompt_fragment: 'Ilford HP5 Plus 400 black and white, classic grain, wide latitude', description: 'British B&W classic. Versatile, pushable, timeless grain structure.', sort_order: 17 },
  { name: 'Ilford Delta 3200', type: 'film_stock', prompt_fragment: 'Ilford Delta 3200 black and white, extreme sensitivity, expressive grain', description: 'Ultra-fast B&W. Expressive grain, low light street work.', sort_order: 18 },
  { name: 'Polaroid 600', type: 'film_stock', prompt_fragment: 'Polaroid 600 instant film, soft colors, white frame border', description: 'Instant film aesthetic. Soft, unpredictable, nostalgic borders.', sort_order: 19 },
  { name: 'Lomography 800', type: 'film_stock', prompt_fragment: 'Lomography 800 film, saturated cross-processed colors, vignette', description: 'Lo-fi experimental. Cross-processed tones, heavy vignette, light leaks.', sort_order: 20 },
  { name: 'Agfa Vista 200', type: 'film_stock', prompt_fragment: 'Agfa Vista 200, warm midtones, vintage European color', description: 'European color warmth. Vintage everyday aesthetic.', sort_order: 21 },
  { name: 'Kodachrome 64', type: 'film_stock', prompt_fragment: 'Kodachrome 64, iconic saturated reds and blues, fine grain', description: 'The legendary discontinued stock. Rich reds, deep blues. National Geographic DNA.', sort_order: 22 },
  { name: 'Technicolor 3-Strip', type: 'film_stock', prompt_fragment: 'Technicolor 3-strip process, hyper-saturated primary colors', description: 'Golden age Hollywood. Impossibly vivid primaries. Wizard of Oz.', sort_order: 23 },
  { name: 'Digital Clean (No Film)', type: 'film_stock', prompt_fragment: 'clean digital capture, no film grain, pristine', description: 'No film emulation. Pure digital clarity. Modern commercial look.', sort_order: 24 },
];

// --- LIGHTING SOURCES (~20) ---
const lightingSources: SeedOption[] = [
  { name: 'Window Light', type: 'lighting_source', prompt_fragment: 'lit by soft window light', description: 'Natural diffused daylight through glass. Soft gradients, gentle shadows.', sort_order: 1 },
  { name: 'Golden Hour Sun', type: 'lighting_source', prompt_fragment: 'golden hour sunlight, warm directional light', description: 'Low sun at magic hour. Warm orange tones, long shadows.', sort_order: 2 },
  { name: 'Overcast Daylight', type: 'lighting_source', prompt_fragment: 'overcast diffused daylight, even soft lighting', description: 'Nature"s softbox. Even, shadowless, flattering.', sort_order: 3 },
  { name: 'Blue Hour', type: 'lighting_source', prompt_fragment: 'blue hour ambient light, cool blue tones', description: 'Twilight glow. Cool blue ambient with warm practicals.', sort_order: 4 },
  { name: 'Harsh Noon Sun', type: 'lighting_source', prompt_fragment: 'harsh midday sun, strong shadows, high contrast', description: 'Overhead sun. Hard shadows, squinting, high contrast. Desert, thriller.', sort_order: 5 },
  { name: 'Moonlight', type: 'lighting_source', prompt_fragment: 'moonlight, cool silver-blue illumination', description: 'Night exterior. Cool silver-blue wash. Romantic or eerie.', sort_order: 6 },
  { name: 'Neon Signs', type: 'lighting_source', prompt_fragment: 'neon sign lighting, colorful mixed neon glow', description: 'Urban night color. Pink, blue, green mixed neon wash. Cyberpunk.', sort_order: 7 },
  { name: 'Practical Lamps', type: 'lighting_source', prompt_fragment: 'practical lamp lighting, warm tungsten pools of light', description: 'In-scene lamps and fixtures. Warm pools, motivated, realistic.', sort_order: 8 },
  { name: 'Candle/Firelight', type: 'lighting_source', prompt_fragment: 'candlelight, warm flickering orange glow', description: 'Flame illumination. Warm, flickering, intimate. Period drama.', sort_order: 9 },
  { name: 'Fluorescent Tubes', type: 'lighting_source', prompt_fragment: 'fluorescent tube lighting, green-white clinical cast', description: 'Institutional buzzing. Green-white cast. Hospitals, offices, horror.', sort_order: 10 },
  { name: 'LED Panel', type: 'lighting_source', prompt_fragment: 'LED panel lighting, clean even illumination', description: 'Modern production light. Clean, color-accurate, controllable.', sort_order: 11 },
  { name: 'Tungsten Fresnel', type: 'lighting_source', prompt_fragment: 'tungsten fresnel spotlight, warm hard directional light', description: 'Classic film light. Warm, hard-edged, focusable beam.', sort_order: 12 },
  { name: 'Ring Light', type: 'lighting_source', prompt_fragment: 'ring light, flat frontal illumination, catch light in eyes', description: 'Flat frontal glow. Distinctive ring catchlight in eyes.', sort_order: 13 },
  { name: 'Strobe/Flash', type: 'lighting_source', prompt_fragment: 'strobe flash, frozen moment, hard shadows', description: 'Flash-frozen instant. Hard shadows, fashion editorial look.', sort_order: 14 },
  { name: 'Car Headlights', type: 'lighting_source', prompt_fragment: 'car headlight illumination, sweeping beams', description: 'Moving light beams. Dramatic sweeps, thriller tension.', sort_order: 15 },
  { name: 'Stadium Lights', type: 'lighting_source', prompt_fragment: 'stadium floodlights, bright overhead wash', description: 'Massive overhead wash. Sports, spectacle, epic scale.', sort_order: 16 },
  { name: 'Projection Light', type: 'lighting_source', prompt_fragment: 'projected light patterns, colorful geometric projections on subject', description: 'Projector patterns on subject. Abstract, editorial, music video.', sort_order: 17 },
  { name: 'Blacklight/UV', type: 'lighting_source', prompt_fragment: 'ultraviolet blacklight, glowing fluorescent colors', description: 'UV reactive glow. Neon fluorescent colors against dark backgrounds.', sort_order: 18 },
  { name: 'Fire/Explosion', type: 'lighting_source', prompt_fragment: 'fire and explosion lighting, intense orange and red', description: 'Explosive light burst. Intense orange-red, action chaos.', sort_order: 19 },
  { name: 'Underwater Caustics', type: 'lighting_source', prompt_fragment: 'underwater caustic light patterns, rippling light through water', description: 'Light filtered through water. Dancing caustic patterns on surfaces.', sort_order: 20 },
];

// --- LIGHTING STYLES (~15) ---
const lightingStyles: SeedOption[] = [
  { name: 'Rembrandt', type: 'lighting_style', prompt_fragment: 'Rembrandt lighting, triangle of light on cheek, dramatic chiaroscuro', description: 'Triangle of light on cheek opposite key. Classic portrait drama.', sort_order: 1 },
  { name: 'Butterfly (Paramount)', type: 'lighting_style', prompt_fragment: 'butterfly lighting, centered overhead key, shadow under nose', description: 'Key light above and centered. Butterfly shadow under nose. Glamour.', sort_order: 2 },
  { name: 'Split Lighting', type: 'lighting_style', prompt_fragment: 'split lighting, half face illuminated half in shadow', description: 'Half the face lit, half in shadow. Mystery, duality, noir.', sort_order: 3 },
  { name: 'Loop Lighting', type: 'lighting_style', prompt_fragment: 'loop lighting, small shadow from nose to cheek', description: 'Slight angle from center. Small loop shadow. Flattering standard.', sort_order: 4 },
  { name: 'Broad Lighting', type: 'lighting_style', prompt_fragment: 'broad lighting, lit side of face toward camera', description: 'Wider side of face lit. Makes face appear fuller. Friendly.', sort_order: 5 },
  { name: 'Short Lighting', type: 'lighting_style', prompt_fragment: 'short lighting, shadow side of face toward camera, slimming', description: 'Narrow side of face lit. Slimming, dramatic, cinematic.', sort_order: 6 },
  { name: 'High Key', type: 'lighting_style', prompt_fragment: 'high key lighting, bright even illumination, minimal shadows', description: 'Bright, even, minimal shadows. Comedy, commercials, clean.', sort_order: 7 },
  { name: 'Low Key', type: 'lighting_style', prompt_fragment: 'low key lighting, deep shadows, pools of light, dramatic', description: 'Mostly shadow with selective light. Noir, thriller, horror.', sort_order: 8 },
  { name: 'Silhouette', type: 'lighting_style', prompt_fragment: 'silhouette lighting, backlit subject, dark figure against bright background', description: 'Subject entirely backlit. Black shape against bright background.', sort_order: 9 },
  { name: 'Rim/Edge Light', type: 'lighting_style', prompt_fragment: 'rim lighting, bright edge outline, backlit hair and shoulders', description: 'Bright edge around subject. Separates from background. Angelic or ominous.', sort_order: 10 },
  { name: 'Cross Lighting', type: 'lighting_style', prompt_fragment: 'cross lighting, two opposing key lights, dramatic modeling', description: 'Two lights from opposite sides. Complex shadows, depth, texture.', sort_order: 11 },
  { name: 'Chiaroscuro', type: 'lighting_style', prompt_fragment: 'chiaroscuro lighting, extreme contrast between light and dark, Caravaggio style', description: 'Extreme light/dark contrast. Old master painting. Caravaggio.', sort_order: 12 },
  { name: 'Natural/Available', type: 'lighting_style', prompt_fragment: 'natural available light only, documentary style', description: 'No artificial light. Whatever exists. Documentary, realism.', sort_order: 13 },
  { name: 'Volumetric/God Rays', type: 'lighting_style', prompt_fragment: 'volumetric lighting, visible light beams through atmosphere, god rays', description: 'Visible shafts of light through haze/dust. Cathedral, forest, epic.', sort_order: 14 },
  { name: 'Motivated Practical', type: 'lighting_style', prompt_fragment: 'motivated practical lighting, all light appears to come from visible sources', description: 'All light sourced from visible practicals in scene. Maximum realism.', sort_order: 15 },
];

// --- ATMOSPHERE (~20) ---
const atmospheres: SeedOption[] = [
  { name: 'Tense', type: 'atmosphere', prompt_fragment: 'tense, suspenseful atmosphere', description: 'Tight, anxious energy. Something is about to happen.', sort_order: 1 },
  { name: 'Dreamy', type: 'atmosphere', prompt_fragment: 'dreamy, ethereal atmosphere', description: 'Soft, floating, otherworldly. Between sleep and waking.', sort_order: 2 },
  { name: 'Intimate', type: 'atmosphere', prompt_fragment: 'intimate, close, personal atmosphere', description: 'Close and personal. Whispered secrets, tender moments.', sort_order: 3 },
  { name: 'Epic', type: 'atmosphere', prompt_fragment: 'epic, grand, sweeping atmosphere', description: 'Massive scale, overwhelming grandeur. Lord of the Rings.', sort_order: 4 },
  { name: 'Melancholic', type: 'atmosphere', prompt_fragment: 'melancholic, wistful, bittersweet atmosphere', description: 'Gentle sadness. Beautiful pain, nostalgia, loss.', sort_order: 5 },
  { name: 'Eerie', type: 'atmosphere', prompt_fragment: 'eerie, unsettling, uncanny atmosphere', description: 'Something is wrong but you cannot say what. Uncanny valley.', sort_order: 6 },
  { name: 'Joyful', type: 'atmosphere', prompt_fragment: 'joyful, vibrant, celebratory atmosphere', description: 'Pure happiness. Colors pop, energy high, life is good.', sort_order: 7 },
  { name: 'Mysterious', type: 'atmosphere', prompt_fragment: 'mysterious, enigmatic atmosphere, hidden secrets', description: 'Questions without answers. Shadows hold secrets.', sort_order: 8 },
  { name: 'Romantic', type: 'atmosphere', prompt_fragment: 'romantic, warm, tender atmosphere', description: 'Love in the air. Soft focus, warm tones, gentle.', sort_order: 9 },
  { name: 'Chaotic', type: 'atmosphere', prompt_fragment: 'chaotic, frenetic, overwhelming atmosphere', description: 'Sensory overload. Too much happening. Panic, action, madness.', sort_order: 10 },
  { name: 'Serene', type: 'atmosphere', prompt_fragment: 'serene, peaceful, tranquil atmosphere', description: 'Deep calm. Still water, quiet forest, meditation.', sort_order: 11 },
  { name: 'Gritty', type: 'atmosphere', prompt_fragment: 'gritty, raw, unpolished atmosphere', description: 'Street-level reality. Dirt under fingernails. Unvarnished truth.', sort_order: 12 },
  { name: 'Opulent', type: 'atmosphere', prompt_fragment: 'opulent, luxurious, extravagant atmosphere', description: 'Dripping in wealth. Gold, velvet, excess. Gatsby.', sort_order: 13 },
  { name: 'Claustrophobic', type: 'atmosphere', prompt_fragment: 'claustrophobic, tight, confined atmosphere', description: 'Walls closing in. No escape. Pressure builds.', sort_order: 14 },
  { name: 'Nostalgic', type: 'atmosphere', prompt_fragment: 'nostalgic, warm memory, looking back atmosphere', description: 'Remembering better days. Faded warmth, gentle ache.', sort_order: 15 },
  { name: 'Ominous', type: 'atmosphere', prompt_fragment: 'ominous, foreboding, dark atmosphere', description: 'Doom approaching. Dark clouds, heavy silence before storm.', sort_order: 16 },
  { name: 'Whimsical', type: 'atmosphere', prompt_fragment: 'whimsical, playful, fantastical atmosphere', description: 'Childlike wonder. Magic, absurdity, Wes Anderson.', sort_order: 17 },
  { name: 'Desolate', type: 'atmosphere', prompt_fragment: 'desolate, empty, abandoned atmosphere', description: 'Nothing left. Empty streets, abandoned buildings, post-human.', sort_order: 18 },
  { name: 'Electric', type: 'atmosphere', prompt_fragment: 'electric, charged, high-energy atmosphere', description: 'Crackling energy. Stadium nights, concert highs, adrenaline.', sort_order: 19 },
  { name: 'Meditative', type: 'atmosphere', prompt_fragment: 'meditative, contemplative, still atmosphere', description: 'Deep thought. Slow breathing, inner world, zen.', sort_order: 20 },
];

// --- ENVIRONMENTS (~30) ---
const environments: SeedOption[] = [
  { name: 'Urban Street', type: 'environment', prompt_fragment: 'urban city street, buildings, sidewalks, traffic', description: 'City life. Cars, pedestrians, concrete, glass.', sort_order: 1 },
  { name: 'Dense Forest', type: 'environment', prompt_fragment: 'dense forest, tall trees, dappled light through canopy', description: 'Deep woods. Filtered light, ancient trees, mystery.', sort_order: 2 },
  { name: 'Desert Landscape', type: 'environment', prompt_fragment: 'vast desert landscape, sand dunes, heat shimmer', description: 'Endless sand. Heat distortion, isolation, primal.', sort_order: 3 },
  { name: 'Ocean/Beach', type: 'environment', prompt_fragment: 'ocean beach, waves, sand, horizon line', description: 'Where land meets sea. Waves, sand, infinite horizon.', sort_order: 4 },
  { name: 'Mountain Peak', type: 'environment', prompt_fragment: 'mountain peak, dramatic elevation, clouds below', description: 'Above the world. Thin air, vast views, achievement.', sort_order: 5 },
  { name: 'Rooftop', type: 'environment', prompt_fragment: 'urban rooftop, city skyline in background', description: 'Above the streets. Skyline panorama, wind, perspective.', sort_order: 6 },
  { name: 'Warehouse/Industrial', type: 'environment', prompt_fragment: 'industrial warehouse interior, concrete, steel beams, raw space', description: 'Raw industrial. Concrete, steel, exposed pipes, vast empty.', sort_order: 7 },
  { name: 'Luxury Interior', type: 'environment', prompt_fragment: 'luxury interior, marble floors, chandeliers, rich furnishings', description: 'High-end spaces. Marble, crystal, velvet, wealth.', sort_order: 8 },
  { name: 'Neon Alley', type: 'environment', prompt_fragment: 'neon-lit alley at night, wet pavement reflecting colorful signs', description: 'Night city back streets. Neon reflections on wet asphalt. Cyberpunk.', sort_order: 9 },
  { name: 'Subway/Metro', type: 'environment', prompt_fragment: 'subway station interior, platform, fluorescent lights, tiles', description: 'Underground transit. Tiles, fluorescent buzz, passing trains.', sort_order: 10 },
  { name: 'Office Space', type: 'environment', prompt_fragment: 'modern office interior, desks, monitors, glass walls', description: 'Corporate interior. Glass, screens, ergonomic chairs, tension.', sort_order: 11 },
  { name: 'Hospital/Clinical', type: 'environment', prompt_fragment: 'hospital interior, clinical white, medical equipment', description: 'Sterile medical. White walls, beeping machines, life and death.', sort_order: 12 },
  { name: 'Library/Study', type: 'environment', prompt_fragment: 'grand library interior, towering bookshelves, reading lamps', description: 'Walls of books. Leather, oak, dust motes, knowledge.', sort_order: 13 },
  { name: 'Nightclub', type: 'environment', prompt_fragment: 'nightclub interior, dance floor, laser lights, fog machine', description: 'Bass and strobe. Lasers cut through fog, bodies move.', sort_order: 14 },
  { name: 'Space/Sci-Fi', type: 'environment', prompt_fragment: 'outer space environment, stars, spacecraft interior', description: 'Beyond Earth. Stars, zero gravity, spacecraft corridors.', sort_order: 15 },
  { name: 'Underwater', type: 'environment', prompt_fragment: 'underwater environment, blue-green water, light rays from surface', description: 'Submerged world. Light filtering down, floating weightless.', sort_order: 16 },
  { name: 'Snowy Landscape', type: 'environment', prompt_fragment: 'snowy winter landscape, white blanket of snow, bare trees', description: 'Winter silence. White everywhere, muffled sound, isolation.', sort_order: 17 },
  { name: 'Rain-Soaked Street', type: 'environment', prompt_fragment: 'rain-soaked street at night, reflections, puddles, wet surfaces', description: 'Night rain. Everything reflects. Noir, loneliness, beauty.', sort_order: 18 },
  { name: 'Garden/Greenhouse', type: 'environment', prompt_fragment: 'lush garden or greenhouse, tropical plants, dappled light', description: 'Living green. Humid, overgrown, life bursting through glass.', sort_order: 19 },
  { name: 'Cathedral/Church', type: 'environment', prompt_fragment: 'cathedral interior, stained glass, vaulted ceilings, stone columns', description: 'Sacred architecture. Light through stained glass, stone, reverence.', sort_order: 20 },
  { name: 'Abandoned Building', type: 'environment', prompt_fragment: 'abandoned building interior, decay, peeling paint, broken windows', description: 'Ruin and decay. Peeling paint, shattered glass, nature reclaiming.', sort_order: 21 },
  { name: 'Train/Rail', type: 'environment', prompt_fragment: 'train interior or railway tracks, motion, journey', description: 'Journey in motion. Passing landscape, rhythmic clatter.', sort_order: 22 },
  { name: 'Stage/Theater', type: 'environment', prompt_fragment: 'theater stage, dramatic spotlights, red curtains, audience', description: 'Performance space. Spotlights, curtains, the fourth wall.', sort_order: 23 },
  { name: 'Parking Garage', type: 'environment', prompt_fragment: 'parking garage, concrete levels, fluorescent strips, shadows', description: 'Concrete layers. Fluorescent strips, car echoes, danger.', sort_order: 24 },
  { name: 'Farmland/Rural', type: 'environment', prompt_fragment: 'rural farmland, open fields, barn, dirt road', description: 'Country life. Open fields, barns, dust roads, simplicity.', sort_order: 25 },
  { name: 'Tropical Island', type: 'environment', prompt_fragment: 'tropical island, palm trees, turquoise water, white sand', description: 'Paradise. Palm trees, crystal water, white sand, escape.', sort_order: 26 },
  { name: 'Foggy Pier/Dock', type: 'environment', prompt_fragment: 'foggy pier or dock, mist rolling in, wooden planks, water', description: 'Fog and water. Wooden planks, creaking boats, disappearing horizon.', sort_order: 27 },
  { name: 'Kitchen/Restaurant', type: 'environment', prompt_fragment: 'professional kitchen or restaurant interior, warm lighting, food', description: 'Food and warmth. Stainless steel, flames, plating, humanity.', sort_order: 28 },
  { name: 'Bedroom', type: 'environment', prompt_fragment: 'bedroom interior, bed, soft lighting, personal space', description: 'Most private space. Soft light, tangled sheets, vulnerability.', sort_order: 29 },
  { name: 'Dystopian Ruins', type: 'environment', prompt_fragment: 'dystopian ruins, collapsed buildings, overgrown vegetation, post-apocalyptic', description: 'After the end. Broken civilization, nature reclaiming, survival.', sort_order: 30 },
];

// --- LOOK AND FEEL (~30) ---
const lookAndFeels: SeedOption[] = [
  { name: 'Blade Runner 2049', type: 'look_and_feel', prompt_fragment: 'Blade Runner 2049 aesthetic, orange and teal, dystopian beauty, Deakins lighting', description: 'Deakins masterclass. Orange/teal, vast emptiness, dystopian beauty.', sort_order: 1 },
  { name: 'Dune (Villeneuve)', type: 'look_and_feel', prompt_fragment: 'Dune aesthetic, desaturated earth tones, epic scale, Greig Fraser cinematography', description: 'Fraser cinematography. Desaturated warmth, massive scale, ancient future.', sort_order: 2 },
  { name: 'The Dark Knight', type: 'look_and_feel', prompt_fragment: 'Dark Knight aesthetic, cold blue steel, urban grit, IMAX scale', description: 'Pfister IMAX work. Cold steel blues, urban grit, operatic scale.', sort_order: 3 },
  { name: 'Arrival', type: 'look_and_feel', prompt_fragment: 'Arrival aesthetic, muted cool tones, fog, alien wonder, Bradford Young cinematography', description: 'Bradford Young fog. Muted, overcast, alien wonder through human eyes.', sort_order: 4 },
  { name: 'Moonlight', type: 'look_and_feel', prompt_fragment: 'Moonlight aesthetic, rich saturated colors, intimate close-ups, James Laxton cinematography', description: 'Laxton intimacy. Rich, saturated, almost tactile. Close and personal.', sort_order: 5 },
  { name: 'Mad Max: Fury Road', type: 'look_and_feel', prompt_fragment: 'Mad Max Fury Road aesthetic, orange desert, teal sky, high contrast, kinetic', description: 'Seale madness. Orange/teal cranked to max, kinetic, relentless.', sort_order: 6 },
  { name: 'Interstellar', type: 'look_and_feel', prompt_fragment: 'Interstellar aesthetic, vast cosmic scale, practical effects, IMAX film grain', description: 'Van Hoytema cosmos. IMAX grain, vast scale, emotional science.', sort_order: 7 },
  { name: 'The Grand Budapest Hotel', type: 'look_and_feel', prompt_fragment: 'Grand Budapest Hotel aesthetic, pastel color palette, symmetrical composition, Wes Anderson', description: 'Anderson symmetry. Pastels, centered frames, dollhouse precision.', sort_order: 8 },
  { name: 'Euphoria', type: 'look_and_feel', prompt_fragment: 'Euphoria aesthetic, neon colors, dramatic lighting, Marcell Rev cinematography', description: 'Rev neon. Saturated gel colors, moving light, teenage intensity.', sort_order: 9 },
  { name: 'Se7en', type: 'look_and_feel', prompt_fragment: 'Se7en aesthetic, desaturated green-brown, bleach bypass, perpetual rain, Darius Khondji', description: 'Khondji darkness. Bleach bypass, perpetual rain, moral decay.', sort_order: 10 },
  { name: 'The Matrix', type: 'look_and_feel', prompt_fragment: 'The Matrix aesthetic, green tint, digital rain, high contrast noir', description: 'Pope green tint. Digital world rendered in jade and black.', sort_order: 11 },
  { name: 'Sicario', type: 'look_and_feel', prompt_fragment: 'Sicario aesthetic, harsh desert light, silhouettes, dread, Roger Deakins', description: 'Deakins border tension. Harsh light, deep shadow, creeping dread.', sort_order: 12 },
  { name: 'Her', type: 'look_and_feel', prompt_fragment: 'Her aesthetic, warm red-orange tones, soft focus, near-future, Hoyte van Hoytema', description: 'Van Hoytema warmth. Red-orange near-future. Lonely in crowds.', sort_order: 13 },
  { name: 'Drive', type: 'look_and_feel', prompt_fragment: 'Drive aesthetic, neon noir, pink and blue, Los Angeles night, Newton Thomas Sigel', description: 'Neon noir LA. Pink and blue, chrome, violence beneath beauty.', sort_order: 14 },
  { name: 'Akira Kurosawa', type: 'look_and_feel', prompt_fragment: 'Akira Kurosawa aesthetic, dynamic weather, epic composition, movement in stillness', description: 'Master composition. Wind, rain, mud, stillness before action.', sort_order: 15 },
  { name: 'Wong Kar-wai', type: 'look_and_feel', prompt_fragment: 'Wong Kar-wai aesthetic, smeared neon, step-printing, Christopher Doyle cinematography', description: 'Doyle expressionism. Smeared neon, step-print motion, romantic ache.', sort_order: 16 },
  { name: 'Terrence Malick', type: 'look_and_feel', prompt_fragment: 'Terrence Malick aesthetic, golden hour, natural light, wide angle, Emmanuel Lubezki', description: 'Chivo magic hour. Natural light, wide angles, whispered narration.', sort_order: 17 },
  { name: 'Stanley Kubrick', type: 'look_and_feel', prompt_fragment: 'Stanley Kubrick aesthetic, symmetrical one-point perspective, cold precision', description: 'Perfect symmetry. One-point perspective, cold precision, uneasy beauty.', sort_order: 18 },
  { name: 'David Fincher', type: 'look_and_feel', prompt_fragment: 'David Fincher aesthetic, dark desaturated, precise camera movement, clinical', description: 'Jeff Cronenweth darkness. Desaturated, precise, every frame calculated.', sort_order: 19 },
  { name: 'Wes Anderson', type: 'look_and_feel', prompt_fragment: 'Wes Anderson aesthetic, centered symmetry, pastel palette, flat staging', description: 'Storybook framing. Dead center, flat staging, candy colors.', sort_order: 20 },
  { name: 'Ridley Scott', type: 'look_and_feel', prompt_fragment: 'Ridley Scott aesthetic, atmospheric smoke, backlight, industrial grandeur', description: 'Smoke and backlight. Industrial cathedral, every frame a painting.', sort_order: 21 },
  { name: 'Christopher Nolan', type: 'look_and_feel', prompt_fragment: 'Christopher Nolan aesthetic, IMAX large format, practical scale, structured complexity', description: 'IMAX scale. Practical effects, temporal complexity, overwhelming.', sort_order: 22 },
  { name: 'Denis Villeneuve', type: 'look_and_feel', prompt_fragment: 'Denis Villeneuve aesthetic, awe and dread, minimal color, vast negative space', description: 'Awe and dread. Minimal palette, vast spaces, slow revelation.', sort_order: 23 },
  { name: 'Spike Lee', type: 'look_and_feel', prompt_fragment: 'Spike Lee aesthetic, Dutch angles, double dolly, bold saturated color', description: 'Double dolly intensity. Dutch angles, bold color, confrontation.', sort_order: 24 },
  { name: 'Tarkovsky', type: 'look_and_feel', prompt_fragment: 'Andrei Tarkovsky aesthetic, long takes, water reflections, dream logic', description: 'Poetic cinema. Long takes, water, decay, time dissolving.', sort_order: 25 },
  { name: 'Michael Mann', type: 'look_and_feel', prompt_fragment: 'Michael Mann aesthetic, urban night, digital blue, professional precision', description: 'LA night digital. Blue cityscapes, professional precision, isolation.', sort_order: 26 },
  { name: 'Coen Brothers', type: 'look_and_feel', prompt_fragment: 'Coen Brothers aesthetic, Roger Deakins, stark American landscape, dark humor', description: 'Deakins Americana. Stark landscapes, precise framing, dark comedy.', sort_order: 27 },
  { name: 'Sofia Coppola', type: 'look_and_feel', prompt_fragment: 'Sofia Coppola aesthetic, dreamy soft focus, pastel, feminine gaze, isolation in luxury', description: 'Dreamy privilege. Soft pastels, boredom in beauty, feminine gaze.', sort_order: 28 },
  { name: 'A24 Indie', type: 'look_and_feel', prompt_fragment: 'A24 indie film aesthetic, naturalistic, raw, intimate, auteur sensibility', description: 'Indie auteur. Naturalistic light, raw performance, intimate stakes.', sort_order: 29 },
  { name: 'Music Video (Hype Williams)', type: 'look_and_feel', prompt_fragment: 'Hype Williams music video aesthetic, fisheye, saturated, luxury, excess', description: 'Fisheye excess. Saturated, glossy, champagne and chrome.', sort_order: 30 },
];

// --- FILTERS/EFFECTS (~30) ---
const filterEffects: SeedOption[] = [
  { name: 'Film Grain (Light)', type: 'filter_effect', prompt_fragment: 'subtle film grain texture', description: 'Gentle organic grain. Adds texture without distraction.', sort_order: 1 },
  { name: 'Film Grain (Heavy)', type: 'filter_effect', prompt_fragment: 'heavy film grain, textured, gritty', description: 'Aggressive grain. Gritty, raw, documentary feel.', sort_order: 2 },
  { name: 'Lens Flare', type: 'filter_effect', prompt_fragment: 'lens flare, light streaks across frame', description: 'Light hitting lens directly. J.J. Abrams signature.', sort_order: 3 },
  { name: 'Light Leak', type: 'filter_effect', prompt_fragment: 'light leak, warm orange and red light bleeding into frame', description: 'Film gate leak. Warm light bleeds, analog imperfection.', sort_order: 4 },
  { name: 'Smoke/Haze', type: 'filter_effect', prompt_fragment: 'atmospheric smoke and haze, diffused light', description: 'Atmospheric particles. Softens light, adds depth, cinematic.', sort_order: 5 },
  { name: 'Dust Particles', type: 'filter_effect', prompt_fragment: 'visible dust particles floating in light beams', description: 'Motes in light. Age, abandonment, or magical realism.', sort_order: 6 },
  { name: 'Fog/Mist', type: 'filter_effect', prompt_fragment: 'thick fog or mist, limited visibility, mysterious', description: 'Visibility drops. Mystery, isolation, otherworldly.', sort_order: 7 },
  { name: 'Rain on Lens', type: 'filter_effect', prompt_fragment: 'rain drops on camera lens, wet glass distortion', description: 'Water on glass. Immersive, raw, POV distortion.', sort_order: 8 },
  { name: 'Bokeh Circles', type: 'filter_effect', prompt_fragment: 'beautiful bokeh circles in background, creamy out of focus areas', description: 'Out-of-focus highlights. Creamy circles, depth, romance.', sort_order: 9 },
  { name: 'Motion Blur', type: 'filter_effect', prompt_fragment: 'motion blur, dynamic movement, speed', description: 'Movement streaking. Speed, urgency, disorientation.', sort_order: 10 },
  { name: 'Chromatic Aberration', type: 'filter_effect', prompt_fragment: 'chromatic aberration, color fringing on edges, RGB split', description: 'Color channel separation. Digital glitch or vintage lens character.', sort_order: 11 },
  { name: 'Vignette (Dark)', type: 'filter_effect', prompt_fragment: 'dark vignette, darkened corners, focus drawn to center', description: 'Darkened edges. Draws eye to center, vintage feel.', sort_order: 12 },
  { name: 'Halation', type: 'filter_effect', prompt_fragment: 'halation glow around bright light sources, warm bloom', description: 'Warm glow bleed from highlights. Film characteristic.', sort_order: 13 },
  { name: 'Bloom/Glow', type: 'filter_effect', prompt_fragment: 'soft bloom glow on highlights, dreamy luminance', description: 'Highlights gently glow outward. Dreamy, angelic.', sort_order: 14 },
  { name: 'Desaturated', type: 'filter_effect', prompt_fragment: 'desaturated color, muted tones, reduced saturation', description: 'Colors drained. Bleak, serious, Fincher/war film.', sort_order: 15 },
  { name: 'Teal and Orange', type: 'filter_effect', prompt_fragment: 'teal and orange color grading, complementary color contrast', description: 'Hollywood blockbuster grade. Warm skin against cool shadows.', sort_order: 16 },
  { name: 'Bleach Bypass', type: 'filter_effect', prompt_fragment: 'bleach bypass look, reduced saturation, increased contrast, silver retained', description: 'Silver retention. Metallic, high contrast, desaturated. Saving Private Ryan.', sort_order: 17 },
  { name: 'Cross-Process', type: 'filter_effect', prompt_fragment: 'cross-processed film look, shifted colors, high saturation, unexpected tones', description: 'Wrong chemicals on purpose. Wild color shifts, experimental.', sort_order: 18 },
  { name: 'Day for Night', type: 'filter_effect', prompt_fragment: 'day for night filter, blue tint, underexposed daylight simulating night', description: 'Daylight pretending to be night. Blue tint, tradition of cinema.', sort_order: 19 },
  { name: 'Sepia Tone', type: 'filter_effect', prompt_fragment: 'sepia toned, warm brown monochrome, antique photograph', description: 'Warm brown mono. Old photograph, memory, historical.', sort_order: 20 },
  { name: 'High Contrast B&W', type: 'filter_effect', prompt_fragment: 'high contrast black and white, deep blacks, bright whites, minimal gray', description: 'Crushed blacks, blown whites. Graphic, bold, Sin City.', sort_order: 21 },
  { name: 'Soft Diffusion', type: 'filter_effect', prompt_fragment: 'soft diffusion filter, smoothed highlights, gentle glow', description: 'Pro Mist or similar. Smoothed highlights, gentle overall softness.', sort_order: 22 },
  { name: 'Anamorphic Streak', type: 'filter_effect', prompt_fragment: 'anamorphic blue lens streak across highlights', description: 'Blue horizontal streak across lights. Distinctly cinematic.', sort_order: 23 },
  { name: 'VHS/Analog Glitch', type: 'filter_effect', prompt_fragment: 'VHS analog glitch, scan lines, tracking distortion, retro', description: 'VHS tracking errors. Scan lines, color bleed, lo-fi nostalgia.', sort_order: 24 },
  { name: 'Double Exposure', type: 'filter_effect', prompt_fragment: 'double exposure effect, two images overlaid, ghostly transparency', description: 'Two realities merged. Ghost images, psychological, dreamlike.', sort_order: 25 },
  { name: 'Prism/Crystal', type: 'filter_effect', prompt_fragment: 'prism or crystal held in front of lens, rainbow refraction, kaleidoscope', description: 'Refracted light. Rainbow fragments, kaleidoscope, psychedelic.', sort_order: 26 },
  { name: 'Tilt-Shift Miniature', type: 'filter_effect', prompt_fragment: 'tilt-shift miniature effect, selective blur, toy-like', description: 'Real world looks like a toy model. Selective sharp band.', sort_order: 27 },
  { name: 'Infrared', type: 'filter_effect', prompt_fragment: 'infrared photography, white foliage, red-purple sky, false color', description: 'Beyond visible spectrum. White trees, alien landscapes.', sort_order: 28 },
  { name: 'Thermal Vision', type: 'filter_effect', prompt_fragment: 'thermal vision heat map, warm bodies against cool backgrounds', description: 'Heat signature view. Predator vision, surveillance, sci-fi.', sort_order: 29 },
  { name: 'Clean (No Effects)', type: 'filter_effect', prompt_fragment: 'clean image, no filters, no post effects', description: 'No filter. Pure image as captured. Commercial clarity.', sort_order: 30 },
];

// --- ASPECT RATIOS (~10) ---
const aspectRatios: SeedOption[] = [
  { name: '2.39:1 Anamorphic', type: 'aspect_ratio', prompt_fragment: '2.39:1 anamorphic widescreen aspect ratio', description: 'Ultra-wide cinema. Epics, landscapes, scope.', sort_order: 1 },
  { name: '2.76:1 Ultra Panavision', type: 'aspect_ratio', prompt_fragment: '2.76:1 Ultra Panavision 70 ultra-wide', description: 'Widest theatrical. The Hateful Eight, Ben-Hur.', sort_order: 2 },
  { name: '1.85:1 Flat Widescreen', type: 'aspect_ratio', prompt_fragment: '1.85:1 flat widescreen aspect ratio', description: 'Standard US widescreen. Most films and commercials.', sort_order: 3 },
  { name: '16:9 (1.78:1)', type: 'aspect_ratio', prompt_fragment: '16:9 widescreen aspect ratio', description: 'TV and streaming standard. YouTube, broadcast.', sort_order: 4 },
  { name: '4:3 (1.33:1)', type: 'aspect_ratio', prompt_fragment: '4:3 aspect ratio, classic television frame', description: 'Classic TV and early film. Boxy, intimate, retro.', sort_order: 5 },
  { name: '1:1 Square', type: 'aspect_ratio', prompt_fragment: '1:1 square aspect ratio, Instagram format', description: 'Perfect square. Instagram, album art, symmetry.', sort_order: 6 },
  { name: '9:16 Vertical', type: 'aspect_ratio', prompt_fragment: '9:16 vertical aspect ratio, mobile phone format', description: 'Phone portrait. TikTok, Stories, Reels.', sort_order: 7 },
  { name: '1.66:1 European', type: 'aspect_ratio', prompt_fragment: '1.66:1 European widescreen aspect ratio', description: 'European standard. Slightly narrower than US wide.', sort_order: 8 },
  { name: '2.20:1 Todd-AO', type: 'aspect_ratio', prompt_fragment: '2.20:1 70mm Todd-AO wide format', description: '70mm road show. Grand presentations, musical epics.', sort_order: 9 },
  { name: '1.43:1 IMAX', type: 'aspect_ratio', prompt_fragment: '1.43:1 IMAX full frame, towering image', description: 'Full IMAX. Near-square, towering, immersive.', sort_order: 10 },
];

// --- STYLES (~13) ---
const styles: SeedOption[] = [
  { name: 'Photorealistic', type: 'style', prompt_fragment: 'photorealistic, ultra-detailed photograph, natural skin texture visible', description: 'Indistinguishable from a photograph. Skin pores, fabric weave, real.', sort_order: 1 },
  { name: 'Cinematic Still', type: 'style', prompt_fragment: 'cinematic film still, movie screenshot, 35mm film', description: 'Looks like a frame pulled from a movie. Film grain, color grade.', sort_order: 2 },
  { name: 'Oil Painting', type: 'style', prompt_fragment: 'oil painting style, visible brushstrokes, rich pigments, gallery quality', description: 'Classical fine art. Impasto texture, rich color, museum quality.', sort_order: 3 },
  { name: 'Watercolor', type: 'style', prompt_fragment: 'watercolor painting, soft washes, bleeding colors, paper texture', description: 'Translucent washes. Soft edges, paper grain, storybook.', sort_order: 4 },
  { name: 'Anime/Manga', type: 'style', prompt_fragment: 'anime style, clean linework, vibrant colors, large expressive eyes', description: 'Japanese animation. Clean lines, big eyes, dynamic poses.', sort_order: 5 },
  { name: 'Pencil Sketch', type: 'style', prompt_fragment: 'pencil sketch, graphite on paper, detailed shading, hand-drawn', description: 'Graphite rendering. Cross-hatching, paper texture, raw talent.', sort_order: 6 },
  { name: 'Comic Book', type: 'style', prompt_fragment: 'comic book style, bold outlines, halftone dots, vivid flat colors', description: 'Bold ink outlines. Halftone dots, vivid flats, POW! BAM!', sort_order: 7 },
  { name: '3D Render', type: 'style', prompt_fragment: '3D rendered, CGI, Pixar quality, subsurface scattering', description: 'Computer generated. Pixar-smooth, subsurface skin glow.', sort_order: 8 },
  { name: 'Noir/High Contrast B&W', type: 'style', prompt_fragment: 'film noir black and white, deep shadows, dramatic contrast', description: 'Classic noir. Black and white, shadow and light, moral gray.', sort_order: 9 },
  { name: 'Retro/Vintage', type: 'style', prompt_fragment: 'retro vintage style, faded colors, 1970s aesthetic', description: 'Throwback vibes. Faded palette, period textures, nostalgia.', sort_order: 10 },
  { name: 'Surrealist', type: 'style', prompt_fragment: 'surrealist style, Dali-inspired, impossible geometry, dreamscape', description: 'Reality melted. Impossible objects, dream logic, Dali.', sort_order: 11 },
  { name: 'Fashion Editorial', type: 'style', prompt_fragment: 'high fashion editorial photography, Vogue quality, dramatic pose', description: 'Vogue cover ready. Dramatic posing, perfect lighting, aspirational.', sort_order: 12 },
  { name: 'Documentary', type: 'style', prompt_fragment: 'documentary photography style, candid, unposed, raw truth', description: 'Unposed truth. Available light, decisive moment, real life.', sort_order: 13 },
];

// --- EXPORT ALL SEED DATA ---
export const ALL_CINEMATIC_OPTIONS: SeedOption[] = [
  ...cameraBodies,
  ...focalLengths,
  ...lensTypes,
  ...filmStocks,
  ...lightingSources,
  ...lightingStyles,
  ...atmospheres,
  ...environments,
  ...lookAndFeels,
  ...filterEffects,
  ...aspectRatios,
  ...styles,
];

// Total count: 20 + 19 + 20 + 24 + 20 + 15 + 20 + 30 + 30 + 30 + 10 + 13 = 251

// Grouped by type for easy access
export const CINEMATIC_OPTIONS_BY_TYPE: Record<string, SeedOption[]> = {
  camera_body: cameraBodies,
  focal_length: focalLengths,
  lens_type: lensTypes,
  film_stock: filmStocks,
  lighting_source: lightingSources,
  lighting_style: lightingStyles,
  atmosphere: atmospheres,
  environment: environments,
  look_and_feel: lookAndFeels,
  filter_effect: filterEffects,
  aspect_ratio: aspectRatios,
  style: styles,
};
