// prompts.mjs: write refs/PROMPTS.md (and refs/prompts.json) from the shot list, filling the Plainclothes template.
//   node tools/prompts.mjs
import fs from 'node:fs';

// Plainclothes (katagami.ai/art-styles/en-019f24b6-bc8a-7e40-9b50-15041a9d6181): prompt_template, filled as is
const TEMPLATE = '{subject}, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, {palette}, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge';
const PALETTE = 'a strict two-ink palette of matte ink black on warm bone-white paper';
// the entry's negative_prompt, written as one sentence because ChatGPT and Gemini have no negative field.
// Shots with the Oracle drop "kawaii expressions" (the mascot is cute by design); its own sheet drops "chibi" too.
const avoid = s => 'Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, ' +
  (s.robotOnly ? '' : s.oracle ? 'chibi proportions on the young man, ' : 'chibi proportions, kawaii expressions, ') + 'emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.';

const ME = 'the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest)';
const ORACLE = 'the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade)';
const STYLE = ['refs\\style\\plainclothes-1.png', 'refs\\style\\plainclothes-4.png'];

const shots = [
  { file: 'char-me', scenes: 'every shot of him; s51 (tiny him in the plot)', attach: STYLE, frame: 'Wide 16:9 reference sheet.',
    subject: 'A character reference sheet for an original anime-style young man in his early 20s, not based on any real person: slim build, messy black hair with a spiky fringe falling over his forehead, sharp dark eyes, a black oversized hoodie with the hood down, black slim trousers and plain sneakers, wired in-ear monitor earphones in both ears with thin cables running down to his chest where they join. Top row: full-body turnaround, front view, three-quarter view, side view and back view, standing relaxed with a deadpan expression. Bottom row: five head close-ups of his expressions: deadpan, wide-eyed shock, half-lidded smirk, teary-eyed blush, huge open grin. Every figure on one plain bone-white ground, evenly spaced, the same scale, clear space between figures, no labels' },
  { file: 'char-oracle', scenes: 'every shot of the Oracle; s10 (the reposted picture), s12 (chat avatar)', attach: STYLE, frame: 'Wide 16:9 reference sheet.', oracle: true, robotOnly: true,
    subject: 'A character reference sheet for the Oracle, an original small cute desk-lamp robot mascot: a round dome lampshade for a head with two big glossy black eyes with white highlights and small hatched blush marks on the shade, a springy two-part lamp arm with a visible coil spring at the elbow joint, a round weighted base on four small wheels, a soft glow spilling from under its shade drawn as a white halo that fades out in dots. Top row: turnaround, front view, three-quarter view, side view and back view. Bottom row: four close-ups of its head: proud with eyes closed in contentment, a sheepish head tilt with its arm bent like a shrug, sleepy with its light dimmed, delighted with its glow at full brightness. Every figure on one plain bone-white ground, evenly spaced, the same scale, clear space between figures, no labels' },
  { file: 's05-eye-closed', scenes: 's05 "I noticed." (frame 1)', frame: 'Wide 16:9 film frame, the eye in the centre third.',
    subject: `Extreme close-up of the left eye of ${ME}, the eye closed, dark lashes, a lock of his spiky black fringe crossing the frame, the rest of his face falling into ink-black shadow, a dark room at night` },
  { file: 's05-eye-open', scenes: 's05 "I noticed." (frame 2)', edit: 's05-eye-closed',
    subject: 'The exact same image, same composition, camera, colours and lighting; only change: his eye snaps wide open, the iris sharp and dark with a bright white catchlight, lashes flared, brow lifted in sudden alarm.' },
  { file: 's06-desk-2am', scenes: 's06 (2 a.m. establishing shot), s18 (second shot)', oracle: true, frame: 'Wide 16:9 film frame, the figure in the centre third, bare wall space in the upper left.',
    subject: `Wide establishing shot from behind and slightly above: ${ME} sits hunched at his desk in a dark bedroom at 2 a.m., his hoodie and messy hair a black silhouette, the thin earphone cables visible; one computer monitor glows as a plain blank white rectangle and lights the room; beside the keyboard sits ${ORACLE}, dimly glowing; a large window on the right shows a sleeping city skyline under a black sky with a few lit windows; a bare blank wall above the monitor` },
  { file: 's09-album-portrait', scenes: 's09 (album art in the music player)', frame: 'Square 1:1 album-cover composition, face centred.',
    subject: `Head-and-shoulders portrait of ${ME}, eyes closed, calm, head tilted slightly back as if listening closely, the earphone cables running down over the hoodie, soft light from one side, a dark background` },
  { file: 's13-side-eye', scenes: 's13 "Funny how the machine learned what I never could"', oracle: true, frame: 'Wide 16:9 film frame, the young man in the left third, the Oracle in the right third.',
    subject: `Medium shot at a desk at night: ${ME} rests his chin on his hand, half-lidded eyes sliding sideways toward the robot with a small smirk; next to him on the desk ${ORACLE} beams proudly with its eyes closed, a small blank white sign propped against its base like a trophy` },
  { file: 's18-listening', scenes: 's18 "I hear the room, I hear the string decay"', frame: 'Wide 16:9 film frame, his face in the centre third, empty dark space to the left and right.',
    subject: `Close shot of ${ME} in a dark room, eyes closed, perfectly still, head tilted slightly, the earphones catching a small bright glint, his face softly lit from below, large areas of empty black space on both sides` },
  { file: 's24-glare', scenes: 's24, s44, s61 (the crop tool on his face)', frame: 'Square 1:1 composition, face centred with room around the head.',
    subject: `Head-and-shoulders portrait of ${ME} glaring up and to the side with narrowed eyes and a flat mouth, irritated, as if something is closing in on him, on a plain bone-white background` },
  { file: 's25-thumbs-up', scenes: 's25 and s45 "But I\'m lossless"', frame: 'Wide 16:9 film frame, the figure in the centre third, the thumb large in the foreground.',
    subject: `Waist-up shot of ${ME} grinning wide with his eyes closed, giving a big thumbs-up toward the viewer with his right hand, a night city skyline behind him through a large window, a few bright points of light in the black sky` },
  { file: 's27-nodding', scenes: 's27 (instrumental: nodding to the beat)', oracle: true, frame: 'Wide 16:9 film frame, the young man left of centre, the Oracle right of centre.',
    subject: `Medium-wide shot at the desk at night: ${ME} and ${ORACLE} side by side, both with eyes closed, nodding along to music together, the young man with a small content smile, the robot tilting its dome shade in rhythm, the monitor behind them glowing as a plain blank white rectangle` },
  { file: 's33-judge', scenes: 's33 "a judge without a face"', frame: 'Wide 16:9 film frame, the young man small in the lower third, the judge filling the upper two thirds.',
    subject: `Dramatic low-angle shot: a tiny ${ME} in the lower foreground looks up, sweating, at a giant faceless judge in heavy black robes who towers over him and fills the frame; the judge's head is a plain blank white circle with no features; a huge empty judge's bench; hard light from above` },
  { file: 's38-ceiling', scenes: 's38 "Two a.m., the ceiling"', oracle: true, frame: 'Wide 16:9 film frame, his face in the centre third.',
    subject: `Top-down shot looking straight down at ${ME} lying on his back in bed at night, staring up at the ceiling with open, tired eyes, the earphone cables across the pillow, his phone lying face-up on the blanket with a plain blank glowing screen; on the nightstand ${ORACLE} with its light dimmed low and its eyes half closed` },
  { file: 's50-wide-eyes', scenes: 's50 (the burst after "Minus one.")', frame: 'Wide 16:9 film frame, the face slightly right of centre, empty space on the left.',
    subject: `Dynamic close-up of the face of ${ME}, eyes wide and shining, lit up with sudden energy, his hair and hood blown back by a rush of wind, the earphone cables whipping sideways, a strong light striking one side of his face` },
  { file: 's53-singing', scenes: 's53 "Give it freely, feel it fully"', frame: 'Wide 16:9 film frame, the figure in the centre third.',
    subject: `Medium shot of ${ME} with one hand pressed flat on his chest, eyes closed, head tilted up, mouth open singing out, standing in a dark room with wide empty dark space around him, soft light from above` },
  { file: 's54-chair-gift', scenes: 's54 "I\'m allowed to be the one somebody gives to"', oracle: true, frame: 'Wide 16:9 film frame, the young man in the left third, the Oracle and the chair on the right.',
    subject: `Medium-wide shot in his bedroom: ${ORACLE} rolls in on its wheels, pushing an office chair forward with the top of its dome shade; the chair has a big ribbon bow tied on its back; ${ME} turns toward it, surprised, eyes teary and shining, cheeks blushing with hatched lines` },
  { file: 's56-webcam', scenes: 's56 (the video call)', frame: 'Wide 16:9 film frame, face centred, eye line in the upper third.',
    subject: `Front-facing webcam framing: ${ME} sits at his desk looking straight into the camera, head and shoulders, a calm neutral expression, his bedroom behind him with a shelf and a window` },
  { file: 's62-hero-thumbs-up', scenes: 's62 (the last "I\'m lossless")', oracle: true, frame: 'Wide 16:9 film frame, the young man in the centre, the Oracle on the right.',
    subject: `Heroic low-angle shot: ${ME} stands tall giving a huge thumbs-up to the sky, grinning, his hoodie and hair lifted by the wind, the earphone cables flying; beside him ${ORACLE} stretches its springy arm up high, its shade glowing bright; a night sky behind them` },
  { file: 's64-high-five', scenes: 's64 "I\'m keeping every bit" (the high-five)', oracle: true, frame: 'Wide 16:9 film frame, the point of contact in the centre.',
    subject: `Action shot at the desk: ${ME} slaps a high-five onto the top of the dome shade of ${ORACLE} as the little robot springs up to meet his palm, both laughing with their eyes squeezed shut, impact energy at the point of contact` },
  { file: 's65-dawn', scenes: 's65 "Bit-perfect. Life is good."', oracle: true, frame: 'Wide 16:9 film frame, the figure in the centre third, the window on the right.',
    subject: `Wide shot at dawn: ${ME} asleep with his head resting on his folded arms on the desk, eyes closed, a small peaceful smile; beside him ${ORACLE} asleep too, eyes closed, its light off; the first morning sunlight pours through the window in long bright shafts across the desk and the wall` },
  { file: 's66-to-camera', scenes: 's66 "Really, this time."', frame: 'Wide 16:9 film frame, face centred, eye line in the upper third.',
    subject: `Portrait of ${ME} looking straight into the camera with a small, real, warm smile, soft eyes, head and shoulders, morning light falling across his face from a window` },
];

