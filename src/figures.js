// Small original characters: rounded shapes, one outline around the whole figure.
// Feet at (0,0); a grown figure is ~50 units tall.
import { hash } from './util.js';

export const INK = '#18203a';

// Avengers character face portraits
export const FACES = {};
const FACE_FILES = {
  tony: '/assets/avengers/tony.png',
  thor: '/assets/avengers/thor.png',
  bruce: '/assets/avengers/bruce(hulk).png',
};
for (const [key, src] of Object.entries(FACE_FILES)) {
  const img = new Image();
  img.src = src;
  img.onload = () => { FACES[key] = img; };
}

export const CAST = {
  asha: { skin: '#b5714a', hair: '#1d1612', style: 'braid', top: '#2fb5a6', dress: true, bottom: '#3d3a66', scarf: '#ffcf3f', label: 'ASHA' },
  aarav: { skin: '#a86a40', hair: '#1d1612', style: 'cap', cap: '#e2412f', top: '#f4ead6', stripe: '#2a7cff', bottom: '#5a6b8c', s: 0.7, label: 'AARAV' },
  meera: { skin: '#a5683f', hair: '#211814', style: 'hardhat', hat: '#ffcf3f', glasses: true, top: '#2a7cff', bottom: '#2b3556', label: 'MEERA' },
  tony: { faceKey: 'tony', skin: '#d9a27c', hair: '#2a1d16', style: 'short', armour: true, top: '#8f9aab', trim: '#5b6577', bottom: '#7d889a', glow: true, label: 'TONY' },
  bruce: { faceKey: 'bruce', skin: '#e0b08a', hair: '#6f6458', style: 'messy', glasses: true, top: '#7c8a4a', bottom: '#4a4f5e', label: 'BRUCE' },
  thor: { faceKey: 'thor', skin: '#e8b894', hair: '#dfb04a', style: 'long', top: '#3b4660', trim: '#9aa6c0', bottom: '#2d3448', cape: '#c8402a', s: 1.08, label: 'THOR' },
  elder: { skin: '#9c6440', hair: '#ece6da', style: 'bun', top: '#c9c2d8', dress: 'long', border: '#7b3c8a', bottom: '#c9c2d8', s: 0.92 },
  tech: { skin: '#c48a62', hair: '#2b2018', style: 'short', top: '#5d6f8f', bottom: '#2b3556', lanyard: true },
  official: { skin: '#b07850', hair: '#3a3a3a', style: 'short', top: '#3a3f4f', bottom: '#2b2f3b', tie: '#c8402a' },
  engineer: { skin: '#8f5a38', hair: '#1d1612', style: 'hardhat', hat: '#f4ead6', top: '#ffcf3f', bottom: '#2b3556', vest: true },
  worker: { skin: '#a36a42', hair: '#1d1612', style: 'hardhat', hat: '#ff6b3d', top: '#ff6b3d', bottom: '#3d3a66', vest: true },
};

const RES_TOPS = ['#e07a5f', '#81b29a', '#f2cc8f', '#6d597a', '#b56576', '#3d5a80', '#e5989b', '#8d99ae', '#c9ada7', '#e9c46a'];
const RES_SKIN = ['#8d5524', '#a86a40', '#c68642', '#b5714a', '#7c4a2d', '#9c6440'];
export function resident(seed) {
  const h = (k) => hash(seed * 7.13 + k);
  return {
    skin: RES_SKIN[Math.floor(h(1) * RES_SKIN.length)],
    hair: h(2) > 0.85 ? '#d8d2c6' : '#1d1612',
    style: ['short', 'bun', 'short', 'long', 'bun', 'cap'][Math.floor(h(3) * 6)],
    cap: RES_TOPS[Math.floor(h(9) * RES_TOPS.length)],
    top: RES_TOPS[Math.floor(h(4) * RES_TOPS.length)],
    dress: h(5) > 0.55 ? (h(6) > 0.5 ? 'long' : true) : false,
    border: RES_TOPS[Math.floor(h(7) * RES_TOPS.length)],
    bottom: ['#3d3a66', '#4a4f5e', '#5a6b8c', '#2b3556'][Math.floor(h(8) * 4)],
    s: 0.88 + h(10) * 0.18,
  };
}

