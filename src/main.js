import Lenis from 'lenis';
import './style.css';
import { U, CHAPTERS, GATES, OPTIONALS, HEADERS, BEATS, FINALE, chapterAt, meter, reserveAt, countdownAt } from './timeline.js';
import { inv, clamp, win } from './util.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { createInteractions } from './interactions.js';
import { createIronManCursor } from './ironman-cursor.js';

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
let audio = null;
let muted = true;
let started = false;

// ---------- scrolling ----------
let unitPx = window.innerHeight * 0.85;
function limitU() {
  for (const g of GATES) if (!S.done[g.id]) return g.u;
  return U;
}
function layoutTrack() {
  unitPx = Math.max(360, window.innerHeight * 0.85);
  // the page physically ends at the next unfinished checkpoint: no input method can pass it
  track.style.height = Math.ceil(window.innerHeight + limitU() * unitPx) + 'px';
}
layoutTrack();

const lenis = new Lenis({
  autoRaf: false,
  lerp: S.reduced ? 1 : 0.1,
  smoothWheel: !S.reduced,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.2,
});
lenis.stop();
document.body.classList.add('locked');

function scrollToU(u, immediate) {
  const y = clamp(u, 0, limitU()) * unitPx;
  lenis.scrollTo(y, { immediate: !!immediate || S.reduced, force: true, duration: immediate ? 0 : 1.6 });
}

// ---------- checkpoints ----------
const inter = createInteractions(S, R, {
  sound: (n, a) => audio && audio.play(n, a),
  complete(id) {
    if (S.done[id]) return;
    S.done[id] = true;
    layoutTrack();
    lenis.resize();
    inter.showOk(id);
  },
});

function activeGate() {
  for (const g of GATES) {
    if (S.done[g.id]) continue;
    if (S.u >= g.u - 0.12) return g.id;
    return null;
  }
  return null;
}
function activeOptional() {
  for (const o of OPTIONALS) if (S.u >= o.a && S.u < o.b) return o.id;
  return null;
}

// a forward push while stopped at a checkpoint nudges the prompt
let lastNudge = 0;
function blockedForward() {
  if (!S.gateActive) return;
  const now = performance.now();
  if (now - lastNudge > 700) { lastNudge = now; inter.nudge(); }
}
window.addEventListener('wheel', (e) => { if (e.deltaY > 0) blockedForward(); }, { passive: true });
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', (e) => { if (touchY != null && touchY - e.touches[0].clientY > 12) blockedForward(); }, { passive: true });
window.addEventListener('keydown', (e) => {
  if (!started) return;
  const fwd = ['ArrowDown', 'PageDown', 'End'].includes(e.key) || (e.key === ' ' && !(e.target instanceof HTMLButtonElement));
  if (fwd) blockedForward();
});

// ---------- story text ----------
const card = $('card');
const hdr = $('header'), hNum = $('hNum'), hTitle = $('hTitle'), hSub = $('hSub');
const fin = $('finale'), fText = $('fText');
const WHO = { ASHA: 'asha', AARAV: 'aarav', MEERA: 'meera', TONY: 'tony', BRUCE: 'bruce', THOR: 'thor', FRIDAY: 'friday', 'THE VOICE': 'engine', 'THE THIRST ENGINE': 'engine' };
const lineHtml = ([who, text]) => `<div class="line"><span class="who ${WHO[who] || 'other'}">${who}</span><span class="says">${text}</span></div>`;
function beatHtml(b) {
  if (b.kind === 'prose') return b.html;
  if (b.kind === 'line') return b.lines.map(lineHtml).join('');
  if (b.kind === 'sys') return `<div class="sys-head">${b.head}</div>${b.html ? `<div>${b.html}</div>` : ''}${b.after ? `<div style="margin-top:${b.html ? 10 : 0}px">${lineHtml(b.after)}</div>` : ''}`;
  if (b.kind === 'list') return `<p><strong>${b.head}</strong></p><ul>${b.items.map(([a, d]) => `<li><b>${a}</b> ${d}</li>`).join('')}</ul>`;
  return '';
}
function endOf(list, i) { return list[i].end ?? (list[i + 1] ? list[i + 1].u : U); }
function pick(list, u) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (u >= list[i].u) return u < endOf(list, i) ? { b: list[i], i, end: endOf(list, i) } : null;
  }
  return null;
}
let cardH = 0;
let shownBeat = null, shownHeader = null, shownFinale = null;
function updateText() {
  const u = S.u;
  // story card
  const p = pick(BEATS, u);
  let op = 0;
  if (p) {
    op = Math.min(inv(p.b.u, p.b.u + 0.14, u), 1 - inv(p.end - 0.1, p.end, u));
    if (shownBeat !== p.b) {
      shownBeat = p.b;
      card.className = p.b.kind === 'sys' ? 'sys' : '';
      card.innerHTML = beatHtml(p.b);
      card.hidden = false;
      cardH = card.offsetHeight;
    }
  }
  // on short screens, a waiting checkpoint prompt takes priority over the story card
  const pr = $('prompt');
  if (op > 0.01 && !pr.hidden && pr.offsetHeight + cardH + 12 > (window.innerWidth <= 720 ? window.innerHeight * 0.56 : window.innerHeight - 130)) op = 0;
  card.hidden = op <= 0.01;
  card.style.opacity = op.toFixed(3);
  card.style.transform = `translateY(${((1 - op) * 10).toFixed(1)}px)`;
  // chapter header
  let ho = 0;
  for (const h of HEADERS) {
    if ((u >= h.u - 0.2 || h.title0) && u < h.end) {
      ho = Math.min(inv(h.u - 0.2, h.u + 0.1, u), 1 - inv(h.end - 0.2, h.end, u));
      if (h.title0) ho = 1 - inv(h.end - 0.2, h.end, u); // title card is up from the first frame
      if (shownHeader !== h) { shownHeader = h; hNum.textContent = h.num; hTitle.textContent = h.title; hSub.textContent = h.sub; }
      break;
    }
  }
  hdr.style.opacity = ho.toFixed(3);
  hdr.style.visibility = ho > 0.01 ? 'visible' : 'hidden';
  // finale
  let fo = 0;
  for (const f of FINALE) {
    if (u >= f.u && u < f.end) {
      fo = Math.min(inv(f.u, f.u + 0.2, u), 1 - inv(f.end - 0.15, f.end, u));
      if (shownFinale !== f) { shownFinale = f; fText.textContent = f.text; fin.classList.toggle('show-extra', !!f.extra); }
      break;
    }
  }
  fin.style.opacity = fo.toFixed(3);
  fin.style.visibility = fo > 0.01 ? 'visible' : 'hidden';
  S.hideLabels = fo > 0.05;
}

