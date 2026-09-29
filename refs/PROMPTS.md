# Lossless: reference images

No image key is set, so these are for you to make in ChatGPT or Gemini. There are 21 images: 2 character sheets, 18 shots and 1 edit. Save each one into `refs\` under its exact file name, then tell me to continue. I trace every image into vector plates. No pixels ship, and all text is drawn in code.

Art style: **Plainclothes** (katagami.ai/art-styles/en-019f24b6-bc8a-7e40-9b50-15041a9d6181). Every prompt below is its prompt template, filled in unchanged. The style references it names are already in `refs\style\`.

## How to make them

1. **Character sheets first.** Make `char-me` and `char-oracle`, then look at them. They set the faces for the whole film, so regenerate until you like both.
2. **Then the shots, one chat message each.** Attach the files listed under "Attach", paste the prompt, generate.
3. **Frame:** landscape. In ChatGPT, landscape (3:2) is fine. In Gemini, pick 16:9. The two square shots (`s09`, `s24`) are 1:1. Use the largest size the tool offers.
4. **Regenerate if:** any letters, numbers or logos appear; colour creeps in; the face or the earphones drift from the sheet. If the likeness drifts, add "match the attached character sheet exactly: same hair, same hoodie, same earphones".
5. **The edit:** `s05-eye-open` uses the image-edit feature on `s05-eye-closed`. Attach the closed-eye image and paste the edit prompt.
6. **Save as PNG** with the exact name. Keep the whole frame and do not crop anything; I crop in code.

## Checklist

| # | Save as | Used in |
| --- | --- | --- |
| 1 | `refs\char-me.png` | every shot of him; s51 (tiny him in the plot) |
| 2 | `refs\char-oracle.png` | every shot of the Oracle; s10 (the reposted picture), s12 (chat avatar) |
| 3 | `refs\s05-eye-closed.png` | s05 "I noticed." (frame 1) |
| 4 | `refs\s05-eye-open.png` | s05 "I noticed." (frame 2) |
| 5 | `refs\s06-desk-2am.png` | s06 (2 a.m. establishing shot), s18 (second shot) |
| 6 | `refs\s09-album-portrait.png` | s09 (album art in the music player) |
| 7 | `refs\s13-side-eye.png` | s13 "Funny how the machine learned what I never could" |
| 8 | `refs\s18-listening.png` | s18 "I hear the room, I hear the string decay" |
| 9 | `refs\s24-glare.png` | s24, s44, s61 (the crop tool on his face) |
| 10 | `refs\s25-thumbs-up.png` | s25 and s45 "But I'm lossless" |
| 11 | `refs\s27-nodding.png` | s27 (instrumental: nodding to the beat) |
| 12 | `refs\s33-judge.png` | s33 "a judge without a face" |
| 13 | `refs\s38-ceiling.png` | s38 "Two a.m., the ceiling" |
| 14 | `refs\s50-wide-eyes.png` | s50 (the burst after "Minus one.") |
| 15 | `refs\s53-singing.png` | s53 "Give it freely, feel it fully" |
| 16 | `refs\s54-chair-gift.png` | s54 "I'm allowed to be the one somebody gives to" |
| 17 | `refs\s56-webcam.png` | s56 (the video call) |
| 18 | `refs\s62-hero-thumbs-up.png` | s62 (the last "I'm lossless") |
| 19 | `refs\s64-high-five.png` | s64 "I'm keeping every bit" (the high-five) |
| 20 | `refs\s65-dawn.png` | s65 "Bit-perfect. Life is good." |
| 21 | `refs\s66-to-camera.png` | s66 "Really, this time." |

## 1. `refs\char-me.png`

Used in: every shot of him; s51 (tiny him in the plot)

Attach: `refs\style\plainclothes-1.png`, `refs\style\plainclothes-4.png`

```text
A character reference sheet for an original anime-style young man in his early 20s, not based on any real person: slim build, messy black hair with a spiky fringe falling over his forehead, sharp dark eyes, a black oversized hoodie with the hood down, black slim trousers and plain sneakers, wired in-ear monitor earphones in both ears with thin cables running down to his chest where they join. Top row: full-body turnaround, front view, three-quarter view, side view and back view, standing relaxed with a deadpan expression. Bottom row: five head close-ups of his expressions: deadpan, wide-eyed shock, half-lidded smirk, teary-eyed blush, huge open grin. Every figure on one plain bone-white ground, evenly spaced, the same scale, clear space between figures, no labels, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 reference sheet. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 2. `refs\char-oracle.png`

Used in: every shot of the Oracle; s10 (the reposted picture), s12 (chat avatar)