// ---- tiny shape list renderer: outline pass then fill pass gives a single silhouette outline ----
function run(ctx, ops, o) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  for (const op of ops) {
    if (op.noOutline) continue;
    if (op.t === 'l') {
      ctx.lineWidth = op.w + o * 2;
      ctx.beginPath(); ctx.moveTo(op.a, op.b); ctx.lineTo(op.c, op.d); ctx.stroke();
    } else {
      ctx.lineWidth = o * 2;
      path(ctx, op); ctx.fill(); ctx.stroke();
    }
  }
  for (const op of ops) {
    if (op.t === 'l') {
      ctx.strokeStyle = op.col; ctx.lineWidth = op.w;
      ctx.beginPath(); ctx.moveTo(op.a, op.b); ctx.lineTo(op.c, op.d); ctx.stroke();
    } else {
      ctx.fillStyle = op.col; path(ctx, op); ctx.fill();
      if (op.inner) { ctx.strokeStyle = INK; ctx.lineWidth = o * 0.8; ctx.stroke(); }
    }
  }
}
function path(ctx, op) {
  ctx.beginPath();
  if (op.t === 'c') ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2);
  else if (op.t === 'e') ctx.ellipse(op.x, op.y, op.rx, op.ry, op.rot || 0, 0, Math.PI * 2);
  else if (op.t === 'r') ctx.roundRect(op.x, op.y, op.w, op.h, op.r);
  else if (op.t === 'p') { ctx.moveTo(op.pts[0], op.pts[1]); for (let i = 2; i < op.pts.length; i += 2) ctx.lineTo(op.pts[i], op.pts[i + 1]); ctx.closePath(); }
  else if (op.t === 'q') { // half-disc dome
    ctx.arc(op.x, op.y, op.r, Math.PI, 0); ctx.closePath();
  }
}
const C = (x, y, r, col, extra) => ({ t: 'c', x, y, r, col, ...extra });
const E = (x, y, rx, ry, col, rot, extra) => ({ t: 'e', x, y, rx, ry, col, rot, ...extra });
const R = (x, y, w, h, r, col, extra) => ({ t: 'r', x, y, w, h, r, col, ...extra });
const P = (pts, col, extra) => ({ t: 'p', pts, col, ...extra });
const Ln = (a, b, c, d, w, col, extra) => ({ t: 'l', a, b, c, d, w, col, ...extra });

/**
 * Draw a character.
 * opts: { f: facing ±1, s: scale, t: time, walk: 0|speed, armL, armR (radians, 0 = down, + = outward/forward),
 *         face: 'calm'|'worried'|'open'|'smile'|'shout', prop, sit, lean, o: outline width (world), glowA }
 */
