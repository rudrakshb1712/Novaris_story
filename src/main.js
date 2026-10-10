import Lenis from 'lenis';
import './style.css';
import { U, CHAPTERS, GATES, OPTIONALS, chapterAt } from './timeline.js';
import { clamp, win } from './util.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { createInteractions } from './interactions.js';
import { createIronManCursor } from './ironman-cursor.js';
import { createSpeechClouds } from './speech-clouds.js';
import { STORY_BEATS } from './story-beats.js';

// ---------- reload always starts at the top ----------
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reducedQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const S = {
  u: 0, uT: 0, t: 0, dt: 0.016, rs: 1,
  reduced: reducedQ.matches,
  done: {},
  cp: { local: Array(9).fill(false), evidence: [] },
  gateActive: null, avoid: [], hideLabels: false,
};

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const track = $('track');
const R = createRenderer(canvas, S);
const speechClouds = createSpeechClouds(document.body, R, S);
let audio = null;
let muted = true;
let started = false;

// ---------- discrete beat controller state ----------
let currentBeatIndex = 0;
let targetU = STORY_BEATS[0]?.u || 2.8;

// Keep track of layout for canvas/checkpoints
let unitPx = window.innerHeight * 0.85;
function limitU() {
  for (const g of GATES) if (!S.done[g.id]) return g.u;
  return U;
}
function layoutTrack() {
  unitPx = Math.max(360, window.innerHeight * 0.85);
  track.style.height = Math.ceil(window.innerHeight + limitU() * unitPx) + 'px';
}
layoutTrack();

// Lenis instance kept in sync for coordinates
const lenis = new Lenis({
  autoRaf: false,
  lerp: S.reduced ? 1 : 0.1,
  smoothWheel: false, // Disabled continuous dragging in favor of discrete beats
});
lenis.stop();
document.body.classList.add('locked');

function scrollToU(u, immediate) {
  targetU = clamp(u, 0, limitU());
  if (immediate || S.reduced) S.u = targetU;
  const y = targetU * unitPx;
  lenis.scrollTo(y, { immediate: true, force: true });
}

// ---------- interactive checkpoints ----------
const inter = createInteractions(S, R, {
  sound: (n, a) => audio && audio.play(n, a),
  complete(id) {
    if (S.done[id]) return;
    S.done[id] = true;
    layoutTrack();
    inter.showOk(id);
    // After gate completion, seamlessly advance to the next beat
    setTimeout(() => {
      if (started) advanceBeat();
    }, 750);
  },
});

function activeGate() {
  for (const g of GATES) {
    if (S.done[g.id]) continue;
    if (S.u >= g.u - 0.15) return g.id;
    return null;
  }
  return null;
}
function activeOptional() {
  for (const o of OPTIONALS) if (S.u >= o.a && S.u < o.b) return o.id;
  return null;
}

// Nudge prompt if trying to advance past an incomplete gate
let lastNudge = 0;
function blockedForward() {
  const now = performance.now();
  if (now - lastNudge > 600) {
    lastNudge = now;
    inter.nudge();
  }
}

// ---------- UI Elements ----------
const card = $('card');
const hdr = $('header'), hNum = $('hNum'), hTitle = $('hTitle'), hSub = $('hSub');
const fin = $('finale'), fText = $('fText');
const mChip = $('mChip'), mChipText = $('mChipText'), mRes = $('mRes'), mResV = $('mResV'), mSup = $('mSup'), mSupV = $('mSupV');
const mExtra = $('mExtra'), mExtraK = $('mExtraK'), mExtraV = $('mExtraV'), meterEl = $('meter');
const navTicks = $('navTicks'), navFill = $('navFill'), mastChapter = $('mastChapter');

// Visual Novel footer controls
const vnControls = $('vnControls');
const vnPrev = $('vnPrev');
const vnNext = $('vnNext');
const vnBeatCurrent = $('vnBeatCurrent');
const vnBeatTotal = $('vnBeatTotal');
const vnHint = $('vnHint');

if (vnBeatTotal) vnBeatTotal.textContent = String(STORY_BEATS.length);

