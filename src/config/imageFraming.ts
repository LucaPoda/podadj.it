/**
 * Configurazione Inquadratura & Zoom delle Immagini per ciascuna Card.
 * Puoi modificare liberamente i valori di posizione ('50% 50%', 'center top', ecc.)
 * e di zoom (1.0 = normale, 1.15 = 15% zoom in) separatamente per Desktop e Mobile.
 */

export interface CardFraming {
  desktop: {
    position: string; // CSS background-position (es. 'center center', 'center 30%')
    zoom?: number;    // Fattore di scala (default: 1.0)
  };
  mobile: {
    position: string; // CSS background-position per mobile (es. 'center 15%')
    zoom?: number;    // Fattore di scala per mobile (default: 1.0)
  };
}

export const cardFramingConfig: Record<string, CardFraming> = {
  'party-side': {
    desktop: {
      position: 'center 45%',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 40%',
      zoom: 1.05,
    },
  },
  'groove-side': {
    desktop: {
      position: 'center 45%',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 45%',
      zoom: 1.05,
    },
  },
  'mainstage-side': {
    desktop: {
      position: 'center 45%',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 40%',
      zoom: 1.05,
    },
  },
  'tech-side': {
    desktop: {
      position: 'center 20%', // Inquadra Luca e la cassa audio sul desktop
      zoom: 1.0,
    },
    mobile: {
      position: 'center 15%', // Centra il viso e il busto evitando che la testa sia tagliata
      zoom: 1.0,
    },
  },
  'demo-live': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 45%',
      zoom: 1.0,
    },
  },
  'events': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 35%',
      zoom: 1.0,
    },
  },
  'partyhive': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 35%',
      zoom: 1.0,
    },
  },
};
