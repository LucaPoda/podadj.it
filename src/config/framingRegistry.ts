import type { ImageFramingConfig } from '../schemas/imageFraming';

export type FramingKeyId =
  | 'mainstage-side'
  | 'party-side'
  | 'groove-side'
  | 'tech-side'
  | 'demo-live'
  | 'events'
  | 'partyhive';

export type FramingConfigKeyId =
  | 'mainstage-side'
  | 'hero-mainstage'
  | 'quicknav-mainstage'
  | 'party-side'
  | 'hero-party'
  | 'quicknav-party'
  | 'groove-side'
  | 'hero-groove'
  | 'quicknav-groove'
  | 'tech-side'
  | 'hero-tech-side'
  | 'demo-live'
  | 'hero-demo-live'
  | 'events'
  | 'hero-events'
  | 'partyhive'
  | 'hero-partyhive';

export type FramingPageId =
  | 'home-bento'
  | 'home-mobile'
  | 'format-pages'
  | 'demo-live-sets'
  | 'tech-side-page'
  | 'events-page'
  | 'partyhive-page';

export type FramingContainerVariant =
  | 'bento-row'
  | 'bento-tall'
  | 'bento-bottom'
  | 'mobile-expandable'
  | 'mobile-tall'
  | 'mobile-grid-square'
  | 'mobile-wide'
  | 'hero-banner'
  | 'quick-nav-card';

export interface FramingKeyMeta {
  key: FramingKeyId;
  title: string;
  subtitle: string;
  defaultWebp: string;
  defaultJpg: string;
  accent: 'amber' | 'fuchsia' | 'cyan' | 'purple' | 'blue' | 'yellow';
}

export interface FramingUsage {
  id: string;
  framingKey: FramingKeyId;
  configKey: FramingConfigKeyId;
  pageId: FramingPageId;
  pageLabel: string;
  route: string;
  viewportSupport: 'desktop' | 'mobile' | 'both';
  slotLabel: string;
  dimensionsNote: string;
  variant: FramingContainerVariant;
  insetExpand: boolean;
  filterCss: string;
  overlayClassName: string;
  /** Real rendered pixel width of this single container in By-Image standalone preview */
  desktopBoxWidthPx: number;
  mobileBoxWidthPx: number;
  /** Exact height style or null if determined naturally by content (e.g. HeroBanner) */
  desktopHeightPx: number | null;
  mobileHeightPx: number | null;
  previewTitle: string;
  previewSubtitle?: string;
}

export interface FramingPageMeta {
  id: FramingPageId;
  label: string;
  route: string;
  description: string;
  primaryViewport: 'desktop' | 'mobile' | 'both';
  desktopStageWidthPx: number;
  mobileStageWidthPx: number;
}

export interface FramingAssetOption {
  label: string;
  webp: string;
  jpg: string;
}

export const KNOWN_PUBLIC_ASSET_OPTIONS: FramingAssetOption[] = [
  { label: 'Mainstage Side (bg-mainstage)', webp: '/assets/bg-mainstage.webp', jpg: '/assets/bg-mainstage.jpg' },
  { label: 'Party Side (bg-party)', webp: '/assets/bg-party.webp', jpg: '/assets/bg-party.jpg' },
  { label: 'Groove Side (bg-groove)', webp: '/assets/bg-groove.webp', jpg: '/assets/bg-groove.jpg' },
  { label: 'The Tech Side (bg-tech)', webp: '/assets/bg-tech.webp', jpg: '/assets/bg-tech.jpg' },
  { label: 'Demo & Live Sets (bg-livesets)', webp: '/assets/bg-livesets.webp', jpg: '/assets/bg-livesets.jpg' },
  { label: 'Events (bg-events)', webp: '/assets/bg-events.webp', jpg: '/assets/bg-events.jpg' },
  { label: 'Partyhive (bg-partyhive)', webp: '/assets/bg-partyhive.webp', jpg: '/assets/bg-partyhive.jpg' },
  { label: 'Sfondo Generale (bg-page)', webp: '/assets/bg-page.webp', jpg: '/assets/bg-page.jpg' },
];

