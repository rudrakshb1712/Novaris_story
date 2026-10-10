// All sound is generated in code: a soft chapter drone + short effects. Nothing harsh.
const CH_CHORDS = {
  0: [146.83, 220.0, 293.66],          // D  A  d   heat, waiting
  1: [146.83, 220.0, 293.66],
  2: [130.81, 196.0, 311.13],          // c  g  e♭  the cold system
  3: [164.81, 246.94, 329.63],         // e  b  e   signal
  4: [146.83, 220.0, 277.18],          // d  a  c♯  forgotten districts
  5: [123.47, 185.0, 233.08],          // b  f♯ b♭  machine (soft, low)
  6: [110.0, 164.81, 220.0],           // a  e  a   countdown
  7: [196.0, 293.66, 392.0],           // g  d  g   relief
  8: [130.81, 196.0, 329.63],          // c  g  e   rebuilding
  9: [146.83, 220.0, 369.99],          // d  a  f♯  calm evening
};

export function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const master = ac.createGain();
  master.gain.value = 0;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 3;
  master.connect(comp).connect(ac.destination);

  // drone: three soft oscillators through a slowly breathing lowpass
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
  const droneGain = ac.createGain(); droneGain.gain.value = 0.0;
  lp.connect(droneGain).connect(master);
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ac.createGain(); lfoG.gain.value = 220;
  lfo.connect(lfoG).connect(lp.frequency); lfo.start();
  const voices = CH_CHORDS[1].map((f, i) => {
    const o = ac.createOscillator();
    o.type = i === 2 ? 'sine' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 1) * 4;
    const g = ac.createGain(); g.gain.value = [0.32, 0.22, 0.12][i];
    o.connect(g).connect(lp); o.start();
    return o;
  });
  // soft air noise bed
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.5;
  const air = ac.createBufferSource(); air.buffer = nb; air.loop = true;
  const airF = ac.createBiquadFilter(); airF.type = 'bandpass'; airF.frequency.value = 900; airF.Q.value = 0.6;
  const airG = ac.createGain(); airG.gain.value = 0.02;
  air.connect(airF).connect(airG).connect(master); air.start();

  // start page music track (assets/start.mp3)
  let startTrack = null;
  let startGain = null;
  try {
    startTrack = new Audio('/assets/start.mp3');
    startTrack.loop = true;
    startTrack.preload = 'auto';

    if (ac.createMediaElementSource) {
      const src = ac.createMediaElementSource(startTrack);
      startGain = ac.createGain();
      startGain.gain.value = 1.0;
      src.connect(startGain).connect(master);
    }
  } catch (e) {
    console.warn('[audio] start track fallback:', e);
  }

  // Chapter 3 Assemble audio track (assets/Assemble.mp4)
  let assembleTrack = null;
  let assembleGain = null;
  let assemblePlaying = false;
  let assembleEnded = false;
  let assemblePlayedForCh3 = false;
  try {
    assembleTrack = new Audio('/assets/Assemble.mp4');
    assembleTrack.preload = 'auto';

    if (ac.createMediaElementSource) {
      const src = ac.createMediaElementSource(assembleTrack);
      assembleGain = ac.createGain();
      assembleGain.gain.value = 1.0;
      src.connect(assembleGain).connect(master);
    }

    assembleTrack.addEventListener('ended', () => {
      assemblePlaying = false;
      assembleEnded = true;
      // After assemble audio ends, continue the start audio till the end!
      const currTime = ac.currentTime;
      if (startTrack && !muted) {
        if (startGain) {
          startGain.gain.setValueAtTime(0.001, currTime);
          startGain.gain.setTargetAtTime(1.0, currTime, 1.2);
        }
        startTrack.play().catch(() => {});
      }
      droneGain.gain.setTargetAtTime(0.06, currTime, 1.2);
      airG.gain.setTargetAtTime(0.015, currTime, 1.2);
    });
  } catch (e) {
    console.warn('[audio] assemble track fallback:', e);
  }

  function playStart() {
    if (!startTrack) return;
    if (ac.state === 'suspended' && !muted) ac.resume();
    startTrack.play().catch(() => {});
  }

  function stopStart() {
    if (!startTrack) return;
    startTrack.pause();
  }

  function playAssemble() {
    if (!assembleTrack || muted || assembleEnded) return;
    assemblePlaying = true;
    if (startTrack) startTrack.pause();
    droneGain.gain.setTargetAtTime(0.0, ac.currentTime, 0.4);
    airG.gain.setTargetAtTime(0.005, ac.currentTime, 0.4);
    assembleTrack.play().catch(() => {});
  }

  function pauseAssemble() {
    if (!assembleTrack) return;
    assemblePlaying = false;
    assembleTrack.pause();
  }

  function resetStart() {
    if (assembleTrack) {
      assembleTrack.pause();
      assembleTrack.currentTime = 0;
    }
    assemblePlayedForCh3 = false;
    assemblePlaying = false;
    assembleEnded = false;
    if (startTrack) {
      startTrack.currentTime = 0;
      if (!muted) startTrack.play().catch(() => {});
    }
  }

  let chapter = -1, muted = true, level = 0.0;

  function setChapter(n, u) {
    const now = ac.currentTime;
    if (n !== chapter) {
      chapter = n;
      const ch = CH_CHORDS[n] || CH_CHORDS[1];
      voices.forEach((o, i) => o.frequency.setTargetAtTime(ch[i], now, 1.2));
      lp.frequency.setTargetAtTime(n === 2 ? 900 : n === 5 || n === 6 ? 520 : n === 9 ? 620 : 760, now, 1.5);
      airF.frequency.setTargetAtTime(n >= 7 ? 1400 : 900, now, 2);

      // Chapter 3: Play Assemble track
      if (n === 3) {
        if (!assemblePlayedForCh3 && assembleTrack && !muted) {
          assemblePlayedForCh3 = true;
          assemblePlaying = true;
          assembleEnded = false;
          // Duck startTrack and drone while Assemble plays
          if (startTrack) startTrack.pause();
          droneGain.gain.setTargetAtTime(0.0, now, 0.4);
          airG.gain.setTargetAtTime(0.005, now, 0.4);
          assembleTrack.currentTime = 0;
          assembleTrack.play().catch(() => {});
        }
      } else {
        // If moving away from Chapter 3 while assemble is playing, pause it
        if (assemblePlaying && assembleTrack) {
          pauseAssemble();
        }
        if (n < 3) {
          assemblePlayedForCh3 = false;
        }
      }
    }

    // Start track plays during Start / Title & Chapter 1 (u < 9.1),
    // and after assemble audio ends in Chapter 3, continues playing till the end of the story!
    const shouldPlayStart = (u < 9.1) || ((assembleEnded || u >= 21.1) && !assemblePlaying);
    if (startGain) {
      startGain.gain.setTargetAtTime(shouldPlayStart ? 1.0 : 0.0, now, 1.4);
    }
    if (startTrack) {
      if (shouldPlayStart && startTrack.paused && !muted) {
        startTrack.play().catch(() => {});
      } else if (!shouldPlayStart && !startTrack.paused) {
        startTrack.pause();
      }
    }

    // the last chapter gets quieter and calmer
    const target = n === 9 ? 0.09 : n === 6 ? 0.12 : 0.13;
    if (Math.abs(target - level) > 0.001) {
      level = target;
      if (!assemblePlaying) {
        droneGain.gain.setTargetAtTime(level, now, 1.5);
      }
    }
  }
  function silence(on) {
    if (assemblePlaying) return;
    droneGain.gain.setTargetAtTime(on ? 0.0 : level, ac.currentTime, on ? 0.08 : 1.2);
  }

  function setMuted(m) {
    muted = m;
    if (!m && ac.state === 'suspended') ac.resume();
    master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.25);
    if (m) {
      if (startTrack) startTrack.pause();
      if (assembleTrack) assembleTrack.pause();
    } else {
      if (chapter === 3 && assemblePlaying && !assembleEnded) {
        playAssemble();
      } else {
        const shouldPlayStart = (chapter <= 1) || assembleEnded || (chapter >= 4);
        if (shouldPlayStart && startTrack) {
          startTrack.play().catch(() => {});
        }
      }
    }
  }

  // ---- effects ----
  function env(g, a, peak, d) {
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(freq, type, a, peak, d, glideTo) {
    if (muted) return;
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq;
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, ac.currentTime + a + d);
    const g = ac.createGain(); o.connect(g).connect(master); env(g, a, peak, d);
    o.start(); o.stop(ac.currentTime + a + d + 0.05);
  }
  function noise(fq, q, a, peak, d, type = 'bandpass') {
    if (muted) return;
    const s = ac.createBufferSource(); s.buffer = nb;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = fq; f.Q.value = q;
    const g = ac.createGain(); s.connect(f).connect(g).connect(master); env(g, a, peak, d);
    s.start(0, Math.random()); s.stop(ac.currentTime + a + d + 0.05);
  }
  const fx = {
    drip: () => { tone(1400, 'sine', 0.005, 0.18, 0.18, 520); },
    clank: () => { noise(380, 2, 0.005, 0.25, 0.25); tone(150, 'triangle', 0.005, 0.12, 0.3, 120); },
    denied: () => { tone(330, 'triangle', 0.01, 0.12, 0.16); setTimeout(() => tone(247, 'triangle', 0.01, 0.12, 0.28), 170); },
    glitch: () => { noise(2400, 4, 0.005, 0.12, 0.25, 'highpass'); tone(90, 'sine', 0.01, 0.18, 0.5, 60); },
    rain: () => { noise(1800, 0.5, 0.4, 0.14, 3.2, 'lowpass'); noise(80, 1, 0.3, 0.18, 1.8, 'lowpass'); },
    choose: () => { tone(523, 'sine', 0.01, 0.12, 0.3); setTimeout(() => tone(659, 'sine', 0.01, 0.1, 0.4), 90); },
    rupture: () => { noise(120, 0.8, 0.02, 0.45, 1.6, 'lowpass'); tone(60, 'sine', 0.02, 0.3, 1.2, 38); },
    hum: () => { tone(98, 'sawtooth', 0.4, 0.035, 1.6); },
    charge: (p) => { tone(220 + p * 330, 'sine', 0.01, 0.04, 0.12); },
    success: () => { [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.01, 0.12, 0.7), i * 90)); },
    click: () => { noise(3000, 3, 0.002, 0.18, 0.05, 'highpass'); },
    switch: () => { tone(880, 'square', 0.002, 0.04, 0.08); tone(1320, 'sine', 0.005, 0.08, 0.18); },
    miss: () => { tone(196, 'triangle', 0.01, 0.1, 0.22); },
    sever: () => { tone(440, 'sine', 0.01, 0.2, 1.4, 55); noise(500, 1, 0.01, 0.12, 0.6, 'lowpass'); },
    pour: () => { noise(1100, 0.7, 0.2, 0.12, 1.4); },
    paper: () => { noise(4200, 1.5, 0.003, 0.1, 0.09, 'highpass'); setTimeout(() => tone(784, 'sine', 0.01, 0.1, 0.5), 80); },
    jet: () => { noise(400, 0.5, 0.8, 0.14, 2.5, 'lowpass'); },
    final: () => { [293.66, 369.99, 440, 554.37].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.3, 0.07, 3.5), i * 260)); },
  };
  function play(name, arg) { try { fx[name] && fx[name](arg); } catch (e) { /* never let sound break the story */ } }

  return { setChapter, setMuted, play, silence, playStart, stopStart, resetStart, get muted() { return muted; }, ctx: ac };
}
