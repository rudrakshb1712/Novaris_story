// Flying Iron Man Cursor with flight physics, animated thrusters, and repulsor effects.
import { clamp, lerp } from './util.js';

export function createIronManCursor(options = {}) {
  // Only activate on devices with fine pointer (mouse/trackpad)
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) {
    return { destroy: () => {} };
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Root container
  const container = document.createElement('div');
  container.id = 'ironman-cursor-container';
  container.setAttribute('aria-hidden', 'true');

  container.innerHTML = `
    <div id="im-reticle">
      <div class="im-reticle-ring"></div>
      <div class="im-reticle-dot"></div>
      <div class="im-reticle-cross"></div>
    </div>
    <div id="im-figure">
      <svg viewBox="-30 -42 60 92" class="im-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Arc reactor glow -->
          <radialGradient id="im-arc-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="35%" stop-color="#58d5ff" />
            <stop offset="70%" stop-color="#00a2ff" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#0080ff" stop-opacity="0" />
          </radialGradient>
          <!-- Eye glow -->
          <filter id="im-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <!-- Thruster flame gradient -->
          <linearGradient id="im-flame-grad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="25%" stop-color="#5cedff" />
            <stop offset="55%" stop-color="#ffcf3f" />
            <stop offset="85%" stop-color="#ff4d2e" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#ff2200" stop-opacity="0" />
          </linearGradient>
          <!-- Thruster core gradient -->
          <linearGradient id="im-flame-core" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="45%" stop-color="#d4f7ff" />
            <stop offset="100%" stop-color="#5cedff" stop-opacity="0" />
          </linearGradient>
          <!-- Armor metallic gradients -->
          <linearGradient id="im-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#db2832" />
            <stop offset="45%" stop-color="#be1b24" />
            <stop offset="100%" stop-color="#7a0d13" />
          </linearGradient>
          <linearGradient id="im-red-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8a1117" />
            <stop offset="100%" stop-color="#52070b" />
          </linearGradient>
          <linearGradient id="im-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffe685" />
            <stop offset="40%" stop-color="#f8be22" />
            <stop offset="100%" stop-color="#b88308" />
          </linearGradient>
        </defs>

        <!-- Thruster Exhaust Flames (Behind boots) -->
        <g id="im-thrusters">
          <!-- Left Thruster -->
          <g class="im-flame-l" transform="translate(-8.5, 25)">
            <path class="flame-outer" d="M -5 0 Q -7 18 0 28 Q 7 18 5 0 Z" fill="url(#im-flame-grad)" />
            <path class="flame-inner" d="M -2.8 0 Q -3.8 12 0 18 Q 3.8 12 2.8 0 Z" fill="url(#im-flame-core)" />
          </g>
          <!-- Right Thruster -->
          <g class="im-flame-r" transform="translate(8.5, 25)">
            <path class="flame-outer" d="M -5 0 Q -7 18 0 28 Q 7 18 5 0 Z" fill="url(#im-flame-grad)" />
            <path class="flame-inner" d="M -2.8 0 Q -3.8 12 0 18 Q 3.8 12 2.8 0 Z" fill="url(#im-flame-core)" />
          </g>
        </g>

        <!-- Iron Man Armor Body -->
        <g id="im-body" stroke="#18203a" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
          
          <!-- Back collar & neck -->
          <path d="M -6 -16 L 6 -16 L 5 -11 L -5 -11 Z" fill="url(#im-red-dark)" />

          <!-- Legs & Boots -->
          <!-- Upper thighs -->
          <path d="M -9 4 L -4 4 L -5 14 L -10 14 Z" fill="url(#im-gold)" />
          <path d="M 4 4 L 9 4 L 10 14 L 5 14 Z" fill="url(#im-gold)" />
          <!-- Shins and Knees -->
          <path d="M -10.5 13 L -4.5 13 L -4 21 L -11 21 Z" fill="url(#im-red)" />
          <path d="M 4.5 13 L 10.5 13 L 11 21 L 4 21 Z" fill="url(#im-red)" />
          <!-- Knee guards (Gold) -->
          <rect x="-9" y="12" width="4.5" height="3.5" rx="1" fill="url(#im-gold)" />
          <rect x="4.5" y="12" width="4.5" height="3.5" rx="1" fill="url(#im-gold)" />
          <!-- Boots & Thruster Nozzles -->
          <path d="M -11.5 21 L -4 21 L -5.5 25.5 L -10.5 25.5 Z" fill="url(#im-red-dark)" />
          <path d="M 4 21 L 11.5 21 L 10.5 25.5 L 5.5 25.5 Z" fill="url(#im-red-dark)" />
          <ellipse cx="-8.2" cy="25.5" rx="3.2" ry="1.2" fill="#364156" />
          <ellipse cx="8.2" cy="25.5" rx="3.2" ry="1.2" fill="#364156" />
          <ellipse cx="-8.2" cy="25.5" rx="1.6" ry="0.6" fill="#58d5ff" />
          <ellipse cx="8.2" cy="25.5" rx="1.6" ry="0.6" fill="#58d5ff" />

          <!-- Torso & Abdomen -->
          <!-- Abdomen midriff plates -->
          <path d="M -6.5 -3 L 6.5 -3 L 5.5 4 L -5.5 4 Z" fill="url(#im-gold)" />
          <path d="M -5.5 -1 L 5.5 -1" stroke="#18203a" stroke-width="0.9" />
          <path d="M -5 1.8 L 5 1.8" stroke="#18203a" stroke-width="0.9" />

          <!-- Main Chestplate -->
          <path d="M -11 -14 L 11 -14 L 8.5 -3 L -8.5 -3 Z" fill="url(#im-red)" />
          <!-- Pectoral plates contour -->
          <path d="M -10 -13 L -1 -13 L -1 -4 L -8 -4 Z" fill="url(#im-red)" />
          <path d="M 1 -13 L 10 -13 L 8 -4 L 1 -4 Z" fill="url(#im-red)" />
          <!-- Gold collar rib accents -->
          <path d="M -8 -13 L -4 -13 L -3 -9 L -7 -9 Z" fill="url(#im-gold)" />
          <path d="M 4 -13 L 8 -13 L 7 -9 L 3 -9 Z" fill="url(#im-gold)" />

          <!-- Arc Reactor Housing & Core -->
          <circle cx="0" cy="-7" r="3.4" fill="#18203a" stroke="#18203a" stroke-width="0.8" />
          <circle cx="0" cy="-7" r="2.8" fill="#0080c0" stroke="none" />
          <circle cx="0" cy="-7" r="2.2" fill="url(#im-arc-glow)" stroke="none" />
          <circle cx="0" cy="-7" r="1.1" fill="#ffffff" stroke="none" />

          <!-- Shoulders & Arms (Outstretched flight posture) -->
          <!-- Left Shoulder Pauldron -->
          <path d="M -11 -15 C -15 -15 -18 -12 -17 -7 C -14 -7 -11 -9 -11 -15 Z" fill="url(#im-gold)" />
          <!-- Right Shoulder Pauldron -->
          <path d="M 11 -15 C 15 -15 18 -12 17 -7 C 14 -7 11 -9 11 -15 Z" fill="url(#im-gold)" />

          <!-- Left Arm & Forearm reaching forward -->
          <path d="M -15 -9 L -19 -20 L -14 -22 L -11 -11 Z" fill="url(#im-red)" />
          <!-- Left Gold Gauntlet Cuff -->
          <path d="M -19 -20 L -14 -22 L -14.5 -25 L -19.5 -23 Z" fill="url(#im-gold)" />
          <!-- Left Hand / Palm Repulsor -->
          <ellipse cx="-17" cy="-24.5" rx="2.5" ry="2" fill="url(#im-red)" />
          <circle cx="-17" cy="-24.5" r="1.3" fill="#58d5ff" stroke="#ffffff" stroke-width="0.6" />

          <!-- Right Arm & Forearm reaching forward -->
          <path d="M 15 -9 L 19 -20 L 14 -22 L 11 -11 Z" fill="url(#im-red)" />
          <!-- Right Gold Gauntlet Cuff -->
          <path d="M 19 -20 L 14 -22 L 14.5 -25 L 19.5 -23 Z" fill="url(#im-gold)" />
          <!-- Right Hand / Palm Repulsor -->
          <ellipse cx="17" cy="-24.5" rx="2.5" ry="2" fill="url(#im-red)" />
          <circle cx="17" cy="-24.5" r="1.3" fill="#58d5ff" stroke="#ffffff" stroke-width="0.6" />

          <!-- Helmet Base (Red dome) -->
          <path d="M -7.5 -20 C -8 -27 -6 -35 0 -35 C 6 -35 8 -27 7.5 -20 C 7 -15 4 -14 0 -14 C -4 -14 -7 -15 -7.5 -20 Z" fill="url(#im-red)" />

          <!-- Gold Faceplate -->
          <path d="M -5.2 -31 C -3 -32 3 -32 5.2 -31 C 6.2 -28 6.5 -23 5 -20 L 3.8 -16.5 L -3.8 -16.5 L -5 -20 C -6.5 -23 -6.2 -28 -5.2 -31 Z" fill="url(#im-gold)" />
          <!-- Brow plate seam line -->
          <path d="M -4.5 -28.5 L 0 -29.5 L 4.5 -28.5" stroke="#18203a" stroke-width="0.9" fill="none" />
          <!-- Mouth slit -->
          <path d="M -2.2 -18 L 2.2 -18" stroke="#18203a" stroke-width="0.8" fill="none" />

          <!-- Glowing Eye Slits (White/Cyan illuminated) -->
          <g filter="url(#im-eye-glow)" stroke="none">
            <!-- Left eye -->
            <polygon points="-4.2,-25.2 -1.8,-25.7 -1.6,-24.4 -3.8,-24.2" fill="#ffffff" />
            <!-- Right eye -->
            <polygon points="4.2,-25.2 1.8,-25.7 1.6,-24.4 3.8,-24.2" fill="#ffffff" />
          </g>
        </g>
      </svg>
    </div>
  `;

  document.body.appendChild(container);

  // Sparks layer for thruster particles
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.id = 'im-spark-canvas';
  sparkCanvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sparkCanvas);
  const sCtx = sparkCanvas.getContext('2d');

  function resizeCanvas() {
    sparkCanvas.width = window.innerWidth;
    sparkCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // State
  let mouseX = window.innerWidth * 0.5;
  let mouseY = window.innerHeight * 0.5;
  let posX = mouseX;
  let posY = mouseY;
  let velX = 0;
  let velY = 0;
  let currentAngle = 0;
  let isHoveringInteractive = false;
  let isPointerDown = false;
  let isVisible = false;
  let sparks = [];

  const reticle = container.querySelector('#im-reticle');
  const figure = container.querySelector('#im-figure');
  const flameL = container.querySelector('.im-flame-l');
  const flameR = container.querySelector('.im-flame-r');

  // Mouse tracking
  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isVisible) {
      isVisible = true;
      container.classList.add('visible');
      posX = mouseX;
      posY = mouseY;
    }

    // Check if hovering clickable/interactive target
    const target = e.target;
    const isInteractive = !!(
      target &&
      (target.closest('button') ||
        target.closest('a') ||
        target.closest('.btn') ||
        target.closest('.hs') ||
        target.closest('.tick') ||
        target.closest('.btn-mute') ||
        target.closest('[role="button"]') ||
        target.closest('input'))
    );

    if (isInteractive !== isHoveringInteractive) {
      isHoveringInteractive = isInteractive;
      container.classList.toggle('targeting', isHoveringInteractive);
    }
  }

  function onPointerDown(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    isPointerDown = true;
    container.classList.add('firing');

    // Create repulsor shockwave flash at pointer location
    createRepulsorBlast(mouseX, mouseY);
  }

  function onPointerUp() {
    isPointerDown = false;
    container.classList.remove('firing');
  }

  function onMouseLeave() {
    isVisible = false;
    container.classList.remove('visible');
  }

  function onMouseEnter() {
    isVisible = true;
    container.classList.add('visible');
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('mouseenter', onMouseEnter);

  // Repulsor blast shockwave animation on click
  function createRepulsorBlast(x, y) {
    const blast = document.createElement('div');
    blast.className = 'im-blast-ring';
    blast.style.left = x + 'px';
    blast.style.top = y + 'px';
    document.body.appendChild(blast);

    // Spawn radial sparks around the blast
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 90;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.2,
        size: 2.2 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#58d5ff' : '#ffcf3f',
      });
    }

    setTimeout(() => blast.remove(), 420);
  }

  // Animation frame loop
  let lastTime = performance.now();
  let sparkTimer = 0;
  let rafId = null;

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    if (!isVisible) {
      if (sparks.length > 0) updateSparks(dt);
      return;
    }

    // Position reticle exactly at pointer location
    reticle.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

    // Calculate flight physics for Iron Man follower
    // Iron Man hovers slightly behind and trailing the cursor
    // Offset depends on angle of movement
    const dx = mouseX - posX;
    const dy = mouseY - posY;
    const dist = Math.hypot(dx, dy);

    // Spring interpolation to follow cursor
    const followSpeed = reducedMotion ? 18 : 11;
    posX += dx * Math.min(1, dt * followSpeed);
    posY += dy * Math.min(1, dt * followSpeed);

    velX = lerp(velX, dx / dt, dt * 8);
    velY = lerp(velY, dy / dt, dt * 8);
    const speed = Math.hypot(velX, velY);

    // Target rotation angle (Iron Man faces the direction he flies)
    let targetAngle = 0;
    if (dist > 3) {
      // Point towards movement direction (+90deg because SVG faces upward)
      targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    } else {
      // When hovering/idle, face upward with slight idle sway
      targetAngle = Math.sin(now * 0.002) * 5;
    }

    // Smooth angle interpolation handling 360 wrap
    let diff = (targetAngle - currentAngle) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    currentAngle += diff * Math.min(1, dt * (dist > 5 ? 12 : 4));

    // Dynamic scale and tilt
    const bankTilt = clamp((velX / 800) * 15, -20, 20);
    const flightScale = isHoveringInteractive ? 0.92 : isPointerDown ? 0.85 : 0.88;
    const idleBob = Math.sin(now * 0.004) * 2.5;

    // Apply transformation to Iron Man figure
    // Position figure centered on (posX, posY)
    figure.style.transform = `translate3d(${posX}px, ${posY + idleBob}px, 0) rotate(${currentAngle.toFixed(1)}deg) skewX(${(-bankTilt * 0.3).toFixed(1)}deg) scale(${flightScale})`;

    // Thruster flames animation (flicker and stretch with flight speed)
    const flameStretch = clamp(0.75 + speed * 0.0006 + (Math.random() - 0.5) * 0.25, 0.6, 2.4);
    const flameIntensity = isPointerDown ? 1.8 : flameStretch;
    if (flameL && flameR) {
      const scaleStr = `scaleY(${flameIntensity.toFixed(2)})`;
      flameL.style.transform = `translate(-8.5px, 25px) ${scaleStr}`;
      flameR.style.transform = `translate(8.5px, 25px) ${scaleStr}`;
    }

    // Spawn thruster particles when moving
    sparkTimer += dt;
    if (!reducedMotion && sparkTimer > 0.025 && (speed > 40 || isPointerDown)) {
      sparkTimer = 0;
      // Calculate boot exhaust position in world coordinates
      const rad = ((currentAngle - 90) * Math.PI) / 180;
      // Boots are behind the center by ~25px
      const exhaustDistance = 24 * flightScale;
      const bootOffsetX = 7 * flightScale;

      for (const side of [-1, 1]) {
        // Orthogonal vector for left/right boots
        const bx = posX - Math.cos(rad) * exhaustDistance + Math.sin(rad) * bootOffsetX * side;
        const by = posY - Math.sin(rad) * exhaustDistance - Math.cos(rad) * bootOffsetX * side;

        const pAngle = rad + Math.PI + (Math.random() - 0.5) * 0.45;
        const pSpeed = 30 + Math.random() * 70 + speed * 0.08;

        sparks.push({
          x: bx,
          y: by,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 0,
          maxLife: 0.2 + Math.random() * 0.25,
          size: 1.4 + Math.random() * 2.2,
          color: Math.random() > 0.45 ? '#58d5ff' : Math.random() > 0.5 ? '#ffcf3f' : '#ff6b3d',
        });
      }
    }

    updateSparks(dt);
  }

  function updateSparks(dt) {
    sCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        sparks.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0.2, p.size * (1 - dt * 2));

      const alpha = 1 - p.life / p.maxLife;
      sCtx.fillStyle = p.color;
      sCtx.globalAlpha = alpha;
      sCtx.beginPath();
      sCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      sCtx.fill();
    }
    sCtx.globalAlpha = 1;
  }

  rafId = requestAnimationFrame(loop);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('resize', resizeCanvas);
      container.remove();
      sparkCanvas.remove();
    },
  };
}