export const FRAMING_KEYS_META: Record<FramingKeyId, FramingKeyMeta> = {
  'mainstage-side': {
    key: 'mainstage-side',
    title: 'THE MAINSTAGE SIDE',
    subtitle: 'Club Culture, Big Room & Festival Energy',
    defaultWebp: '/assets/bg-mainstage.webp',
    defaultJpg: '/assets/bg-mainstage.jpg',
    accent: 'amber',
  },
  'party-side': {
    key: 'party-side',
    title: 'THE PARTY SIDE',
    subtitle: 'Commercial, Dance Hits & Open Format',
    defaultWebp: '/assets/bg-party.webp',
    defaultJpg: '/assets/bg-party.jpg',
    accent: 'fuchsia',
  },
  'groove-side': {
    key: 'groove-side',
    title: 'THE GROOVE SIDE',
    subtitle: 'Tech House, Deep & Minimal Rolling Basslines',
    defaultWebp: '/assets/bg-groove.webp',
    defaultJpg: '/assets/bg-groove.jpg',
    accent: 'cyan',
  },
  'tech-side': {
    key: 'tech-side',
    title: 'THE TECH SIDE',
    subtitle: 'Audio Pro 2.2, FOH Digitale & Show Luci DMX',
    defaultWebp: '/assets/bg-tech.webp',
    defaultJpg: '/assets/bg-tech.jpg',
    accent: 'purple',
  },
  'demo-live': {
    key: 'demo-live',
    title: 'DEMO & LIVE SETS',
    subtitle: 'Ascolta Mixati Ufficiali & Live Recordings',
    defaultWebp: '/assets/bg-livesets.webp',
    defaultJpg: '/assets/bg-livesets.jpg',
    accent: 'purple',
  },
  events: {
    key: 'events',
    title: 'EVENTS & SCHEDULE',
    subtitle: 'Prossime Date & Archivio Storico Performance',
    defaultWebp: '/assets/bg-events.webp',
    defaultJpg: '/assets/bg-events.jpg',
    accent: 'blue',
  },
  partyhive: {
    key: 'partyhive',
    title: 'PARTYHIVE',
    subtitle: 'Collettivo Eventi Open-Air & Clubbing in Trentino',
    defaultWebp: '/assets/bg-partyhive.webp',
    defaultJpg: '/assets/bg-partyhive.jpg',
    accent: 'yellow',
  },
};

export const FRAMING_PAGES: FramingPageMeta[] = [
  {
    id: 'home-bento',
    label: 'Home Bento',
    route: '/',
    description: 'Griglia 2fr / 1fr (max-w-6xl = 1152px): 3 righe da 148px a sinistra, Tech Side 484px e 3 card inferiori da 148px.',
    primaryViewport: 'desktop',
    desktopStageWidthPx: 1152,
    mobileStageWidthPx: 358,
  },
  {
    id: 'home-mobile',
    label: 'Home Linktree',
    route: '/',
    description: 'Layout smartphone (390px, area 358px): 3 espandibili 92px, Tech Side 300px, griglia 2 colonne 144px e Partyhive 144px.',
    primaryViewport: 'mobile',
    desktopStageWidthPx: 1152,
    mobileStageWidthPx: 358,
  },
  {
    id: 'format-pages',
    label: 'Format Pages (Hero)',
    route: '/mainstage-side · /party-side · /groove-side',
    description: 'HeroBanner dedicati dei tre format musicali (max-w-5xl = 1024px desktop / 358px mobile).',
    primaryViewport: 'both',
    desktopStageWidthPx: 1024,
    mobileStageWidthPx: 358,
  },
  {
    id: 'demo-live-sets',
    label: 'Demo & Live Sets',
    route: '/demo-live-sets',
    description: 'HeroBanner hero-demo-live (1024px) + 3 quick-nav format cards (330px × 165px desktop / 358px × 135px mobile).',
    primaryViewport: 'both',
    desktopStageWidthPx: 1024,
    mobileStageWidthPx: 358,
  },
  {
    id: 'tech-side-page',
    label: 'The Tech Side',
    route: '/tech-side',
    description: 'HeroBanner della pagina service audio & luci (1024px desktop / 358px mobile).',
    primaryViewport: 'both',
    desktopStageWidthPx: 1024,
    mobileStageWidthPx: 358,
  },
  {
    id: 'events-page',
    label: 'Events',
    route: '/events',
    description: 'HeroBanner del calendario date e archivio eventi (1024px desktop / 358px mobile).',
    primaryViewport: 'both',
    desktopStageWidthPx: 1024,
    mobileStageWidthPx: 358,
  },
  {
    id: 'partyhive-page',
    label: 'Partyhive',
    route: '/partyhive',
    description: 'HeroBanner della pagina collettivo Partyhive (1024px desktop / 358px mobile).',
    primaryViewport: 'both',
    desktopStageWidthPx: 1024,
    mobileStageWidthPx: 358,
  },
];

