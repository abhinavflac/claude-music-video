# Lossless: song notes

## The take
- File: `Downloads\Lossless.wav` -> `song/song.wav` (48 kHz, 16-bit, stereo, 4:08.01).
- Made in Suno v6 (Advanced Mode, Max Mode on, Variety Off). Style prompt:
  `melancholic alt-pop with a hip-hop groove, 92 BPM, G minor, half-time drums with busy double-time hi-hats, deep warm sub bass, dark mellow synths, intimate close-mic lead vocal, quiet intro motif that returns in the break and outro, each chorus bigger than the last, bass-heavy bridge, fade-out ending`
- `lyrics.json` follows the recording: the post-chorus repeats "every bit" many times, "I'm keeping every bit" is sung twice at the end, and the break after chorus 1 was dropped.

## Measured
- Tempo 90.99 BPM, steady. One bar = 2.638 s. The kick marks the bar's one.
- Key G minor. Very bass-heavy.
- Hard stop at 2:33.8, near silence until "Minus one." (2:37.2), then a loud burst 2:38-2:43 before the bridge.
- Whisper section 3:41.5-3:48.6 ("Bit-perfect. Life is good."), loud tag to 4:04, hard ending at 4:06.

## Files
- `lyrics.json`: `text` for the screen, `sung` + `map` where the singer says it differently (a.m., 320, RPM, DBSCAN, FLAC, Bit-perfect).
- `timing.json`: DRAFT word timing (word-level recognition on the isolated vocal, matched to the lyrics). Re-align with ElevenLabs.
- `labels.txt`: line times as Audacity labels.
- `vocals.wav`: isolated vocal, 24 kHz mono, same length as the song.
- `beats.json`: beats and downbeats on the 90.99 BPM grid.

## Timing (final, 2026-09-28)
- Stem check: `vocals.wav` has the mix's length; `tools/offset.py` prints 0.0 ms at 30, 100 and 190 s.
- Whole-song ElevenLabs alignment (`align/song.json` -> `song/timing-aligned.json`) pulled i1's first word to 0:00 and ran high loss in the choruses.
- Final source: every line re-aligned on its own clip with neighbours as context (`tools/realign-lines.mjs` -> `align/lines/`, `align/sections-lines.json`), then compared with the draft (`song/timing-draft.json`) on spectrograms of the stem (`tools/specview.py`).
- Kept from the draft: i2, c1_1, v2_1 (their first words sit on the onset; the aligner was 0.06-0.2 s late). Word fixes: v1_4, v1_5, v1_8, post_1, post_2. Each has its reason in `song/timing-fixes.json`.
- Rebuild: `node tools/rebuild-timing.mjs --sections align/sections-lines.json --fixes song/timing-fixes.json`
- Hard stop at 153.59 s (on a beat): the mix is silent 153.6-153.9 s, then a pad until the burst on the downbeat at 158.21 s. The kick confirms the downbeat phase in `beats.json`.
