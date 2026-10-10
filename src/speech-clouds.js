// Interactive Comic Speech Clouds controller
// Anchors dynamic speech bubbles directly over characters' heads with tails pointing to mouths.

import { clamp } from './util.js';

export const SPEAKERS = {
  ASHA: {
    tag: 'ASHA',
    col: '#E65100',
    bg: 'rgba(230, 81, 0, 0.12)',
    border: 'rgba(230, 81, 0, 0.4)',
    initials: 'AS',
  },
  AARAV: {
    tag: 'AARAV',
    col: '#D97706',
    bg: 'rgba(217, 119, 6, 0.14)',
    border: 'rgba(217, 119, 6, 0.45)',
    initials: 'AR',
  },
  TONY: {
    tag: 'STARK',
    col: '#00B4D8',
    bg: 'rgba(0, 180, 216, 0.12)',
    border: 'rgba(0, 180, 216, 0.4)',
    avatar: '/assets/avengers/iron%20man.png?v=2',
    initials: 'TS',
  },
  IRONMAN: {
    tag: 'STARK',
    col: '#00B4D8',
    bg: 'rgba(0, 180, 216, 0.12)',
    border: 'rgba(0, 180, 216, 0.4)',
    avatar: '/assets/avengers/iron%20man.png?v=2',
    initials: 'TS',
  },
  BRUCE: {
    tag: 'BRUCE',
    col: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.12)',
    border: 'rgba(22, 163, 74, 0.4)',
    avatar: '/assets/avengers/bruce(hulk).png?v=2',
    initials: 'BB',
  },
  THOR: {
    tag: 'THOR',
    col: '#CA8A04',
    bg: 'rgba(202, 138, 4, 0.14)',
    border: 'rgba(202, 138, 4, 0.45)',
    avatar: '/assets/avengers/thor.png?v=2',
    initials: 'TH',
  },
  MEERA: {
    tag: 'MEERA',
    col: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.4)',
    initials: 'ME',
  },
  FRIDAY: {
    tag: 'F.R.I.D.A.Y.',
    col: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    border: 'rgba(5, 150, 105, 0.4)',
    initials: 'AI',
    transmission: true,
  },
  TECHNICIAN: {
    tag: 'TECH',
    col: '#64748B',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.35)',
    initials: 'TC',
  },
  ENGINEER: {
    tag: 'ENGINEER',
    col: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.35)',
    initials: 'EN',
  },
  RESIDENT: {
    tag: 'RESIDENT',
    col: '#64748B',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.35)',
    initials: 'RS',
  },
  ELDER: {
    tag: 'NEIGHBOUR',
    col: '#9333EA',
    bg: 'rgba(147, 51, 234, 0.12)',
    border: 'rgba(147, 51, 234, 0.35)',
    initials: 'NB',
  },
  'THE VOICE': {
    tag: 'AQUA-9',
    col: '#9333EA',
    bg: 'rgba(147, 51, 234, 0.14)',
    border: 'rgba(147, 51, 234, 0.4)',
    initials: 'AI',
    transmission: true,
  },
  'THE THIRST ENGINE': {
    tag: 'THIRST ENGINE',
    col: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.14)',
    border: 'rgba(220, 38, 38, 0.45)',
    initials: 'TE',
    transmission: true,
  },
};

