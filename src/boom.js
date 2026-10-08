// Synthesised bomb: beeps, then a distorted explosion and a ringing in the
// ears. Everything is generated in the browser. Needs a user gesture to
// start (call it from a click handler).
let ctx;

// Beep times in seconds from the start: they speed up, like a real bomb.
const BEEP_GAPS = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1];
const BEEP_LENGTH = 0.08;
export const BEEP_TIMES = BEEP_GAPS.reduce(
  (times, gap) => [...times, times[times.length - 1] + gap],
  [0],
);
// Seconds from the call until the explosion itself.
export const BOOM_DELAY = BEEP_TIMES[BEEP_TIMES.length - 1] + 0.5;

const distortionCurve = (amount) => {
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * amount);
  }
  return curve;
};

const noiseBuffer = (seconds) => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

// Generated room reverb: noise that decays, so the blast echoes.
const reverb = (seconds) => {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = buffer;
  return convolver;
};

const beep = (output, at) => {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.005);
  gain.gain.setValueAtTime(0.35, at + BEEP_LENGTH);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_LENGTH + 0.03);
  osc.connect(gain).connect(output);
  osc.start(at);
  osc.stop(at + BEEP_LENGTH + 0.05);
};

const boom = (output, at) => {
  const length = 5;

  const shaper = ctx.createWaveShaper();
  shaper.curve = distortionCurve(40);
  shaper.oversample = "4x";
  const master = ctx.createGain();
  master.gain.setValueAtTime(1, at);
  master.gain.exponentialRampToValueAtTime(0.001, at + length);
  // Right after the blast everything sounds muffled, then clears up.
  const muffle = ctx.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.setValueAtTime(20000, at);
  muffle.frequency.setValueAtTime(20000, at + 0.15);
  muffle.frequency.exponentialRampToValueAtTime(350, at + 0.5);
  muffle.frequency.exponentialRampToValueAtTime(12000, at + 7);
  const room = reverb(3);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  shaper.connect(master).connect(muffle);
  muffle.connect(output);
  muffle.connect(room).connect(wet).connect(output);

  // Debris clattering down for a few seconds.
  for (let i = 0; i < 40; i++) {
    const t = at + 0.4 + Math.random() * 3.5;
    const tick = ctx.createBufferSource();
    tick.buffer = noiseBuffer(0.1);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 200 + Math.random() * 3000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4 * (1 - (t - at) / 4.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    tick.connect(f).connect(g).connect(output);
    tick.start(t);
  }

  // Crack: a bright, very short burst.
  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuffer(0.3);
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(1, at);
  crackGain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
  crack.connect(crackGain).connect(shaper);
  crack.start(at);

  // Body: noise that gets darker as it dies away.
  const body = ctx.createBufferSource();
  body.buffer = noiseBuffer(length);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(6000, at);
  filter.frequency.exponentialRampToValueAtTime(60, at + length);
  body.connect(filter).connect(shaper);
  body.start(at);

  // Sub-bass thump.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(90, at);
  sub.frequency.exponentialRampToValueAtTime(18, at + 2);
  const subGain = ctx.createGain();
  subGain.gain.value = 4;
  sub.connect(subGain).connect(shaper);
  sub.start(at);
  sub.stop(at + length);
};

// The ringing after a flashbang: a high tone that fades in as the blast dies.
const tinnitus = (output, at) => {
  for (const frequency of [5900, 7300]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.12, at + 0.4);
    gain.gain.setValueAtTime(0.12, at + 3);
    gain.gain.linearRampToValueAtTime(0.0001, at + 9);
    osc.connect(gain).connect(output);
    osc.start(at);
    osc.stop(at + 9.1);
  }
};

// Plays beeps, then the explosion. Returns the delay (ms) until the explosion.
export const playBombSequence = () => {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    const now = ctx.currentTime + 0.05;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.connect(ctx.destination);

    for (const t of BEEP_TIMES) beep(limiter, now + t);
    boom(limiter, now + BOOM_DELAY);
    tinnitus(limiter, now + BOOM_DELAY + 0.3);
  } catch {
    // No audio available; the explosion still works silently.
  }
  return BOOM_DELAY * 1000 + 50;
};

// A celebration: fanfare, bouncy bass, sparkles and applause.
export const playHappy = () => {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    const now = ctx.currentTime + 0.05;
    const out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(ctx.destination);

    const note = (freq, at, length, volume = 0.25, type = "triangle") => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + length + 0.05);
    };

    // Fanfare melody (C major): [frequency, start beat, beats]
    const beat = 0.16;
    const melody = [
      [523.25, 0, 1], [523.25, 1, 1], [523.25, 2, 1], [659.25, 3, 2],
      [587.33, 5, 1], [659.25, 6, 1], [783.99, 7, 2], [659.25, 9, 1],
      [783.99, 10, 1], [1046.5, 11, 4],
    ];
    for (const [f, start, beats] of melody) {
      note(f, now + start * beat, beats * beat * 1.1, 0.22, "square");
      note(f * 2, now + start * beat, beats * beat * 1.1, 0.06);
    }

    // Bouncy oom-pah bass underneath.
    const bass = [130.81, 196, 130.81, 196, 174.61, 261.63, 130.81, 196];
    bass.forEach((f, i) => note(f, now + i * beat * 2, beat * 1.5, 0.3));

    // Final big chord.
    const end = now + 15 * beat;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) =>
      note(f, end, 2.2, 0.15),
    );

    // Sparkles: random high pings.
    for (let i = 0; i < 24; i++) {
      const f = 1568 * Math.pow(2, Math.floor(Math.random() * 5) / 5);
      note(f, end + Math.random() * 2.5, 0.25, 0.07, "sine");
    }

    // Applause: lots of short bandpassed noise claps.
    const clapBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = clapBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    for (let i = 0; i < 220; i++) {
      const t = end - 0.2 + Math.random() * 3.5;
      const clap = ctx.createBufferSource();
      clap.buffer = clapBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1200 + Math.random() * 2500;
      const g = ctx.createGain();
      const fade = Math.max(0, 1 - (t - end) / 3.5);
      g.gain.setValueAtTime(0.25 * fade, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      clap.connect(f).connect(g).connect(out);
      clap.start(t);
    }
  } catch {
    // No audio available.
  }
};