export const FRAMING_USAGES: FramingUsage[] = [
  // HOME BENTO (DESKTOP — max-w-6xl = 1152px, gap-5 = 20px -> 2fr = 755px, 1fr = 377px)
  {
    id: 'bento-mainstage',
    framingKey: 'mainstage-side',
    configKey: 'mainstage-side',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Col 1 Riga 1',
    dimensionsNote: '755 × 148px (inset -15px)',
    variant: 'bento-row',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE MAINSTAGE SIDE',
  },
  {
    id: 'bento-party',
    framingKey: 'party-side',
    configKey: 'party-side',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Col 1 Riga 2',
    dimensionsNote: '755 × 148px (inset -15px)',
    variant: 'bento-row',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE PARTY SIDE',
  },
  {
    id: 'bento-groove',
    framingKey: 'groove-side',
    configKey: 'groove-side',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Col 1 Riga 3',
    dimensionsNote: '755 × 148px (inset -15px)',
    variant: 'bento-row',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE GROOVE SIDE',
  },
  {
    id: 'bento-tech',
    framingKey: 'tech-side',
    configKey: 'tech-side',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Row-Span 3',
    dimensionsNote: '377 × 484px (inset -15px)',
    variant: 'bento-tall',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 377,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 484,
    mobileHeightPx: 300,
    previewTitle: 'THE TECH SIDE',
  },
  {
    id: 'bento-demo-live',
    framingKey: 'demo-live',
    configKey: 'demo-live',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Inferiore 1/3',
    dimensionsNote: '371 × 148px (inset -15px)',
    variant: 'bento-bottom',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 173,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'DEMO & LIVE SETS',
  },
  {
    id: 'bento-events',
    framingKey: 'events',
    configKey: 'events',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Inferiore 2/3',
    dimensionsNote: '371 × 148px (inset -15px)',
    variant: 'bento-bottom',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 173,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'EVENTS',
  },
  {
    id: 'bento-partyhive',
    framingKey: 'partyhive',
    configKey: 'partyhive',
    pageId: 'home-bento',
    pageLabel: 'Home Bento (Desktop)',
    route: '/',
    viewportSupport: 'desktop',
    slotLabel: 'Home Bento · Inferiore 3/3',
    dimensionsNote: '371 × 148px (inset -15px)',
    variant: 'bento-bottom',
    insetExpand: true,
    filterCss: 'brightness(0.85)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'PARTYHIVE',
  },

  // HOME LINKTREE (MOBILE — 390px viewport - 32px px-4 = 358px, 2-col gap-3 = 173px)
  {
    id: 'mobile-mainstage',
    framingKey: 'mainstage-side',
    configKey: 'mainstage-side',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Card 1',
    dimensionsNote: '358 × 92px',
    variant: 'mobile-expandable',
    insetExpand: false,
    filterCss: 'brightness(0.8) contrast(1.05)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE MAINSTAGE SIDE',
  },
  {
    id: 'mobile-party',
    framingKey: 'party-side',
    configKey: 'party-side',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Card 2',
    dimensionsNote: '358 × 92px',
    variant: 'mobile-expandable',
    insetExpand: false,
    filterCss: 'brightness(0.8) contrast(1.05)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE PARTY SIDE',
  },
  {
    id: 'mobile-groove',
    framingKey: 'groove-side',
    configKey: 'groove-side',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Card 3',
    dimensionsNote: '358 × 92px',
    variant: 'mobile-expandable',
    insetExpand: false,
    filterCss: 'brightness(0.8) contrast(1.05)',
    overlayClassName: 'bg-black/25',
    desktopBoxWidthPx: 755,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 92,
    previewTitle: 'THE GROOVE SIDE',
  },
  {
    id: 'mobile-tech',
    framingKey: 'tech-side',
    configKey: 'tech-side',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Service',
    dimensionsNote: '358 × 300px',
    variant: 'mobile-tall',
    insetExpand: false,
    filterCss: 'brightness(0.82) contrast(1.05)',
    overlayClassName: 'bg-gradient-to-t from-black/85 via-black/30 to-black/20',
    desktopBoxWidthPx: 377,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 484,
    mobileHeightPx: 300,
    previewTitle: 'THE TECH SIDE',
  },
  {
    id: 'mobile-demo-live',
    framingKey: 'demo-live',
    configKey: 'demo-live',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Grid Sinistra',
    dimensionsNote: '173 × 144px',
    variant: 'mobile-grid-square',
    insetExpand: false,
    filterCss: 'brightness(0.8) contrast(1.05)',
    overlayClassName: 'bg-gradient-to-t from-black/85 via-black/40 to-black/25',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 173,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'DEMO & LIVE SETS',
  },
  {
    id: 'mobile-events',
    framingKey: 'events',
    configKey: 'events',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Grid Destra',
    dimensionsNote: '173 × 144px',
    variant: 'mobile-grid-square',
    insetExpand: false,
    filterCss: 'brightness(0.8) contrast(1.05)',
    overlayClassName: 'bg-gradient-to-t from-black/85 via-black/40 to-black/25',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 173,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'EVENTS',
  },
  {
    id: 'mobile-partyhive',
    framingKey: 'partyhive',
    configKey: 'partyhive',
    pageId: 'home-mobile',
    pageLabel: 'Home Linktree (Mobile)',
    route: '/',
    viewportSupport: 'mobile',
    slotLabel: 'Home Mobile · Panoramica',
    dimensionsNote: '358 × 144px',
    variant: 'mobile-wide',
    insetExpand: false,
    filterCss: 'brightness(0.82) contrast(1.05)',
    overlayClassName: 'bg-gradient-to-t from-black/80 via-black/35 to-black/20',
    desktopBoxWidthPx: 371,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 148,
    mobileHeightPx: 144,
    previewTitle: 'PARTYHIVE',
  },

  // FORMAT HERO BANNERS (max-w-5xl = 1024px desktop / 358px mobile, Title only)
  {
    id: 'hero-mainstage',
    framingKey: 'mainstage-side',
    configKey: 'hero-mainstage',
    pageId: 'format-pages',
    pageLabel: 'Format Page: Mainstage',
    route: '/mainstage-side',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /mainstage-side',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'THE MAINSTAGE SIDE',
  },
  {
    id: 'hero-party',
    framingKey: 'party-side',
    configKey: 'hero-party',
    pageId: 'format-pages',
    pageLabel: 'Format Page: Party',
    route: '/party-side',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /party-side',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'THE PARTY SIDE',
  },
  {
    id: 'hero-groove',
    framingKey: 'groove-side',
    configKey: 'hero-groove',
    pageId: 'format-pages',
    pageLabel: 'Format Page: Groove',
    route: '/groove-side',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /groove-side',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'THE GROOVE SIDE',
  },

  // DEMO & LIVE SETS PAGE
  {
    id: 'hero-demo-live',
    framingKey: 'demo-live',
    configKey: 'hero-demo-live',
    pageId: 'demo-live-sets',
    pageLabel: 'Demo & Live Sets',
    route: '/demo-live-sets',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /demo-live-sets',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'DEMO & LIVE SETS',
  },
  {
    id: 'quicknav-mainstage',
    framingKey: 'mainstage-side',
    configKey: 'quicknav-mainstage',
    pageId: 'demo-live-sets',
    pageLabel: 'Demo & Live Sets',
    route: '/demo-live-sets',
    viewportSupport: 'both',
    slotLabel: 'Quick-Nav Card · Mainstage',
    dimensionsNote: '331 × 165px desktop / 358 × 135px mobile',
    variant: 'quick-nav-card',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-black/90 via-black/45 to-black/20',
    desktopBoxWidthPx: 331,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 165,
    mobileHeightPx: 135,
    previewTitle: 'THE MAINSTAGE SIDE',
  },
  {
    id: 'quicknav-party',
    framingKey: 'party-side',
    configKey: 'quicknav-party',
    pageId: 'demo-live-sets',
    pageLabel: 'Demo & Live Sets',
    route: '/demo-live-sets',
    viewportSupport: 'both',
    slotLabel: 'Quick-Nav Card · Party',
    dimensionsNote: '331 × 165px desktop / 358 × 135px mobile',
    variant: 'quick-nav-card',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-black/90 via-black/45 to-black/20',
    desktopBoxWidthPx: 331,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 165,
    mobileHeightPx: 135,
    previewTitle: 'THE PARTY SIDE',
  },
  {
    id: 'quicknav-groove',
    framingKey: 'groove-side',
    configKey: 'quicknav-groove',
    pageId: 'demo-live-sets',
    pageLabel: 'Demo & Live Sets',
    route: '/demo-live-sets',
    viewportSupport: 'both',
    slotLabel: 'Quick-Nav Card · Groove',
    dimensionsNote: '331 × 165px desktop / 358 × 135px mobile',
    variant: 'quick-nav-card',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-black/90 via-black/45 to-black/20',
    desktopBoxWidthPx: 331,
    mobileBoxWidthPx: 358,
    desktopHeightPx: 165,
    mobileHeightPx: 135,
    previewTitle: 'THE GROOVE SIDE',
  },

  // OTHER DEDICATED HERO PAGES
  {
    id: 'hero-tech-side',
    framingKey: 'tech-side',
    configKey: 'hero-tech-side',
    pageId: 'tech-side-page',
    pageLabel: 'The Tech Side',
    route: '/tech-side',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /tech-side',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'THE TECH SIDE',
    previewSubtitle: 'Noleggio sound system professionale e regia tecnica dedicata per DJ set ed eventi fino a 250 persone.',
  },
  {
    id: 'hero-events',
    framingKey: 'events',
    configKey: 'hero-events',
    pageId: 'events-page',
    pageLabel: 'Events',
    route: '/events',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /events',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'EVENTS',
    previewSubtitle: 'Report post-evento con debriefing tecnico, setup impianto audio e tracklist completa di ogni set.',
  },
  {
    id: 'hero-partyhive',
    framingKey: 'partyhive',
    configKey: 'hero-partyhive',
    pageId: 'partyhive-page',
    pageLabel: 'Partyhive',
    route: '/partyhive',
    viewportSupport: 'both',
    slotLabel: 'HeroBanner · /partyhive',
    dimensionsNote: '1024px desktop / 358px mobile',
    variant: 'hero-banner',
    insetExpand: false,
    filterCss: 'brightness(0.45)',
    overlayClassName: 'bg-gradient-to-t from-[#050508] via-black/55 to-black/35',
    desktopBoxWidthPx: 1024,
    mobileBoxWidthPx: 358,
    desktopHeightPx: null,
    mobileHeightPx: null,
    previewTitle: 'PARTYHIVE',
    previewSubtitle: 'Collettivo di DJ, producer e organizzatori di eventi musicali attivi in Trentino e dintorni.',
  },
];