Attach: `refs\style\plainclothes-1.png`, `refs\style\plainclothes-4.png`

```text
A character reference sheet for the Oracle, an original small cute desk-lamp robot mascot: a round dome lampshade for a head with two big glossy black eyes with white highlights and small hatched blush marks on the shade, a springy two-part lamp arm with a visible coil spring at the elbow joint, a round weighted base on four small wheels, a soft glow spilling from under its shade drawn as a white halo that fades out in dots. Top row: turnaround, front view, three-quarter view, side view and back view. Bottom row: four close-ups of its head: proud with eyes closed in contentment, a sheepish head tilt with its arm bent like a shrug, sleepy with its light dimmed, delighted with its glow at full brightness. Every figure on one plain bone-white ground, evenly spaced, the same scale, clear space between figures, no labels, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 reference sheet. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 3. `refs\s05-eye-closed.png`

Used in: s05 "I noticed." (frame 1)

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Extreme close-up of the left eye of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest), the eye closed, dark lashes, a lock of his spiky black fringe crossing the frame, the rest of his face falling into ink-black shadow, a dark room at night, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the eye in the centre third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 4. `refs\s05-eye-open.png`

Used in: s05 "I noticed." (frame 2)

Attach: `refs\s05-eye-closed.png` (use the image-edit feature)

```text
The exact same image, same composition, camera, colours and lighting; only change: his eye snaps wide open, the iris sharp and dark with a bright white catchlight, lashes flared, brow lifted in sudden alarm.
```

## 5. `refs\s06-desk-2am.png`

Used in: s06 (2 a.m. establishing shot), s18 (second shot)

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Wide establishing shot from behind and slightly above: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) sits hunched at his desk in a dark bedroom at 2 a.m., his hoodie and messy hair a black silhouette, the thin earphone cables visible; one computer monitor glows as a plain blank white rectangle and lights the room; beside the keyboard sits the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade), dimly glowing; a large window on the right shows a sleeping city skyline under a black sky with a few lit windows; a bare blank wall above the monitor, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the figure in the centre third, bare wall space in the upper left. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 6. `refs\s09-album-portrait.png`

Used in: s09 (album art in the music player)

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Head-and-shoulders portrait of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest), eyes closed, calm, head tilted slightly back as if listening closely, the earphone cables running down over the hoodie, soft light from one side, a dark background, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Square 1:1 album-cover composition, face centred. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 7. `refs\s13-side-eye.png`

Used in: s13 "Funny how the machine learned what I never could"

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Medium shot at a desk at night: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) rests his chin on his hand, half-lidded eyes sliding sideways toward the robot with a small smirk; next to him on the desk the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) beams proudly with its eyes closed, a small blank white sign propped against its base like a trophy, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the young man in the left third, the Oracle in the right third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 8. `refs\s18-listening.png`

Used in: s18 "I hear the room, I hear the string decay"

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Close shot of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) in a dark room, eyes closed, perfectly still, head tilted slightly, the earphones catching a small bright glint, his face softly lit from below, large areas of empty black space on both sides, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, his face in the centre third, empty dark space to the left and right. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 9. `refs\s24-glare.png`

Used in: s24, s44, s61 (the crop tool on his face)

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Head-and-shoulders portrait of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) glaring up and to the side with narrowed eyes and a flat mouth, irritated, as if something is closing in on him, on a plain bone-white background, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Square 1:1 composition, face centred with room around the head. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 10. `refs\s25-thumbs-up.png`

Used in: s25 and s45 "But I'm lossless"

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Waist-up shot of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) grinning wide with his eyes closed, giving a big thumbs-up toward the viewer with his right hand, a night city skyline behind him through a large window, a few bright points of light in the black sky, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the figure in the centre third, the thumb large in the foreground. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 11. `refs\s27-nodding.png`

Used in: s27 (instrumental: nodding to the beat)

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Medium-wide shot at the desk at night: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) and the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) side by side, both with eyes closed, nodding along to music together, the young man with a small content smile, the robot tilting its dome shade in rhythm, the monitor behind them glowing as a plain blank white rectangle, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the young man left of centre, the Oracle right of centre. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 12. `refs\s33-judge.png`

Used in: s33 "a judge without a face"

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Dramatic low-angle shot: a tiny the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) in the lower foreground looks up, sweating, at a giant faceless judge in heavy black robes who towers over him and fills the frame; the judge's head is a plain blank white circle with no features; a huge empty judge's bench; hard light from above, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the young man small in the lower third, the judge filling the upper two thirds. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 13. `refs\s38-ceiling.png`

Used in: s38 "Two a.m., the ceiling"

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Top-down shot looking straight down at the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) lying on his back in bed at night, staring up at the ceiling with open, tired eyes, the earphone cables across the pillow, his phone lying face-up on the blanket with a plain blank glowing screen; on the nightstand the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) with its light dimmed low and its eyes half closed, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, his face in the centre third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 14. `refs\s50-wide-eyes.png`

Used in: s50 (the burst after "Minus one.")

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Dynamic close-up of the face of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest), eyes wide and shining, lit up with sudden energy, his hair and hood blown back by a rush of wind, the earphone cables whipping sideways, a strong light striking one side of his face, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the face slightly right of centre, empty space on the left. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 15. `refs\s53-singing.png`

Used in: s53 "Give it freely, feel it fully"

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Medium shot of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) with one hand pressed flat on his chest, eyes closed, head tilted up, mouth open singing out, standing in a dark room with wide empty dark space around him, soft light from above, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the figure in the centre third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 16. `refs\s54-chair-gift.png`

Used in: s54 "I'm allowed to be the one somebody gives to"

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Medium-wide shot in his bedroom: the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) rolls in on its wheels, pushing an office chair forward with the top of its dome shade; the chair has a big ribbon bow tied on its back; the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) turns toward it, surprised, eyes teary and shining, cheeks blushing with hatched lines, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the young man in the left third, the Oracle and the chair on the right. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 17. `refs\s56-webcam.png`

Used in: s56 (the video call)

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Front-facing webcam framing: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) sits at his desk looking straight into the camera, head and shoulders, a calm neutral expression, his bedroom behind him with a shelf and a window, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, face centred, eye line in the upper third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 18. `refs\s62-hero-thumbs-up.png`

Used in: s62 (the last "I'm lossless")

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Heroic low-angle shot: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) stands tall giving a huge thumbs-up to the sky, grinning, his hoodie and hair lifted by the wind, the earphone cables flying; beside him the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) stretches its springy arm up high, its shade glowing bright; a night sky behind them, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the young man in the centre, the Oracle on the right. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 19. `refs\s64-high-five.png`

Used in: s64 "I'm keeping every bit" (the high-five)

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Action shot at the desk: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) slaps a high-five onto the top of the dome shade of the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) as the little robot springs up to meet his palm, both laughing with their eyes squeezed shut, impact energy at the point of contact, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the point of contact in the centre. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 20. `refs\s65-dawn.png`

Used in: s65 "Bit-perfect. Life is good."

Attach: `refs\char-me.png`, `refs\char-oracle.png`, `refs\style\plainclothes-1.png`

```text
Wide shot at dawn: the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) asleep with his head resting on his folded arms on the desk, eyes closed, a small peaceful smile; beside him the Oracle (an original small cute desk-lamp robot: a round dome lampshade head with two big glossy black eyes with white highlights and small hatched blush marks, a springy two-part lamp arm with a coil spring at the joint, a round weighted base on small wheels, a soft glow under its shade) asleep too, eyes closed, its light off; the first morning sunlight pours through the window in long bright shafts across the desk and the wall, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, the figure in the centre third, the window on the right. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions on the young man, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```

## 21. `refs\s66-to-camera.png`

Used in: s66 "Really, this time."

Attach: `refs\char-me.png`, `refs\style\plainclothes-1.png`

```text
Portrait of the young man (an original anime-style character in his early 20s: slim, messy black hair with a spiky fringe over his forehead, sharp dark eyes, a black oversized hoodie, wired in-ear monitor earphones in both ears with thin cables running down to his chest) looking straight into the camera with a small, real, warm smile, soft eyes, head and shoulders, morning light falling across his face from a window, in the style of Plainclothes: a quiet high-contrast black-and-white graphic-novel ink treatment, a strict two-ink palette of matte ink black on warm bone-white paper, the subject rendered entirely in matte ink black and bone-white with no grey wash, all tone built from dense halftone dot fields and sharp screentone hatching laid in as flat tonal panel shading, confident clean brushline contours, generous negative space and uncluttered composition, cinematic restraint, fills the frame edge to edge. Wide 16:9 film frame, face centred, eye line in the upper third. Avoid: any colour, accent colours, neon glow, gradients, muddy mid-grey wash, soft pastel, scan-frame brackets, crop marks, bounding boxes, HUD overlays, tick marks, readable words, letters or numbers anywhere, title text, whitespace borders, chibi proportions, kawaii expressions, emoji, speech bubbles, watermark, logos or brand marks, photographic realism, 3D render, glossy plastic.
```
