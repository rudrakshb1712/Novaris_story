// The "game" layer: checkpoints that come out of the story's own events.
// Every control is a real <button>, so mouse, touch and keyboard all work.
import { DISTRICTS } from './timeline.js';
import { nodePos } from './net.js';
import { EVIDENCE } from './render.js';

export function createInteractions(S, R, api) {
  const prompt = document.getElementById('prompt');
  const layer = document.getElementById('hotspots');
  let current = null;      // id of the gate/optional currently shown
  let ctl = null;          // per-interaction controller {update(dt), hotspots: [{el, pos()}]}
  let okUntil = 0;

  const sfx = (n, a) => api.sound(n, a);

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shell(tag, title, hint, opt) {
    prompt.innerHTML = '';
    prompt.append(el('span', 'p-tag' + (opt ? ' opt' : ''), tag));
    prompt.append(el('p', 'p-title', title));
    if (hint) prompt.append(el('p', 'p-hint', hint));
    const row = el('div', 'p-row');
    prompt.append(row);
    const msg = el('p', 'p-msg');
    prompt.append(msg);
    return { row, msg };
  }
  function say(msg, text, kind) { msg.textContent = text; msg.className = 'p-msg' + (kind ? ' ' + kind : ''); }
  function hotspot(label, cls = '') {
    const b = el('button', 'hs ' + cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    if (label) b.append(el('span', 'hs-label', label));
    layer.append(b);
    return b;
  }
  function press(b, fn) { b.addEventListener('click', (e) => { e.preventDefault(); fn(); }); }

  /** press-and-hold on any number of elements; keyboard Space/Enter holds too */
  function holdable(els, dur, onDone, onTick) {
    let holding = 0, charge = 0, fired = false;
    const down = (e) => { if (e.type === 'keydown') { if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return; } e.preventDefault(); holding++; };
    const up = (e) => { if (e.type === 'keyup' && e.key !== ' ' && e.key !== 'Enter') return; holding = 0; };
    for (const b of els) {
      b.addEventListener('pointerdown', (e) => { try { b.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } down(e); });
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('keydown', down); b.addEventListener('keyup', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', (e) => e.preventDefault());
    }
    return {
      get charge() { return charge; },
      update(dt) {
        if (fired) return;
        const was = charge;
        charge = holding ? Math.min(1, charge + dt / dur) : Math.max(0, charge - dt * 1.4);
        if (holding && Math.floor(charge * 8) !== Math.floor(was * 8)) sfx('charge', charge);
        onTick && onTick(charge, holding > 0, was);
        if (charge >= 1) { fired = true; onDone(); }
      },
    };
  }

  // ---------------- builders ----------------
  const B = {
    tap() {
      const { row, msg } = shell('YOUR MOVE', 'Shake the tap', 'Two hours in the queue. Give the old tap a shake: click it in the scene or use the button.');
      const btn = el('button', 'btn btn-paper', 'Shake the tap'); row.append(btn);
      const hs = hotspot('TAP');
      let n = 0, finished = false;
      const lines = ['A few drops fell…', 'One more drop…', 'Then nothing.'];
      const go = () => {
        if (finished) return;
        n++;
        S.cp.tapT = S.t;
        sfx('clank');
        const drops = [3, 1, 0][Math.min(2, n - 1)];
        for (let i = 0; i < drops; i++) setTimeout(() => { R.burst('city', 'drop', 161.5, -29, 1); sfx('drip'); }, 160 + i * 260);
        say(msg, lines[Math.min(2, n - 1)], n >= 3 ? 'bad' : '');
        if (n >= 3) { finished = true; btn.classList.add('done'); setTimeout(() => api.complete('tap'), 900); }
      };
      press(btn, go); press(hs, go);
      return { hotspots: [{ el: hs, pos: () => R.project(158, -40) }] };
    },

    override() {
      const { row, msg } = shell('YOUR MOVE', 'Restore Shantinagar\'s water', 'You are at Meera\'s console. The system cut Shantinagar\'s allocation again. Override it.');
      const btn = el('button', 'btn btn-term', '> OVERRIDE  allocation · SHANTINAGAR  ↵'); row.append(btn);
      let n = 0, finished = false;
      press(btn, () => {
        if (finished) return;
        n++;
        S.cp.deniedT = S.t; S.cp.overrideReach = 1;
        sfx('denied');
        if (n === 1) say(msg, 'ACCESS DENIED. Emergency optimisation active. Manual changes require Central Authority approval.', 'bad');
        else {
          finished = true;
          setTimeout(() => { S.cp.flickT = S.t; sfx('glitch'); say(msg, 'ACCESS DENIED again. Then the screen flickered…', 'bad'); }, 450);
          btn.classList.add('done');
          setTimeout(() => api.complete('override'), 1800);
        }
      });
      return { hotspots: [] };
    },

    choice() {
      const { row, msg } = shell('YOUR CHOICE', 'What does Novaris need?', 'Thor offers to call the rain. Bruce isn\'t sure. Pick one.');
      const rain = el('button', 'btn btn-warm', '<img class="btn-avatar" src="/assets/avengers/thor.png?v=2" alt="Thor" /> Summon rain');
      const find = el('button', 'btn btn-blue', '<img class="btn-avatar" src="/assets/avengers/iron%20man.png?v=2" alt="Tony" /> Find the source');
      row.append(rain, find);
      let finished = false;
      press(rain, () => {
        if (finished) return;
        S.cp.rainT = S.t; sfx('rain'); rain.classList.add('done');
        say(msg, 'Rain fell on broken pipes and empty storage, and ran into the drains. Shantinagar\'s tap: +0 litres. The drought is only the pressure.', 'bad');
        find.classList.add('lit'); find.focus({ preventScroll: true });
      });
      press(find, () => {
        if (finished) return;
        finished = true; sfx('choose'); find.classList.remove('lit');
        say(msg, 'Right: the real problem is who decides where the water goes.', 'good');
        setTimeout(() => api.complete('choice'), 900);
      });
      return { hotspots: [] };
    },

    brace() {
      const { row, msg } = shell('PRESS AND HOLD', 'Hold the beam', '<span style="display:inline-flex;align-items:center;gap:6px"><img class="prompt-avatar" src="/assets/avengers/thor.png?v=2" alt="Thor" /> The machine is tearing bolts from the wall. Hold so Thor can brace the support beam.</span>');
      const btn = el('button', 'btn btn-paper hold', '<i class="fill"></i><span>Hold to brace</span>'); row.append(btn);
      const hs = hotspot('HOLD', 'small');
      const fill = btn.querySelector('.fill');
      const h = holdable([btn, hs], 1.5, () => { S.cp.braceCharge = 1; sfx('success'); say(msg, 'Thor holds. The beam stops moving.', 'good'); R.burst('city', 'spark', 870, 600, 14); setTimeout(() => api.complete('brace'), 700); },
        (c, holding, was) => { S.cp.braceCharge = c; fill.style.transform = `scaleX(${c})`; if (!holding && was > 0.15 && c < was && c > 0.05) say(msg, 'Keep holding: the beam is still moving.'); });
      return { hotspots: [{ el: hs, pos: () => R.project(880, 905) }], update: (dt) => h.update(dt) };
    },

    valve() {
      const { row, msg } = shell('TIMING', 'Ease the pressure', '<span style="display:inline-flex;align-items:center;gap:6px"><img class="prompt-avatar" src="/assets/avengers/bruce(hulk).png?v=2" alt="Bruce" /> Bruce is turning the balancing valve. Press when the needle swings into the green.</span>');
      const g = el('div', 'gauge');
      g.innerHTML = `<svg viewBox="0 0 104 64" aria-hidden="true"><path d="M8 58 A44 44 0 0 1 96 58" fill="none" stroke="#f4ead6" stroke-width="10"/><path d="M52 14 A44 44 0 0 1 86.3 30.6" fill="none" stroke="#36b86a" stroke-width="10"/><path d="M86.3 30.6 A44 44 0 0 1 96 58" fill="none" stroke="#e2412f" stroke-width="10"/><line id="needle" x1="52" y1="58" x2="52" y2="18" stroke="#ffcf3f" stroke-width="3.5" stroke-linecap="round"/><circle cx="52" cy="58" r="5" fill="#ffcf3f"/></svg>`;
      const btn = el('button', 'btn btn-paper', 'Turn the valve now');
      g.append(btn); row.append(g);
      const needle = g.querySelector('#needle');
      let ph = 0, finished = false, val = 0;
      // needle swings smoothly from left (-1) to right (+1); the green band is 0.05..0.5
      press(btn, () => {
        if (finished) return;
        if (val > 0.02 && val < 0.53) {
          finished = true; S.cp.valveTurn = 1; sfx('success');
          say(msg, 'Pressure stabilising.', 'good');
          setTimeout(() => api.complete('valve'), 800);
        } else {
          sfx('miss');
          say(msg, val <= 0.02 ? 'Too early. Wait until the needle reaches the green.' : 'Too late, it\'s in the red. Try again on the next swing.', 'bad');
        }
      });
      return {
        hotspots: [],
        update(dt) {
          if (!finished) { ph += dt * (S.reduced ? 0.9 : 1.25); val = Math.sin(ph); }
          else val += (0.28 - val) * Math.min(1, dt * 4);
          needle.setAttribute('transform', `rotate(${val * 90} 52 58)`);
        },
      };
    },

    districts() {
      const { row, msg } = shell('YOUR MOVE', 'Hand control back to people', 'Switch three districts to local control: hospitals first, then two residential districts. Click the nodes on the map.');
      row.remove();
      const hs = DISTRICTS.map((d, i) => {
        const b = hotspot(S.reduced ? d.name : '', 'node small');
        b.setAttribute('aria-label', 'Switch ' + d.name + ' to local control');
        return b;
      });
      let homes = 0, finished = false;
      S.cp.hint = 4;
      hs.forEach((b, i) => press(b, () => {
        if (finished || S.cp.local[i]) return;
        const k = DISTRICTS[i].kind;
        if (!S.cp.local[4] && i !== 4) { sfx('miss'); S.cp.hint = 4; say(msg, 'Hospitals first: emergency supply comes before anything else.', 'bad'); return; }
        if (i !== 4 && k !== 'home') { sfx('miss'); say(msg, k === 'industry' ? 'Not yet. The factories can wait; homes can\'t.' : 'Not yet. Homes and hospitals come before luxury districts.', 'bad'); return; }
        S.cp.local[i] = true; S.cp.localCount = (S.cp.localCount || 0) + 1; b.classList.add('on'); sfx('switch');
        const g = R.hudGeom(); const [x, y] = nodePos(g.cx, g.cy, g.R, i);
        if (i === 4) { S.cp.hint = 3; say(msg, 'City Hospitals: local control. Emergency supply protected. Now two residential districts.', 'good'); }
        else { homes++; say(msg, `${DISTRICTS[i].name}: local control. ${homes < 2 ? 'One more.' : ''}`, 'good'); }
        if (S.cp.local[4] && homes >= 2) { finished = true; S.cp.hint = null; setTimeout(() => api.complete('districts'), 900); }
        void x; void y;
      }));
      return {
        hotspots: hs.map((b, i) => ({ el: b, pos: () => { const g = R.hudGeom(); return nodePos(g.cx, g.cy, g.R, i); } })),
        update() { hs.forEach((b, i) => b.classList.toggle('on', !!S.cp.local[i])); },
      };
    },

    sever() {
      const { row, msg } = shell('PRESS AND HOLD', 'Cut the Engine\'s authority', 'The valves and pumps don\'t need it. Hold to sever its central command; the safety circuit keeps the water on.');
      const btn = el('button', 'btn btn-warm hold', '<i class="fill"></i><span>Hold to sever</span>'); row.append(btn);
      const hs = hotspot('HOLD', 'small');
      const fill = btn.querySelector('.fill');
      const h = holdable([btn, hs], 1.3, () => { sfx('sever'); say(msg, 'Severed.', 'good'); setTimeout(() => api.complete('sever'), 500); },
        (c, holding, was) => { fill.style.transform = `scaleX(${c})`; if (!holding && was > 0.15 && c < was && c > 0.05) say(msg, 'Hold it a little longer.'); });
      return { hotspots: [{ el: hs, pos: () => { const g = R.hudGeom(); return [g.cx, g.cy]; } }], update: (dt) => h.update(dt) };
    },

    tracker() {
      const { row, msg } = shell('YOUR MOVE', 'Check the repair tracker', 'Every job says COMPLETED. Look at the street: is one of them still leaking? Reopen it.');
      const rows = [
        ['#0388 Old Market · pump repair', false],
        ['#0417 Shantinagar Lane 4 · leaking main', true],
        ['#0420 Eastgate · water meter', false],
      ];
      const tr = el('div', 'tracker');
      row.replaceWith(tr);
      let finished = false;
      const hs = hotspot('LEAK', 'small');
      const reopen = (stat, b) => {
        if (finished) return;
        finished = true; sfx('paper');
        stat.textContent = 'REOPENED · evidence attached'; stat.className = 't-stat re';
        if (b) b.classList.add('done');
        say(msg, 'Record corrected. A crew is on its way.', 'good');
        setTimeout(() => api.complete('tracker'), 1000);
      };
      let lane4 = null;
      for (const [name, real] of rows) {
        const r = el('div', 't-row');
        const left = el('div');
        left.append(el('div', 't-name', name));
        const stat = el('div', 't-stat ok', '✓ COMPLETED');
        left.append(stat);
        const b = el('button', 'btn btn-term', 'Still leaking?');
        b.setAttribute('aria-label', 'Report ' + name + ' as still leaking');
        press(b, () => {
          if (finished) return;
          if (real) reopen(stat, b);
          else { sfx('miss'); say(msg, 'Crew photo and sensor readings match. That one really is fixed.', 'bad'); }
        });
        if (real) lane4 = { stat, b };
        r.append(left, b); tr.append(r);
      }
      press(hs, () => lane4 && reopen(lane4.stat, lane4.b));
      return { hotspots: [{ el: hs, pos: () => R.project(430, -4) }] };
    },

    evidence() {
      const { row, msg } = shell('OPTIONAL', 'Gather the evidence', 'Tap the glowing spots: the allocation notice, the dry tap, the denied request.', true);
      row.remove();
      S.cp.evidence = S.cp.evidence || [];
      const names = { notice: 'NOTICE', tap: 'DRY TAP', terminal: 'DENIED' };
      const spots = Object.keys(EVIDENCE).map((id) => {
        const b = hotspot(names[id], 'small');
        if (S.cp.evidence.includes(id)) b.classList.add('hidden');
        press(b, () => {
          if (S.cp.evidence.includes(id)) return;
          S.cp.evidence.push(id); b.classList.add('hidden'); sfx('paper');
          R.burst('city', 'spark', EVIDENCE[id][0], EVIDENCE[id][1], 8);
          const n = S.cp.evidence.length;
          say(msg, n < 3 ? `Collected ${n}/3.` : 'All three collected. Asha has her case.', 'good');
        });
        return { el: b, pos: () => R.project(EVIDENCE[id][0], EVIDENCE[id][1]) };
      });
      if (S.cp.evidence.length) say(msg, `Collected ${S.cp.evidence.length}/3.`, 'good');
      return { hotspots: spots };
    },
  };

  function clear() {
    layer.innerHTML = '';
    prompt.innerHTML = '';
    ctl = null;
  }

  function showOk(id) {
    clear();
    prompt.append(el('span', 'p-tag ok', 'DONE'));
    prompt.append(el('p', 'p-hint', 'Tap screen or press Space to continue the story ▶'));
    current = 'ok:' + id;
    okUntil = S.u + 0.45;
  }

  /** called every frame with the id that should be shown (gate id, optional id, or null) */
  function update(want, dt) {
    if (current && current.startsWith('ok:') && !want && S.u < okUntil && S.u > okUntil - 1) {
      prompt.hidden = false;
      return;
    }
    if (want !== current) {
      clear();
      current = want;
      if (want && B[want]) ctl = B[want]();
    }
    prompt.hidden = !current;
    if (!ctl) return;
    try { ctl.update && ctl.update(dt); } catch (e) { console.error(e); }
    for (const h of ctl.hotspots || []) {
      const p = h.pos();
      if (!p) { h.el.style.display = 'none'; continue; }
      h.el.style.display = '';
      h.el.style.left = p[0] + 'px';
      h.el.style.top = p[1] + 'px';
    }
  }

  return { update, showOk, nudge() { prompt.classList.remove('nudge'); void prompt.offsetWidth; prompt.classList.add('nudge'); }, reset() { clear(); current = null; } };
}
