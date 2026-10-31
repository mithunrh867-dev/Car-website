/**
 * NOCTIS Configuration
 * All section heights, chapter ranges, frame counts, frame paths, and callout coordinates
 * can be tuned here.
 */

const CONFIG = {
  // HERO SECTION CONFIGURATION
  hero: {
    sectionHeight: '600vh',
    frameCount: 600,
    pathDesktop: 'assets/frames/hero/frame_',
    pathMobile: 'assets/frames/hero-mobile/frame_',
    extension: '.webp',
    padLength: 4,
    // Chapters: [startProgress, endProgress]
    chapters: [
      {
        id: 'wake',
        number: '01',
        start: 0.00,
        end: 0.12,
        title: 'NOCTIS',
        subtitle: 'The city is asleep.',
        hint: 'SCROLL TO WAKE IT'
      },
      {
        id: 'light-1',
        number: '02',
        start: 0.22,
        end: 0.40,
        text: "It doesn't need the city's light."
      },
      {
        id: 'light-2',
        number: '03',
        start: 0.50,
        end: 0.68,
        text: 'It brings its own.'
      },
      {
        id: 'gt-e',
        number: '04',
        start: 0.80,
        end: 1.00,
        title: 'GT-E',
        specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
        linkText: 'Discover the GT-E',
        linkHref: '#lineup'
      }
    ],
    // Fade canvas to solid black over the last 5% of scroll (0.95 -> 1.00)
    fadeToBlackStart: 0.95,
    // HUD counters range over progress [0, 1]
    hud: {
      maxSpeed: 118,      // km/h
      maxDistance: 4.2    // km
    }
  },

  // STATEMENT SECTION
  statement: {
    sectionHeight: '100vh',
    label: '02 — ENGINEERING',
    sentence: 'Every part was designed to disappear into one line of light.'
  },

  // DISMANTLE SECTION CONFIGURATION
  dismantle: {
    sectionHeight: '350vh',
    frameCount: 200,
    pathDesktop: 'assets/frames/dismantle/frame_',
    pathMobile: 'assets/frames/dismantle-mobile/frame_',
    extension: '.webp',
    padLength: 4,
    title: 'Look closer.',
    // After 70% progress, callouts fade in one by one
    calloutsStartProgress: 0.70,
    callouts: [
      {
        id: 'body',
        label: 'BODY',
        desc: 'Carbon composite monocoque',
        // Percentage coordinates on screen [0-100]
        dotX: 42,
        dotY: 42,
        textX: 25,
        textY: 34,
        align: 'right',
        triggerProgress: 0.72
      },
      {
        id: 'battery',
        label: 'BATTERY',
        desc: '110 kWh structural pack',
        dotX: 46,
        dotY: 65,
        textX: 25,
        textY: 72,
        align: 'right',
        triggerProgress: 0.78
      },
      {
        id: 'drive',
        label: 'DRIVE',
        desc: 'Dual axial-flux motors, 680 kW',
        dotX: 62,
        dotY: 62,
        textX: 74,
        textY: 72,
        align: 'left',
        triggerProgress: 0.84
      },
      {
        id: 'light',
        label: 'LIGHT',
        desc: 'Single-line LED signature',
        dotX: 66,
        dotY: 45,
        textX: 74,
        textY: 36,
        align: 'left',
        triggerProgress: 0.90
      }
    ]
  },

  // LINEUP SECTION CONFIGURATION
  lineup: {
    label: '03 — THE LINEUP',
    heading: 'Five ways to drive the night.',
    hoverDebounceMs: 80,
    defaultOpenIndex: 0,
    cars: [
      {
        id: 'gt-e',
        number: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        range: '640 km',
        accel: '3.1 s',
        power: '680 kW',
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E matte graphite electric grand tourer coupe',
        swatches: ['#121418', '#EDEAE4', '#0E1726', '#3D0A0A'],
        activeSwatch: 0
      },
      {
        id: 's',
        number: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        range: '600 km',
        accel: '3.6 s',
        power: '520 kW',
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS S satin bone white electric sport sedan',
        swatches: ['#EDEAE4', '#121418', '#1A222D', '#2B2C2E'],
        activeSwatch: 0
      },
      {
        id: 'x',
        number: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        range: '560 km',
        accel: '4.2 s',
        power: '480 kW',
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS X midnight blue electric coupe SUV',
        swatches: ['#0B192C', '#121418', '#EDEAE4', '#20252D'],
        activeSwatch: 0
      },
      {
        id: 'r',
        number: '04',
        name: 'R',
        tagline: 'Built for the track.',
        range: '420 km',
        accel: '2.4 s',
        power: '900 kW',
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS R satin black electric track coupe with rear wing',
        swatches: ['#0A0B0D', '#8C100B', '#1E2024', '#EDEAE4'],
        activeSwatch: 0
      },
      {
        id: 'one',
        number: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        range: '800 km',
        accel: '1.9 s',
        power: '1100 kW',
        isConcept: true,
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS ONE liquid silver concept electric hypercar',
        swatches: ['#C5C9D0', '#07080A', '#1B1F24', '#E1251B'],
        activeSwatch: 0
      }
    ]
  },

  // PRELOADER & PERFORMANCE
  preload: {
    initialHeroFrames: 40,
    lerpFactor: 0.15,
    cursorLerp: 0.18,
    reducedMotionStaticHeroFrames: [0.00, 0.35, 0.65, 1.00],
    reducedMotionDismantleFrames: [1, 200]
  }
};

// Export to window
window.CONFIG = CONFIG;