// ---------- live meter ----------
const mChip = $('mChip'), mChipText = $('mChipText'), mRes = $('mRes'), mResV = $('mResV'), mSup = $('mSup'), mSupV = $('mSupV');
const mExtra = $('mExtra'), mExtraK = $('mExtraK'), mExtraV = $('mExtraV'), meterEl = $('meter');
let chipState = '';
let lastSup = 30;
function updateMeter() {
  const u = S.u;
  const [res, sup] = meter(u);
  mRes.style.width = res + '%'; mResV.textContent = Math.round(res) + '%';
  mSup.style.width = sup + '%'; mSupV.textContent = Math.round(sup) + '%';
  if (lastSup > 0.5 && sup <= 0.5) { meterEl.classList.remove('shake'); void meterEl.offsetWidth; meterEl.classList.add('shake'); }
  lastSup = sup;
  // the official chip lies until the very end
  let st = 'normal';
  if (S.done.sever && u > 36.95) st = u < 37.8 ? 'offline' : u < 50.9 ? 'local' : 'honest';
  else if (u > 50.9) st = 'honest';
  if (st !== chipState) {
    chipState = st;
    mChip.className = 'm-chip' + (st === 'normal' ? '' : ' ' + st);
    mChipText.textContent = { normal: 'NORMAL', offline: 'OFFLINE', local: 'LOCAL CONTROL', honest: 'LIMITED SUPPLY' }[st];
  }
  const cd = countdownAt(u);
  const rv = reserveAt(u);
  let k = null, v = '', alarm = false;
  if (cd != null && u > 32.3 && u < 37.4) { k = 'SHUTDOWN'; v = '00:' + String(Math.max(2, Math.ceil(cd))).padStart(2, '0'); alarm = true; }
  else if (rv != null) { k = 'RESERVE'; const s = Math.round(rv * 3600); v = `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m left`; alarm = rv < 1.5; }
  else if (u >= 38.6 && u < 42.2) { k = 'TANKERS'; v = 'EN ROUTE · 6 LANES'; }
  else if (u >= 42.8) { k = 'OVERSIGHT'; v = 'PUBLIC DATA · WEEKLY'; }
  mExtra.classList.toggle('hide', !k);
  mExtra.classList.toggle('alarm', alarm);
  if (k) { mExtraK.textContent = k; mExtraV.textContent = v; }
}