export function getFramingUsagesByKey(key: FramingKeyId): FramingUsage[] {
  return FRAMING_USAGES.filter((u) => u.framingKey === key);
}

export function getFramingUsagesByPage(pageId: FramingPageId): FramingUsage[] {
  return FRAMING_USAGES.filter((u) => u.pageId === pageId);
}

export function getGroupForConfigKey(configKey: FramingConfigKeyId): FramingKeyId {
  const match = FRAMING_USAGES.find((u) => u.configKey === configKey);
  return match?.framingKey ?? 'mainstage-side';
}

export function getConfigKeysForGroup(groupKey: FramingKeyId): FramingConfigKeyId[] {
  return Array.from(
    new Set(FRAMING_USAGES.filter((u) => u.framingKey === groupKey).map((u) => u.configKey))
  );
}

export interface AssetGroupSummary {
  assetPath: string;
  label: string;
  framingKeys: FramingKeyId[];
  configKeys: FramingConfigKeyId[];
  usagesCount: number;
}

/**
 * Derives an asset-oriented index across all independent occurrence keys,
 * gallery assets, and staged uploads.
 */
export function getFramingAssetGroups(
  framingConfig: ImageFramingConfig,
  extraAssetPaths: string[] = []
): AssetGroupSummary[] {
  const byAsset = new Map<
    string,
    { groups: Set<FramingKeyId>; configs: Set<FramingConfigKeyId> }
  >();

  for (const usage of FRAMING_USAGES) {
    const conf = framingConfig[usage.configKey] ?? framingConfig[usage.framingKey];
    const meta = FRAMING_KEYS_META[usage.framingKey];
    const dPath = conf?.desktop?.imageJpg || conf?.desktop?.imageWebp || meta.defaultJpg;
    const mPath = conf?.mobile?.imageJpg || conf?.mobile?.imageWebp || meta.defaultJpg;

    for (const p of [dPath, mPath]) {
      const normalized = p.startsWith('/') ? p : `/${p}`;
      if (!byAsset.has(normalized)) {
        byAsset.set(normalized, { groups: new Set(), configs: new Set() });
      }
      const entry = byAsset.get(normalized)!;
      entry.groups.add(usage.framingKey);
      entry.configs.add(usage.configKey);
    }
  }

  for (const extra of extraAssetPaths) {
    const normalized = extra.startsWith('/') ? extra : `/${extra}`;
    if (!byAsset.has(normalized)) {
      byAsset.set(normalized, { groups: new Set(), configs: new Set() });
    }
  }

  return Array.from(byAsset.entries()).map(([assetPath, entry]) => {
    const framingKeys = Array.from(entry.groups);
    const configKeys = Array.from(entry.configs);
    const known = KNOWN_PUBLIC_ASSET_OPTIONS.find(
      (opt) => opt.jpg === assetPath || opt.webp === assetPath
    );
    return {
      assetPath,
      label: known?.label || assetPath.split('/').pop() || assetPath,
      framingKeys,
      configKeys,
      usagesCount: configKeys.length,
    };
  });
}
