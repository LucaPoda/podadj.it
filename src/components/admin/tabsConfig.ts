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
    phase: 'Fase 1–2',
    summary: 'Stato generale dei contenuti JSON, checklist operativa e priorità di aggiornamento.',
    plannedFeatures: [
      'Contatori live di eventi, tracklist, demo, live set e pacchetti service',
      'To-do automatici su eventi senza tracklist o media link incompleti',
      'Accesso rapido alle sezioni editabili da mobile e desktop',
    ],
  },
  {
    id: 'tracklists',
    label: 'Tracklists',
    shortLabel: 'Tracklists',
    icon: 'fas fa-list-ol',
    desktopOnly: true,
    phase: 'Fase 3',
    summary: 'Editor tabellare per le tracklist degli eventi con BPM, tonalità Camelot/key e riordino.',
    plannedFeatures: [
      'Import rapido da export Rekordbox / CSV / testo',
      'Modifica inline di titolo, artista, BPM e key con validazione Zod',
      'Riordino tracce drag-and-drop e numerazione automatica',
    ],
  },
  {
    id: 'events',
    label: 'Events',
    shortLabel: 'Events',
    icon: 'fas fa-calendar-days',
    desktopOnly: true,
    phase: 'Fase 3',
    summary: 'Gestione completa dei file JSON in src/content/events/ con testi IT/EN e setup audio.',
    plannedFeatures: [
      'Creazione, modifica e duplicazione schede evento',
      'Selettore format canonico e collegamenti ai live set registrati',
      'Note tecniche e debriefing bilingue IT / EN',
    ],
  },
  {
    id: 'demo-live',
    label: 'Demo & Live Sets',
    shortLabel: 'Demo & Live',
    icon: 'fas fa-compact-disc',
    desktopOnly: true,
    phase: 'Fase 4',
    summary: 'Gestione di demos.json e liveSets.json con preview player SoundCloud, Mixcloud e YouTube.',
    plannedFeatures: [
      'Editor demo ufficiali per format + selezione Extra & Eclectic',
      'Associazione live set -> scheda evento e verifica URL embed',
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
