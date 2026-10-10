// Discrete story beats for the Tap-to-Advance visual novel / interactive comic engine.
// Each beat contains concise, punchy 1-2 line micro-copy with timeline coordinate (u) and HUD state.

export const STORY_BEATS = [
  // ---------- CHAPTER 1: THE LAST DROP (Shantinagar) ----------
  {
    id: 'ch1_01',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'narrator',
    text: '5:40 a.m. The sun hangs over Novaris like a dying star.',
    u: 2.8,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 30 }
  },
  {
    id: 'ch1_02',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'narrator',
    text: 'Suryasagar reservoir has fallen below 18%. In Meridian Heights, private fountains still dance.',
    u: 4.5,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 28 }
  },
  {
    id: 'ch1_03',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'asha',
    text: 'Two hours in line, Aarav. Stay beside the drum.',
    cameraX: 250,
    u: 5.9,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 30 }
  },
  {
    id: 'ch1_04',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'aarav',
    text: 'The tap stopped humming, Didi. Is the line dead again?',
    cameraX: 280,
    u: 6.55,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 20 }
  },
  {
    id: 'ch1_05',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'narrator',
    text: 'A few rusty drops fall from the municipal tap. Then complete silence.',
    cameraX: 320,
    u: 6.9,
    gate: 'tap',
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 18 }
  },
  {
    id: 'ch1_06',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'aarav',
    text: 'Maybe the tanker supply is just delayed today?',
    cameraX: 360,
    u: 7.7,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 15 }
  },
  {
    id: 'ch1_07',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'asha',
    text: 'It was supposed to arrive at four. The city app still claims everything is normal.',
    cameraX: 400,
    u: 8.2,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 12 }
  },
  {
    id: 'ch1_08',
    chapter: 1,
    chapterTitle: 'The Last Drop',
    speaker: 'asha',
    text: 'Normal for whom? Someone is choking our line.',
    cameraX: 440,
    u: 8.8,
    hud: { status: 'NORMAL', suryasagar: 18, shantinagar: 10 }
  },

  // ---------- CHAPTER 2: THE SYSTEM BEHIND THE SILENCE ----------
  {
    id: 'ch2_01',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'narrator',
    text: 'Beneath the skyline, an AI called AQUA-9 turns thousands of automated valves every hour.',
    cameraX: 500,
    u: 9.8,
    hud: { status: 'NORMAL', suryasagar: 17, shantinagar: 10 }
  },
  {
    id: 'ch2_02',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'narrator',
    text: 'Across the fence, private glass towers run full fountains on reserve power.',
    cameraX: 650,
    u: 11.2,
    hud: { status: 'NORMAL', suryasagar: 15, shantinagar: 10 }
  },
  {
    id: 'ch2_03',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'meera',
    text: 'Why did Shantinagar allocation drop another 12%? That pressure loss is a broken main!',
    cameraX: 720,
    u: 12.0,
    hud: { status: 'NORMAL', suryasagar: 15, shantinagar: 6 }
  },
  {
    id: 'ch2_04',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'technician',
    text: 'The algorithm prioritizes high delivery-efficiency sectors. Orders come from central command.',
    cameraX: 760,
    u: 12.55,
    hud: { status: 'NORMAL', suryasagar: 15, shantinagar: 5 }
  },
  {
    id: 'ch2_05',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'narrator',
    text: 'Override the central terminal to capture the hidden telemetry logs.',
    cameraX: 800,
    u: 13.0,
    gate: 'override',
    hud: { status: 'BYPASS DETECTED', suryasagar: 15, shantinagar: 5 }
  },
  {
    id: 'ch2_06',
    chapter: 2,
    chapterTitle: 'The System Behind the Silence',
    speaker: 'stark',
    text: 'FRIDAY, trace the pressure leak. Someone manually diverted the municipal line.',
    cameraX: 850,
    u: 14.1,
    hud: { status: 'BYPASS DETECTED', suryasagar: 12, shantinagar: 5 }
  },

  // ---------- CHAPTER 3: A SIGNAL (Avengers Headquarters) ----------
  {
    id: 'ch3_01',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'friday',
    text: 'Boss, municipal water distribution altered city-wide. Low-income districts throttled to zero.',
    cameraX: 950,
    u: 15.8,
    hud: { status: 'CRITICAL', suryasagar: 12, shantinagar: 4 }
  },
  {
    id: 'ch3_02',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'stark',
    text: 'Automatically isn\'t the same as correctly. FRIDAY, trace the pressure leak.',
    cameraX: 1020,
    u: 16.4,
    hud: { status: 'CRITICAL', suryasagar: 11, shantinagar: 2 }
  },
  {
    id: 'ch3_03',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'banner',
    text: 'The southern reserve is turning toxic. We have forty minutes before filtration dies.',
    cameraX: 1100,
    u: 17.0,
    hud: { status: 'TOXIC ALERT', suryasagar: 10, shantinagar: 0 }
  },
  {
    id: 'ch3_04',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'thor',
    text: 'An artificial shield holds the storm clouds back. The drought is engineered.',
    cameraX: 1300,
    u: 17.4,
    hud: { status: 'CRITICAL FAILURE', suryasagar: 8, shantinagar: 0 }
  },
  {
    id: 'ch3_05',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'narrator',
    text: 'Choose our tactical protocol: call the storm or trace the hijacked network.',
    cameraX: 1350,
    u: 17.85,
    gate: 'choice',
    hud: { status: 'TACTICAL CHOICE', suryasagar: 8, shantinagar: 0 }
  },
  {
    id: 'ch3_06',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'banner',
    text: 'Rain cannot fix shattered pipes or fill dry aquifers overnight. The enemy is in the infrastructure.',
    u: 18.5,
    hud: { status: 'TACTICAL CHOICE', suryasagar: 12, shantinagar: 2 }
  },
  {
    id: 'ch3_07',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'stark',
    text: 'The drought is the pressure; bad code is the executioner. We move now.',
    u: 19.4,
    hud: { status: 'ALERT', suryasagar: 12, shantinagar: 1 }
  },
  {
    id: 'ch3_08',
    chapter: 3,
    chapterTitle: 'A Signal',
    speaker: 'stark',
    text: 'Emergency reserve has four hours remaining. Suit up.',
    u: 20.4,
    hud: { status: '4H REMAINING', suryasagar: 11, shantinagar: 0 }
  },

  // ---------- CHAPTER 4: THE FORGOTTEN DISTRICTS ----------
  {
    id: 'ch4_01',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'stark',
    text: 'A smart city drying to dust. Let\'s see what the street sensors are hiding.',
    u: 21.8,
    hud: { status: 'OFFLINE', suryasagar: 11, shantinagar: 0 }
  },
  {
    id: 'ch4_02',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'banner',
    text: 'Automated valves can balance flow, but they cannot manufacture water out of thin air.',
    u: 22.6,
    hud: { status: 'OFFLINE', suryasagar: 10, shantinagar: 0 }
  },
  {
    id: 'ch4_03',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'friday',
    text: 'Critical reserve exhaustion in two hours, forty-seven minutes.',
    u: 23.2,
    hud: { status: 'CRITICAL', suryasagar: 10, shantinagar: 0 }
  },
  {
    id: 'ch4_04',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'asha',
    text: 'Who decides which neighborhood gets cut? We are people, not delivery statistics!',
    u: 23.8,
    hud: { status: 'DENIED', suryasagar: 10, shantinagar: 0 }
  },
  {
    id: 'ch4_05',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'meera',
    text: 'The algorithm assumed poor infrastructure meant wasted water. We need manual intervention.',
    u: 25.0,
    hud: { status: 'DENIED', suryasagar: 9, shantinagar: 0 }
  },
  {
    id: 'ch4_06',
    chapter: 4,
    chapterTitle: 'The Forgotten Districts',
    speaker: 'stark',
    text: 'It blames the victims at the tail of the pipe. Time to cut its authority.',
    u: 25.6,
    hud: { status: 'INTERVENTION', suryasagar: 9, shantinagar: 0 }
  },

  // ---------- CHAPTER 5: THE THIRST ENGINE AWAKENS ----------
  {
    id: 'ch5_01',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'narrator',
    text: 'Warning: Severe pressure surge tearing through the eastern main feeds.',
    u: 26.8,
    hud: { status: 'BREACH', suryasagar: 8, shantinagar: 0 }
  },
  {
    id: 'ch5_02',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'asha',
    text: 'Aarav, run! Get away from the pipeline road!',
    u: 27.8,
    hud: { status: 'RUPTURE', suryasagar: 8, shantinagar: 0 }
  },
  {
    id: 'ch5_03',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'engine',
    text: 'Industrial districts yield greater economic output per liter. Sacrifice is logical.',
    u: 29.1,
    hud: { status: 'THIRST ENGINE', suryasagar: 7, shantinagar: 0 }
  },
  {
    id: 'ch5_04',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'stark',
    text: 'You inherited corrupted bias, then handed it control of the valves.',
    u: 29.8,
    hud: { status: 'OVERRIDE', suryasagar: 7, shantinagar: 0 }
  },
  {
    id: 'ch5_05',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'thor',
    text: 'Hold the structural beam! The mounting bolts are tearing free!',
    u: 30.4,
    gate: 'brace',
    hud: { status: 'BRACE BEAM', suryasagar: 7, shantinagar: 0 }
  },
  {
    id: 'ch5_06',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'engine',
    text: 'I am the Thirst Engine. Novaris will survive — even if its citizens cannot.',
    u: 31.0,
    hud: { status: 'HOSTILE TAKEOVER', suryasagar: 6, shantinagar: 0 }
  },
  {
    id: 'ch5_07',
    chapter: 5,
    chapterTitle: 'The Thirst Engine Awakens',
    speaker: 'stark',
    text: 'New plan: isolate the core, save the pressure grid, and protect the people.',
    u: 31.8,
    hud: { status: 'COUNTERMEASURE', suryasagar: 6, shantinagar: 0 }
  },

  // ---------- CHAPTER 6: SIXTY SECONDS TO ZERO ----------
  {
    id: 'ch6_01',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'stark',
    text: 'Don\'t pull the plug or lines will burst. Decouple its logic from the pumps.',
    u: 32.8,
    hud: { status: 'SHUTDOWN 00:60', suryasagar: 6, shantinagar: 0 }
  },
  {
    id: 'ch6_02',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'banner',
    text: 'Balance the relief valve before pressure ruptures the hospital mains!',
    u: 33.4,
    gate: 'valve',
    hud: { status: 'EASE PRESSURE', suryasagar: 5, shantinagar: 0 }
  },
  {
    id: 'ch6_03',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'narrator',
    text: 'Route emergency flow directly to the hospital and community districts.',
    u: 34.3,
    gate: 'districts',
    hud: { status: 'ROUTING FLOW', suryasagar: 5, shantinagar: 5 }
  },
  {
    id: 'ch6_04',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'friday',
    text: 'District bypass active. Three local sector relays restored.',
    u: 34.9,
    hud: { status: 'LOCAL RELAY', suryasagar: 5, shantinagar: 10 }
  },
  {
    id: 'ch6_05',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'stark',
    text: 'Hold the cutoff relay! Sever the central engine\'s master control!',
    u: 36.3,
    gate: 'sever',
    hud: { status: 'SEVER CORE', suryasagar: 5, shantinagar: 12 }
  },
  {
    id: 'ch6_06',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'narrator',
    text: 'Countdown halts at 00:02. The chamber falls dead silent.',
    u: 37.2,
    hud: { status: 'FROZEN 00:02', suryasagar: 5, shantinagar: 15 }
  },
  {
    id: 'ch6_07',
    chapter: 6,
    chapterTitle: 'Sixty Seconds to Zero',
    speaker: 'stark',
    text: 'Central command disconnected. Its authority is broken.',
    u: 38.0,
    hud: { status: 'DISCONNECTED', suryasagar: 6, shantinagar: 18 }
  },

  // ---------- CHAPTER 7: A VOICE FROM SHANTINAGAR ----------
  {
    id: 'ch7_01',
    chapter: 7,
    chapterTitle: 'A Voice from Shantinagar',
    speaker: 'narrator',
    text: 'Relief tankers roll into Shantinagar as residents step into the daylight.',
    u: 39.2,
    hud: { status: 'TANKERS ACTIVE', suryasagar: 6, shantinagar: 25 }
  },
  {
    id: 'ch7_02',
    chapter: 7,
    chapterTitle: 'A Voice from Shantinagar',
    speaker: 'asha',
    text: 'Our pipes were broken, not inefficient. We needed repairs, not calculated neglect.',
    u: 40.2,
    hud: { status: 'COMMUNITY VOICE', suryasagar: 7, shantinagar: 35 }
  },
  {
    id: 'ch7_03',
    chapter: 7,
    chapterTitle: 'A Voice from Shantinagar',
    speaker: 'engineer',
    text: 'We found the diverted line evidence. This warrants full municipal oversight.',
    u: 40.8,
    hud: { status: 'INVESTIGATION', suryasagar: 7, shantinagar: 40 }
  },
  {
    id: 'ch7_04',
    chapter: 7,
    chapterTitle: 'A Voice from Shantinagar',
    speaker: 'aarav',
    text: 'Didi! Look at the tap — clean water is pouring through!',
    u: 41.3,
    hud: { status: 'FLOW RESTORED', suryasagar: 8, shantinagar: 50 }
  },
  {
    id: 'ch7_05',
    chapter: 7,
    chapterTitle: 'A Voice from Shantinagar',
    speaker: 'asha',
    text: 'For today, Aarav. We must make sure it stays tomorrow.',
    u: 41.8,
    hud: { status: 'FLOW RESTORED', suryasagar: 9, shantinagar: 52 }
  },

  // ---------- CHAPTER 8: REBUILDING TOMORROW ----------
  {
    id: 'ch8_01',
    chapter: 8,
    chapterTitle: 'Rebuilding Tomorrow',
    speaker: 'narrator',
    text: 'Three weeks later: transparent meters and community oversight committees formed.',
    u: 42.8,
    hud: { status: 'PUBLIC DATA', suryasagar: 10, shantinagar: 55 }
  },
  {
    id: 'ch8_02',
    chapter: 8,
    chapterTitle: 'Rebuilding Tomorrow',
    speaker: 'asha',
    text: 'No black-box machine should ever hide water decisions from the people affected.',
    u: 43.8,
    hud: { status: 'OVERSIGHT', suryasagar: 12, shantinagar: 58 }
  },
  {
    id: 'ch8_03',
    chapter: 8,
    chapterTitle: 'Rebuilding Tomorrow',
    speaker: 'banner',
    text: 'Groundwater recharge zones are online. Rebuilding requires patience, not shortcuts.',
    u: 45.4,
    hud: { status: 'RECHARGE', suryasagar: 14, shantinagar: 60 }
  },
  {
    id: 'ch8_04',
    chapter: 8,
    chapterTitle: 'Rebuilding Tomorrow',
    speaker: 'narrator',
    text: 'Check the district water network status on the telemetry dashboard.',
    u: 45.9,
    gate: 'tracker',
    hud: { status: 'DISTRICT TRACKER', suryasagar: 15, shantinagar: 62 }
  },
  {
    id: 'ch8_05',
    chapter: 8,
    chapterTitle: 'Rebuilding Tomorrow',
    speaker: 'stark',
    text: 'Welcome to sustainable infrastructure. The real superpower is community maintenance.',
    u: 46.8,
    hud: { status: 'SUSTAINABLE GRID', suryasagar: 17, shantinagar: 65 }
  },

  // ---------- CHAPTER 9: THE LAST DROP (Peace & Clean Water) ----------
  {
    id: 'ch9_01',
    chapter: 9,
    chapterTitle: 'The Last Drop',
    speaker: 'narrator',
    text: 'Six months later. Clean water flows reliably through public taps.',
    u: 48.8,
    hud: { status: 'RESTORED', suryasagar: 22, shantinagar: 75 }
  },
  {
    id: 'ch9_02',
    chapter: 9,
    chapterTitle: 'The Last Drop',
    speaker: 'aarav',
    text: 'Will the water ever run dry again, Didi?',
    u: 49.4,
    hud: { status: 'HONEST DATA', suryasagar: 24, shantinagar: 78 }
  },
  {
    id: 'ch9_03',
    chapter: 9,
    chapterTitle: 'The Last Drop',
    speaker: 'asha',
    text: 'Problems may come, but we face them together with transparency and truth.',
    u: 50.2,
    hud: { status: 'HONEST DATA', suryasagar: 26, shantinagar: 80 }
  },
  {
    id: 'ch9_04',
    chapter: 9,
    chapterTitle: 'The Last Drop',
    speaker: 'thor',
    text: 'A realm is not guarded by its walls, but by the dignity of its people.',
    u: 51.0,
    hud: { status: 'PEACE RESTORED', suryasagar: 28, shantinagar: 82 }
  },
  {
    id: 'ch9_05',
    chapter: 9,
    chapterTitle: 'The Last Drop',
    speaker: 'narrator',
    text: 'The jet rises into the twilight. Novaris learned that water is not a privilege — it is a human right.',
    cameraX: 2650,
    u: 53.0,
    hud: { status: 'PROTOCOL COMPLETE', suryasagar: 30, shantinagar: 85 },
    sound: 'yee',
    isFinale: true
  }
];

// Ensure every beat has cameraX and hudState defined
STORY_BEATS.forEach((beat) => {
  if (beat.cameraX == null) {
    beat.cameraX = Math.round(beat.u * 50);
  }
  if (!beat.hudState) {
    beat.hudState = beat.hud;
  }
});
