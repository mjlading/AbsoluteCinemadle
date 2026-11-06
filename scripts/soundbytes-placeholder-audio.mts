/*
 * Writes the placeholder clips the Soundbytes mock boards play, into
 * public/audio/mock/. Nothing here is film audio: every clip is synthesized,
 * so the files are safe to commit and easy to swap for real clips later.
 *
 * For each category there are two variants (a, b), each with a real 6-second
 * clip and a 2-second disguised one that mimics the disguise:
 *   dialogue: a warbling, vowel-like voice; disguised with a helium pitch-up
 *   score:    a short melody; disguised as a buzzy kazoo
 *   sfx:      thumps (a) or a roar (b); disguised by muffling
 *
 * Run with: npx tsx scripts/soundbytes-placeholder-audio.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RATE = 16_000;
const OUT = join(import.meta.dirname, "..", "public", "audio", "mock");

type Signal = Float32Array;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A two-pole filter section (RBJ cookbook), run over a whole signal. */
function biquad(
  input: Signal,
  type: "lowpass" | "bandpass" | "highpass",
  freq: number | ((t: number) => number),
  q = 0.707,
) {
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const f = Math.min(typeof freq === "number" ? freq : freq(i / RATE), RATE * 0.45);
    const w = (2 * Math.PI * f) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    let b0: number, b1: number, b2: number;
    if (type === "lowpass") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (type === "highpass") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [alpha, 0, -alpha];
    const a0 = 1 + alpha;
    const a1 = -2 * cos;
    const a2 = 1 - alpha;
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

const mix = (...signals: Signal[]) => {
  const out = new Float32Array(signals[0].length);
  for (const s of signals) for (let i = 0; i < out.length; i++) out[i] += s[i];
  return out;
};

const gain = (s: Signal, g: number) => s.map((v) => v * g);

/** Normalizes to a comfortable peak and fades the ends so clips never click. */
function finish(s: Signal): Signal {
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  const out = gain(s, peak > 0 ? 0.7 / peak : 1);
  const fade = Math.floor(RATE * 0.015);
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[out.length - 1 - i] *= i / fade;
  }
  return out;
}

/** Phase-accumulating oscillator with a time-varying frequency. */
function osc(seconds: number, freq: (t: number) => number, wave: (phase: number) => number) {
  const out = new Float32Array(Math.round(seconds * RATE));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = wave(phase);
    phase = (phase + freq(i / RATE) / RATE) % 1;
  }
  return out;
}

const saw = (p: number) => 2 * p - 1;
const tri = (p: number) => 1 - 4 * Math.abs(p - 0.5);
const sine = (p: number) => Math.sin(2 * Math.PI * p);

// --- Dialogue: a glottal buzz through moving vowel formants. ---

const VOWELS: Record<string, [number, number, number]> = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  i: [300, 2200, 2900],
  o: [570, 840, 2410],
  u: [330, 870, 2240],
};

type Syllable = { vowel: keyof typeof VOWELS; length: number; gap: number };

function voice(seconds: number, syllables: Syllable[], basePitch: number, shift: number, speed: number) {
  // Lay the syllables out in time, repeating the phrase to fill the clip.
  const spans: { start: number; end: number; vowel: string }[] = [];
  let t = 0.05;
  for (let k = 0; t < seconds; k++) {
    const s = syllables[k % syllables.length];
    spans.push({ start: t, end: t + s.length / speed, vowel: s.vowel });
    t += (s.length + s.gap) / speed;
  }
  const at = (time: number) => spans.find((s) => time >= s.start && time < s.end) ?? null;
  const pitch = (time: number) => {
    const phrase = (time % 3) / 3; // a falling contour every few seconds, like a sentence
    return basePitch * shift * (1.15 - 0.3 * phrase + 0.04 * Math.sin(2 * Math.PI * 5.5 * time));
  };
  const source = osc(seconds, pitch, saw);
  const envelope = new Float32Array(source.length);
  for (let i = 0; i < source.length; i++) {
    const span = at(i / RATE);
    if (!span) continue;
    const pos = (i / RATE - span.start) / (span.end - span.start);
    envelope[i] = Math.sin(Math.PI * Math.min(1, pos)) ** 0.6;
  }
  const formant = (n: 0 | 1 | 2) => (time: number) => {
    const span = at(time);
    return VOWELS[span?.vowel ?? "a"][n] * (shift > 1 ? 1.5 : 1);
  };
  const shaped = mix(
    biquad(source, "bandpass", formant(0), 6),
    gain(biquad(source, "bandpass", formant(1), 8), 0.6),
    gain(biquad(source, "bandpass", formant(2), 10), 0.3),
  );
  return shaped.map((v, i) => v * envelope[i]);
}

const PHRASES: Record<"a" | "b", { syllables: Syllable[]; pitch: number }> = {
  a: {
    pitch: 115,
    syllables: [
      { vowel: "a", length: 0.2, gap: 0.04 },
      { vowel: "i", length: 0.16, gap: 0.03 },
      { vowel: "o", length: 0.28, gap: 0.12 },
      { vowel: "e", length: 0.18, gap: 0.03 },
      { vowel: "u", length: 0.34, gap: 0.45 },
    ],
  },
  b: {
    pitch: 190,
    syllables: [
      { vowel: "e", length: 0.15, gap: 0.03 },
      { vowel: "a", length: 0.24, gap: 0.05 },
      { vowel: "o", length: 0.17, gap: 0.03 },
      { vowel: "i", length: 0.3, gap: 0.5 },
    ],
  },
};