export function drawFigure(ctx, spec, x, y, opts = {}) {
  const s = (opts.s || 1) * (spec.s || 1);
  const f = opts.f || 1;
  const t = opts.t || 0;
  const o = (opts.o || 1.2) / s;
  const seed = opts.seed || 0;
  ctx.save();
  ctx.translate(x, y);
  if (opts.lean) ctx.rotate(opts.lean);
  ctx.scale(s * f, s);

  const walk = opts.walk || 0;
  const ph = t * walk * 7 + seed;
  const idle = Math.sin(t * 1.7 + seed * 3.1);
  const bob = walk ? Math.abs(Math.sin(ph)) * -1.6 : idle * 0.35;
  const sit = !!opts.sit;
  const by = (sit ? 12 : 0) + bob; // body drop

  const ops = [];
  const behind = [];

  // cape (behind everything)
  if (spec.cape) {
    const fl = Math.sin(t * 2.3 + seed) * 2 + (walk ? 3 : 0);
    behind.push(P([-7, -32 + by, 7, -32 + by, 9 + fl * 0.3, -6 + by, -12 - fl, -4 + by], spec.cape));
  }
  // braid swings behind
  if (spec.style === 'braid') {
    const sw = Math.sin(t * 1.9 + seed) * 1.5 + (walk ? Math.sin(ph) * 2 : 0);
    behind.push(Ln(-4, -40 + by, -7 + sw, -22 + by, 4.2, spec.hair));
    behind.push(C(-7 + sw, -21 + by, 2.4, spec.scarf || spec.hair));
  }
  if (spec.style === 'long' && !spec.faceKey) behind.push(R(-9.5, -46 + by, 19, 22, 6, spec.hair));

  // legs
  const legs = [];
  if (sit) {
    legs.push(Ln(-3, -15 + by, 8, -14 + by + 1, 5, spec.bottom));
    legs.push(Ln(3, -15 + by, 10, -13 + by + 2, 5, spec.bottom));
    legs.push(Ln(8, -13 + by, 9, 0, 5, spec.bottom));
    legs.push(Ln(10, -12 + by, 12, 0, 5, spec.bottom));
  } else {
    const fx = walk ? Math.sin(ph) * 4.5 : 0;
    const lift1 = walk ? Math.max(0, Math.cos(ph)) * -2.5 : 0;
    const lift2 = walk ? Math.max(0, -Math.cos(ph)) * -2.5 : 0;
    legs.push(Ln(-3, -16 + by, -3 + fx, -2 + lift1, 5.2, spec.bottom));
    legs.push(Ln(3, -16 + by, 3 - fx, -2 + lift2, 5.2, spec.bottom));
    legs.push(E(-3 + fx + 1, -1.2 + lift1, 3.4, 1.8, INK));
    legs.push(E(3 - fx + 1, -1.2 + lift2, 3.4, 1.8, INK));
  }

  // torso
  const torso = [];
  if (spec.dress === 'long') torso.push(P([-8, -33 + by, 8, -33 + by, 11, -2 + by * 0.2, -11, -2 + by * 0.2], spec.top));
  else if (spec.dress) torso.push(P([-8, -33 + by, 8, -33 + by, 10, -10 + by, -10, -10 + by], spec.top));
  torso.push(R(-8, -34 + by, 16, 20, 6, spec.top));
  if (spec.armour) torso.push(R(-6, -31 + by, 12, 7, 3, spec.trim));

  // arms
  const armL = opts.armL ?? 0.12, armR = opts.armR ?? 0.12;
  const swing = walk ? Math.sin(ph) * 0.5 : idle * 0.03;
  const aL = armL - swing, aR = armR + swing;
  const sh = -30 + by;
  const handL = [-7 - Math.sin(aL) * 13, sh + Math.cos(aL) * 13];
  const handR = [7 + Math.sin(aR) * 13, sh + Math.cos(aR) * 13];
  const sleeve = spec.armour ? spec.top : spec.top;
  const arms = [
    Ln(-7, sh, handL[0], handL[1], 4.6, sleeve),
    Ln(7, sh, handR[0], handR[1], 4.6, sleeve),
    C(handL[0], handL[1], 2.6, spec.armour ? spec.trim : spec.skin),
    C(handR[0], handR[1], 2.6, spec.armour ? spec.trim : spec.skin),
  ];

  // head
  const hy = -42 + by;
  const faceImg = spec.faceKey ? FACES[spec.faceKey] : null;
  const head = [];
  const hair = [];
  if (!faceImg) {
    head.push(C(0, hy, 8.6, spec.skin));
    switch (spec.style) {
      case 'braid': hair.push(P([-8.6, hy - 1, -6, hy - 8, 2, hy - 9.6, 8.4, hy - 4, 8.6, hy - 1.5, 3, hy - 5.5, -3, hy - 4.5], spec.hair)); break;
      case 'short': hair.push(P([-8.8, hy, -7, hy - 7.5, 0, hy - 10, 7.5, hy - 7, 8.8, hy - 2, 4, hy - 6, -4, hy - 5.6], spec.hair)); break;
      case 'messy': hair.push(P([-9.4, hy + 1, -8.5, hy - 7, -3, hy - 11, 2, hy - 9.5, 6, hy - 11, 9.4, hy - 4, 8.8, hy - 1, 4, hy - 6, -3, hy - 5], spec.hair)); break;
      case 'long': hair.push(P([-9.2, hy + 4, -8.5, hy - 6, 0, hy - 10.4, 8.5, hy - 6, 9.2, hy + 2, 6, hy - 4, -4, hy - 5], spec.hair)); break;
      case 'bun': hair.push(C(-6.5, hy - 6.5, 4, spec.hair)); hair.push(P([-8.8, hy, -7, hy - 7.5, 0, hy - 9.8, 7.5, hy - 7, 8.6, hy - 1, 3, hy - 5.5, -4, hy - 5], spec.hair)); break;
      case 'cap': hair.push({ t: 'q', x: 0, y: hy - 2, r: 9.2, col: spec.cap }); hair.push(R(2, hy - 3.2, 11, 3, 1.5, spec.cap)); break;
      case 'hardhat': hair.push({ t: 'q', x: 0, y: hy - 3, r: 9.6, col: spec.hat }); hair.push(R(-11, hy - 4, 22, 3, 1.5, spec.hat)); break;
    }
  }
  // scarf / dupatta for Asha
  const scarf = [];
  if (spec.scarf) {
    const fl = Math.sin(t * 2 + seed) * 1.2;
    scarf.push(P([-8, -34 + by, 8, -34 + by, 8.5, -29 + by, -2, -21 + by, -10 - fl, -12 + by, -11 - fl, -18 + by], spec.scarf));
  }
  if (spec.vest) scarf.push(R(-6.5, -32 + by, 13, 15, 3, spec.top === '#ffcf3f' ? '#ffcf3f' : '#ff6b3d', { noOutline: true, inner: true }));
  if (spec.border) torso.push(R(-11, -5 + by * 0.2, 22, 3, 1, spec.border, { noOutline: true }));

  // props
  const prop = [];
  const p = opts.prop;
  if (p === 'drum') { // big blue drum standing beside
    prop.push(R(-31, -22, 17, 22, 4, '#2a7cff'));
    prop.push(R(-32, -23.5, 19, 4, 2, '#1d5bb8'));
  } else if (p === 'cans') {
    prop.push(R(handR[0] - 4, handR[1], 9, 11, 2.5, '#ffcf3f'));
    prop.push(R(handL[0] - 5, handL[1], 9, 11, 2.5, '#2fb5a6'));
  } else if (p === 'can') {
    prop.push(R(handR[0] - 4.5, handR[1], 9, 11, 2.5, opts.propCol || '#2fb5a6'));
  } else if (p === 'pot') {
    prop.push(E(handR[0] + 2, handR[1] + 4, 6.5, 5.5, '#c7ccd6'));
    prop.push(R(handR[0] - 3, handR[1] - 2, 10, 3, 1.5, '#9aa2b1'));
  } else if (p === 'potFloor') {
    prop.push(E(15, -5, 7.5, 5.5, '#c7ccd6'));
    prop.push(R(9, -11, 12, 3, 1.5, '#9aa2b1'));
  } else if (p === 'tablet') {
    prop.push(R(handR[0] - 1, handR[1] - 9, 9, 12, 2, '#1b2742'));
  } else if (p === 'phone') {
    prop.push(R(handR[0] - 1, handR[1] - 7, 5, 8, 1.4, '#1b2742'));
  } else if (p === 'hammer') {
    const ax = handR[0], ay = handR[1];
    const ang = opts.hammerA ?? 0.3;
    const hx = ax + Math.sin(ang) * 10, hy2 = ay + Math.cos(ang) * 10;
    prop.push(Ln(ax, ay, hx, hy2, 2.6, '#7a5a3a'));
    prop.push({ t: 'r', x: hx - 7, y: hy2 - 4, w: 14, h: 9, r: 2, col: '#a8b0bf' });
  } else if (p === 'bucket') {
    prop.push(P([handR[0] - 5, handR[1] + 1, handR[0] + 5, handR[1] + 1, handR[0] + 4, handR[1] + 11, handR[0] - 4, handR[1] + 11], '#e07a5f'));
  } else if (p === 'folder') {
    prop.push(R(handR[0] - 2, handR[1] - 10, 10, 13, 1.5, '#f4ead6'));
  } else if (p === 'wrench') {
    prop.push(Ln(handR[0], handR[1], handR[0] + 6, handR[1] - 9, 2.6, '#a8b0bf'));
  }

  const all = [...behind, ...legs, ...torso, ...arms, ...scarf, ...head, ...hair, ...prop];
  run(ctx, all, o);

  // face (drawn last, no outline)
  if (faceImg && faceImg.complete && faceImg.naturalWidth > 0) {
    const fw = 22 * (spec.s || 1);
    const fh = (faceImg.naturalHeight / faceImg.naturalWidth) * fw;
    ctx.save();
    ctx.shadowColor = 'rgba(24, 32, 58, 0.45)';
    ctx.shadowBlur = o * 2.5;
    ctx.drawImage(faceImg, -fw / 2, hy - fh / 2 - 1, fw, fh);
    ctx.restore();
  } else if (!faceImg) {
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    const blink = Math.sin(t * 0.9 + seed * 5) > 0.985;
    const ex = 1.8;
    if (blink) { ctx.fillRect(ex - 4, hy - 0.6, 2.4, 0.9); ctx.fillRect(ex + 1.6, hy - 0.6, 2.4, 0.9); }
    else { ctx.beginPath(); ctx.arc(ex - 2.8, hy - 0.4, 1.15, 0, 7); ctx.arc(ex + 2.8, hy - 0.4, 1.15, 0, 7); ctx.fill(); }
    if (spec.glasses) {
      ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(ex - 2.8, hy - 0.4, 2.4, 0, 7); ctx.moveTo(ex + 5.2, hy - 0.4); ctx.arc(ex + 2.8, hy - 0.4, 2.4, 0, 7); ctx.stroke();
    }
    ctx.lineWidth = 1.1;
    const face = opts.face || 'calm';
    ctx.beginPath();
    if (face === 'smile') ctx.arc(ex, hy + 2.4, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (face === 'worried') ctx.arc(ex, hy + 5.2, 2.2, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (face === 'shout' || face === 'open') { ctx.ellipse(ex, hy + 3.6, 1.8, face === 'shout' ? 2.2 : 1.3, 0, 0, 7); ctx.fill(); }
    else { ctx.moveTo(ex - 1.8, hy + 3.6); ctx.lineTo(ex + 1.8, hy + 3.6); }
    ctx.stroke();
    // cheek / brow when worried
    if (face === 'worried' || face === 'shout') {
      ctx.beginPath(); ctx.moveTo(ex - 4.5, hy - 3.6); ctx.lineTo(ex - 1.6, hy - 3); ctx.moveTo(ex + 4.5, hy - 3.6); ctx.lineTo(ex + 1.6, hy - 3); ctx.stroke();
    }
  }
  // stripes for Aarav
  if (spec.stripe) {
    ctx.fillStyle = spec.stripe;
    for (let i = 0; i < 3; i++) ctx.fillRect(-7, -31 + by + i * 5.5, 14, 1.6);
  }
  if (spec.tie) { ctx.fillStyle = spec.tie; ctx.fillRect(-1, -33 + by, 2, 11); }
  if (spec.lanyard) { ctx.strokeStyle = '#ff6b3d'; ctx.beginPath(); ctx.moveTo(-4, -33 + by); ctx.lineTo(0, -25 + by); ctx.lineTo(4, -33 + by); ctx.stroke(); ctx.fillStyle = '#f4ead6'; ctx.fillRect(-2, -25 + by, 4, 5); }

  // repulsor glow (Tony)
  if (spec.glow && (opts.glowA ?? 0.6) > 0) {
    const ga = opts.glowA ?? 0.6;
    for (const h of [handL, handR]) {
      const g = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 9);
      g.addColorStop(0, `rgba(220,250,255,${ga})`);
      g.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h[0], h[1], 9, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
  return { head: [x, y + (hy - 12) * s] };
}
