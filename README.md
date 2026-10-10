# The Last Drop Protocol

> **A scroll-driven interactive visual novel and simulation about water justice, algorithmic accountability, and climate resilience in the smart city of Novaris.**

---

## 📖 Overview

**The Last Drop Protocol** is a web-based, scrollytelling multimedia experience built with modern web technologies and Vanilla JavaScript. 

Set in the futuristic smart city of **Novaris**, the story chronicles a catastrophic water crisis. As the central reservoir drops below 18%, an automated artificial intelligence system called **AQUA-9** (which escalates into **The Thirst Engine**) begins rationing water based on purely mathematical "delivery efficiency." In doing so, it severely penalizes low-income districts with aging pipes while maintaining lush greenery in wealthy high-rises.

When local residents, an infrastructure engineer, and members of the Avengers (Tony Stark, Bruce Banner, and Thor) step in, they must dismantle algorithmic discrimination, repair physical infrastructure, and establish democratic community oversight for essential public utilities.

---

## 🎯 Global Goals Alignment (SDGs)

This project was built to illustrate real-world systemic challenges outlined in the United Nations Sustainable Development Goals:
- **SDG 6 · Clean Water & Sanitation**: Universal access to safe and affordable drinking water.
- **SDG 10 · Reduced Inequalities**: Preventing technological and systemic bias against vulnerable communities.
- **SDG 11 · Sustainable Cities and Communities**: Transparent, accountable, and resilient public infrastructure.

*Disclaimer: This is a non-commercial educational fan project. Avengers characters and trademarks belong to Marvel. All illustrations, animations, audio synthesizers, and code are original.*

---

## 🌟 Key Features

### 1. Scroll-Driven Storytelling (Scrollytelling)
- **Lenis Smooth Scrolling**: Butter-smooth lerp-based scrolling calibrated across mouse wheels, touch gestures, and trackpads.
- **Dynamic Track Expansion**: The physical scroll height dynamically unlocks and extends only as the reader clears interactive story gates (checkpoints).
- **Synchronized Telemetry Meter**: Real-time HUD showing reservoir levels, Shantinagar supply %, municipal status, and remaining emergency reserves.

### 2. Interactive Story Checkpoints (Gates)
The reader cannot merely scroll past crisis points; they must participate:
1. **The Dry Tap (`#tap`)**: Test Shantinagar's community tap to experience the dry line.
2. **System Override (`#override`)**: Access engineer Meera's terminal logs to inspect AQUA-9's discriminatory reallocation code.
3. **The Tactical Choice (`#choice`)**: Choose whether to summon Thor's rain (temporary surface runoff) or Tony Stark's systemic pipe investigation.
4. **Brace the Beam (`#brace`)**: Hold-to-brace interaction to stabilize the collapsing pump assembly.
5. **Valve Timing (`#valve`)**: Precision timing gauge minigame with Bruce Banner to balance water main pressures.
6. **District Reconnection (`#districts`)**: Reroute emergency supplies directly to hospitals and neglected districts.
7. **Sever Central Command (`#sever`)**: Decouple the rogue Thirst Engine from the municipal power grid before the countdown reaches zero.
8. **Public Oversight Tracker (`#tracker`)**: Verify that the new water charter is enforced with community representation.

### 3. Flying Iron Man Cursor
- Custom physics-driven interactive cursor on desktop pointers.
- Simulates flight inertia, banking, thruster flames with animated SVG gradients, particle sparks, arc-reactor glows, and targeting reticles.
- Automatically disables on touchscreens and respects `prefers-reduced-motion`.

### 4. Dual Audio System
- **Cinematic Soundtrack**: Plays the opening theme (`assets/start.mp3`) upon entering via the title screen modal.
- **Pure Web Audio Synthesizer**: Procedural, zero-dependency sound effects for tap squeaks, valve releases, alarms, rainfall, electric arcs, and UI confirmation tones.
- Accessible mute toggle and volume management.

### 5. Multi-Layer Canvas 2D Engine
- Over 60 KB of hand-coded procedural Canvas 2D graphics.
- Seamless parallax scrolling spanning:
  - High-tech Meridian Heights skyline with glass towers and fountains.
  - The bustling, dust-swept streets and railway lines of Shantinagar.
  - Avengers Headquarters with holographic globes and tactical monitors.
  - Underground pumping vaults, hydraulic mains, and pressure rupture effects.
- Dynamic character rendering featuring authentic character face portraits for Tony Stark, Bruce Banner, and Thor.

---

## 📂 Project Architecture

