import type { Locale } from '../i18n/ui';

export interface WipSectionConfig {
  slug: string;
  name: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  quips: Record<Locale, string>;
  framingKey: string;
  bgImageWebp: string;
  bgImageJpg: string;
  accent: 'amber' | 'fuchsia' | 'cyan' | 'purple' | 'blue' | 'yellow';
  showPartyhiveInstagram?: boolean;
}

export const WIP_SECTIONS: Record<string, WipSectionConfig> = {
  'mainstage-side': {
    slug: 'mainstage-side',
    name: {
      it: 'The Mainstage Side',
      en: 'The Mainstage Side',
    },
    subtitle: {
      it: 'Festival Techno, Hardstyle & Rawstyle',
      en: 'Festival Techno, Hardstyle & Rawstyle',
    },
    quips: {
      it: 'I BPM sono già a 150, ma questa pagina è ancora bloccata al warmup.',
      en: 'The BPMs are already at 150, yet this webpage is still stuck in warmup.',
    },
    framingKey: 'hero-mainstage',
    bgImageWebp: '/assets/bg-mainstage.webp',
    bgImageJpg: '/assets/bg-mainstage.jpg',
    accent: 'amber',
  },
  'party-side': {
    slug: 'party-side',
    name: {
      it: 'The Party Side',
      en: 'The Party Side',
    },
    subtitle: {
      it: 'Commercial EDM, Vocal House & Club Edits',
      en: 'Commercial EDM, Vocal House & Club Edits',
    },
    quips: {
      it: 'La pista è già pronta a ballare, il testo di questa pagina un po’ meno.',
      en: 'The dancefloor is ready to go, the copy for this page... not so much.',
    },
    framingKey: 'hero-party',
    bgImageWebp: '/assets/bg-party.webp',
    bgImageJpg: '/assets/bg-party.jpg',
    accent: 'fuchsia',
  },
  'groove-side': {
    slug: 'groove-side',
    name: {
      it: 'The Groove Side',
      en: 'The Groove Side',
    },
    subtitle: {
      it: 'Tech House, Hypnotic Techno & Clubbing',
      en: 'Tech House, Hypnotic Techno & Clubbing',
    },
    quips: {
      it: 'Troppo preso a cercare il groove perfetto per ricordarmi di scrivere questa pagina.',
      en: 'Too busy hunting for the perfect groove to finish writing this page.',
    },
    framingKey: 'hero-groove',
    bgImageWebp: '/assets/bg-groove.webp',
    bgImageJpg: '/assets/bg-groove.jpg',
    accent: 'cyan',
  },
  'tech-side': {
    slug: 'tech-side',
    name: {
      it: 'The Tech Side',
      en: 'The Tech Side',
    },
    subtitle: {
      it: 'Service Audio & Luci Professionale',
      en: 'Pro Audio & DMX Lighting Service',
    },
    quips: {
      it: 'L’impianto suona già alla grande, è solo la scheda tecnica online che sta facendo ancora i capricci.',
      en: 'The sound system already slaps, it’s just the online spec sheet still missing a few cables.',
    },
    framingKey: 'hero-tech-side',
    bgImageWebp: '/assets/bg-tech.webp',
    bgImageJpg: '/assets/bg-tech.jpg',
    accent: 'blue',
  },
  'demo-live-sets': {
    slug: 'demo-live-sets',
    name: {
      it: 'Demo & Live Sets',
      en: 'Demo & Live Sets',
    },
    subtitle: {
      it: 'Archivio Audio & Registrazioni Live',
      en: 'Audio Archive & Live Recordings',
    },
    quips: {
      it: 'I mix non sono ancora tutti caricati su SoundCloud e Mixcloud (spoiler: è esattamente questo il motivo per cui non ho ancora finito le altre pagine).',
      en: 'The mixes aren’t all up on SoundCloud and Mixcloud yet (spoiler: that’s the exact reason the other pages aren’t finished either).',
    },
    framingKey: 'hero-demo-live',
    bgImageWebp: '/assets/bg-livesets.webp',
    bgImageJpg: '/assets/bg-livesets.jpg',
    accent: 'purple',
  },
  events: {
    slug: 'events',
    name: {
      it: 'Events',
      en: 'Events',
    },
    subtitle: {
      it: 'Archivio Serate, Date & Tracklist',
      en: 'Event Archive, Dates & Tracklists',
    },
    quips: {
      it: 'Le serate le abbiamo fatte davvero, giuro. Devo solo trovare il tempo di trascriverle qui sopra.',
      en: 'The gigs actually happened, I swear. I just need to find the time to type them up here.',
    },
    framingKey: 'hero-events',
    bgImageWebp: '/assets/bg-events.webp',
    bgImageJpg: '/assets/bg-events.jpg',
    accent: 'yellow',
  },
  partyhive: {
    slug: 'partyhive',
    name: {
      it: 'Partyhive',
      en: 'Partyhive',
    },
    subtitle: {
      it: 'Collective & Events, Trentino',
      en: 'Collective & Events, Trentino',
    },
    quips: {
      it: 'Nel frattempo ci trovi attivi h24 sul profilo Instagram ufficiale di Partyhive.',
      en: 'In the meantime, you can catch everything happening on Partyhive’s official Instagram.',
    },
    framingKey: 'hero-partyhive',
    bgImageWebp: '/assets/bg-partyhive.webp',
    bgImageJpg: '/assets/bg-partyhive.jpg',
    accent: 'purple',
    showPartyhiveInstagram: true,
  },
};

export const WIP_SLUGS = Object.keys(WIP_SECTIONS);

export const DEFAULT_WIP_SECTION: WipSectionConfig = {
  slug: 'sito',
  name: {
    it: 'questa sezione',
    en: 'this section',
  },
  subtitle: {
    it: 'Work in Progress',
    en: 'Work in Progress',
  },
  quips: {
    it: 'Sì, questa pagina è ancora un cantiere aperto. Ma i contatti sotto funzionano alla perfezione.',
    en: 'Yep, this page is still under construction. Good thing all the contacts below actually work.',
  },
  framingKey: 'hero-demo-live',
  bgImageWebp: '/assets/bg-page.webp',
  bgImageJpg: '/assets/bg-page.jpg',
  accent: 'purple',
};
