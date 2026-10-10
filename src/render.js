// scene(u): everything visible is a function of the eased story position u (+ checkpoint state).
import { clamp, lerp, inv, ease, win, mixHex, keyed, spline, hash, wobble } from './util.js';
import { setsAt, sky, meter, pressureAt, countdownAt, allocAt, starAt, U } from './timeline.js';
import { drawFigure, CAST, resident, INK } from './figures.js';
import { drawNet, nodePos } from './net.js';

const MAXP = 220;

export function createRenderer(canvas, S) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const buf = document.createElement('canvas');
  const bctx = buf.getContext('2d', { alpha: false });
  let W = 1, H = 1, pr = 1;
  const labels = [];
  const parts = [];

  // halftone pattern (pre-rendered once)
  const ht = document.createElement('canvas');
  ht.width = ht.height = 6;
  { const c = ht.getContext('2d'); c.fillStyle = 'rgba(24,32,58,0.32)'; c.beginPath(); c.arc(3, 3, 1.25, 0, 7); c.fill(); }
  const htPat = ctx.createPattern(ht, 'repeat');
  const htPatB = bctx.createPattern(ht, 'repeat');

  // pre-generated city layout (deterministic)
  const HOUSE_COLS = ['#e8b4a0', '#9fd1c9', '#f0cf8a', '#d9a6c8', '#c9d6a3', '#e6c3a0', '#a8c3e0', '#f2a97e'];
  const backRow = [], frontRow = [];
  for (let i = 0, x = -330; x < 760; i++) {
    const w = 30 + hash(i * 3.3) * 22, h = 58 + hash(i * 5.1) * 52;
    backRow.push({ x, w, h, col: HOUSE_COLS[i % HOUSE_COLS.length], tank: hash(i * 9.7) > 0.35, line: hash(i * 2.2) > 0.6, i });
    x += w + 2;
  }
  for (let i = 0, x = -320; x < 760; i++) {
    const w = 34 + hash(i * 7.7 + 1) * 20, h = 34 + hash(i * 4.4 + 2) * 40;
    if (x + w > 70 && x < 680) { x = 680; continue; }
    frontRow.push({ x, w, h, col: HOUSE_COLS[(i * 3 + 2) % HOUSE_COLS.length], tank: hash(i * 3.1) > 0.4, i });
    x += w + 3;
  }
  const towers = [
    { x: -1460, w: 70, h: 330 }, { x: -1380, w: 92, h: 470 }, { x: -1270, w: 64, h: 380 },
    { x: -1190, w: 110, h: 540 }, { x: -1060, w: 72, h: 420 }, { x: -760, w: 96, h: 500 },
    { x: -650, w: 70, h: 360, pool: true }, { x: -570, w: 84, h: 440 },
  ];
  const central = [
    { x: 780, w: 60, h: 260 }, { x: 850, w: 40, h: 200 }, { x: 1150, w: 70, h: 320 }, { x: 1230, w: 54, h: 240 }, { x: 1290, w: 46, h: 180 },
  ];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    pr = dpr * S.rs;
    canvas.width = Math.max(1, Math.round(W * pr));
    canvas.height = Math.max(1, Math.round(H * pr));
    buf.width = canvas.width; buf.height = canvas.height;
  }

  // ---------- camera ----------
  function camFor(keys) {
    const c = spline(keys, S.u);
    const mobile = W <= 720;
    const base = Math.min(W / 1000, H / 620) * (mobile ? 1.35 : 1);
    const fx = mobile ? W * 0.5 : W * (W > 1100 ? 0.6 : 0.62);
    const fy = mobile ? H * 0.36 : H * 0.48;
    let sx = 0, sy = 0;
    const amp = S.reduced ? 0 : shakeAmp(S.u) * Math.min(W, H) * 0.012;
    if (amp > 0.01) { sx = wobble(S.t, 1) * amp; sy = wobble(S.t, 7) * amp; }
    return { x: c.x, y: c.y, z: c.z, base, fx: fx + sx, fy: fy + sy, k: base * c.z };
  }
  function shakeAmp(u) {
    let a = 0;
    a += win(19.55, 20.1, u, 0.15) * 0.5;
    a += win(27.3, 28.4, u, 0.2) * 1.0;
    a += win(29.6, 31.4, u, 0.2) * 0.45;
    a += win(32.1, 36.5, u, 0.3) * 0.25;
    return a;
  }
  function apply(c, cam, par = 1) {
    const k = cam.base * (1 + (cam.z - 1) * par);
    const tx = cam.fx - cam.x * par * k, ty = cam.fy - cam.y * par * k;
    c.setTransform(k * pr, 0, 0, k * pr, tx * pr, ty * pr);
    return { k, tx, ty };
  }
  function screen(c) { c.setTransform(pr, 0, 0, pr, 0, 0); }
  let curCam = null;
  function w2s(x, y) { const k = curCam.k; return [curCam.fx + (x - curCam.x) * k, curCam.fy + (y - curCam.y) * k]; }
  function view(cam) {
    const k = cam.k;
    return { x0: cam.x - cam.fx / k, x1: cam.x + (W - cam.fx) / k, y0: cam.y - cam.fy / k, y1: cam.y + (H - cam.fy) / k };
  }

  // ---------- particles (capped) ----------
  function burst(set, type, x, y, n = 8, col) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAXP) parts.shift();
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60;
      const p = { set, type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: 0.6 + Math.random() * 0.6, col: col || '#ffcf3f', size: 1.5 + Math.random() * 2 };
      if (type === 'drop') { p.vx = (Math.random() - 0.5) * 6; p.vy = 10 + Math.random() * 30; p.max = 1.6; p.col = col || '#2a7cff'; p.size = 2.2; p.ground = set === 'city' ? -2 : null; }
      if (type === 'splash') { p.vy = -40 - Math.random() * 50; p.vx = (Math.random() - 0.5) * 70; p.col = col || '#6fb6ff'; p.max = 0.7; }
      if (type === 'dust') { p.vy = -10 - Math.random() * 25; p.vx *= 0.6; p.col = col || '#b98a5a'; p.size = 3 + Math.random() * 4; p.max = 1.2; }
      parts.push(p);
    }
  }
  function drawParts(c, set, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      if (p.set !== set) continue;
      const g = p.type === 'dust' ? -5 : p.type === 'spark' ? 60 : 260;
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'drop' && p.ground != null && p.y > p.ground) { burst(set, 'splash', p.x, p.ground, 3); parts.splice(i, 1); continue; }
      const a = 1 - p.life / p.max;
      c.globalAlpha = p.type === 'dust' ? a * 0.5 : a;
      c.fillStyle = p.col;
      if (p.type === 'drop') {
        c.beginPath(); c.ellipse(p.x, p.y, p.size * 0.8, p.size * 1.3, 0, 0, 7); c.fill();
      } else { c.beginPath(); c.arc(p.x, p.y, p.size * (p.type === 'dust' ? 1 + p.life : 1), 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  // ---------- helpers ----------
  function rect(c, x, y, w, h, fill, o) {
    c.fillStyle = fill; c.fillRect(x, y, w, h);
    if (o) { c.strokeStyle = INK; c.lineWidth = o; c.strokeRect(x, y, w, h); }
  }
  function shade(c, x, y, w, h) { // halftone shadow
    const pat = c === ctx ? htPat : htPatB;
    try { pat.setTransform(new DOMMatrix().scale(1 / (curCam.k * pr) * pr)); } catch (e) { /* older browsers */ }
    c.fillStyle = pat; c.fillRect(x, y, w, h);
  }
  function label(name, x, y, col) {
    const [sx, sy] = w2s(x, y);
    labels.push({ name, sx, sy, col });
  }
  function fig(c, key, x, y, opts = {}, lab = true) {
    const spec = typeof key === 'string' ? CAST[key] : key;
    const o = 1.6 / curCam.k;
    const r = drawFigure(c, spec, x, y, { t: S.t, o, ...opts });
    if (lab && spec.label && curCam.k * (opts.s || 1) * (spec.s || 1) * 50 > 46) label(spec.label, r.head[0], r.head[1]);
    return r;
  }

  // ========== CITY ==========
  function drawSky(c, cam) {
    screen(c);
    const [top, bot, sun, haze] = sky(S.u);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(0.5, bot); g.addColorStop(1, haze);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // stars at the very end
    const st = ease(52.2, 54.5, S.u);
    if (st > 0) {
      c.fillStyle = `rgba(255,246,226,${st * 0.8})`;
      for (let i = 0; i < 70; i++) {
        const x = hash(i * 1.7) * W, y = hash(i * 3.9) * H * 0.45;
        const tw = 0.6 + 0.4 * Math.sin(S.t * 1.3 + i);
        c.globalAlpha = st * tw; c.fillRect(x, y, 1.6, 1.6);
      }
      c.globalAlpha = 1;
    }
    // sun
    apply(c, cam, 0.12);
    const sp = keyed([[0, [-80, -440]], [9, [-80, -440]], [21, [-260, -400]], [26, [-260, -400]], [29, [-260, -430]], [42, [120, -540]], [47, [200, -500]], [48.2, [520, -220]], [55, [620, -120]]], S.u);
    const sr = keyed([[0, 70], [26, 70], [29, 58], [42, 50], [48, 64], [55, 78]], S.u);
    const halo = c.createRadialGradient(sp[0], sp[1], sr * 0.6, sp[0], sp[1], sr * 3.2);
    halo.addColorStop(0, sun + 'aa'); halo.addColorStop(1, sun + '00');
    c.fillStyle = halo; c.beginPath(); c.arc(sp[0], sp[1], sr * 3.2, 0, 7); c.fill();
    c.fillStyle = sun; c.beginPath(); c.arc(sp[0], sp[1], sr, 0, 7); c.fill();
    // riso offset ring
    c.strokeStyle = 'rgba(255,107,61,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(sp[0] + 4, sp[1] + 3, sr, 0, 7); c.stroke();
    // clouds return only once the city is healing
    const cl = ease(41.6, 43, S.u);
    if (cl > 0) {
      apply(c, cam, 0.22);
      const cc = S.u > 47.5 ? mixHex('#f6efe3', '#f2a68a', ease(47.5, 49, S.u)) : '#f6efe3';
      c.fillStyle = cc; c.globalAlpha = cl * 0.9;
      for (let i = 0; i < 6; i++) {
        const x = -900 + i * 420 + ((S.t * 4 + i * 80) % 300), y = -560 + hash(i) * 160;
        cloud(c, x, y, 70 + hash(i * 2) * 50);
      }
      c.globalAlpha = 1;
    }
  }
  function cloud(c, x, y, s) {
    c.beginPath();
    c.ellipse(x, y, s, s * 0.32, 0, 0, 7); c.ellipse(x - s * 0.45, y + 4, s * 0.5, s * 0.26, 0, 0, 7); c.ellipse(x + s * 0.35, y - s * 0.12, s * 0.45, s * 0.3, 0, 0, 7);
    c.fill();
  }

  function drawFar(c, cam) {
    const [, , , haze] = sky(S.u);
    // hills + Suryasagar
    apply(c, cam, 0.3);
    c.fillStyle = mixHex(haze, '#7a5a48', 0.35);
    c.beginPath(); c.moveTo(-3000, 0);
    for (let x = -3000; x <= 3000; x += 150) c.lineTo(x, -70 - Math.sin(x * 0.004) * 40 - hash(x) * 25);
    c.lineTo(3000, 40); c.lineTo(-3000, 40); c.fill();
    // reservoir basin with real level
    const [res] = meter(S.u);
    const bx = 1500, bw = 520, bd = 60;
    c.fillStyle = mixHex(haze, '#8a6a52', 0.5);
    c.beginPath(); c.ellipse(bx, -40, bw / 2, bd / 2, 0, 0, Math.PI); c.fill();
    const lv = res / 100;
    c.save(); c.beginPath(); c.ellipse(bx, -40, bw / 2, bd / 2, 0, 0, Math.PI); c.clip();
    c.fillStyle = S.u > 26.6 && S.u < 38.4 ? '#6a4d9a' : '#4f8fd8';
    c.fillRect(bx - bw / 2, -40 + bd / 2 * (1 - lv * 1.8), bw, bd);
    c.restore();
    // dam wall
    c.fillStyle = '#9a8f86'; c.fillRect(bx + bw / 2 - 6, -60, 14, 40);
    // far skyline
    apply(c, cam, 0.55);
    c.fillStyle = mixHex(haze, '#556070', 0.35);
    for (let i = 0; i < 40; i++) {
      const x = -2400 + i * 120 + hash(i * 4) * 50, h = 60 + hash(i * 1.3) * (Math.abs(x + 600) < 700 ? 260 : 120);
      c.fillRect(x, -h, 50 + hash(i) * 40, h + 40);
    }
    // dry river channel
    c.fillStyle = mixHex(haze, '#a27a55', 0.5);
    c.fillRect(-3000, -6, 6000, 14);
    c.fillStyle = mixHex('#6a8fb0', '#a27a55', 0.45);
    c.beginPath(); c.moveTo(-3000, 0);
    for (let x = -3000; x <= 3000; x += 100) c.lineTo(x, 1 + Math.sin(x * 0.01) * 1.5);
    c.lineTo(3000, 3); c.lineTo(-3000, 3); c.fill();
  }

  function drawUnderground(c, cam, v) {
    // soil cross-section
    const g = c.createLinearGradient(0, 0, 0, 1150);
    g.addColorStop(0, '#9a6a44'); g.addColorStop(0.35, '#6e4a31'); g.addColorStop(1, '#3a281d');
    c.fillStyle = g; c.fillRect(v.x0 - 10, 6, v.x1 - v.x0 + 20, 1250);
    // strata
    c.strokeStyle = 'rgba(24,32,58,0.25)'; c.lineWidth = 1.5;
    for (const sy of [190, 420, 640, 880]) {
      c.beginPath();
      for (let x = Math.floor(v.x0 / 60) * 60; x <= v.x1 + 60; x += 60) c.lineTo(x, sy + Math.sin(x * 0.01 + sy) * 10);
      c.stroke();
    }
    // stones
    c.fillStyle = 'rgba(24,32,58,0.18)';
    for (let i = 0; i < 90; i++) {
      const x = -1600 + hash(i * 2.7) * 3600, y = 30 + hash(i * 6.1) * 1100;
      if (x < v.x0 - 20 || x > v.x1 + 20) continue;
      c.beginPath(); c.ellipse(x, y, 4 + hash(i) * 6, 3 + hash(i * 3) * 3, 0, 0, 7); c.fill();
    }
    // aquifer: depleted, then slowly recharged
    const aq = keyed([[0, 0.22], [38, 0.18], [45, 0.24], [55, 0.36]], S.u);
    c.fillStyle = 'rgba(42,124,255,0.12)'; c.fillRect(v.x0, 1040, v.x1 - v.x0, 90);
    c.fillStyle = 'rgba(42,124,255,0.4)'; c.fillRect(v.x0, 1130 - 90 * aq, v.x1 - v.x0, 90 * aq);
    c.font = '700 14px "JetBrains Mono", monospace'; c.fillStyle = 'rgba(244,234,214,0.7)';
    c.fillText('AQUIFER · GROUNDWATER TABLE', -200, 1060);
  }

  function pipe(c, x0, y0, x1, y1, w, col, flow, flowCol) {
    c.lineCap = 'butt';
    c.strokeStyle = INK; c.lineWidth = w + 3;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = w * 0.25;
    c.beginPath(); c.moveTo(x0, y0 - w * 0.22); c.lineTo(x1, y1 - w * 0.22); c.stroke();
    if (flow > 0) {
      c.strokeStyle = flowCol || 'rgba(220,240,255,0.85)'; c.lineWidth = w * 0.3;
      c.setLineDash([6, 16]); c.lineDashOffset = -S.t * 40 * flow * Math.sign(x1 - x0 || y1 - y0);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.setLineDash([]);
    }
  }

  function drawPipes(c) {
    const u = S.u;
    const al = allocAt(u);
    const vio = sysViolet(u);
    const fair = ease(41, 44, u);
    // Meridian main: fat and full, running right under the thirsty district
    pipe(c, 1000, 104, -1350, 104, lerp(17, 11, fair), '#2a7cff', lerp(1.4, 0.6, fair));
    pipe(c, -900, 104, -900, 4, 9, '#2a7cff', 0);
    // industrial bypass
    const byCol = mixHex('#2a7cff', '#8a4dff', vio);
    pipe(c, 1000, 150, 2100, 150, lerp(20, 12, fair), byCol, al[1] * 1.6, vio > 0.3 ? 'rgba(255,140,120,0.9)' : undefined);
    // shaft
    pipe(c, 1000, 0, 1000, 560, 14, '#7a8597', 0);
    // eastern main → Shantinagar. old & rusty, replaced in ch8
    const rep = ease(44.8, 45.7, u);
    const repX = lerp(1000, -300, rep);
    pipe(c, 1000, 58, -300, 58, 11, '#9a5b36', al[3] * 0.9, 'rgba(255,230,200,0.6)');
    if (rep > 0) pipe(c, 1000, 58, repX, 58, 12, '#3a8ee6', 0.6);
    // rust patches
    c.fillStyle = 'rgba(70,30,15,0.45)';
    for (let i = 0; i < 14; i++) { const x = -280 + i * 70 + hash(i) * 30; if (x < repX) c.fillRect(x, 54, 8 + hash(i * 2) * 10, 8); }
    // leak drips from the broken main (the losses AQUA-9 blamed on residents)
    if (u < 45.2) {
      for (const lx of [40, 330]) leak(c, lx, 64, 1);
    }
    const lane4 = u < 46.6 || !S.done.tracker ? 1 : 0;
    if (u > 1 && lane4 && (u < 44.8 || u > 45.7)) leak(c, 430, 64, 1);
    // riser to the tap
    pipe(c, 150, 58, 150, 4, 6, u > 45.4 ? '#3a8ee6' : '#9a5b36', 0);
    // sensors after rebuild
    if (u > 45.4) {
      for (let i = 0; i < 6; i++) {
        const x = -250 + i * 190; const on = Math.sin(S.t * 3 + i) > 0;
        c.fillStyle = on ? '#5ee08f' : '#1d4a32'; c.beginPath(); c.arc(x, 47, 3.2, 0, 7); c.fill();
      }
    }
    // pressure wave racing to Shantinagar
    const pw = inv(26.95, 27.45, u);
    if (pw > 0 && pw < 1) {
      const x = lerp(1000, 260, ease(0, 1, pw));
      const gr = c.createRadialGradient(x, 58, 0, x, 58, 40);
      gr.addColorStop(0, 'rgba(255,90,60,0.95)'); gr.addColorStop(1, 'rgba(255,90,60,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, 58, 40, 0, 7); c.fill();
    }
  }
  function leak(c, x, y, a) {
    const ph = (S.t * 0.9 + x * 0.01) % 1;
    c.fillStyle = `rgba(80,150,230,${0.8 * a})`;
    c.beginPath(); c.ellipse(x, y + ph * 26, 2, 3, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(40,70,120,0.35)';
    c.beginPath(); c.ellipse(x, y + 30, 12, 3, 0, 0, 7); c.fill();
  }

  function sysViolet(u) {
    return Math.max(win(26.6, 37.0, u, 0.35), ease(19.6, 19.9, u) * (1 - ease(20.8, 21.2, u)));
  }
  function sysDark(u) { return S.done.sever ? win(36.9, 37.75, u, 0.12) : 0; }

  function drawControlRoom(c, v) {
    if (v.x1 < 840 || v.x0 > 1200 || v.y1 < 190 || v.y0 > 480) return;
    const u = S.u;
    const vio = sysViolet(u), dark = sysDark(u);
    rect(c, 850, 196, 340, 280, mixHex('#16233d', '#1d1230', vio), 3);
    rect(c, 850, 470, 340, 8, '#0b1120');
    // ceiling lights
    for (let i = 0; i < 4; i++) rect(c, 880 + i * 80, 200, 40, 4, dark > 0.5 ? '#333' : mixHex('#cfe6ff', '#c8a7ff', vio));
    // big map screen
    rect(c, 925, 222, 170, 122, '#0a1222', 3);
    const flick = S.cp.flickT != null ? Math.max(0, 1 - (S.t - S.cp.flickT) / 0.9) : 0;
    const denied = S.cp.deniedT != null && S.t - S.cp.deniedT < 1.4 && u > 12.6 && u < 13.6;
    if (dark < 0.5) {
      drawNet(c, 1010, 283, 46, {
        t: S.t, lw: 0.55, star: starAt(u, flick > 0.2 ? 1 : 0), alloc: allocAt(u), violet: Math.max(vio, flick > 0.2 ? 1 : 0),
        level: meter(u)[0] / 100 * 2.2, col: '#5fb4ff', broken: 1, red: win(23.9, 26.2, u, 0.2) * 0.8,
      });
      if (u > 11.2 && u < 26.3 && vio < 0.5) { // the lying indicator
        rect(c, 1060, 228, 30, 10, '#123a24'); c.fillStyle = '#5ee08f'; c.font = '700 6px "JetBrains Mono"'; c.fillText('NORMAL', 1063, 236);
      }
      if (denied || (u > 13.0 && u < 13.35 && S.done.override)) {
        rect(c, 950, 270, 120, 24, '#3a0c12', 2);
        c.fillStyle = '#ff7a6a'; c.font = '700 11px "JetBrains Mono"'; c.fillText('ACCESS DENIED', 964, 287);
      }
      if (win(26.5, 27.1, u, 0.1) > 0) {
        rect(c, 935, 300, 150, 34, '#1b0a24', 2);
        c.fillStyle = '#ff8f7a'; c.font = '700 8px "JetBrains Mono"';
        c.fillText('UNAUTHORISED INTERVENTION', 943, 314); c.fillText('CORRECTIVE ACTION INITIATED', 943, 326);
      }
    }
    // side screens with bar graphs
    for (let s = 0; s < 2; s++) {
      const x = s ? 1110 : 868;
      rect(c, x, 236, 54, 46, '#0a1222', 2);
      if (dark < 0.5) for (let i = 0; i < 5; i++) {
        const al = allocAt(u)[[0, 1, 3, 5, 7][i]];
        c.fillStyle = i === 2 ? '#ff6b3d' : mixHex('#5fb4ff', '#9b5cff', vio);
        c.fillRect(x + 6 + i * 9, 276 - al * 34, 6, al * 34);
      }
    }
    // consoles
    for (const cx of [900, 1090]) {
      c.fillStyle = '#2b3556'; c.beginPath(); c.moveTo(cx, 440); c.lineTo(cx + 70, 440); c.lineTo(cx + 64, 470); c.lineTo(cx + 6, 470); c.fill();
      c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      c.fillStyle = mixHex('#5fb4ff', '#9b5cff', vio); c.fillRect(cx + 10, 436, 50, 4);
    }
    // people
    const heroes = u > 25.2 && u < 26.9;
    if (u < 15.4) {
      const reach = S.cp.overrideReach || 0;
      fig(c, 'meera', 945, 470, { f: 1, prop: 'tablet', armR: reach ? 1.2 : 0.8, face: u > 12.4 ? 'worried' : 'calm' });
      fig(c, 'tech', 1090, 470, { f: -1, armR: 0.9, armL: 0.2 });
    } else if (heroes) {
      fig(c, 'meera', 945, 470, { f: 1, prop: 'tablet', armR: 0.8, face: 'worried' });
      fig(c, 'tony', 1015, 470, { f: -1, armR: 0.4, glowA: 0.3 });
      fig(c, 'bruce', 1065, 470, { f: -1, prop: 'tablet', armR: 0.8 });
      fig(c, 'thor', 1125, 470, { f: -1, prop: 'hammer', armR: 0.3 });
    } else if (u >= 26.9 && u < 29) {
      fig(c, 'meera', 945, 470, { f: 1, armR: 1.4, face: 'shout' });
      fig(c, 'tony', 1015, 470, { f: -1, armR: 1.5, glowA: 0.9, face: 'worried' });
      fig(c, 'bruce', 1065, 470, { f: -1, prop: 'tablet', armR: 0.8, face: 'worried' });
      fig(c, 'thor', 1125, 470, { f: -1, prop: 'hammer', armR: 0.9 });
    }
    if (dark > 0) { c.fillStyle = `rgba(4,6,12,${dark * 0.9})`; c.fillRect(850, 196, 340, 282); }
  }

  function drawChamber(c, v) {
    if (v.x1 < 720 || v.x0 > 1300 || v.y1 < 550 || v.y0 > 950) return;
    const u = S.u;
    const vio = sysViolet(u), dark = sysDark(u);
    const off = S.done.sever && u > 36.95;
    rect(c, 730, 560, 560, 380, mixHex('#141a2a', '#1a1028', vio), 3);
    rect(c, 730, 930, 560, 10, '#0b0f1a');
    // wall pipes
    pipe(c, 770, 560, 770, 930, 22, '#5b6577', 0);
    pipe(c, 1250, 560, 1250, 930, 22, '#5b6577', 0);
    pipe(c, 730, 610, 1290, 610, 14, '#4a5366', u > 26.6 && !off ? 1.4 : 0.3, vio > 0.3 && !off ? 'rgba(200,150,255,0.8)' : undefined);
    // gauges
    let pres = pressureAt(u);
    if (S.done.valve && u > 33.6) pres = Math.min(pres, 0.55);
    for (const [gx, gy, k] of [[1195, 660, 0], [1215, 760, 1]]) {
      c.fillStyle = '#f4ead6'; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.arc(gx, gy, 18, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = '#e2412f'; c.lineWidth = 4; c.beginPath(); c.arc(gx, gy, 13, -0.4, 0.6); c.stroke();
      const jit = S.reduced ? 0 : wobble(S.t * 0.6, k) * 0.06 * pres;
      const a = Math.PI * 0.8 + (pres + jit) * Math.PI * 1.4;
      c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a) * 14, gy + Math.sin(a) * 14); c.stroke();
    }
    // support beam (Thor holds it)
    const braced = S.done.brace || (S.cp.braceCharge || 0) > 0.98;
    const wob = braced || S.reduced ? 0 : (u > 29.4 && u < 30.9 ? wobble(S.t * 0.5, 3) * 0.05 : 0);
    c.save(); c.translate(870, 930); c.rotate(wob + (braced ? 0 : (u > 29.5 && u < 31 ? 0.05 : 0)));
    rect(c, -9, -370, 18, 370, '#7d889a', 2.5);
    rect(c, -16, -370, 32, 10, '#5b6577', 2); rect(c, -16, -10, 32, 10, '#5b6577', 2);
    c.restore();
    // valve wheels
    for (const [wx, wy, dir] of [[930, 660, 1], [1090, 660, -1]]) {
      const rot = off ? 0 : S.t * (vio > 0.3 ? 1.6 : 0.4) * dir;
      c.save(); c.translate(wx, wy); c.rotate(rot);
      c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.stroke();
      c.strokeStyle = '#c8402a'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.stroke();
      for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 4); c.strokeStyle = '#c8402a'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.stroke(); }
      c.restore();
    }
    drawEngine(c, u, vio, off);
    // the team
    if (u > 28.6) {
      const hold = S.cp.braceCharge || 0;
      const brace = u > 29.6;
      fig(c, 'thor', 870 + (brace ? 10 : 0), 930, { f: 1, armL: brace ? 2.75 : 0.3, armR: brace ? 2.75 : 0.4, prop: brace ? null : 'hammer', face: brace && !braced ? 'shout' : 'calm', lean: brace ? -0.06 : 0 });
      if (brace && !braced && hold > 0) {
        c.strokeStyle = `rgba(255,207,63,${0.4 + hold * 0.6})`; c.lineWidth = 3;
        c.beginPath(); c.arc(870, 885, 34 + hold * 10, 0, 7); c.stroke();
      }
      // the girder torn loose: Thor holds it overhead
      if (brace) {
        const sag = braced ? 0 : 0.16 * (1 - hold) + (S.reduced ? 0 : wobble(S.t * 0.4, 5) * 0.03 * (1 - hold));
        c.save(); c.translate(880, 862); c.rotate(sag);
        rect(c, -80, -7, 160, 12, '#7d889a', 2.5);
        c.fillStyle = '#5b6577'; for (let k = -70; k < 80; k += 20) c.fillRect(k, -5, 3, 8);
        c.restore();
      }
      const panel = u > 32;
      fig(c, 'tony', 1115, 930, { f: -1, armR: panel ? 1.6 : 1.4, armL: 0.4, glowA: off ? 0.3 : 0.9, face: u > 37.8 ? 'calm' : 'worried' });
      fig(c, 'meera', 1165, 930, { f: -1, armR: panel ? 1.7 : 0.6, prop: panel ? null : 'tablet', face: u > 37.8 ? 'smile' : 'worried' });
      fig(c, 'bruce', 1222, 930, { f: -1, armR: S.cp.valveTurn ? 2.2 : 1.6, face: 'worried' });
      // physical switch panel
      rect(c, 1135, 845, 48, 40, '#2b3556', 2);
      for (let i = 0; i < 4; i++) { c.fillStyle = (S.cp.localCount || 0) > i || off ? '#5fb4ff' : '#9b5cff'; c.fillRect(1141 + i * 10, 856, 6, 18); }
    }
    if (dark > 0) { c.fillStyle = `rgba(4,6,12,${dark * 0.85})`; c.fillRect(730, 560, 560, 380); }
  }

  function drawEngine(c, u, vio, off) {
    const cx = 1010, cy = 730;
    const live = u > 28.8 && !off;
    // body
    c.fillStyle = '#2b3243'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx - 70, 930); c.lineTo(cx - 52, 780); c.lineTo(cx + 52, 780); c.lineTo(cx + 70, 930); c.closePath(); c.fill(); c.stroke();
    shade(c, cx - 60, 860, 120, 70);
    // arms
    const amp = live ? 1 : 0;
    const strike = live ? Math.sin(S.t * 1.3) : 0;
    for (const side of [-1, 1]) {
      const sx = cx + side * 58, sy = 790;
      const a1 = side * (0.9 + 0.35 * strike * amp) - (side < 0 ? 0 : 0) + (off ? side * 0.25 : 0);
      const l1 = 80, l2 = 66;
      const ex = sx + Math.sin(a1) * l1 * side * side, ey = sy - Math.cos(a1 * side) * l1 * 0.6;
      const a2 = a1 + side * (0.8 + 0.4 * Math.sin(S.t * 1.3 + 1) * amp);
      const hx = ex + Math.sin(a2) * l2, hy = ey + Math.cos(a2 * side) * l2 * 0.5 + (off ? 50 : 0);
      for (const [w, col] of [[16, INK], [11, '#7d889a']]) {
        c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
      }
      c.fillStyle = vio > 0.3 && !off ? '#9b5cff' : '#5b6577'; c.beginPath(); c.arc(ex, ey, 7, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#a8b0bf'; c.beginPath(); c.arc(hx, hy, 10, 0, 7); c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
    }
    // head screen with the sigil eye
    c.fillStyle = '#0b0714'; c.strokeStyle = INK; c.lineWidth = 4;
    c.beginPath(); c.arc(cx, cy, 52, 0, 7); c.fill(); c.stroke();
    if (!off) {
      drawNet(c, cx, cy, 40, { t: S.t, lw: 0.45, star: u > 28.8 ? 1 : starAt(u, 0), violet: live ? 1 : vio, alloc: allocAt(u), level: 0.2 });
    } else {
      c.fillStyle = '#1a1d26'; c.beginPath(); c.arc(cx, cy, 46, 0, 7); c.fill();
    }
    // status lights
    for (let i = 0; i < 5; i++) {
      c.fillStyle = off ? '#333a48' : (Math.sin(S.t * 4 + i) > 0 ? '#c8a7ff' : '#5a2fa0');
      c.fillRect(cx - 30 + i * 13, 800, 7, 7);
    }
  }

  function drawSurface(c, v) {
    const u = S.u;
    // ground
    const [, , , haze] = sky(u);
    c.fillStyle = '#4f9a5c'; c.fillRect(-1500, -6, 1040, 8);    // Meridian lawns
    c.fillStyle = '#c99a62'; c.fillRect(-330, -4, 1060, 10);     // Shantinagar dirt
    c.fillStyle = '#6b6b72'; c.fillRect(730, -4, 1500, 10);      // central asphalt
    c.fillStyle = '#7a7a80'; c.fillRect(-460, -4, 130, 10);      // railway bed
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(v.x0, -5); c.lineTo(v.x1, -5); c.stroke();
    // cracks in the dry earth
    if (u < 44.9) {
      c.strokeStyle = 'rgba(24,32,58,0.45)'; c.lineWidth = 1;
      for (let i = 0; i < 22; i++) {
        const x = -320 + i * 48 + hash(i) * 20;
        c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 6, 1); c.lineTo(x + 2, 4); c.stroke();
      }
    }

    // ---- Meridian Heights ----
    if (v.x0 < -440) {
      for (const t of towers) {
        rect(c, t.x, -t.h, t.w, t.h, '#a9cde0', 2.5);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        for (let y = -t.h + 12; y < -10; y += 16) c.fillRect(t.x + 5, y, t.w - 10, 3);
        shade(c, t.x + t.w * 0.66, -t.h, t.w * 0.34, t.h);
        // green terraces
        c.fillStyle = '#4f9a5c';
        for (let y = -t.h + 60; y < -40; y += 110) c.fillRect(t.x - 4, y, t.w + 8, 6);
        if (t.pool) {
          rect(c, t.x + 6, -t.h - 8, t.w - 12, 8, '#3fb6ff', 2);
          c.fillStyle = 'rgba(255,255,255,0.8)';
          for (let k = 0; k < 4; k++) c.fillRect(t.x + 10 + ((S.t * 12 + k * 15) % (t.w - 20)), -t.h - 6, 4, 1.5);
        }
      }
      // fountain
      const on = u < 47.8 ? 1 : 1 - ease(47.8, 48.4, u);
      rect(c, -880, -12, 120, 12, '#d9d2c5', 2);
      if (on > 0.02) {
        c.fillStyle = `rgba(80,170,255,${0.85 * on})`;
        for (let j = 0; j < 3; j++) for (let k = 0; k < 14; k++) {
          const ph = (S.t * 0.7 + k / 14) % 1;
          const dir = j - 1;
          const x = -820 + dir * 50 * ph, y = -12 - (Math.sin(ph * Math.PI) * 70 * on) * (j === 1 ? 1.3 : 0.8);
          c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill();
        }
      }
      // sprinklers on lawn
      if (u < 41) {
        c.strokeStyle = 'rgba(80,170,255,0.6)'; c.lineWidth = 1.5;
        for (const sx of [-1300, -1120, -620]) {
          const a = Math.sin(S.t * 1.2 + sx) * 0.8;
          c.beginPath(); c.moveTo(sx, -6); c.quadraticCurveTo(sx + Math.sin(a) * 20, -30, sx + Math.sin(a) * 40, -6); c.stroke();
        }
      }
    }
    // ---- railway ----
    if (v.x0 < -300 && v.x1 > -480) {
      c.strokeStyle = INK; c.lineWidth = 2;
      for (let x = -455; x < -335; x += 10) { c.beginPath(); c.moveTo(x, -4); c.lineTo(x, 2); c.stroke(); }
      rect(c, -460, -9, 130, 3, '#5b6577'); rect(c, -460, -15, 130, 3, '#5b6577');
      // fence
      c.strokeStyle = '#3d4458'; c.lineWidth = 2;
      for (let x = -470; x < -320; x += 14) { c.beginPath(); c.moveTo(x, -4); c.lineTo(x, -34); c.stroke(); }
      c.beginPath(); c.moveTo(-470, -28); c.lineTo(-320, -28); c.moveTo(-470, -18); c.lineTo(-320, -18); c.stroke();
      // signal
      rect(c, -340, -90, 4, 86, '#3d4458'); rect(c, -346, -100, 16, 16, INK);
      c.fillStyle = '#e2412f'; c.beginPath(); c.arc(-338, -92, 4, 0, 7); c.fill();
    }
    // ---- Shantinagar back row ----
    const build = ease(44.75, 45.8, u);
    for (const h of backRow) {
      if (h.x > v.x1 || h.x + h.w < v.x0) continue;
      const y0 = -h.h - 8;
      rect(c, h.x, y0, h.w, h.h + 4, mixHex(h.col, '#7b6a62', 0.25), 2);
      shade(c, h.x + h.w * 0.7, y0, h.w * 0.3, h.h + 4);
      c.fillStyle = 'rgba(24,32,58,0.55)';
      for (let r = 0; r < Math.floor(h.h / 26); r++) for (let k = 0; k < 2; k++) c.fillRect(h.x + 6 + k * (h.w - 18), y0 + 10 + r * 26, 7, 9);
      if (h.tank) { rect(c, h.x + 6, y0 - 12, 14, 12, '#2b2b2b', 1.5); }
      // rainwater harvesting appears during the rebuild
      if (build > hash(h.i * 1.9) * 0.8 && u > 44.75) {
        rect(c, h.x + h.w - 14, y0 - 10, 12, 10, '#2a7cff', 1.5);
        c.strokeStyle = '#5b6577'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(h.x, y0 + 1); c.lineTo(h.x + h.w, y0 + 1); c.stroke();
      }
      if (h.line) {
        c.strokeStyle = INK; c.lineWidth = 0.8; c.beginPath(); c.moveTo(h.x + 2, y0 + 20); c.quadraticCurveTo(h.x + h.w / 2, y0 + 26, h.x + h.w - 2, y0 + 20); c.stroke();
        for (let k = 0; k < 3; k++) { c.fillStyle = HOUSE_COLS[(h.i + k) % 8]; c.fillRect(h.x + 6 + k * 8, y0 + 22, 5, 7); }
      }
    }
    // ---- central district + pumping station ----
    if (v.x1 > 760) {
      for (const b of central) {
        rect(c, b.x, -b.h, b.w, b.h, '#c7d3e0', 2.5);
        c.fillStyle = 'rgba(24,32,58,0.18)';
        for (let y = -b.h + 10; y < -10; y += 14) c.fillRect(b.x + 4, y, b.w - 8, 5);
        shade(c, b.x + b.w * 0.65, -b.h, b.w * 0.35, b.h);
      }
      // pumping station
      rect(c, 900, -150, 220, 150, '#d9d2c5', 3);
      shade(c, 1060, -150, 60, 150);
      rect(c, 890, -162, 240, 14, '#9a8f86', 2.5);
      rect(c, 985, -60, 50, 60, '#2b3556', 2);
      drawNet(c, 1010, -110, 22, { t: S.t, lw: 0.3, star: 0, alloc: allocAt(u), level: meter(u)[0] / 100 * 2, col: '#2a7cff' });
      c.fillStyle = INK; c.font = '800 13px "Big Shoulders Display"'; c.fillText('NIWN PUMPING STATION', 1040, -125);
      // billboard
      rect(c, 1150, -400, 130, 56, '#0b1222', 3);
      c.fillStyle = '#7cc4ff'; c.font = '700 10px "JetBrains Mono"';
      c.fillText(u < 41 ? 'NOVARIS' : 'NOVARIS', 1160, -380);
      c.fillStyle = '#f4ead6'; c.font = '600 9px "JetBrains Mono"';
      c.fillText(u < 41 ? 'THE FUTURE OF' : 'WATER IS A', 1160, -365); c.fillText(u < 41 ? 'WATER SECURITY' : 'RIGHT', 1160, -353);
    }
    // ---- industry ----
    if (v.x1 > 1350) {
      for (let i = 0; i < 5; i++) {
        const x = 1400 + i * 140;
        rect(c, x, -90, 110, 90, '#b8b0a4', 2.5);
        c.fillStyle = '#8c8478'; c.beginPath(); c.moveTo(x, -90); for (let k = 0; k < 4; k++) { c.lineTo(x + k * 27.5 + 14, -110); c.lineTo(x + (k + 1) * 27.5, -90); } c.fill();
        rect(c, x + 80, -190, 14, 100, '#8c8478', 2);
        // full blue tanks
        rect(c, x + 10, -140, 34, 50, '#2a7cff', 2);
      }
      if (u > 26.8 && u < 37) { // barriers
        c.fillStyle = '#ffcf3f';
        for (let x = 1360; x < 2100; x += 30) c.fillRect(x, -16, 18, 6);
      }
    }
  }

  function drawPlaza(c, v) {
    const u = S.u;
    if (v.x1 < -60 || v.x0 > 720) return;
    // loudspeaker pole
    rect(c, 58, -170, 5, 166, '#3d4458');
    c.fillStyle = '#9aa2b1'; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(62, -168); c.lineTo(84, -178); c.lineTo(84, -150); c.lineTo(62, -160); c.closePath(); c.fill(); c.stroke();
    const spk = win(28.3, 28.95, u, 0.1);
    if (spk > 0) {
      c.strokeStyle = `rgba(24,32,58,${spk})`; c.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const r = 10 + ((S.t * 20 + k * 8) % 24); c.beginPath(); c.arc(84, -164, r, -0.6, 0.6); c.stroke(); }
    }
    // overhead pipe (rattles at the checkpoint)
    const shakeT = S.cp.tapT != null ? Math.max(0, 1 - (S.t - S.cp.tapT) / 0.6) : 0;
    const rat = S.reduced ? 0 : Math.sin((S.t - (S.cp.tapT || 0)) * 40) * 2.2 * shakeT;
    pipe(c, 20, -78 + rat * 0.5, 160, -78 + rat * 0.5, 7, '#9a5b36', 0);
    pipe(c, 156, -78, 156, -38 + rat * 0.2, 7, '#9a5b36', 0);
    // display board
    const honest = u > 50.9;
    rect(c, 22, -150, 120, 40, '#0b1222', 2.5);
    rect(c, 40, -110, 4, 30, '#3d4458'); rect(c, 120, -110, 4, 30, '#3d4458');
    c.font = '700 6.4px "JetBrains Mono"';
    if (!honest) {
      c.fillStyle = '#c9d6e6'; c.fillText('WATER DISTRIBUTION', 30, -136); c.fillText('STATUS:', 30, -126);
      c.fillStyle = '#5ee08f'; c.font = '700 9px "JetBrains Mono"'; c.fillText('NORMAL', 62, -125);
      c.beginPath(); c.arc(126, -128, 3.2, 0, 7); c.fill();
    } else {
      c.fillStyle = '#ffcf3f'; c.fillText('LIMITED SUPPLY', 30, -138); c.fillText('CONSERVE WATER', 30, -129);
      c.fillStyle = '#c9d6e6'; c.font = '700 5px "JetBrains Mono"'; c.fillText('VIEW ALLOCATION DATA', 30, -121); c.fillText('REPORT A SHORTAGE', 30, -115);
    }
    // distribution terminal
    rect(c, 96, -46, 28, 46, '#5b6577', 2);
    const denied = win(24.15, 25.3, u, 0.08);
    rect(c, 100, -42, 20, 14, denied > 0.5 ? '#3a0c12' : '#0b1222', 1.5);
    if (denied > 0.5) { c.fillStyle = '#ff7a6a'; c.font = '700 3.6px "JetBrains Mono"'; c.fillText('REQUEST', 102, -36); c.fillText('DENIED', 102, -31); }
    else drawNet(c, 110, -35, 5, { t: S.t, lw: 0.12, alloc: allocAt(u), star: starAt(u, 0), violet: sysViolet(u), col: '#5fb4ff', level: 0.3 });
    // the tap
    pipe(c, 150, 2, 150, -36, 6, u > 45.4 ? '#3a8ee6' : '#9a5b36', 0);
    pipe(c, 150, -36, 162, -36, 6, '#9a5b36', 0);
    rect(c, 159, -36, 5, 7, '#7a8597', 1.5);
    rect(c, 147, -44, 8, 4, '#c8402a', 1.2);
    // water from the tap once it is fixed (ch7 tanker, ch9 tap)
    const flowing = u > 48.4;
    if (flowing) {
      c.fillStyle = 'rgba(80,160,255,0.85)';
      c.fillRect(160.5, -29, 2.6, 16 + Math.sin(S.t * 9) * 0.5);
    }
    // a tarp strung over the long queue
    if ((u > 21 && u < 26.9)) {
      c.fillStyle = '#e07a5f'; c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.moveTo(250, -66); c.quadraticCurveTo(320, -56, 390, -68); c.lineTo(390, -60); c.quadraticCurveTo(320, -48, 250, -58); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#3d5a80';
      c.beginPath(); c.moveTo(450, -64); c.quadraticCurveTo(520, -54, 590, -66); c.lineTo(590, -58); c.quadraticCurveTo(520, -46, 450, -56); c.closePath(); c.fill(); c.stroke();
      for (const px of [250, 390, 450, 590]) rect(c, px - 1, -68, 2, 66, '#3d4458');
    }
    // notice board (evidence)
    rect(c, 182, -102, 26, 30, '#f4ead6', 1.5);
    c.fillStyle = INK; for (let k = 0; k < 4; k++) c.fillRect(186, -96 + k * 6, 18 - (k % 2) * 6, 1.5);
    c.fillStyle = '#e2412f'; c.fillRect(186, -100, 18, 2);

    // ---- rupture ----
    const rup = ease(27.42, 27.55, u);
    const repaired = ease(44.8, 45.4, u);
    if (rup > 0 && repaired < 1) {
      c.fillStyle = '#2a1d16';
      c.beginPath(); c.ellipse(262, -1, 26 * rup * (1 - repaired), 6 * rup * (1 - repaired), 0, 0, 7); c.fill();
      // slabs of road
      c.fillStyle = '#8a7a6a'; c.strokeStyle = INK; c.lineWidth = 1.5;
      c.save(); c.translate(236, -4); c.rotate(-0.5 * rup * (1 - repaired)); c.fillRect(-12, -4, 14, 5); c.strokeRect(-12, -4, 14, 5); c.restore();
      c.save(); c.translate(288, -4); c.rotate(0.45 * rup * (1 - repaired)); c.fillRect(-2, -4, 14, 5); c.strokeRect(-2, -4, 14, 5); c.restore();
    }
    const gey = win(27.45, 28.95, u, 0.12);
    if (gey > 0) {
      const hgt = 150 * gey;
      for (let k = 0; k < 18; k++) {
        const ph = (S.t * 1.4 + k / 18) % 1;
        const y = -ph * hgt, r = 12 + Math.sin(ph * Math.PI) * 10 + wobble(S.t * 0.3, k) * 2;
        c.fillStyle = k % 3 ? 'rgba(120,150,190,0.85)' : 'rgba(150,120,90,0.85)';
        c.beginPath(); c.arc(262 + wobble(S.t * 0.4, k) * 6, y, r * gey, 0, 7); c.fill();
      }
      c.fillStyle = 'rgba(150,190,240,0.85)';
      for (let k = 0; k < 30; k++) {
        const ph = (S.t * 0.8 + hash(k)) % 1, dir = hash(k * 3) - 0.5;
        c.beginPath(); c.arc(262 + dir * 220 * ph, -hgt * Math.sin(ph * Math.PI) * 0.9 - 4, 2.2, 0, 7); c.fill();
      }
    }
    const flood = win(27.5, 39.5, u, 0.6);
    if (flood > 0) {
      c.fillStyle = `rgba(90,110,140,${0.55 * flood})`;
      c.beginPath(); c.ellipse(262, -2, 170 * flood, 5, 0, 0, 7); c.fill();
    }
    // barrier after the rupture
    if (u > 38.5 && u < 45) {
      for (let k = 0; k < 3; k++) {
        const bx = 226 + k * 26;
        c.fillStyle = k % 2 ? '#f4ead6' : '#e2412f'; c.fillRect(bx, -22, 24, 6);
        c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(bx, -22, 24, 6);
        rect(c, bx + 2, -16, 2, 14, '#3d4458'); rect(c, bx + 20, -16, 2, 14, '#3d4458');
      }
    }
    // lane-4 leak puddle (tracker)
    if (u > 45.6 && u < 47.5 && !(S.done.tracker && u > 46.6)) {
      c.fillStyle = 'rgba(80,140,210,0.6)'; c.beginPath(); c.ellipse(430, -2, 24 + Math.sin(S.t) * 2, 4, 0, 0, 7); c.fill();
    }
  }

  function drawFrontRow(c, v) {
    for (const h of frontRow) {
      if (h.x > v.x1 || h.x + h.w < v.x0) continue;
      rect(c, h.x, -h.h, h.w, h.h, h.col, 2.5);
      shade(c, h.x + h.w * 0.68, -h.h, h.w * 0.32, h.h);
      rect(c, h.x + h.w / 2 - 5, -20, 10, 20, '#5b4636', 1.5);
      c.fillStyle = 'rgba(24,32,58,0.6)'; c.fillRect(h.x + 5, -h.h + 10, 8, 8); c.fillRect(h.x + h.w - 13, -h.h + 10, 8, 8);
      if (h.tank) rect(c, h.x + 4, -h.h - 13, 15, 13, '#2b2b2b', 1.5);
    }
  }

  function drawTanker(c, x) {
    // cab
    rect(c, x, -40, 32, 34, '#f4ead6', 2.5);
    rect(c, x + 4, -36, 14, 12, '#9fd1f0', 1.5);
    // tank
    c.fillStyle = '#2a7cff'; c.strokeStyle = INK; c.lineWidth = 2.5;
    c.beginPath(); c.roundRect(x + 34, -46, 96, 38, 16); c.fill(); c.stroke();
    c.fillStyle = '#f4ead6'; c.font = '800 10px "Big Shoulders Display"'; c.fillText('DRINKING WATER', x + 46, -24);
    rect(c, x + 30, -10, 104, 4, '#3d4458');
    for (const wx of [x + 14, x + 60, x + 112]) { c.fillStyle = INK; c.beginPath(); c.arc(wx, -4, 7, 0, 7); c.fill(); c.fillStyle = '#9aa2b1'; c.beginPath(); c.arc(wx, -4, 3, 0, 7); c.fill(); }
    // hose + water
    pipe(c, x + 130, -22, x + 142, -22, 4, '#3d4458', 0);
    c.fillStyle = 'rgba(80,160,255,0.85)'; c.fillRect(x + 141, -20, 3, 9 + Math.sin(S.t * 8) * 0.5);
  }

  function drawJet(c, x, y, s, tilt, flip = 1) {
    c.save(); c.translate(x, y); c.rotate(tilt); c.scale(s * flip, s);
    c.fillStyle = '#3a4566'; c.strokeStyle = INK; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(-60, 4); c.lineTo(40, -6); c.lineTo(66, 2); c.lineTo(40, 10); c.lineTo(-60, 12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5b6b8c';
    c.beginPath(); c.moveTo(-20, 6); c.lineTo(10, 6); c.lineTo(-30, 30); c.lineTo(-44, 30); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-48, 2); c.lineTo(-56, -18); c.lineTo(-44, -18); c.lineTo(-36, 2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#9fd1f0'; c.beginPath(); c.moveTo(30, -4); c.lineTo(52, 0); c.lineTo(30, 3); c.closePath(); c.fill();
    const g = c.createRadialGradient(-62, 8, 0, -62, 8, 18);
    g.addColorStop(0, 'rgba(255,207,63,0.95)'); g.addColorStop(1, 'rgba(255,107,61,0)');
    c.fillStyle = g; c.beginPath(); c.arc(-62, 8, 18, 0, 7); c.fill();
    c.restore();
  }

  function drawStreetCast(c, v) {
    const u = S.u;
    if (v.x1 < -60 || v.x0 > 760) return;
    const ch1 = u < 9.6, ch4 = u > 22.4 && u < 26.0, ch5 = u > 27.0 && u < 29.0, ch7 = u > 38.5 && u < 42.0;
    const reb = u > 44.6 && u < 47.6, ch9 = u > 47.6;
    const t = S.t;
    if (ch1 || ch4) {
      const n = ch1 ? 8 : 20;
      for (let i = n - 1; i >= 0; i--) {
        const x = 252 + i * 22 + (i > 9 ? 6 : 0);
        if (x > v.x1 + 30) continue;
        const r = resident(i + 3);
        fig(c, r, x, 0, { f: -1, seed: i, prop: i % 3 === 0 ? 'bucket' : 'can', propCol: ['#ffcf3f', '#2fb5a6', '#e07a5f', '#c7ccd6'][i % 4], armR: 0.25, face: ch4 && i === 0 ? 'open' : (hash(i) > 0.5 ? 'worried' : 'calm') }, false);
      }
      fig(c, 'elder', 226, 0, { f: -1, prop: 'bucket', face: 'worried' }, false);
      const shake = S.cp.tapT != null && t - S.cp.tapT < 0.6;
      const atTap = ch1 && u > 6.4 && u < 7.6;
      const phone = ch1 && u > 7.95;
      const strike = ch4 && u > 24.65;
      const ax = strike ? lerp(172, 134, ease(24.55, 24.85, u)) : 172;
      fig(c, 'asha', ax, 0, {
        f: -1, prop: phone ? 'phone' : ch4 ? (strike ? null : 'cans') : 'drum',
        armR: phone ? 2.2 : atTap ? (shake ? 2.1 + Math.sin(t * 30) * 0.15 : 1.9) : strike ? 1.9 : 0.25,
        face: strike ? 'shout' : u > 7.1 ? 'worried' : 'calm',
      });
      fig(c, 'aarav', 198, 0, { f: -1, sit: ch4, prop: ch4 ? 'potFloor' : 'pot', armR: 0.6, face: ch4 ? 'worried' : 'calm' });
    }
    if (ch5) {
      const run = ease(27.5, 28.3, u);
      fig(c, 'aarav', lerp(198, 70, run), 0, { f: -1, walk: run > 0 && run < 1 ? 1.4 : 0, face: 'shout' });
      fig(c, 'asha', lerp(200, 150, run), 0, { f: -1, walk: run > 0 && run < 1 ? 1.2 : 0, armL: 1.2, face: 'shout' });
      fig(c, 'elder', lerp(226, 170, run), 0, { f: -1, walk: run > 0 && run < 1 ? 0.8 : 0, face: 'worried' }, false);
      for (let i = 0; i < 9; i++) {
        const x0 = 300 + i * 26;
        fig(c, resident(i + 3), x0 + run * (90 + i * 10), 0, { f: 1, seed: i, walk: run < 1 ? 1.3 : 0, face: 'shout' }, false);
      }
      // overturned handcart near the hole
      c.save(); c.translate(300, -8); c.rotate(0.4 * ease(27.5, 27.8, u));
      rect(c, -14, -8, 28, 8, '#a87a4a', 1.5); c.restore();
    }
    if (ch7) {
      drawTanker(c, 296);
      fig(c, 'asha', 228, 0, { f: 1, prop: 'folder', armR: u > 40.0 && u < 41.1 ? 1.5 : 0.9, face: u > 41.2 ? 'smile' : 'calm' });
      fig(c, 'engineer', 262, 0, { f: -1, armR: 0.5, prop: 'tablet' });
      fig(c, 'aarav', 452, 0, { f: -1, prop: 'pot', armR: 1.1, face: u > 41.1 ? 'smile' : 'calm' });
      for (let i = 0; i < 6; i++) fig(c, resident(i + 20), 482 + i * 24, 0, { f: -1, seed: i + 20, prop: 'can', propCol: ['#ffcf3f', '#2fb5a6', '#e07a5f'][i % 3], armR: 0.25, face: 'calm' }, false);
      // collected evidence glints
      for (const id of S.cp.evidence || []) {
        const [ex, ey] = EVIDENCE[id];
        c.strokeStyle = 'rgba(255,207,63,0.9)'; c.lineWidth = 2;
        c.beginPath(); c.arc(ex, ey, 10 + Math.sin(t * 4) * 1.5, 0, 7); c.stroke();
      }
    }
    if (reb) {
      // montage crew
      fig(c, 'bruce', 300, 0, { f: 1, prop: 'tablet', armR: 0.8 });
      rect(c, 318, -12, 22, 12, '#9a8f86', 2); // recharge well
      c.fillStyle = '#2a7cff'; c.fillRect(322, -9, 14, 3);
      const thorX = lerp(560, 600, inv(44.7, 46, u));
      fig(c, 'thor', thorX, 0, { f: -1, armL: 2.8, armR: 2.8, walk: 0.3 });
      pipe(c, thorX - 40, -66, thorX + 40, -66, 8, '#3a8ee6', 0);
      fig(c, 'worker', 500, 0, { f: -1, prop: 'wrench', armR: 1.4 }, false);
      fig(c, 'tony', 640, 0, { f: -1, armR: 1.2, glowA: 0.4 });
      if (u > 45.6) {
        fig(c, 'asha', 372, 0, { f: 1, prop: 'phone', armR: 2.0, face: S.done.tracker ? 'calm' : 'worried' });
        fig(c, resident(41), 404, 0, { f: -1, seed: 41, armR: 1.6, face: 'worried' }, false);
        if (S.done.tracker && u > 46.3) {
          fig(c, 'worker', 452, 0, { f: -1, prop: 'wrench', armR: 1.9, seed: 9 }, false);
          c.fillStyle = '#ff6b3d'; c.beginPath(); c.moveTo(470, 0); c.lineTo(476, -14); c.lineTo(482, 0); c.fill();
        }
      }
    }
    if (ch9) {
      const leave = ease(51.75, 52.6, u);
      fig(c, 'aarav', 172, 0, { f: 1, prop: 'can', propCol: '#2fb5a6', armR: 1.25, face: 'calm' });
      if (u < 52.7) {
        fig(c, 'asha', lerp(198, 70, leave), 0, { f: leave > 0 ? -1 : -1, walk: leave > 0 && leave < 1 ? 0.8 : 0, face: 'smile', armR: leave > 0 ? 0.6 : 0.25 });
        fig(c, 'elder', lerp(238, 100, leave), 0, { f: -1, prop: 'bucket', walk: leave > 0 && leave < 1 ? 0.7 : 0, face: 'smile' }, false);
      }
      fig(c, resident(51), 270, 0, { f: -1, s: 0.68, prop: 'can', propCol: '#ffcf3f', armR: 0.8, face: 'smile' }, false);
      fig(c, resident(52), 292, 0, { f: -1, s: 0.62, prop: 'can', propCol: '#e07a5f', armR: 0.8, face: 'smile' }, false);
      fig(c, 'worker', 116, 0, { f: 1, prop: 'tablet', armR: 0.9, seed: 4 }, false);
      // the team heads for the jet
      const go = ease(50.3, 51.6, u);
      if (u < 52.0) {
        fig(c, 'tony', lerp(430, 640, go), 0, { f: 1, walk: go > 0 && go < 1 ? 0.8 : 0, glowA: 0.4 });
        fig(c, 'bruce', lerp(470, 680, go), 0, { f: 1, walk: go > 0 && go < 1 ? 0.8 : 0, prop: 'tablet' });
        fig(c, 'thor', lerp(510, 720, go), 0, { f: 1, walk: go > 0 && go < 1 ? 0.8 : 0, prop: 'hammer' });
      }
    }
  }

  function drawSquare(c, v) {
    const u = S.u;
    const a = win(41.9, 44.75, u, 0.2);
    if (a <= 0 || v.x1 < 680 || v.x0 > 1350) return;
    c.globalAlpha = a;
    // stage and dashboard
    rect(c, 920, -18, 180, 14, '#9a8f86', 2.5);
    rect(c, 958, -220, 6, 200, '#3d4458'); rect(c, 1102, -220, 6, 200, '#3d4458');
    rect(c, 950, -232, 166, 112, '#0b1222', 3);
    c.fillStyle = '#c9d6e6'; c.font = '700 7px "JetBrains Mono"'; c.fillText('PUBLIC WATER ALLOCATION DASHBOARD', 958, -222);
    drawNet(c, 1000, -170, 36, { t: S.t, lw: 0.45, star: 0, alloc: allocAt(u), ring: ease(42.6, 43.4, u), level: meter(u)[0] / 100 * 2, col: '#5fb4ff', labels: false });
    c.fillStyle = '#ffcf3f'; c.font = '700 5px "JetBrains Mono"';
    ['NEEDS FIRST', 'TRANSPARENT', 'OVERSIGHT', 'COMMUNITY'].forEach((s, i) => { if (u > 42.8 + i * 0.15) c.fillText('✓ ' + s, 1046, -196 + i * 12); });
    // people
    fig(c, 'official', 950, -14, { f: 1, armR: u > 44.2 ? 1.0 : 0.2 }, false);
    fig(c, 'meera', 990, -14, { f: 1, armR: u > 43.6 ? 1.3 : 0.3, prop: 'tablet' });
    fig(c, 'tony', 1032, -14, { f: -1, glowA: 0.3 });
    fig(c, 'bruce', 1068, -14, { f: -1, prop: 'tablet', armR: 0.8 });
    const crowd = [];
    for (let i = 0; i < 18; i++) crowd.push(700 + i * 22 + (i > 8 ? 210 : 0) + hash(i) * 6);
    crowd.forEach((x, i) => fig(c, resident(i + 60), x, 0, { f: x < 1010 ? 1 : -1, seed: i + 60, face: 'calm', armR: 0.2 }, false));
    fig(c, 'asha', 880, 0, { f: 1, armR: u > 43.5 && u < 44.4 ? 2.9 : 0.3, face: u > 44.2 ? 'smile' : 'calm' });
    fig(c, 'thor', 1180, 0, { f: -1, prop: 'hammer', armR: 0.3 });
    c.globalAlpha = 1;
  }

  function drawCity(c, cam) {
    curCam = cam;
    drawSky(c, cam);
    drawFar(c, cam);
    apply(c, cam, 1);
    const v = view(cam);
    if (v.y1 > 0) drawUnderground(c, cam, v);
    drawPipes(c);
    drawControlRoom(c, v);
    drawChamber(c, v);
    drawSurface(c, v);
    drawPlaza(c, v);
    drawSquare(c, v);
    drawStreetCast(c, v);
    drawFrontRow(c, v);
    // jet: flyover in ch4, departure in ch9
    if (S.u > 20.9 && S.u < 23) {
      const p = inv(21.0, 22.8, S.u);
      drawJet(c, lerp(-1000, 1300, p), lerp(-640, -300, p), 1.1, 0.08);
    }
    if (S.u > 49.5) {
      const p = ease(51.6, 53.4, S.u);
      drawJet(c, lerp(720, -260, p), lerp(-150, -760, p), 0.9 + p * 0.2, 0.3 * p, -1);
    }
    drawParts(c, 'city', S.dt);
    // colour wash: violet when the machine rules, a clean light once people do
    screen(c);
    const vw = sysViolet(S.u) * 0.32;
    if (vw > 0.01) {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = `rgba(140,90,220,${vw})`; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
  }

  // ========== HQ ==========
  function drawHQ(c, cam) {
    curCam = cam;
    screen(c);
    c.fillStyle = '#0d1527'; c.fillRect(0, 0, W, H);
    apply(c, cam, 1);
    const u = S.u, t = S.t;
    const storm = ease(17.2, 17.9, u);
    const rainOn = S.cp.rainT != null && t - S.cp.rainT < 4.2 && u > 17.6 && u < 18.8;
    // back wall + window
    rect(c, -700, -520, 1400, 520, '#121d34');
    for (let x = -680; x < 700; x += 80) { c.fillStyle = 'rgba(95,180,255,0.06)'; c.fillRect(x, -520, 2, 520); }
    const wg = c.createLinearGradient(0, -400, 0, -180);
    wg.addColorStop(0, mixHex('#e59a55', '#3a4566', storm)); wg.addColorStop(1, mixHex('#f8dcaa', '#5b6b8c', storm));
    c.fillStyle = wg; c.fillRect(-320, -400, 640, 220);
    c.fillStyle = mixHex('#c9a27e', '#2b3556', storm);
    for (let i = 0; i < 12; i++) c.fillRect(-320 + i * 54, -180 - 40 - hash(i) * 70, 40, 40 + hash(i) * 70);
    if (storm > 0) {
      c.fillStyle = `rgba(40,48,72,${0.85 * storm})`;
      for (let i = 0; i < 5; i++) cloud(c, -260 + i * 130 + Math.sin(t * 0.3 + i) * 10, -370 + hash(i) * 30, 70);
      const flash = Math.max(0, Math.sin(t * 0.9) - 0.96) * 20 * storm;
      if (flash > 0) { c.fillStyle = `rgba(230,240,255,${flash * 0.5})`; c.fillRect(-320, -400, 640, 220); }
    }
    if (rainOn) {
      c.strokeStyle = 'rgba(200,220,255,0.6)'; c.lineWidth = 1.5;
      for (let i = 0; i < 60; i++) { const x = -320 + hash(i) * 640, y = -400 + ((t * 300 + hash(i * 2) * 220) % 220); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 12); c.stroke(); }
    }
    c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(-320, -400, 640, 220);
    c.lineWidth = 4; c.beginPath(); c.moveTo(0, -400); c.lineTo(0, -180); c.stroke();
    // floor
    rect(c, -700, 0, 1400, 300, '#0a1120');
    c.strokeStyle = 'rgba(95,180,255,0.12)'; c.lineWidth = 1;
    for (let x = -700; x < 700; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x * 1.6, 300); c.stroke(); }
    // holo table
    c.fillStyle = '#2b3556'; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, -16, 110, 16, 0, 0, 7); c.fill(); c.stroke();
    rect(c, -40, -16, 80, 16, '#1b2742', 2);
    const red = win(19.55, 20.95, u, 0.15);
    const beam = c.createLinearGradient(0, -300, 0, -16);
    beam.addColorStop(0, 'rgba(95,180,255,0)'); beam.addColorStop(1, red > 0.5 ? 'rgba(255,90,80,0.25)' : 'rgba(95,180,255,0.25)');
    c.fillStyle = beam; c.beginPath(); c.moveTo(-100, -16); c.lineTo(-150, -290); c.lineTo(150, -290); c.lineTo(100, -16); c.fill();
    // the hologram: the same nine lines
    c.save(); c.translate(0, -170); c.scale(1, 0.78);
    drawNet(c, 0, 0, 100, {
      t, lw: 1, star: starAt(u, 0), alloc: allocAt(u), violet: sysViolet(u), red: red * 0.7 + (S.cp.rainT != null && u > 17.6 && u < 18.9 ? 0.2 : 0),
      level: meter(u)[0] / 100 * 2.2, col: '#5fd0ff', broken: 1, labels: cam.k > 0.9 && cam.k < 2.4 && red < 0.5, font: 8.5,
    });
    if (rainOn) {
      c.strokeStyle = 'rgba(150,230,255,0.75)'; c.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { const x = -120 + hash(i * 1.3) * 240, y = -130 + ((t * 160 + hash(i) * 260) % 260); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); }
      // the Shantinagar line leaks it straight into the ground
      const [nx, ny] = nodePos(0, 0, 100, 3);
      c.fillStyle = 'rgba(150,230,255,0.8)';
      for (let k = 0; k < 6; k++) { const ph = (t * 1.2 + k / 6) % 1; c.beginPath(); c.arc(nx * 0.6, ny * 0.6 + ph * 60, 2, 0, 7); c.fill(); }
    }
    c.restore();
    if (S.cp.rainT != null && u > 17.6 && u < 18.9) {
      c.font = '700 9px "JetBrains Mono"'; c.textAlign = 'center';
      c.fillStyle = 'rgba(10,14,30,0.85)'; c.fillRect(-100, -318, 200, 30);
      c.fillStyle = '#ff9b86'; c.fillText('SIMULATION · SHANTINAGAR TAP: +0 L', 0, -306);
      c.fillStyle = '#c9d6e6'; c.fillText('broken pipes · no storage · runoff', 0, -295);
      c.textAlign = 'left';
    }
    if (win(20.25, 21.0, u, 0.1) > 0) {
      c.font = '700 10px "JetBrains Mono"'; c.textAlign = 'center';
      c.fillStyle = 'rgba(60,10,16,0.9)'; c.fillRect(-120, -300, 240, 22);
      c.fillStyle = '#ff9b86'; c.fillText('SHANTINAGAR RESERVE: 4 HOURS', 0, -285); c.textAlign = 'left';
    }
    // FRIDAY waveform
    const fri = win(15.75, 16.6, u, 0.1);
    if (fri > 0) {
      c.strokeStyle = `rgba(110,240,220,${fri})`; c.lineWidth = 2; c.beginPath();
      for (let x = -60; x <= 60; x += 3) c.lineTo(x, -310 + Math.sin(x * 0.2 + t * 8) * 6 * Math.cos(x / 40));
      c.stroke();
      c.fillStyle = `rgba(110,240,220,${fri})`; c.font = '700 8px "JetBrains Mono"'; c.textAlign = 'center'; c.fillText('FRIDAY', 0, -322); c.textAlign = 'left';
    }
    // people
    const thorIn = ease(16.5, 17.2, u);
    fig(c, 'tony', 70, 0, { f: -1, armR: u > 16.0 && u < 16.6 ? 1.6 : 1.1, glowA: 0.6, face: u > 19.6 ? 'worried' : 'calm' });
    fig(c, 'bruce', 112, 0, { f: -1, prop: 'tablet', armR: 0.8, face: u > 19.6 ? 'worried' : 'calm' });
    if (thorIn > 0) fig(c, 'thor', lerp(360, 175, thorIn), 0, { f: -1, prop: 'hammer', walk: thorIn < 1 ? 1 : 0, armR: u > 17.3 && u < 18.3 ? 2.6 : 0.3, hammerA: u > 17.3 && u < 18.3 ? 3.0 : 0.3, face: 'calm' });
    drawParts(c, 'hq', S.dt);
  }

  // ========== HUD (ch6 helmet display + finale thread) ==========
  function hudGeom() {
    const mobile = W <= 720;
    if (mobile) return { cx: W / 2, cy: H * 0.33, R: Math.min(W * 0.21, H * 0.14) };
    // keep the whole map (labels included) clear of the story dock on the left
    const dockRight = 56 + Math.min(440, W * 0.36);
    const R = Math.max(80, Math.min(H * 0.24, (W - dockRight - 270) / 2));
    return { cx: Math.min(W - R - 135, dockRight + 135 + R), cy: H * 0.5, R };
  }
  const localAnim = Array(9).fill(0);
  function drawHUD(c) {
    const u = S.u;
    const a = win(32.35, 37.5, u, 0.3);
    screen(c);
    if (a > 0) {
      const dark = sysDark(u);
      c.fillStyle = `rgba(8,10,22,${0.74 * a})`; c.fillRect(0, 0, W, H);
      if (a > 0.15) labels.length = 0;
      const g = hudGeom();
      c.globalAlpha = a * (1 - dark * 0.9);
      // helmet brackets
      c.strokeStyle = 'rgba(120,200,255,0.7)'; c.lineWidth = 2;
      const bw = g.R * 1.75, bh = g.R * 1.35;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        c.beginPath(); c.moveTo(g.cx + sx * bw, g.cy + sy * (bh - 22)); c.lineTo(g.cx + sx * bw, g.cy + sy * bh); c.lineTo(g.cx + sx * (bw - 22), g.cy + sy * bh); c.stroke();
      }
      const local = localAnim.map((v, i) => (localAnim[i] = v + ((S.cp.local[i] ? 1 : 0) - v) * Math.min(1, S.dt * (S.reduced ? 30 : 4))));
      if (S.done.districts) { /* keep */ }
      drawNet(c, g.cx, g.cy, g.R, {
        t: S.t, lw: Math.max(0.9, g.R / 150), star: starAt(u, 0), alloc: allocAt(u), violet: S.done.sever && u > 36.95 ? 0 : 1, local,
        level: 0.28, labels: true, labelOff: 27, font: Math.max(9, Math.min(12, g.R / 14)), hot: S.gateActive === 'districts' ? S.cp.hint : null, col: '#5fb4ff',
      });
      // countdown
      const cd = countdownAt(u);
      if (cd != null) {
        const s = Math.max(2, Math.ceil(cd));
        const txt = `CENTRAL WATER NETWORK SHUTDOWN  00:${String(s).padStart(2, '0')}`;
        c.font = `700 ${W <= 720 ? 11 : 14}px "JetBrains Mono", monospace`;
        c.textAlign = 'center';
        const ty = g.cy + bh + 26;
        const tw = c.measureText(txt).width + 20;
        c.fillStyle = 'rgba(30,8,14,0.85)'; c.fillRect(g.cx - tw / 2, ty - 16, tw, 24);
        c.fillStyle = s <= 10 ? '#ff8f7a' : '#ffcf3f'; c.fillText(txt, g.cx, ty + 1);
        c.textAlign = 'left';
      }
      c.globalAlpha = 1;
    }
    // finale: the thread re-forms in the sky as an open network around a single drop
    const f = ease(52.3, 53.6, u);
    if (f > 0) {
      const mobile = W <= 720;
      const R = Math.min(W * (mobile ? 0.26 : 0.2), H * 0.15);
      const cx = W / 2, cy = Math.max(R + 70, H * (mobile ? 0.3 : 0.29));
      c.globalAlpha = f * 0.85;
      drawNet(c, cx, cy, R, { t: S.t, lw: R / 120, star: 0, alloc: [0.55, 0.55, 0.55, 0.6, 0.6, 0.55, 0.55, 0.55, 0.55], ring: f, drop: ease(52.8, 53.8, u), level: 0.32, col: '#9fd8ff' });
      c.globalAlpha = 1;
    }
    // global blackout at the cut
    const bo = sysDark(u);
    if (bo > 0) { c.fillStyle = `rgba(2,3,8,${bo * 0.8})`; c.fillRect(0, 0, W, H); }
  }

  let phoneRect = null;
  function drawPhone(c) {
    phoneRect = null;
    const a = win(8.0, 8.98, S.u, 0.18);
    if (a <= 0) return;
    screen(c);
    const mobile = W <= 720;
    const ph = Math.min(H * 0.42, 300), pw = ph * 0.52;
    const x = mobile ? W / 2 - pw / 2 : W * 0.75 - pw / 2, y = mobile ? H * 0.12 : H * 0.5 - ph / 2;
    phoneRect = { x: x - 10, y: y - 10, w: pw + 20, h: ph + 20 };
    c.globalAlpha = a;
    c.save(); c.translate(0, (1 - a) * 20);
    c.fillStyle = INK; c.beginPath(); c.roundRect(x - 6, y - 6, pw + 12, ph + 12, 18); c.fill();
    c.fillStyle = '#eef3f7'; c.beginPath(); c.roundRect(x, y, pw, ph, 12); c.fill();
    c.fillStyle = '#123a66'; c.fillRect(x, y, pw, ph * 0.16);
    drawNet(c, x + pw * 0.16, y + ph * 0.08, ph * 0.045, { t: S.t, lw: 0.18, star: 0, alloc: allocAt(S.u), level: 0.3, col: '#9fd8ff' });
    c.fillStyle = '#fff'; c.font = `800 ${ph * 0.055}px "Big Shoulders Display"`; c.fillText('NIWN WATER', x + pw * 0.3, y + ph * 0.1);
    c.fillStyle = '#4a5366'; c.font = `700 ${ph * 0.038}px "JetBrains Mono"`;
    c.fillText('WATER DISTRIBUTION', x + pw * 0.1, y + ph * 0.3); c.fillText('STATUS', x + pw * 0.1, y + ph * 0.35);
    c.fillStyle = '#dff3e6'; c.fillRect(x + pw * 0.1, y + ph * 0.4, pw * 0.8, ph * 0.12);
    c.fillStyle = '#18a050'; c.font = `800 ${ph * 0.08}px "Big Shoulders Display"`; c.fillText('● NORMAL', x + pw * 0.16, y + ph * 0.49);
    c.fillStyle = '#4a5366'; c.font = `400 ${ph * 0.034}px "JetBrains Mono"`;
    c.fillText('Shantinagar: within', x + pw * 0.1, y + ph * 0.62); c.fillText('acceptable parameters', x + pw * 0.1, y + ph * 0.67);
    c.restore();
    c.globalAlpha = 1;
  }

  function drawLabels(c) {
    screen(c);
    const dock = phoneRect ? [...(S.avoid || []), phoneRect] : (S.avoid || []);
    c.font = '800 12px "Big Shoulders Display", sans-serif';
    c.textAlign = 'center';
    for (const l of labels) {
      const w = c.measureText(l.name).width + 10;
      const r = { x: l.sx - w / 2, y: l.sy - 16, w, h: 16 };
      if (r.x < 0 || r.x + r.w > W || r.y < 0 || r.y > H) continue;
      let hit = false;
      for (const d of dock) if (r.x < d.x + d.w && r.x + r.w > d.x && r.y < d.y + d.h && r.y + r.h > d.y) { hit = true; break; }
      if (hit) continue; // step aside for story text
      c.fillStyle = 'rgba(244,234,214,0.92)'; c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = INK; c.fillText(l.name, l.sx, l.sy - 4);
    }
    c.textAlign = 'left';
  }

  function vignette(c) {
    screen(c);
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(10,12,24,0)'); g.addColorStop(1, 'rgba(10,12,24,0.38)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function drawSet(c, set, keys) {
    const cam = camFor(keys);
    if (set === 'city') drawCity(c, cam); else drawHQ(c, cam);
    return cam;
  }

  let lastCity = null;
  function draw() {
    labels.length = 0;
    const sets = setsAt(S.u);
    const first = sets[0];
    const cam0 = drawSet(ctx, first.set, first.cam);
    if (first.set === 'city') lastCity = cam0;
    if (sets.length > 1) {
      labels.length = 0;
      const cam1 = drawSet(bctx, sets[1].set, sets[1].cam);
      if (sets[1].set === 'city') lastCity = cam1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = sets[1].w;
      ctx.drawImage(buf, 0, 0);
      ctx.globalAlpha = 1;
      curCam = sets[1].w > 0.5 ? cam1 : cam0;
      if (sets[1].w < 0.5) labels.length = 0;
    }
    drawPhone(ctx);
    drawHUD(ctx);
    vignette(ctx);
    if (!S.hideLabels) drawLabels(ctx);
  }

  /** world → screen for the hotspots (city set only) */
  function project(x, y) {
    if (!lastCity) return null;
    const c = lastCity;
    return [c.fx + (x - c.x) * c.k, c.fy + (y - c.y) * c.k];
  }

  return { resize, draw, burst, project, hudGeom, get W() { return W; }, get H() { return H; } };
}

export const EVIDENCE = { notice: [195, -87], tap: [158, -40], terminal: [110, -35] };