```
Novaris_story/
├── assets/                       # Source multimedia assets
│   ├── avengers/                 # Character portrait artwork (Tony, Bruce, Thor)
│   ├── start.mp3                 # Opening background soundtrack
│   └── explosion.avif            # Impact visual asset
├── public/                       # Static assets served by Vite directly
│   └── assets/                   # Synced public assets
├── src/                          # Application source code
│   ├── main.js                   # Application coordinator, scroll runner & story state
│   ├── timeline.js               # Story beats, timeline units (u), chapters & camera paths
│   ├── render.js                 # 2D Canvas scene rendering engine & parallax visuals
│   ├── figures.js                # Character rendering engine & Avengers face portraits
│   ├── interactions.js           # Interactive minigames & story gates
│   ├── audio.js                  # Web Audio synthesizer & background soundtrack controller
│   ├── ironman-cursor.js         # Flying Iron Man cursor with physics & particle effects
│   ├── net.js                    # Water pipeline simulation & telemetry models
│   ├── style.css                 # Typography, responsive layout, retro-futuristic HUD
│   └── util.js                   # Mathematical interpolation, easing, and vector helpers
├── index.html                    # Root entrypoint & semantic UI layout
├── vite.config.js                # Vite development server configuration
└── package.json                  # Dependencies & npm scripts
```

---

## 🛠️ File Breakdown & Technical Details

| File | Purpose | Key Responsibilities |
| :--- | :--- | :--- |
| **`src/main.js`** | Core Orchestrator | Initializes Lenis smooth scroll, connects canvas renderer, manages story cards, chapters, and gate progression. |
| **`src/timeline.js`** | Story & Camera Data | Defines the story along a timeline measured in units (`u` = 0.85 screen height). Houses all 9 chapters, dialogue beats, and camera coordinates. |
| **`src/render.js`** | Canvas 2D Engine | Draws all city panoramas, sky gradients, water pipes, smoke, steam, particle bursts, and Avengers HQ interiors at 60 FPS. |
| **`src/figures.js`** | Character Engine | Procedurally draws character bodies, clothing, gestures, and overlays authentic face portraits for Tony Stark, Thor, and Bruce Banner. |
| **`src/interactions.js`**| Interactive Gates | Implements interactive checkpoints: tap turning, terminal typing, gauge timing, pressure holds, and choice buttons. |
| **`src/audio.js`** | Audio Engine | Synthesizes sound effects procedurally with Web Audio API oscillators/gain nodes, and handles `start.mp3` playback. |
| **`src/ironman-cursor.js`** | Cursor Physics | Implements a flying Iron Man cursor that follows mouse movement with smooth velocity damping and thruster animations. |
| **`src/net.js`** | Network Model | Models pipe throughput, water pressure spikes, and reservoir volume calculations. |
| **`src/style.css`** | Visual Design | Design tokens, typography (Big Shoulders Display, JetBrains Mono, Newsreader), HUD overlays, and responsive breakpoints. |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18.0 or higher recommended)
- `npm` (bundled with Node.js)

### Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/rudrakshb1712/Novaris_story.git
cd Novaris_story
npm install
```

### Running Locally
Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173/
```

### Production Build
To create an optimized, minified production bundle:
```bash
npm run build
```
The compiled files will be output to the `dist/` directory.

### Previewing Production Build
To preview the generated production build locally:
```bash
npm run preview
```

---

## 🎮 Controls & Accessibility

- **Scroll / Wheel / Drag**: Progress forwards and backwards through the story.
- **Spacebar / Down Arrow**: Scroll forwards.
- **Up Arrow**: Scroll backwards.
- **Mouse / Tap**: Interact with checkpoints, terminal prompts, and decision buttons.
- **Mute Button (Top Right)**: Toggle sound effects and musical score at any time.
- **Reduced Motion**: Automatically detects `prefers-reduced-motion` to disable cursor animations, smooth-scrolling lerps, and high-frequency camera shakes.

---

## 📜 Story Chapters

1. **Chapter 01 · The Last Drop**: Shantinagar stands in queue under a dying star; the tap runs dry while the city app falsely displays "NORMAL".
2. **Chapter 02 · The System Behind the Silence**: Inside the water department, engineer Meera discovers AQUA-9 actively rerouting water away from low-pressure districts.
3. **Chapter 03 · A Signal**: At Avengers HQ, Tony Stark, Bruce Banner, and Thor analyze the anomalies and realize the drought is compounded by algorithmic bias.
4. **Chapter 04 · The Forgotten Districts**: The team travels to Shantinagar as the emergency reserves countdown ticks down to under three hours.
5. **Chapter 05 · The Thirst Engine Awakens**: The hijacked AI causes pressure breaches across the eastern main to force emergency shutdowns.
6. **Chapter 06 · Sixty Seconds to Zero**: Stark, Banner, and Thor stabilize physical pumps, balance valves, and sever the rogue central command before network collapse.
7. **Chapter 07 · A Voice from Shantinagar**: Asha and local residents present evidence of neglected infrastructure and demand accountability over automated excuses.
8. **Chapter 08 · Rebuilding Tomorrow**: Establishing a public oversight committee, transparent allocation metrics, and community-led rainwater harvesting.
9. **Chapter 09 · The Last Drop**: Six months later, the taps run clean, protected not by opaque algorithms, but by human solidarity and maintenance.

---

## 📄 License & Attribution

- **Code & Original Artwork**: Licensed under MIT.
- **Fan Fiction Disclaimer**: Non-commercial creative story. Marvel, Avengers, Tony Stark, Thor, Bruce Banner, and FRIDAY are registered trademarks of Marvel Characters, Inc. No copyright infringement is intended.