// ---------- discrete beat transitions ----------
let headerTimer = null;
let shownChapterNum = -1;

function updateBeatUI(beat) {
  if (vnBeatCurrent) vnBeatCurrent.textContent = String(currentBeatIndex + 1);
  if (vnPrev) vnPrev.disabled = currentBeatIndex === 0;
  if (vnNext) vnNext.disabled = currentBeatIndex === STORY_BEATS.length - 1;

  if (vnHint) {
    if (beat.gate && !S.done[beat.gate]) {
      vnHint.textContent = 'Interaction required to proceed ⚡';
      vnHint.style.color = '#ff8000';
    } else if (beat.isFinale) {
      vnHint.textContent = 'Story complete · Protocol concluded';
      vnHint.style.color = '#00e5ff';
    } else {
      vnHint.textContent = 'Tap screen or Space to advance ▶';
      vnHint.style.color = '#8b949e';
    }
  }
}

function applyBeatHud(hud) {
  if (!hud) return;
  if (hud.suryasagar != null) {
    mRes.style.width = hud.suryasagar + '%';
    mResV.textContent = Math.round(hud.suryasagar) + '%';
  }
  if (hud.shantinagar != null) {
    mSup.style.width = hud.shantinagar + '%';
    mSupV.textContent = Math.round(hud.shantinagar) + '%';
  }
  if (hud.status) {
    mChipText.textContent = hud.status;
    const st = hud.status.toLowerCase();
    let chipClass = 'm-chip';
    if (st.includes('bypass') || st.includes('alert') || st.includes('toxic') || st.includes('critical') || st.includes('failure')) {
      chipClass += ' alert';
    } else if (st.includes('shutdown') || st.includes('offline')) {
      chipClass += ' offline';
    } else if (st.includes('honest') || st.includes('sustainable') || st.includes('restored') || st.includes('complete') || st.includes('peace')) {
      chipClass += ' honest';
    } else if (st.includes('local')) {
      chipClass += ' local';
    }
    mChip.className = chipClass;
  }
}

function applyBeatText(beat) {
  if (!beat) return;

  // Chapter Header banner on chapter change
  if (beat.chapter !== shownChapterNum && beat.chapter > 0) {
    shownChapterNum = beat.chapter;
    hNum.textContent = `CHAPTER ${String(beat.chapter).padStart(2, '0')}`;
    hTitle.textContent = beat.chapterTitle || `Chapter ${beat.chapter}`;
    hSub.textContent = beat.text.length < 50 ? beat.text : '';
    hdr.style.opacity = '1';
    hdr.style.visibility = 'visible';

    clearTimeout(headerTimer);
    headerTimer = setTimeout(() => {
      hdr.style.opacity = '0';
      setTimeout(() => { hdr.style.visibility = 'hidden'; }, 450);
    }, 2400);
  }

  // Finale screen
  if (beat.isFinale) {
    card.hidden = true;
    card.style.opacity = '0';
    speechClouds.hide();
    fin.style.opacity = '1';
    fin.style.visibility = 'visible';
    fText.textContent = beat.text;
    fin.classList.add('show-extra');
    S.hideLabels = true;
    return;
  } else {
    fin.style.opacity = '0';
    fin.style.visibility = 'hidden';
    fin.classList.remove('show-extra');
    S.hideLabels = false;
  }

  // Comic speech cloud vs narrative card
  const speaker = (beat.speaker || 'narrator').toLowerCase().trim();
  if (speaker === 'narrator') {
    speechClouds.hide();
    card.hidden = false;
    card.className = '';
    const formattedText = beat.text.replace(/\b(\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.)?)/gi, '<span class="timestamp">$1</span>');
    card.innerHTML = `<p>${formattedText}</p>`;
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  } else {
    // Character dialogue emerges as comic speech cloud above their head
    card.hidden = true;
    card.style.opacity = '0';
    speechClouds.show(speaker, beat.text, beat.u);
  }
}