export function createSpeechClouds(container, R, S) {
  let layer = document.getElementById('comic-bubbles-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'comic-bubbles-layer';
    layer.className = 'comic-bubbles-layer';
    container.appendChild(layer);
  }

  // Pool of active bubble DOM nodes
  const activeClouds = new Map();
  let currentKey = '';
  let activeDialogue = null;

  function getSpeakerMeta(who) {
    const key = (who || '').toUpperCase().trim();
    return SPEAKERS[key] || {
      tag: who.toUpperCase(),
      col: '#4B5563',
      bg: 'rgba(75, 85, 99, 0.12)',
      border: 'rgba(75, 85, 99, 0.35)',
      initials: who.slice(0, 2).toUpperCase(),
    };
  }

  function createCloudElement(who, text, isTransmission = false) {
    const meta = getSpeakerMeta(who);
    const el = document.createElement('div');
    el.className = `comic-speech-cloud bubble-pop ${isTransmission ? 'transmission-cloud' : ''}`;

    const avatarHtml = meta.avatar
      ? `<img class="comic-cloud-avatar" src="${meta.avatar}" alt="${meta.tag}" />`
      : `<span class="comic-cloud-initials" style="background:${meta.bg}; color:${meta.col}; border-color:${meta.border}">${meta.initials}</span>`;

    el.innerHTML = `
      <div class="comic-cloud-header">
        ${avatarHtml}
        <span class="comic-speaker-tag" style="color:${meta.col}; background:${meta.bg}; border-color:${meta.border}">
          ${meta.tag}
        </span>
      </div>
      <div class="comic-cloud-body">${text}</div>
    `;
    return el;
  }

  // Fallback world positions for characters across different chapters
  function getFallbackWorldPos(who, u) {
    const key = (who || '').toUpperCase();
    if (key === 'ASHA') {
      if (u < 9.5) return [172, 0];
      if (u < 26.5) return [172, 0];
      if (u < 42) return [228, 0];
      if (u < 48) return [880, 0];
      return [198, 0];
    }
    if (key === 'AARAV') {
      if (u < 9.5) return [198, 0];
      if (u < 26.5) return [198, 0];
      if (u < 42) return [452, 0];
      return [172, 0];
    }
    if (key === 'TONY' || key === 'STARK' || key === 'IRONMAN') {
      if (u >= 15 && u < 21) return [70, 0];
      if (u >= 28 && u < 38) return [1115, 930];
      return [1032, -14];
    }
    if (key === 'BRUCE') {
      if (u >= 15 && u < 21) return [112, 0];
      if (u >= 28 && u < 38) return [1222, 930];
      return [1068, -14];
    }
    if (key === 'THOR') {
      if (u >= 15 && u < 21) return [175, 0];
      if (u >= 28 && u < 38) return [870, 930];
      return [1180, 0];
    }
    if (key === 'MEERA') {
      if (u < 15) return [945, 470];
      if (u >= 28 && u < 38) return [1165, 930];
      return [990, -14];
    }
    if (key === 'ENGINEER') return [262, 0];
    if (key === 'TECHNICIAN' || key === 'TECH') return [1090, 470];
    if (key === 'RESIDENT' || key === 'ELDER') return [226, 0];
    return null;
  }

  function positionCloud(el, who, isTransmission) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const isMobile = W <= 720;
    const bubbleW = Math.min(isMobile ? 260 : 310, W - 32);

    el.style.width = bubbleW + 'px';

    if (isTransmission) {
      // Transmission clouds (FRIDAY, AQUA-9) anchor nicely near top-center or HUD
      const left = Math.round(W / 2 - bubbleW / 2);
      const top = isMobile ? 86 : 74;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.classList.add('no-tail');
      return;
    }

    let fig = R.getFigure ? R.getFigure(who) : null;
    let mouthX = null, mouthY = null, headX = null, headY = null, feetY = null, facing = 1;

    if (fig && fig.visible) {
      mouthX = fig.mouthX;
      mouthY = fig.mouthY;
      headX = fig.headX;
      headY = fig.headY;
      feetY = fig.feetY;
      facing = fig.facing;
    } else {
      // Try projecting world fallback
      const worldPos = getFallbackWorldPos(who, S.u);
      if (worldPos && R.w2s) {
        const screenPos = R.w2s(worldPos[0], worldPos[1]);
        if (screenPos) {
          mouthX = screenPos[0];
          mouthY = screenPos[1] - 42;
          headX = screenPos[0];
          headY = screenPos[1] - 52;
          feetY = screenPos[1];
        }
      }
    }

    // If completely off-screen, fall back to safe bottom-left/dock area
    if (mouthX == null || mouthY == null || mouthX < -100 || mouthX > W + 100) {
      const left = isMobile ? 16 : 56;
      const top = Math.round(H * 0.55);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.classList.add('no-tail');
      return;
    }

    el.classList.remove('no-tail');

    const bubbleH = el.offsetHeight || (isMobile ? 76 : 86);
    const tailHeight = 15;
    const minTop = isMobile ? 74 : 64;

    // Check vertical positioning
    let top = headY - bubbleH - tailHeight - 8;
    let isFlipped = false;

    if (top < minTop) {
      // Too close to top of viewport: flip below character
      top = (mouthY || headY) + 24 + tailHeight;
      isFlipped = true;

      // If flipping below pushes it off the bottom screen edge, tuck it neatly beside face
      if (top + bubbleH > H - 18) {
        top = clamp(minTop, H - bubbleH - 18, headY - bubbleH * 0.5);
      }
    }

    // Horizontal positioning & alignment
    const targetCenter = mouthX + (facing > 0 ? 18 : -18);
    let left = targetCenter - bubbleW / 2;

    // Clamp horizontally to stay inside viewport safely
    const padding = 16;
    left = Math.max(padding, Math.min(W - bubbleW - padding, left));

    // Tail pointer positioning relative to bubble body
    const tailOffset = mouthX - left;
    const clampedTail = Math.max(26, Math.min(bubbleW - 26, tailOffset));

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.setProperty('--tail-left', `${Math.round(clampedTail)}px`);
    el.classList.toggle('tail-up', isFlipped);
  }

  function update(u, currentBeat, beatEnd) {
    // Check if current beat has dialogue
    let targetLines = null;
    let beatU = 0;
    let endU = beatEnd || u + 0.8;

    if (currentBeat) {
      if (currentBeat.kind === 'line' && Array.isArray(currentBeat.lines) && currentBeat.lines.length > 0) {
        targetLines = currentBeat.lines;
        beatU = currentBeat.u;
      } else if (currentBeat.kind === 'sys' && currentBeat.after) {
        targetLines = [currentBeat.after];
        beatU = currentBeat.u;
      }
    }

    if (!targetLines || targetLines.length === 0) {
      // Fade out and clear existing bubbles
      if (activeClouds.size > 0) {
        for (const [key, el] of activeClouds) {
          el.classList.add('fade-out');
          setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 240);
        }
        activeClouds.clear();
      }
      currentKey = '';
      activeDialogue = null;
      return;
    }

    // Sequential multi-line progression based on scroll inside beat
    const span = Math.max(0.1, endU - beatU);
    const progress = clamp((u - beatU) / span, 0, 0.999);
    const activeIndex = Math.min(targetLines.length - 1, Math.floor(progress * targetLines.length));

    const [who, text] = targetLines[activeIndex];
    const speakerMeta = getSpeakerMeta(who);
    const isTransmission = !!speakerMeta.transmission;

    const dialogueKey = `${currentBeat.u}_${activeIndex}_${who}`;

    let cloudEl = activeClouds.get(dialogueKey);
    if (!cloudEl) {
      // Clean up previous bubbles with a smooth fade
      for (const [key, el] of activeClouds) {
        el.classList.add('fade-out');
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 220);
      }
      activeClouds.clear();

      cloudEl = createCloudElement(who, text, isTransmission);
      layer.appendChild(cloudEl);
      activeClouds.set(dialogueKey, cloudEl);
    }

    // Keep position synchronized with camera & character on every frame
    positionCloud(cloudEl, who, isTransmission);
  }

  function clear() {
    for (const [, el] of activeClouds) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    activeClouds.clear();
    currentKey = '';
    activeDialogue = null;
  }

  return {
    update,
    clear,
    getSpeakerMeta,
  };
}
