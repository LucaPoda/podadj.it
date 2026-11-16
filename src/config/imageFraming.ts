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
    position: string; // CSS background-position per mobile
    zoom?: number;    // Fattore di scala per mobile
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
      position: 'center 20%', // Inquadratura verticale desktop
      zoom: 1.0,
    },
    mobile: {
      position: 'center 15%', // Ottimale con card mobile più alta (h-40) per mostrare viso e cassa
      zoom: 1.0,
    },
  },
  'demo-live': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center center', // Inquadra la consolle CDJ nella card quadrata
      zoom: 1.0,
    },
  },
  'events': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center center', // Inquadra la folla nella card quadrata
      zoom: 1.0,
    },
  },
  'partyhive': {
    desktop: {
      position: 'center center',
      zoom: 1.0,
    },
    mobile: {
      position: 'center 22%', // Mostra i 4 volti e mezzo busto senza tagliare le teste
      zoom: 1.0,
    },
  },
};