const dialogue = (variant: "a" | "b", disguised: boolean) => {
  const { syllables, pitch } = PHRASES[variant];
  return disguised ? voice(2, syllables, pitch, 1.9, 1.3) : voice(6, syllables, pitch, 1, 1);
};

// --- Score: a melody, played straight or on a kazoo. ---

const note = (semitones: number) => 261.63 * 2 ** (semitones / 12);

const MELODIES: Record<"a" | "b", { notes: [number, number][]; tempo: number }> = {
  // [semitones from middle C, beats]
  a: {
    tempo: 92,
    notes: [
      [0, 1],
      [7, 1],
      [12, 1.5],
      [11, 0.5],
      [9, 1],
      [7, 2],
      [5, 1],
      [4, 1],
      [2, 1],
      [0, 2],
    ],
  },
  b: {
    tempo: 150,
    notes: [
      [-3, 0.5],
      [0, 0.5],
      [-3, 0.5],
      [2, 0.5],
      [3, 1],
      [2, 0.5],
      [0, 0.5],
      [-1, 1],
      [-3, 0.5],
      [-5, 0.5],
      [-3, 2],
    ],
  },
};

function melody(variant: "a" | "b", seconds: number, kazoo: boolean) {
  const { notes, tempo } = MELODIES[variant];
  const beat = 60 / tempo;
  const events: { start: number; end: number; freq: number }[] = [];
  let t = 0.05;
  for (let k = 0; t < seconds; k++) {
    const [semitones, beats] = notes[k % notes.length];
    events.push({ start: t, end: t + beats * beat, freq: note(semitones) });
    t += beats * beat;
  }
  const at = (time: number) => events.find((e) => time >= e.start && time < e.end) ?? null;
  const vibrato = (time: number) => 1 + (kazoo ? 0.012 : 0.004) * Math.sin(2 * Math.PI * 6 * time);
  const tone = osc(seconds, (time) => (at(time) ?? events[0]).freq * vibrato(time), kazoo ? saw : tri);
  const envelope = tone.map((_, i) => {
    const time = i / RATE;
    const e = at(time);
    if (!e) return 0;
    const pos = time - e.start;
    const rest = e.end - time;
    return Math.min(1, pos / 0.02) * Math.min(1, rest / 0.04) * (kazoo ? 1 : Math.exp(-pos * 0.9));
  });
  const voiced = tone.map((v, i) => v * envelope[i]);
  if (kazoo) {
    // A kazoo is a hummed voice through a buzzing membrane: nasal and edgy.
    const buzz = biquad(voiced, "bandpass", 1300, 1.4);
    return mix(gain(buzz, 1.4), gain(biquad(voiced, "highpass", 2400), 0.5));
  }
  const bass = osc(seconds, (time) => (at(time) ?? events[0]).freq / 2, sine).map((v, i) => v * envelope[i] * 0.4);
  return mix(voiced, bass);
}

const score = (variant: "a" | "b", disguised: boolean) => melody(variant, disguised ? 2 : 6, disguised);

// --- Sound effects: heavy thumps or a roar; muffled behind a door. ---

function noise(seconds: number, seed: number) {
  const random = seeded(seed);
  return new Float32Array(Math.round(seconds * RATE)).map(() => random() * 2 - 1);
}

function thumps(seconds: number) {
  const out = new Float32Array(Math.round(seconds * RATE));
  const hit = noise(0.5, 7);
  for (let start = 0.15; start < seconds - 0.3; start += 1.05) {
    const offset = Math.round(start * RATE);
    for (let i = 0; i < RATE * 0.5 && offset + i < out.length; i++) {
      const t = i / RATE;
      const body = Math.sin(2 * Math.PI * (40 * t + 30 * (1 - Math.exp(-t * 18)) * 0.06)) * Math.exp(-t * 7);
      out[offset + i] += body + hit[i] * 0.25 * Math.exp(-t * 30);
    }
  }
  return mix(biquad(out, "lowpass", 900), gain(biquad(noise(seconds, 3), "lowpass", 120), 0.05));
}

function roar(seconds: number) {
  const swell = (t: number) => Math.sin(Math.PI * Math.min(1, (t % 3) / 2.6)) ** 1.5;
  const breath = biquad(noise(seconds, 11), "bandpass", (t) => 350 + 700 * swell(t), 2.2);
  const growl = osc(seconds, (t) => 68 + 10 * swell(t), saw).map((v, i) => {
    const t = i / RATE;
    return v * (0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * t));
  });
  return mix(breath, gain(biquad(growl, "lowpass", 600), 0.7)).map((v, i) => v * swell(i / RATE));
}

const sfx = (variant: "a" | "b", disguised: boolean) => {
  const seconds = disguised ? 2 : 6;
  const raw = variant === "a" ? thumps(seconds) : roar(seconds);
  // Behind a door: everything above a few hundred hertz is gone.
  return disguised ? biquad(biquad(raw, "lowpass", 320), "lowpass", 320) : raw;
};

// --- WAV output: 16-bit mono PCM. ---

function wav(samples: Signal): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
const makers = { dialogue, score, sfx };
for (const [category, make] of Object.entries(makers)) {
  for (const variant of ["a", "b"] as const) {
    for (const disguised of [true, false]) {
      const file = `${category}-${variant}-${disguised ? "disguised" : "real"}.wav`;
      writeFileSync(join(OUT, file), wav(finish(make(variant, disguised))));
      console.log(`Wrote ${file}`);
    }
  }
}
