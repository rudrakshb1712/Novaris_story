export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const ease = (a, b, v) => smooth(inv(a, b, v));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0→1 across [a,a+f], 1 until b-f, →0 at b */
export const win = (a, b, v, f = 0.25) => Math.min(ease(a, a + f, v), 1 - ease(b - f, b, v));

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
export function mixHex(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = (x, y) => Math.round(lerp(x, y, t)).toString(16).padStart(2, '0');
  return '#' + r(a[0], b[0]) + r(a[1], b[1]) + r(a[2], b[2]);
}

/** keyframes: [[u, value]...] numeric or arrays */
export function keyed(frames, u) {
  if (u <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [u1, v1] = frames[i];
    if (u <= u1) {
      const [u0, v0] = frames[i - 1];
      const t = smooth((u - u0) / (u1 - u0 || 1));
      if (Array.isArray(v0)) return v0.map((x, k) => (typeof x === 'string' ? mixHex(x, v1[k], t) : lerp(x, v1[k], t)));
      if (typeof v0 === 'string') return mixHex(v0, v1, t);
      return lerp(v0, v1, t);
    }
  }
  return frames[frames.length - 1][1];
}

/** Catmull-Rom through keyframes [{u,x,y,z}] → continuous camera with no stops */
export function spline(keys, u) {
  if (u <= keys[0].u) return { ...keys[0] };
  const n = keys.length;
  if (u >= keys[n - 1].u) return { ...keys[n - 1] };
  let i = 0;
  while (i < n - 2 && u > keys[i + 1].u) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const t = (u - p1.u) / (p2.u - p1.u);
  // gentle in/out per segment keeps motion fluid but never jerky
  const s = t;
  const cr = (a, b, c, d) => {
    const t2 = s * s, t3 = t2 * s;
    return 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  };
  // zoom interpolated in log space so push-ins feel even
  const lz = cr(Math.log(p0.z), Math.log(p1.z), Math.log(p2.z), Math.log(p3.z));
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), z: Math.exp(lz) };
}

/** deterministic hash noise */
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
/** smooth wobble: sum of sines, never random per frame */
export function wobble(t, seed = 0) {
  return Math.sin(t * 13.1 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2.1) * 0.3 + Math.sin(t * 23.7 + seed * 0.7) * 0.2;
}
