/**
 * Configurazione Inquadratura, Zoom e Immagini Dedicate per ciascuna Card.
 * Permette di configurare posizione ('center 50%', 'center 70%', ecc.),
 * zoom (1.0 = 100%, 1.2 = 120%) e immagini sorgente differenti tra Desktop e Mobile.
 */

export interface CardDeviceConfig {
  position: string;        // CSS background-position (es. 'center 60%')
  zoom?: number;           // Fattore di scala (default: 1.0)
  transformOrigin?: string;// CSS transform-origin (es. '15%', 'left center')
  imageWebp?: string;      // Immagine specifica (default: usa l'asset principale della card)
  imageJpg?: string;       // Fallback JPG specifico
}

export interface CardFraming {
  desktop: CardDeviceConfig;
  mobile: CardDeviceConfig;
}

export const cardFramingConfig: Record<string, CardFraming> = {
  'party-side': {
    desktop: {
      position: 'center 45%',
      zoom: 1.0,
      imageWebp: '/assets/bg-party.webp',
      imageJpg: '/assets/bg-party.jpg',
    },
    mobile: {
      position: 'center 40%',
      zoom: 1.0,
      imageWebp: '/assets/bg-party.webp',
      imageJpg: '/assets/bg-party.jpg',
    },
  },
  'groove-side': {
    desktop: {
      position: 'center 79%',
      zoom: 1.1,
      imageWebp: '/assets/bg-groove.webp',
      imageJpg: '/assets/bg-groove.jpg',
    },
    mobile: {
      position: 'center 70%',
      zoom: 1.1,
      imageWebp: '/assets/bg-groove.webp',
      imageJpg: '/assets/bg-groove.jpg',
    },
  },
  'mainstage-side': {
    desktop: {
      position: 'center 65%',
      zoom: 1.1,
      imageWebp: '/assets/bg-mainstage.webp',
      imageJpg: '/assets/bg-mainstage.jpg',
    },
    mobile: {
      position: 'center 57%',
      zoom: 1.0,
      imageWebp: '/assets/bg-mainstage.webp',
      imageJpg: '/assets/bg-mainstage.jpg',
    },
  },
  'tech-side': {
    desktop: {
      position: 'left 55%',
      zoom: 1.1,
      transformOrigin: '15%',
      imageWebp: '/assets/bg-tech.webp',
      imageJpg: '/assets/bg-tech.jpg',
    },
    mobile: {
      position: 'left 58%',
      zoom: 1.2,
      transformOrigin: '15%',
      imageWebp: '/assets/bg-tech.webp',
      imageJpg: '/assets/bg-tech.jpg',
    },
  },
  'demo-live': {
    desktop: {
      position: 'center 40%',
      zoom: 1.3,
      imageWebp: '/assets/bg-livesets.webp',
      imageJpg: '/assets/bg-livesets.jpg',
    },
    mobile: {
      position: 'center 45%',
      zoom: 1.5,
      imageWebp: '/assets/bg-livesets.webp',
      imageJpg: '/assets/bg-livesets.jpg',
    },
  },
  'events': {
    desktop: {
      position: 'center 40%',
      zoom: 2.0,
      transformOrigin: '60%',
      imageWebp: '/assets/bg-events.webp',
      imageJpg: '/assets/bg-events.jpg',
    },
    mobile: {
      position: 'center 40%',
      zoom: 2,
      transformOrigin: '60%',
      imageWebp: '/assets/bg-events.webp',
      imageJpg: '/assets/bg-events.jpg',
    },
  },
  'partyhive': {
    desktop: {
      position: 'center 33%',
      zoom: 1.2,
      imageWebp: '/assets/bg-partyhive.webp',
      imageJpg: '/assets/bg-partyhive.jpg',
    },
    mobile: {
      position: 'center 40%',
      zoom: 1.0,
      imageWebp: '/assets/bg-partyhive.webp',
      imageJpg: '/assets/bg-partyhive.jpg',
    },
  },
};
