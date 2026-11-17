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
    phase: 'Fase 4',
    summary: 'Configurazione pacchetti service, specifiche hardware e galleria fotografica in techSide.json.',
    plannedFeatures: [
      'Editor pacchetti Chiavi in Mano e badge TOP CHOICE',
      'Gestione scheda hardware (Proel, Behringer, Pioneer, DMX)',
      'Ordinamento e didascalie IT/EN della galleria foto',
    ],
  },
  {
    id: 'framing',
    label: 'Framing Editor',
    shortLabel: 'Framing',
    icon: 'fas fa-crop-simple',
    desktopOnly: true,
    phase: 'Fase 5',
    summary: 'Calibrazione visuale di posizione, zoom e transform-origin per Desktop e Mobile in imageFraming.json.',
    plannedFeatures: [
      'Anteprima live side-by-side delle card desktop Bento e mobile Linktree',
      'Controlli precisi per background-position, scale e transform-origin',
      'Reset rapido ai valori calibrati esistenti',
    ],
  },
  {
    id: 'texts-links',
    label: 'Testi, Link & Traduzioni',
    shortLabel: 'Testi & Link',
    icon: 'fas fa-language',
    desktopOnly: false,
    phase: 'Fase 5',
    summary: 'Gestione centralizzata di siteLinks.json e dei copy bilingue it.json / en.json.',
    plannedFeatures: [
      'Modifica email ufficiale, handle social, link Privacy Policy',
      'Editor copy IT / EN organizzato per pagina e sezione',
      'Controllo parità chiavi tra italiano e inglese',
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