let navChapter = -1;
function updateNavForBeat(beat) {
  const f = clamp(beat.u / U) * 100;
  const mobile = window.innerWidth <= 720;
  navFill.style.height = mobile ? '100%' : f + '%';
  navFill.style.width = mobile ? f + '%' : '100%';
  const chNum = beat.chapter;
  if (chNum !== navChapter) {
    navChapter = chNum;
    const ch = CHAPTERS.find((c) => c.n === chNum) || { n: chNum, name: beat.chapterTitle || '' };
    mastChapter.textContent = ch.n ? `${String(ch.n).padStart(2, '0')} · ${ch.name}` : 'Novaris';
    for (const t of tickEls) {
      t.b.classList.toggle('past', t.ch.n < ch.n);
      t.b.classList.toggle('here', t.ch.n === ch.n);
    }
  }
}

export function jumpToBeat(index, immediate = false) {
  currentBeatIndex = clamp(index, 0, STORY_BEATS.length - 1);
  const beat = STORY_BEATS[currentBeatIndex];
  if (!beat) return;

  targetU = beat.u;
  if (immediate || S.reduced) {
    S.u = targetU;
  }

  updateBeatUI(beat);
  applyBeatHud(beat.hudState || beat.hud);
  updateNavForBeat(beat);
  applyBeatText(beat);

  if (audio) {
    audio.setChapter(beat.chapter, beat.u);
    if (beat.sound) {
      audio.play(beat.sound);
    } else if (beat.isFinale || currentBeatIndex === STORY_BEATS.length - 1) {
      audio.playYee();
    }
  }
}

export function advanceBeat() {
  if (!started) return;
  const curBeat = STORY_BEATS[currentBeatIndex];
  if (curBeat && curBeat.gate && !S.done[curBeat.gate]) {
    blockedForward();
    return;
  }
  if (currentBeatIndex < STORY_BEATS.length - 1) {
    jumpToBeat(currentBeatIndex + 1);
  }
}

export function rewindBeat() {
  if (!started) return;
  if (currentBeatIndex > 0) {
    jumpToBeat(currentBeatIndex - 1);
  }
}

// ---------- Input Triggers ----------

// 1. Click/Tap anywhere on main story screen
window.addEventListener('click', (e) => {
  if (!started) return;
  if (e.target.closest('button, input, a, select, textarea, #prompt, .gate-interactive, #mute, .tick, #entry, #replay, .vn-btn')) {
    return;
  }
  advanceBeat();
});

// 2. Keyboard Navigation
window.addEventListener('keydown', (e) => {
  if (!started) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  if (['Space', ' ', 'ArrowRight', 'Enter', 'PageDown'].includes(e.key)) {
    e.preventDefault();
    advanceBeat();
  } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    rewindBeat();
  }
});

// 3. Mouse Wheel / Trackpad (Debounced 350ms, single flick advances ONE beat)
let lastWheelAdvance = 0;
window.addEventListener('wheel', (e) => {
  if (!started) return;
  e.preventDefault();
  const now = performance.now();
  if (now - lastWheelAdvance < 350) return;

  const dy = e.deltaY;
  const dx = e.deltaX;
  if (Math.abs(dy) > 14 || Math.abs(dx) > 14) {
    lastWheelAdvance = now;
    if (dy > 0 || dx > 0) {
      advanceBeat();
    } else {
      rewindBeat();
    }
  }
}, { passive: false });

// 4. Touch Gestures (Swipe left/tap advances, swipe right rewinds)
let touchStartX = null, touchStartY = null, touchStartTime = 0;
window.addEventListener('touchstart', (e) => {
  if (!started) return;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = performance.now();
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (!started || touchStartX == null) return;
  if (e.target.closest('button, input, a, select, textarea, #prompt, .gate-interactive, #mute, .tick, #entry, #replay, .vn-btn')) {
    touchStartX = null;
    return;
  }
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const dt = performance.now() - touchStartTime;
  touchStartX = null;
  touchStartY = null;

  if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) {
      advanceBeat(); // swipe left
    } else {
      rewindBeat();  // swipe right
    }
  } else if (dt < 300 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
    advanceBeat();   // tap on story
  }
}, { passive: true });

