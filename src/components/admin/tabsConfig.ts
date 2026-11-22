export type AdminTabId =
  | 'overview'
  | 'tracklists'
  | 'events'
  | 'demo-live'
  | 'tech-side'
  | 'framing'
  | 'texts-links'
  | 'review-publish';

export interface AdminTabConfig {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  icon: string;
  desktopOnly: boolean;
  phase: string;
  summary: string;
  plannedFeatures: string[];
}

export const ADMIN_TABS: AdminTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview & To-Do',
    shortLabel: 'Overview',
    icon: 'fas fa-gauge-high',
    desktopOnly: false,
    phase: 'Fase 4',
    summary: 'Contatori live dal workspace, Card To-Do automatiche per eventi passati incompleti e stato pubblicazione.',
    plannedFeatures: [
      'Contatori live di eventi (prossimi/passati), tracklist, demo e live set',
      'To-do automatici per eventi passati senza tracklist o note/setup audio',
      'Accesso rapido alle sezioni mobile-friendly e jump diretti su desktop',
    ],
  },
  {
    id: 'tracklists',
    label: 'Tracklists',
    shortLabel: 'Tracklists',
    icon: 'fas fa-list-ol',
    desktopOnly: true,
    phase: 'Fase 3–4',
    summary: 'Archivio tracklist, Auto-Sync XML Rekordbox (Events YYYY/HISTORIES + tag globali), import file singolo UTF-16/TSV e Spotify Web API.',
    plannedFeatures: [
      'Caricamento XML Rekordbox con auto-sync tag globali e rilevamento nuove History',
      'Import da file singolo esportato (.txt/.tsv/.csv) o testo incollato',
      'Ricerca batch preview Spotify Web API e tabella editabile completa',
    ],
  },
  {
    id: 'events',
    label: 'Events',
    shortLabel: 'Events',
    icon: 'fas fa-calendar-days',
    desktopOnly: true,
    phase: 'Fase 4',
    summary: 'Gestione completa di src/content/events/*.json con orari espliciti (post-mezzanotte), ciclo Futuro -> Passato e collegamenti Tracklist/Live Set.',
    plannedFeatures: [
      'Separazione automatica Prossimi Eventi vs Eventi Passati',
      'Orari startAt/endAt Europe/Rome con supporto chiusura dopo mezzanotte',
      'Collegamento diretto a Tracklist JSON e Live Set registrati',
    ],
  },
  {
    id: 'demo-live',
    label: 'Demo & Live Sets',
    shortLabel: 'Demo & Live',
    icon: 'fas fa-compact-disc',
    desktopOnly: true,
    phase: 'Fase 4',
    summary: 'Gestione completa di demos.json e liveSets.json con collegamento a Tracklist, eventi reali e validazione URL media.',
    plannedFeatures: [
      'Editor demo ufficiali per format + selezione Extra & Eclectic + tracklistId',
      'CRUD live set con dropdown eventi reali ed embed SoundCloud/Mixcloud/YouTube',
      'Gestione tag, highlight tracklist e durate',
    ],
  },
  {
    id: 'tech-side',
    label: 'The Tech Side',
    shortLabel: 'Tech Side',
    icon: 'fas fa-sliders',
    desktopOnly: true,
    phase: 'Fase 5',
    summary: 'Configurazione pacchetti service, specifiche hardware e galleria fotografica con upload foto ottimizzate in techSide.json.',
    plannedFeatures: [
      'Editor pacchetti Chiavi in Mano e badge TOP CHOICE con AI IT/EN',
      'Gestione scheda hardware (Proel, Behringer, Pioneer, DMX) con icon picker FontAwesome',
      'Upload foto compresse verso assets/tech-gallery/ con conversione automatica .webp/.jpg',
    ],
  },
  {
    id: 'framing',
    label: 'Framing Editor',
    shortLabel: 'Framing',
    icon: 'fas fa-crop-simple',
    desktopOnly: true,
    phase: 'Fase 6',
    summary: 'Calibrazione visuale di posizione X/Y, zoom (%) e transform-origin per Desktop e Mobile in imageFraming.json.',
    plannedFeatures: [
      'Doppia modalità Per Immagine e Per Pagina (Home Bento, Mobile Linktree, HeroBanner, Quick-Nav)',
      'Controlli precisi Desktop/Mobile con copia tra viewport e ripristino da main',
      'Anteprima live identica al CSS pubblico (incluso inset -15px)',
    ],
  },
  {
    id: 'texts-links',
    label: 'Testi, Link & Traduzioni',
    shortLabel: 'Testi & Link',
    icon: 'fas fa-language',
    desktopOnly: false,
    phase: 'Fase 5',
    summary: 'Gestione centralizzata di siteLinks.json e dei copy bilingue it.json / en.json con assistente AI Gemini.',
    plannedFeatures: [
      'Modifica email ufficiale, handle social, link Privacy Policy con sync footer IT/EN',
      'Editor copy IT / EN ricercabile per sezione con controllo parità chiavi e Zod',
      'Ottimizzazione DJ-style e traduzione Pro-Audio IT → EN con Gemini AI',
    ],
  },
  {
    id: 'review-publish',
    label: 'Revisione & Pubblicazione',
    shortLabel: 'Pubblica',
    icon: 'fas fa-rocket',
    desktopOnly: false,
    phase: 'Fase 2',
    summary: 'Diff leggibile campo-per-campo, salvataggio bozza (draft/*) e apertura Pull Request verso main.',
    plannedFeatures: [
      'Riepilogo leggibile delle modifiche rispetto alla branch di produzione',
      'Salvataggio bozza temporanea su branch draft/* con rilevamento e ripristino',
      'Validazione Zod server-side e creazione/aggiornamento Pull Request con CI automatica',
    ],
  },
];
