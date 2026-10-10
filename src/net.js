// The visual thread: Suryasagar (the circle) and its nine mains.
// As spokes it is a public network; folded into a {9/4} star it becomes the Thirst Engine's cage.
import { lerp, mixHex, clamp } from './util.js';
import { DISTRICTS } from './timeline.js';

const N = 9;
export function nodePos(cx, cy, R, i) {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / N;
  return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
}

/**
 * st: { star, alloc[9], violet, local[9], ring, level(0..1), drop, col, lw, t, broken, labels, hot, red, dim, font }
 */
export function drawNet(ctx, cx, cy, R, st) {
  const t = st.t || 0;
  const lw = st.lw || 1;
  const star = clamp(st.star || 0);
  const vio = clamp(st.violet || 0);
  const red = clamp(st.red || 0);
  const base = st.col || '#5fb4ff';
  const r0 = R * 0.26;
  const nodes = [], inner = [];
  for (let i = 0; i < N; i++) {
    nodes.push(nodePos(cx, cy, R, i));
    inner.push(nodePos(cx, cy, r0, i));
  }
  ctx.save();
  ctx.lineCap = 'round';

  // ring main: the resilient loop that lets districts share
  if ((st.ring || 0) > 0.01) {
    ctx.strokeStyle = base;
    ctx.globalAlpha = st.ring;
    ctx.lineWidth = 2.2 * lw;
    ctx.setLineDash([10 * lw, 6 * lw]);
    ctx.lineDashOffset = -t * 12 * lw;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // the nine lines
  for (let i = 0; i < N; i++) {
    const j = (i + 4) % N;
    const sI = st.local ? star * (1 - clamp(st.local[i])) : star; // a freed line unfolds back into a spoke
    const ax = lerp(inner[i][0], nodes[i][0], sI), ay = lerp(inner[i][1], nodes[i][1], sI);
    const bx = lerp(nodes[i][0], nodes[j][0], sI), by = lerp(nodes[i][1], nodes[j][1], sI);
    const al = st.alloc ? st.alloc[i] : 0.55;
    const loc = st.local ? st.local[i] : 0;
    let col = mixHex(base, '#9b5cff', vio);
    col = mixHex(col, '#ff4d3a', red * (i === 3 || DISTRICTS[i].kind === 'home' ? 1 : 0.3));
    col = mixHex(col, '#7cc4ff', loc);
    const w = (1.4 + al * 6.5 * (1 - sI * 0.5) + sI * 1.6) * lw;
    // outline for print feel
    ctx.strokeStyle = 'rgba(10,14,30,0.55)';
    ctx.lineWidth = w + 2.4 * lw;
    if (i === 3 && st.broken > 0.01) ctx.setLineDash([R * 0.09, R * 0.05 * st.broken]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    // flow
    if (sI < 0.6 && al > 0.08) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, w * 0.35);
      ctx.setLineDash([2 * lw, 10 * lw]);
      ctx.lineDashOffset = -t * (10 + al * 50) * lw;
      ctx.globalAlpha = 1 - sI / 0.6;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  // reservoir (the circle) with real water level
  const lev = clamp(st.level ?? 0.18);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = mixHex('#0d1a33', '#1a0d33', vio);
  ctx.fillRect(cx - r0, cy - r0, r0 * 2, r0 * 2);
  const wy = cy + r0 - lev * 2 * r0;
  ctx.fillStyle = mixHex('#2a7cff', '#8a4dff', vio);
  ctx.beginPath();
  ctx.moveTo(cx - r0, wy);
  for (let k = 0; k <= 12; k++) {
    const x = cx - r0 + (k / 12) * 2 * r0;
    ctx.lineTo(x, wy + Math.sin(k * 0.9 + t * 2) * r0 * 0.03);
  }
  ctx.lineTo(cx + r0, cy + r0); ctx.lineTo(cx - r0, cy + r0); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = mixHex(base, '#c8a7ff', vio);
  ctx.lineWidth = 2.6 * lw;
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.stroke();

  // the eye
  if (vio > 0.02) {
    ctx.globalAlpha = vio;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 1.6);
    g.addColorStop(0, 'rgba(200,160,255,0.9)');
    g.addColorStop(0.35, 'rgba(138,77,255,0.5)');
    g.addColorStop(1, 'rgba(138,77,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r0 * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0614';
    ctx.beginPath(); ctx.ellipse(cx, cy, r0 * 0.22, r0 * 0.62, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // the drop
  if ((st.drop || 0) > 0.01) {
    const d = st.drop;
    const s = r0 * 0.7 * d;
    ctx.fillStyle = '#e9f4ff';
    ctx.strokeStyle = '#18203a';
    ctx.lineWidth = 2 * lw;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.25);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.1, cx + s * 0.8, cy + s * 0.8, cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 0.8, cy + s * 0.8, cx - s * 0.9, cy - s * 0.1, cx, cy - s * 1.25);
    ctx.fill(); ctx.stroke();
  }

  // nodes
  for (let i = 0; i < N; i++) {
    const [x, y] = nodes[i];
    const loc = st.local ? st.local[i] : 0;
    const rr = (i === 3 ? 6.5 : 5) * lw;
    ctx.fillStyle = loc > 0.5 ? '#7cc4ff' : mixHex('#f4ead6', '#c8a7ff', vio);
    ctx.strokeStyle = '#18203a';
    ctx.lineWidth = 2 * lw;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.stroke();
    if (DISTRICTS[i].kind === 'hospital') {
      ctx.fillStyle = '#e2412f';
      ctx.fillRect(x - rr * 0.6, y - rr * 0.18, rr * 1.2, rr * 0.36);
      ctx.fillRect(x - rr * 0.18, y - rr * 0.6, rr * 0.36, rr * 1.2);
    }
    if (st.hot === i) {
      ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2.5 * lw;
      ctx.beginPath(); ctx.arc(x, y, rr + 5 * lw + Math.sin(t * 5) * 1.5 * lw, 0, 7); ctx.stroke();
    }
  }
  if (st.labels) {
    ctx.font = `700 ${st.font || 11}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < N; i++) {
      const [x, y] = nodes[i];
      const dx = x - cx, dy = y - cy;
      const m = Math.hypot(dx, dy) || 1;
      const off = st.labelOff || 16 * lw;
      const lx = x + (dx / m) * off, ly = y + (dy / m) * off * 0.85;
      ctx.textAlign = dx > 8 ? 'left' : dx < -8 ? 'right' : 'center';
      const txt = DISTRICTS[i].name.toUpperCase();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,14,30,0.85)';
      ctx.strokeText(txt, lx, ly);
      ctx.fillStyle = i === 3 ? '#ffcf3f' : '#e9f0ff';
      ctx.fillText(txt, lx, ly);
    }
  }
  ctx.restore();
}