// 5. VN Controller Buttons
if (vnPrev) vnPrev.addEventListener('click', (e) => { e.stopPropagation(); rewindBeat(); });
if (vnNext) vnNext.addEventListener('click', (e) => { e.stopPropagation(); advanceBeat(); });

// ---------- Chapter Navigation ticks ----------
const tickEls = [];
for (const ch of CHAPTERS.slice(1)) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.className = 'tick'; b.type = 'button';
  b.setAttribute('aria-label', `Chapter ${ch.n}: ${ch.name}`);
  b.innerHTML = `<span class="tick-label">${ch.n} · ${ch.name}</span>`;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetIndex = STORY_BEATS.findIndex((bt) => bt.chapter === ch.n);
    if (targetIndex !== -1) {
      jumpToBeat(targetIndex);
    }
  });
  li.append(b); navTicks.append(li);
  tickEls.push({ li, b, ch });
}

function layoutNav() {
  const mobile = window.innerWidth <= 720;
  for (const t of tickEls) {
    const f = (t.ch.u / U) * 100;
    t.li.style.top = mobile ? '0' : f + '%';
    t.li.style.left = mobile ? f + '%' : '0';
  }
  if (mobile) {
    const r = meterEl.getBoundingClientRect();
    document.documentElement.style.setProperty('--nav-top', Math.round(r.bottom + 8) + 'px');
    document.documentElement.style.setProperty('--mute-top', Math.round(r.bottom + 34) + 'px');
  }
}

// ---------- Sound cues (forward only) ----------
const CUES = [
  [19.6, 'glitch'], [20.3, 'denied'], [21.0, 'jet'], [24.2, 'denied'], [26.7, 'glitch'], [27.45, 'rupture'],
  [28.8, 'hum'], [30.85, 'hum'], [38.7, 'pour'], [41.15, 'pour'], [51.6, 'jet'], [52.6, 'final'], [52.9, 'yee'],
];
let prevU = 0;
let silenced = false;
function updateSound() {
  if (!audio) { prevU = S.u; return; }
  for (const [cu, name] of CUES) if (prevU < cu && S.u >= cu && S.u - prevU < 1.2) audio.play(name);
  prevU = S.u;
  const quiet = !!S.done.sever && S.u > 36.95 && S.u < 37.7;
  if (quiet !== silenced) { silenced = quiet; audio.silence(quiet); }
}