// ---------- navigation ----------
const navTicks = $('navTicks'), navFill = $('navFill'), mastChapter = $('mastChapter');
const tickEls = [];
for (const ch of CHAPTERS.slice(1)) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.className = 'tick'; b.type = 'button';
  b.setAttribute('aria-label', `Chapter ${ch.n}: ${ch.name}`);
  b.innerHTML = `<span class="tick-label">${ch.n} · ${ch.name}</span>`;
  b.addEventListener('click', () => {
    const lim = limitU();
    if (ch.u > lim) blockedForward();
    scrollToU(Math.min(ch.u + 0.02, lim));
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
let navChapter = -1;
function updateNav() {
  const f = clamp(S.u / U) * 100;
  const mobile = window.innerWidth <= 720;
  navFill.style.height = mobile ? '100%' : f + '%';
  navFill.style.width = mobile ? f + '%' : '100%';
  const ch = chapterAt(S.u);
  if (ch.n !== navChapter) {
    navChapter = ch.n;
    mastChapter.textContent = ch.n ? `${String(ch.n).padStart(2, '0')} · ${ch.name}` : 'Novaris';
    for (const t of tickEls) { t.b.classList.toggle('past', t.ch.n < ch.n); t.b.classList.toggle('here', t.ch.n === ch.n); }
    if (audio) audio.setChapter(ch.n, S.u);
  }
}

// ---------- sound cues (forward only) ----------
const CUES = [
  [19.6, 'glitch'], [20.3, 'denied'], [21.0, 'jet'], [24.2, 'denied'], [26.7, 'glitch'], [27.45, 'rupture'],
  [28.8, 'hum'], [30.85, 'hum'], [38.7, 'pour'], [41.15, 'pour'], [51.6, 'jet'], [52.6, 'final'],
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
  for (const id of ['card', 'prompt', 'meter', 'mute']) {
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

// ---------- main loop: one bad frame never stops it ----------
let last = performance.now();
let errCount = 0;
let stepping = false;
function frame(now) {
  if (!stepping) requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
  last = now;
  S.dt = dt; S.t += dt;
  try {
    lenis.raf(now);
    S.uT = clamp(lenis.scroll / unitPx, 0, limitU());
    // eased story progress: big jumps still play out as motion
    const k = S.reduced ? 18 : 4.2;
    S.u += (S.uT - S.u) * (1 - Math.exp(-dt * k));
    if (Math.abs(S.uT - S.u) < 0.0004 || S.snap) S.u = S.uT;
    S.gateActive = activeGate();
    inter.update(S.gateActive || activeOptional(), dt);
    updateText();
    updateMeter();
    updateNav();
    updateSound();
    updateAvoid();
    R.draw();
    adapt(dt);
  } catch (e) {
    if (errCount++ < 5) console.error('[frame]', e);
  }
}

// ---------- entry ----------
function begin(withSound) {
  if (started) return;
  started = true;
  if (withSound) {
    audio = audio || createAudio();
    if (audio) { muted = false; audio.setMuted(false); audio.setChapter(chapterAt(S.u).n, S.u); }
  }
  syncMute();
  $('entry').classList.add('gone');
  document.body.classList.add('started');
  document.body.classList.remove('locked');
  lenis.start();
  setTimeout(() => { $('entry').style.display = 'none'; }, 950);
  layoutNav();
}
$('startSound').addEventListener('click', () => begin(true));
$('startQuiet').addEventListener('click', () => begin(false));

function syncMute() {
  const b = $('mute');
  b.setAttribute('aria-pressed', String(muted));
  $('muteText').textContent = muted ? 'Sound off' : 'Sound on';
}
$('mute').addEventListener('click', () => {
  if (!audio) { audio = createAudio(); if (audio) audio.setChapter(chapterAt(S.u).n, S.u); }
  muted = !muted;
  if (audio) audio.setMuted(muted);
  syncMute();
});

$('replay').addEventListener('click', () => {
  S.done = {};
  S.cp = { local: Array(9).fill(false), evidence: [] };
  inter.reset();
  layoutTrack();
  lenis.resize();
  lenis.scrollTo(0, { immediate: true, force: true });
  S.u = 0; S.uT = 0; prevU = 0;
  window.scrollTo(0, 0);
});

// ---------- Flying Iron Man cursor follower ----------
if (window.matchMedia('(pointer: fine)').matches) {
  document.body.classList.add('has-ironman-cursor');
  createIronManCursor();
}

// ---------- repulsor flash on click (mouse only, skipped for reduced motion) ----------
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
  const keepU = S.uT;
  shownBeat = null;
  R.resize();
  layoutTrack();
  lenis.resize();
  lenis.scrollTo(keepU * unitPx, { immediate: true, force: true });
  layoutNav();
}
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(onResize, 120); });
reducedQ.addEventListener?.('change', (e) => { S.reduced = e.matches; });
window.addEventListener('pageshow', (e) => { if (e.persisted) { lenis.scrollTo(0, { immediate: true, force: true }); S.u = S.uT = 0; } });

R.resize();
layoutNav();
document.fonts && document.fonts.ready.then(() => layoutNav());
requestAnimationFrame((t) => { last = t; frame(t); });
setTimeout(() => document.body.classList.remove('booting'), 50);
$('startSound').focus({ preventScroll: true });

// test hook, dev server only
if (import.meta.env.DEV) window.__story = { S, scrollToU, lenis, step: (n = 1, ms = 16.7) => { for (let i = 0; i < n; i++) { stepping = true; frame(last + ms); stepping = false; } }, complete: (id) => inter && (S.done[id] = true, layoutTrack(), lenis.resize()) };
void win;
