// Resolve the chosen design language per scene to catalog entries (slug + a tag that tells duplicates apart).
import fs from 'node:fs';
const cat = JSON.parse(fs.readFileSync('looks/catalog.json', 'utf8'));
const picks = {
  s01: ['regler', 'Hi-fi functional modernism for the export dialog: knurled controls, burnt-orange signal'],
  s02: ['aurora', 'Oscilloscope graticule and waveform trace for the shaved peaks'],
  s03: ['dither', 'CGA retro desktop for the Bin window'],
  s04: ['klaxon', 'Screen-printed poster type with an acid slab for LESS'],
  s05: ['nightwatch', 'Surveillance-dossier halftone: the eye that noticed'],
  s06: ['dialtone', 'Bedroom console at 2 a.m.: powder grey, manga-ink wiring, one active window'],
  s07: ['cathode', 'Dark phosphor terminal for the broken Arch update'],
  s08: ['phosphene', 'Cell meters and quantized readouts for the three widgets'],
  s09: ['nighthawk', 'After-hours warm black and cue marks for the hi-fi player'],
  s10: ['mimeo', 'Photocopy of a photocopy: the repost feed degrading'],
  s11: ['reticle-ledger', 'White analytics with tabular numerals for the model card'],
  s12: ['plush', 'Self-lit companion OS: the Oracle as a nightlight chat'],
  s13: ['kissaten', 'Slice-of-life manga interior with soft terminal panes'],
  s14: ['glaze', 'Porcelain phone UI for the two status cards', 'porcelain'],
  s15: ['gamut', 'Product-interface chips and slots for the export queue'],
  s16: ['broadsheet', 'Twelve-column red-black digest for summaries of summaries'],
  s17: ['halide', 'Spectrograph ledger for the low-pass cut'],
  s18: ['tobari', 'Spotlit koma at night for the room and the string decay'],
  s19: ['riveter', 'Constructivist steel plate for the vise'],
  s20: ['errata', 'Redline proof pass: strike 320 and smooth'],
  s21: ['kymograph', 'One continuous trace, amplitude as state: keep the tremble'],
  s22: ['prism-works', 'Prismatic dispersion: the spectrum grows back'],
  s23: ['caret-ledger', 'Command-first ops console for the full server'],
  s24: ['reticle', 'Crop marks on a light table for the crop tool', 'crop-marks'],
  s25: ['limelight', 'Cel-anime key light for the first lossless'],
  s26: ['sector-bureau', 'Checksum bands and archive recovery for BITS LOST: 0'],
  s27: ['parapara', 'Hand-inked flipbook on twos for the nod'],
  s28: ['tessera', 'Arcade cell meters for the pixel VU', 'cyan-arcade'],
  s29: ['akte', 'Machine judgment and redaction bars for the lockout'],
  s30: ['pomelo-soft-white-melon-azure', 'Soft consumer launcher that greys out'],
  s31: ['kursbuch', 'Objective Swiss form with a strict counter'],
  s32: ['vernier', 'Dark analytics with amber thresholds for the risk engine', 'dark-analytics'],
  s33: ['bulla', 'Tribunal, seals and custody for the faceless judge'],
  s34: ['carbon', 'Case file, manila and stencil stamps for the no-reason notice'],
  s35: ['bouba', 'Soft inflatable bodies: literal soft landings'],
  s36: ['servo', 'Chrome console gauges for the needle-less RPM dial'],
  s37: ['tally', 'Append-only ledger for keeping score'],
  s38: ['shinya', "Shin'ya means late night: lavender-cyan haze for the ceiling"],
  s39: ['wheatpaste', 'Flyposted wall and sodium highlighter: BROKEN'],
  s40: ['litmus', 'Assay product interface for the second dropdown', 'product-interface'],
  s41: ['beamline', 'Petrol-ground oscilloscope for the dark wave editor'],
  s42: ['caustic', 'Spectral accents on dark glass: the spectrum restored'],
  s43: ['phosphor-deck', 'Mission console that refuses the shrink'],
  s44: ['quire', 'Proofing desk crop marks for the crop that fails', 'proofing-desk'],
  s45: ['fanfare', 'Bright-stage proclamation cut for 99%'],
  s46: ['plakat', 'Die-cut stickers, bursts and ribbons for every bit'],
  s47: ['florette', 'Superflat sticker press, piling up to the hard stop'],
  s48: ['slate', 'Broadcast signal dropout for the buffering freeze'],
  s49: ['phosphor', 'True-black green terminal for the -1', 'true-black'],
  s50: ['gekiga', 'Inked panel frames and halftone emphasis for the burst'],
  s51: ['soma', 'Manga schematic linework on e-paper for the DBSCAN plot'],
  s52: ['citron-counter', 'Premium commerce page for the chair left in the cart'],
  s53: ['halation', 'Luminous bloom: the sound pours out'],
  s54: ['furoku', 'Kawaii stationery stickers for the gift chair'],
  s55: ['knockout', 'Knockout type on ink-black stock: the vise shatters'],
  s56: ['vitrine', 'Liquid glass video call with the blur switched off', 'liquid-glass'],
  s57: ['cambium', 'Concentric growth rings read as record grooves'],
  s58: ['meridian', 'Neon-on-white almanac chart for the spectrum at 100%', 'seasonal-chart'],
  s59: ['techo', 'Planner, washi tape and stamps for the self-care checkout'],
  s60: ['spool', 'Reverse-video listing tape for the dashboard that blows up'],
  s61: ['decoupage', 'Paste-up collage: the crop tool comes apart'],
  s62: ['amikake-console', 'Battery chips and screentone rails for 100%'],
  s63: ['kardex', 'One-bit seal and archival ledger for BITS LOST: 0'],
  s64: ['komawari', 'Comic panels and registration offset for the high-five'],
  s65: ['yoake', 'Yoake means dawn: network-dawn console for bit-perfect'],
  s66: ['moire-manga-tone-console', 'Screentone moire console for the look to camera'],
  s67: ['tachikiri', "The film's own look: koma panels and one phosphor signal"],
};
const scenes = JSON.parse(fs.readFileSync('scenes.json', 'utf8'));
const out = [], used = new Set();
for (const s of scenes) {
  const [slug, why, tag] = picks[s.id];
  const hits = cat.filter(c => c.slug === slug && (!tag || c.tags.includes(tag)));
  const uniq = [...new Map(hits.map(h => [h.id, h])).values()];
  if (uniq.length !== 1) throw new Error(`${s.id}: ${slug}${tag ? ' #' + tag : ''} matched ${uniq.length}`);
  const e = uniq[0];
  if (used.has(e.id)) throw new Error(`${s.id}: ${slug} already used`);
  used.add(e.id);
  out.push({ scene: s.id, mode: s.mode, slug: e.slug, id: e.id, name: e.name, url: e.url, thumb: e.thumb, why });
}
fs.writeFileSync('looks/picks.json', JSON.stringify(out, null, 1) + '\n');
console.log(out.length, 'picks,', used.size, 'distinct languages');