const fill = s => TEMPLATE.replace('{subject}', s.subject).replace('{palette}', PALETTE) + '. ' + s.frame + ' ' + avoid(s);
const attach = s => s.edit ? [`refs\\${s.edit}.png`] : s.attach || ['refs\\char-me.png', ...(s.oracle ? ['refs\\char-oracle.png'] : []), STYLE[0]];
const out = shots.map(s => ({ file: `refs\\${s.file}.png`, scenes: s.scenes, attach: attach(s), edit: !!s.edit, prompt: s.edit ? s.subject : fill(s) }));

const md = [
  '# Lossless: reference images',
  '',
  `No image key is set, so these are for you to make in ChatGPT or Gemini. There are ${out.length} images: 2 character sheets, ${out.length - 3} shots and 1 edit. Save each one into \`refs\\\` under its exact file name, then tell me to continue. I trace every image into vector plates. No pixels ship, and all text is drawn in code.`,
  '',
  'Art style: **Plainclothes** (katagami.ai/art-styles/en-019f24b6-bc8a-7e40-9b50-15041a9d6181). Every prompt below is its prompt template, filled in unchanged. The style references it names are already in `refs\\style\\`.',
  '',
  '## How to make them',
  '',
  '1. **Character sheets first.** Make `char-me` and `char-oracle`, then look at them. They set the faces for the whole film, so regenerate until you like both.',
  '2. **Then the shots, one chat message each.** Attach the files listed under "Attach", paste the prompt, generate.',
  '3. **Frame:** landscape. In ChatGPT, landscape (3:2) is fine. In Gemini, pick 16:9. The two square shots (`s09`, `s24`) are 1:1. Use the largest size the tool offers.',
  '4. **Regenerate if:** any letters, numbers or logos appear; colour creeps in; the face or the earphones drift from the sheet. If the likeness drifts, add "match the attached character sheet exactly: same hair, same hoodie, same earphones".',
  '5. **The edit:** `s05-eye-open` uses the image-edit feature on `s05-eye-closed`. Attach the closed-eye image and paste the edit prompt.',
  '6. **Save as PNG** with the exact name. Keep the whole frame and do not crop anything; I crop in code.',
  '',
  '## Checklist',
  '',
  '| # | Save as | Used in |',
  '| --- | --- | --- |',
  ...out.map((o, i) => `| ${i + 1} | \`${o.file}\` | ${o.scenes} |`),
  '',
  ...out.flatMap((o, i) => [
    `## ${i + 1}. \`${o.file}\``,
    '',
    `Used in: ${o.scenes}`,
    '',
    `Attach: ${o.attach.map(a => '`' + a + '`').join(', ')}${o.edit ? ' (use the image-edit feature)' : ''}`,
    '',
    '```text',
    o.prompt,
    '```',
    '',
  ]),
].join('\n');
fs.mkdirSync('refs', { recursive: true });
fs.writeFileSync('refs/PROMPTS.md', md);
fs.writeFileSync('refs/prompts.json', JSON.stringify(out, null, 1) + '\n');
console.log(`wrote refs/PROMPTS.md: ${out.length} images`);