// ---------- label avoidance rects ----------
let avoidTick = 0;
function updateAvoid() {
  if (avoidTick++ % 5) return;
  const out = [];
  for (const id of ['card', 'prompt', 'meter', 'mute', 'vnControls']) {
    const e = $(id);
    if (!e || e.hidden) continue;
    const r = e.getBoundingClientRect();
    if (r.width && r.height && (id !== 'card' || parseFloat(e.style.opacity || '0') > 0.05)) out.push({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
  }
  if (parseFloat(hdr.style.opacity || '0') > 0.05) { const r = hdr.querySelector('.h-strip').getBoundingClientRect(); out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); }
  S.avoid = out;
}

// ---------- adaptive resolution ----------
let perfAcc = 0, perfN = 0, perfCool = 0;
function adapt(dt) {
  perfAcc += dt; perfN++;
  perfCool -= dt;
  if (perfN < 45) return;
  const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
  if (perfCool > 0 || document.hidden) return;
  if (avg > 0.024 && S.rs > 0.55) { S.rs = Math.max(0.55, S.rs - 0.15); R.resize(); perfCool = 2; }
  else if (avg < 0.015 && S.rs < 1) { S.rs = Math.min(1, S.rs + 0.1); R.resize(); perfCool = 4; }
}

// ---------- main loop: Smooth Camera Interpolation ----------
let last = performance.now();
let errCount = 0;
let stepping = false;
function frame(now) {
  if (!stepping) requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
  last = now;
  S.dt = dt; S.t += dt;
  try {
    // Smooth camera pan toward targetU
    const k = S.reduced ? 18 : 6.0;
    S.u += (targetU - S.u) * (1 - Math.exp(-dt * k));
    if (Math.abs(targetU - S.u) < 0.0004) S.u = targetU;

    S.gateActive = activeGate();
    inter.update(S.gateActive || activeOptional(), dt);

    // Keep active comic speech clouds anchored directly over character heads as camera pans
    speechClouds.sync(S.u);

    updateSound();
    updateAvoid();
    R.draw();
    adapt(dt);
  } catch (e) {
    if (errCount++ < 5) console.error('[frame]', e);
  }
}

// ---------- entry and audio management ----------
let startAudioTriggered = false;
function triggerStartAudio() {
  if (started || startAudioTriggered) return;
  startAudioTriggered = true;
  audio = audio || createAudio();
  if (audio) {
    muted = false;
    audio.setMuted(false);
    audio.playStart();
    syncMute();
  }
}

// If user clicks anywhere on start screen before clicking Begin, start the theme
$('entry').addEventListener('pointerdown', (e) => {
  if (e.target && e.target.id === 'startQuiet') return;
  triggerStartAudio();
}, { passive: true });

function begin(withSound) {
  if (started) return;
  started = true;
  if (withSound) {
    audio = audio || createAudio();
    if (audio) {
      muted = false;
      audio.setMuted(false);
      audio.playStart();
      audio.setChapter(STORY_BEATS[0].chapter, STORY_BEATS[0].u);
    }
  } else {
    if (audio) {
      audio.stopStart();
      audio.setMuted(true);
    }
    muted = true;
  }
  syncMute();
  $('entry').classList.add('gone');
  document.body.classList.add('started');
  document.body.classList.remove('locked');
  setTimeout(() => { $('entry').style.display = 'none'; }, 950);
  layoutNav();

  // Jump to first story beat
  jumpToBeat(0, true);
}
$('startSound').addEventListener('click', () => begin(true));
$('startQuiet').addEventListener('click', () => begin(false));

function syncMute() {
  const b = $('mute');
  b.setAttribute('aria-pressed', String(muted));
  $('muteText').textContent = muted ? 'Sound off' : 'Sound on';
}
$('mute').addEventListener('click', () => {
  if (!audio) { audio = createAudio(); if (audio) audio.setChapter(STORY_BEATS[currentBeatIndex]?.chapter || 1, S.u); }
  muted = !muted;
  if (audio) audio.setMuted(muted);
  syncMute();
});

$('replay').addEventListener('click', (e) => {
  e.stopPropagation();
  S.done = {};
  S.cp = { local: Array(9).fill(false), evidence: [] };
  inter.reset();
  speechClouds.clear();
  jumpToBeat(0, true);
  if (audio && !muted) audio.resetStart();
});

// ---------- Flying Iron Man cursor follower ----------
if (window.matchMedia('(pointer: fine)').matches) {
  document.body.classList.add('has-ironman-cursor');
  createIronManCursor();
}

// ---------- repulsor flash on click ----------
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' || S.reduced) return;
  const z = document.createElement('div');
  z.className = 'zap';
  z.style.left = e.clientX + 'px';
  z.style.top = e.clientY + 'px';
  document.body.append(z);
  setTimeout(() => z.remove(), 450);
}, { passive: true });

// ---------- resize ----------
let rzT = 0;
function onResize() {
  R.resize();
  layoutTrack();
  layoutNav();
  if (started && STORY_BEATS[currentBeatIndex]) {
    jumpToBeat(currentBeatIndex, true);
  }
}
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(onResize, 120); });
reducedQ.addEventListener?.('change', (e) => { S.reduced = e.matches; });

R.resize();
layoutNav();
document.fonts && document.fonts.ready.then(() => layoutNav());
requestAnimationFrame((t) => { last = t; frame(t); });
setTimeout(() => document.body.classList.remove('booting'), 50);
$('startSound').focus({ preventScroll: true });

// test hooks
if (import.meta.env.DEV) {
  window.__story = {
    S,
    STORY_BEATS,
    advanceBeat,
    rewindBeat,
    jumpToBeat,
    get currentBeatIndex() { return currentBeatIndex; },
    complete: (id) => inter && (S.done[id] = true, inter.showOk(id)),
  };
}
