/**
 * Configurazione Inquadratura, Zoom e Immagini Dedicate per ciascuna Card.
 * Permette di configurare posizione ('center 50%', 'center 70%', ecc.),
 * zoom (1.0 = 100%, 1.2 = 120%) e immagini sorgente differenti tra Desktop e Mobile.
 */

export interface CardDeviceConfig {
  position: string;     // CSS background-position (es. 'center 60%')
  zoom?: number;        // Fattore di scala (default: 1.0)
  imageWebp?: string;   // Immagine specifica (default: usa l'asset principale della card)
  imageJpg?: string;    // Fallback JPG specifico
}

export interface CardFraming {
  desktop: CardDeviceConfig;
  mobile: CardDeviceConfig;
}

export const cardFramingConfig: Record<string, CardFraming> = {
  'party-side': {
    desktop: {
      position: 'center 70%',
      zoom: 1.0,
      imageWebp: '/assets/bg-party.webp',
      imageJpg: '/assets/bg-party.jpg',
    },
    mobile: {
      position: 'center 60%',
      zoom: 1.05,
      imageWebp: '/assets/bg-party.webp',
      imageJpg: '/assets/bg-party.jpg',
    },
  },
  'groove-side': {
    desktop: {
      position: 'center 65%',
      zoom: 1.2,
      imageWebp: '/assets/bg-deeper.webp',
      imageJpg: '/assets/bg-deeper.jpg',
    },
    mobile: {
      position: 'center 65%',
      zoom: 1.05,
      imageWebp: '/assets/bg-deeper.webp',
      imageJpg: '/assets/bg-deeper.jpg',
    },
  },
  'mainstage-side': {
    desktop: {
      position: 'center 55%',
      zoom: 1.1,
      imageWebp: '/assets/bg-harder.webp',
      imageJpg: '/assets/bg-harder.jpg',
    },
    mobile: {
      position: 'center 60%',
      zoom: 1.05,
      imageWebp: '/assets/bg-harder.webp',
      imageJpg: '/assets/bg-harder.jpg',
    },
  },
  'tech-side': {
    desktop: {
      position: 'center 20%', // Inquadratura verticale desktop
      zoom: 1.0,
      imageWebp: '/assets/bg-tech.webp',
      imageJpg: '/assets/bg-tech.jpg',
    },
    mobile: {
      position: 'center 50%', // Inquadratura calibrata per bg-tech-mobile
      zoom: 1.0,
      imageWebp: '/assets/bg-tech-mobile.webp', // Nuova immagine dedicata mobile!
      imageJpg: '/assets/bg-tech-mobile.jpg',
    },
  },
  'demo-live': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
      imageWebp: '/assets/bg-livesets.webp',
      imageJpg: '/assets/bg-livesets.jpg',
    },
    mobile: {
      position: 'center 55%',
      zoom: 1.0,
      imageWebp: '/assets/bg-livesets.webp',
      imageJpg: '/assets/bg-livesets.jpg',
    },
  },
  'events': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
      imageWebp: '/assets/bg-events.webp',
      imageJpg: '/assets/bg-events.jpg',
    },
    mobile: {
      position: 'center 40%',
      zoom: 1.0,
      imageWebp: '/assets/bg-events.webp',
      imageJpg: '/assets/bg-events.jpg',
    },
  },
  'partyhive': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
      imageWebp: '/assets/bg-partyhive.webp',
      imageJpg: '/assets/bg-partyhive.jpg',
    },
    mobile: {
      position: 'center 35%',
      zoom: 1.0,
      imageWebp: '/assets/bg-partyhive.webp',
      imageJpg: '/assets/bg-partyhive.jpg',
    },
  },
};
