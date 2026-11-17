import type { LocalizedText } from './liveSets';

export interface TechPackage {
  id: string;
  name: LocalizedText;
  tag: LocalizedText;
  badge?: LocalizedText;
  capacity: LocalizedText;
  description: LocalizedText;
  isFeatured?: boolean;
  features: LocalizedText[];
}

export interface EquipmentSpec {
  category: LocalizedText;
  model: string;
  highlight: LocalizedText;
  specs: LocalizedText[];
  icon: string;
}

export interface GalleryItem {
  id: string;
  imageWebp: string;
  imageJpg: string;
  title: LocalizedText;
  caption: LocalizedText;
  tag: LocalizedText;
}

export const techPackages: TechPackage[] = [
  {
    id: 'all-in-one',
    name: {
      it: 'All-in-One Completo (Audio + Luci)',
      en: 'All-in-One Complete (Audio + Lighting)',
    },
    tag: {
      it: 'Soluzione Consigliata',
      en: 'Recommended Solution',
    },
    badge: {
      it: 'TOP CHOICE',
      en: 'TOP CHOICE',
    },
    capacity: {
      it: 'Fino a 250 persone (Indoor / Outdoor)',
      en: 'Up to 250 guests (Indoor / Outdoor)',
    },
    description: {
      it: 'Impianto audio 2.2 ad alta potenza + console Pioneer DJ + mixer di regia digitale Wi-Fi + show luci DMX sincronizzato. Il pacchetto definitivo "chiavi in mano" per feste ed eventi open-air.',
      en: 'High-power 2.2 PA sound system + Pioneer DJ console + Wi-Fi digital FOH mixer + synchronized DMX lightshow. The ultimate turnkey package for parties and open-air events.',
    },
    isFeatured: true,
    features: [
      {
        it: '2x Diffusori Proel DIVA 15A bi-amplificati (1000W peak cad.) su stativi',
        en: '2x Proel DIVA 15A bi-amplified top speakers (1000W peak each) with heavy-duty stands',
      },
      {
        it: '2x Subwoofer Proel DIVA SUB 18A (1200W peak cad.) per bassi profondi e controllati',
        en: '2x Proel DIVA SUB 18A subwoofers (1200W peak each) for deep, punchy low-end',
      },
      {
        it: 'Console Pioneer DJ XDJ-RX3 all-in-one con touchscreen da 10.1"',
        en: 'Pioneer DJ XDJ-RX3 all-in-one console with 10.1" responsive touchscreen',
      },
      {
        it: 'Mixer digitale Behringer X-AIR XR16 con taratura acustica wireless da iPad in pista',
        en: 'Behringer X-AIR XR16 digital mixer with wireless iPad acoustic calibration directly on the dancefloor',
      },
      {
        it: 'Show luci DMX: 2 teste mobili su stativo + 2 faretti LED wash fixed controllati da software',
        en: 'DMX lightshow: 2 moving heads on stand + 2 fixed LED wash fixtures controlled via software',
      },
      {
        it: 'Cassa spia monitor DJ dedicata, stativo Quik Lok DJ233 e linea di backup audio cablata',
        en: 'Dedicated DJ booth monitor speaker, Quik Lok DJ233 DJ stand, and redundant wired audio backup',
      },
      {
        it: 'Trasporto, montaggio professionale, cablaggi schermati e taratura inclusi',
        en: 'Professional transport, on-site setup, shielded cabling, and room acoustic tuning included',
      },
    ],
  },
  {
    id: 'solo-audio',
    name: {
      it: 'Solo Audio Completo',
      en: 'Full Audio Setup',
    },
    tag: {
      it: 'Suono ad Alta Definizione',
      en: 'High-Definition Audio',
    },
    capacity: {
      it: 'Fino a 250 persone',
      en: 'Up to 250 guests',
    },
    description: {
      it: 'Tops + Subwoofer + Mixer di Regia Digitale + Console Pioneer DJ. Tutta la potenza e la pulizia del sistema 2.2 PODA per chi ha già un setup luci o per eventi diurni.',
      en: 'Tops + Subwoofers + Digital FOH Mixer + Pioneer DJ Console. Full power and clarity of the PODA 2.2 system for daytime gigs or venues with existing lighting.',
    },
    isFeatured: false,
    features: [
      {
        it: 'Diffusori Tops Proel DIVA 15A (coppia) su stativi ad altezza regolabile',
        en: 'Pair of Proel DIVA 15A tops on adjustable heavy-duty tripod stands',
      },
      {
        it: 'Subwoofer Proel DIVA SUB 18A (coppia) per una risposta frequenze 2.2 simmetrica',
        en: 'Pair of Proel DIVA SUB 18A subwoofers for symmetrical 2.2 frequency balance',
      },
      {
        it: 'Console Pioneer DJ XDJ-RX3 con flight case e stativo Quik Lok DJ233',
        en: 'Pioneer DJ XDJ-RX3 console with flight case and Quik Lok DJ233 stand',
      },
      {
        it: 'Regia digitale Behringer X-AIR XR16 con controllo Wi-Fi e gestione volumi separata',
        en: 'Behringer X-AIR XR16 digital mixer with Wi-Fi control and separate booth/master routing',
      },
      {
        it: 'Cassa monitor spia DJ per la console e cavi professionali bilanciati',
        en: 'Dedicated DJ booth monitor and high-grade balanced audio cables',
      },
    ],
  },
  {
    id: 'solo-diffusione',
    name: {
      it: 'Solo Diffusione / Casse',
      en: 'PA Speakers Only',
    },
    tag: {
      it: 'Aperitivi & Speech',
      en: 'Aperitifs & Speeches',
    },
    capacity: {
      it: 'Fino a 100-150 persone (o estendibile con sub)',
      en: 'Up to 100-150 guests (or expandable with subs)',
    },
    description: {
      it: 'Coppia di diffusori Proel DIVA 15A con stativi professionali. Perfetto per sonorizzazioni di aperitivi, speech aziendali o come impianto audio per DJ dotati di propria console.',
      en: 'Pair of Proel DIVA 15A active speakers with professional stands. Perfect for cocktail receptions, corporate speeches, or as sound reinforcement for visiting DJs with their own decks.',
    },
    isFeatured: false,
    features: [
      {
        it: '2x Casse attive Proel DIVA 15A (1000W peak cad.) con DSP a 4 preset',
        en: '2x Proel DIVA 15A active speakers (1000W peak each) with 4-preset onboard DSP',
      },
      {
        it: '2x Stativi professionali in alluminio con borsa di trasporto',
        en: '2x Heavy-duty aluminum tripod stands with travel bag',
      },
      {
        it: 'Cablaggi di segnale bilanciati XLR e prolunghe alimentazione dedicate',
        en: 'Balanced XLR signal cables and dedicated power extensions',
      },
      {
        it: 'Opzione aggiunta 1 o 2 subwoofer Proel DIVA SUB 18A su richiesta',
        en: 'Optional addition of 1 or 2 Proel DIVA SUB 18A subwoofers on request',
      },
    ],
  },
  {
    id: 'solo-console',
    name: {
      it: 'Solo Console DJ',
      en: 'DJ Console Only',
    },
    tag: {
      it: 'Rider & DJ Set',
      en: 'DJ Rider & Sets',
    },
    capacity: {
      it: 'Per DJ, locali e club con impianto già presente',
      en: 'For DJs, venues, and clubs with existing sound system',
    },
    description: {
      it: 'Pioneer DJ XDJ-RX3 a due canali in flight case professionale, completa di stativo Quik Lok DJ233. Lo standard di settore per DJ che necessitano di una console affidabile e performante.',
      en: 'Pioneer DJ XDJ-RX3 2-channel all-in-one system in flight case with Quik Lok DJ233 stand. The industry-standard all-in-one workstation for demanding performers.',
    },
    isFeatured: false,
    features: [
      {
        it: 'Pioneer DJ XDJ-RX3 con schermo touch da 10.1 pollici ad alta frequenza di fotogrammi',
        en: 'Pioneer DJ XDJ-RX3 featuring a 10.1-inch high-frame-rate responsive touchscreen',
      },
      {
        it: 'Supporto doppio drive USB, rekordbox e modalità controller',
        en: 'Dual USB drive support, rekordbox ready, and PC/Mac controller mode',
      },
      {
        it: 'Stativo professionale ripiegabile Quik Lok DJ233 robusto e stabile',
        en: 'Quik Lok DJ233 foldable professional DJ workstation stand',
      },
      {
        it: 'Flight case rigido su misura per trasporto sicuro e cavi di collegamento XLR bilanciati',
        en: 'Custom heavy-duty flight case for secure transport and balanced XLR cables',
      },
    ],
  },
];

export const equipmentBreakdown: EquipmentSpec[] = [
  {
    category: {
      it: 'Diffusori Principali (Tops)',
      en: 'Main Speakers (Tops)',
    },
    model: 'Proel DIVA 15A (Coppia)',
    highlight: {
      it: 'Diffusori attivi bi-amplificati da 15" per alta pressione e massima definizione',
      en: '15" active bi-amplified speakers for high SPL and crystalline clarity',
    },
    icon: 'fas fa-volume-high',
    specs: [
      {
        it: 'Potenza: 1000W di picco (amplificatore digitale in Classe D)',
        en: 'Power: 1000W peak (high-efficiency Class-D digital amplifier)',
      },
      {
        it: 'Risposta in frequenza: 45 Hz - 20 kHz con DSP ad alta risoluzione a 24-bit',
        en: 'Frequency response: 45 Hz - 20 kHz with high-resolution 24-bit DSP processing',
      },
      {
        it: 'Driver a compressione da 1" ad alta efficienza per voci limpide e acuti brillanti',
        en: '1" high-efficiency compression driver for crystal-clear vocals and bright highs',
      },
      {
        it: 'Cabinet in polipropilene leggero e resistente con doppia impugnatura e foro per stativo',
        en: 'Rugged lightweight polypropylene enclosure with dual handles and pole mount socket',
      },
    ],
  },
  {
    category: {
      it: 'Subwoofer Attivi',
      en: 'Active Subwoofers',
    },
    model: 'Proel DIVA SUB 18A (Coppia)',
    highlight: {
      it: 'Subwoofer attivo da 18" in configurazione 2.2 simmetrica per bassi profondi e controllati',
      en: '18" active subwoofer in symmetrical 2.2 setup for deep, controlled low frequencies',
    },
    icon: 'fas fa-compact-disc',
    specs: [
      {
        it: 'Potenza: 1200W di picco con woofer da 18" a lunga escursione',
        en: 'Power: 1200W peak with long-excursion 18" custom woofer',
      },
      {
        it: 'Risposta da 35 Hz per far tremare la pista senza distorsioni',
        en: 'Frequency extension down to 35 Hz delivering physical punch without distortion',
      },
      {
        it: 'Crossover stereo integrato regolabile per un allineamento di fase perfetto con i tops',
        en: 'Integrated adjustable stereo crossover for phase-aligned coupling with tops',
      },
      {
        it: 'Costruzione in multistrato di betulla con verniciatura anti-graffio e griglia in acciaio',
        en: 'Heavy-duty birch plywood cabinet with anti-scratch coating and steel grille',
      },
    ],
  },
  {
    category: {
      it: 'Regia Digitale Wi-Fi',
      en: 'Digital Wi-Fi FOH Mixer',
    },
    model: 'Behringer X-AIR XR16',
    highlight: {
      it: 'Regia digitale controllabile da iPad/smartphone direttamente dal centro pista',
      en: 'Digital console controlled remotely via iPad/smartphone straight from the dancefloor',
    },
    icon: 'fas fa-sliders',
    specs: [
      {
        it: 'Taratura acustica FOH in tempo reale senza essere vincolati alla consolle',
        en: 'Real-time FOH acoustic tuning anywhere in the room without booth confinement',
      },
      {
        it: 'Routing indipendente tra Master pubblico e Booth monitor DJ per volumi sempre ottimali',
        en: 'Independent routing between crowd Master and DJ Booth monitor for zero ear fatigue',
      },
      {
        it: 'Equalizzatore parametrico a 31 bande, compressori dedicati e limiter salvaguardia diffusori',
        en: '31-band graphic EQ, dedicated compressors, and brickwall limiters to protect speakers',
      },
      {
        it: 'Registrazione live stereo diretta su USB senza interferire con i livelli della serata',
        en: 'Direct stereo USB live recording without interfering with the ongoing event mix',
      },
    ],
  },
  {
    category: {
      it: 'Console DJ Professionale',
      en: 'Pro DJ Workstation',
    },
    model: 'Pioneer DJ XDJ-RX3',
    highlight: {
      it: 'Sistema all-in-one professionale a due canali con touchscreen da 10.1 pollici',
      en: '2-channel professional all-in-one system with responsive 10.1-inch touchscreen',
    },
    icon: 'fas fa-headphones',
    specs: [
      {
        it: 'Display touch ad altissima risoluzione per navigazione rapida e visualizzazione forme d\'onda',
        en: 'High-res touchscreen for rapid playlist browsing and expanded 3-band waveforms',
      },
      {
        it: 'Jog wheel calibrate con display LCD centrale per controllo scratch e pitch accurato',
        en: 'Full-size feeling jog wheels with on-jog LCD displays for precise pitch & scratch',
      },
      {
        it: '14 Beat FX e 6 Sound Color FX ereditati dallo standard club Pioneer DJM-900NXS2',
        en: '14 Beat FX and 6 Sound Color FX inherited from the industry-standard DJM-900NXS2',
      },
      {
        it: 'Doppia porta USB per cambi DJ istantanei senza interruzione di musica',
        en: 'Dual USB ports allowing instant, seamless DJ transitions without silence',
      },
    ],
  },
  {
    category: {
      it: 'Show Luci & Effetti DMX',
      en: 'DMX Lighting & Visual FX',
    },
    model: 'Moving Heads + LED Wash DMX System',
    highlight: {
      it: '2 teste mobili su stativo + 2 faretti LED wash fixed con controllo software DMX',
      en: '2 moving heads on stand + 2 fixed LED wash fixtures with software DMX control',
    },
    icon: 'fas fa-lightbulb',
    specs: [
      {
        it: 'Controllo software QLC+ su laptop con scene dinamiche sincronizzate a tempo di musica',
        en: 'QLC+ software control on laptop with dynamic scenes synchronized to musical tempo',
      },
      {
        it: 'Fasci luminosi motorizzati a 360°, gobo rotanti ed effetti strobo per il peak time',
        en: '360° motorized beam movement, rotating gobos, and high-impact strobes for peak moments',
      },
      {
        it: 'Color wash fixed per illuminazione d\'atmosfera elegante durante aperitivi e warmup',
        en: 'Fixed color wash for sophisticated atmospheric illumination during aperitifs and warmup',
      },
      {
        it: 'Programmi ed effetti personalizzabili su richiesta per temi e brand specifici',
        en: 'Fully custom programmable cues and color palettes tailored to event themes and branding',
      },
    ],
  },
  {
    category: {
      it: 'Monitoring, Supporti & Sicurezza',
      en: 'Monitoring, Stands & Backup',
    },
    model: 'Setup Cablaggi & Redundancy',
    highlight: {
      it: 'Casse spia dedicate, stativo Quik Lok DJ233, cablaggi professionali e linea audio di backup',
      en: 'Dedicated DJ booth monitor, Quik Lok DJ233 stand, pro cabling, and wired backup lines',
    },
    icon: 'fas fa-shield-halved',
    specs: [
      {
        it: 'Cassa spia attiva posizionata ad altezza orecchio per ascolto preciso in console',
        en: 'Active booth monitor positioned at ear level for pinpoint cueing and mixing accuracy',
      },
      {
        it: 'Stativo professionale ripiegabile Quik Lok DJ233 ad altissima stabilità',
        en: 'Quik Lok DJ233 professional foldable workstation for maximum console stability',
      },
      {
        it: 'Cavi bilanciati ad alta schermatura Tasker/Neutrik per annullare ogni ronzio o interferenza',
        en: 'High-shielding balanced Tasker/Neutrik cables eliminating ground hum and interference',
      },
      {
        it: 'Linea audio analogica di emergenza e sorgente secondaria pronta al subentro istantaneo',
        en: 'Secondary analog audio emergency line and backup playback source for zero silence risk',
      },
    ],
  },
];

export const techGallery: GalleryItem[] = [
  {
    id: 'setup-openair',
    imageWebp: '/assets/bg-tech.webp',
    imageJpg: '/assets/bg-tech.jpg',
    title: {
      it: 'Setup Impianto 2.2 Open-Air',
      en: 'Open-Air 2.2 System Setup',
    },
    caption: {
      it: 'Coppia Proel DIVA 15A con doppio subwoofer 18A in configurazione simmetrica per eventi all\'aperto.',
      en: 'Pair of Proel DIVA 15A with dual 18A subwoofers in symmetrical alignment for open-air venues.',
    },
    tag: {
      it: '2.2 Full Audio',
      en: '2.2 Full Audio',
    },
  },
  {
    id: 'setup-booth',
    imageWebp: '/assets/bg-mainstage.webp',
    imageJpg: '/assets/bg-mainstage.jpg',
    title: {
      it: 'Console Pioneer DJ XDJ-RX3',
      en: 'Pioneer DJ XDJ-RX3 Booth',
    },
    caption: {
      it: 'Postazione DJ con flight case, stativo Quik Lok e monitor spia dedicato per controllo totale.',
      en: 'DJ workstation with heavy-duty flight case, Quik Lok stand, and dedicated booth monitor.',
    },
    tag: {
      it: 'DJ Workstation',
      en: 'DJ Workstation',
    },
  },
  {
    id: 'setup-lights',
    imageWebp: '/assets/bg-party.webp',
    imageJpg: '/assets/bg-party.jpg',
    title: {
      it: 'Show Luci DMX in Azione',
      en: 'DMX Lighting Show in Action',
    },
    caption: {
      it: 'Teste mobili motorizzate ed effetti wash sincronizzati a tempo per massima energia in pista.',
      en: 'Motorized moving heads and wash effects synchronized to music tempo for peak dancefloor vibes.',
    },
    tag: {
      it: 'DMX Lighting',
      en: 'DMX Lighting',
    },
  },
  {
    id: 'setup-tuning',
    imageWebp: '/assets/bg-groove.webp',
    imageJpg: '/assets/bg-groove.jpg',
    title: {
      it: 'Taratura FOH Digitale con iPad',
      en: 'iPad Wireless FOH Tuning',
    },
    caption: {
      it: 'Regolazione dei livelli e del DSP direttamente tra il pubblico per un\'acustica omogenea.',
      en: 'Volume and DSP adjustments handled directly inside the crowd for balanced acoustic coverage.',
    },
    tag: {
      it: 'Wireless FOH',
      en: 'Wireless FOH',
    },
  },
];

export function getPrefilledMailto(locale: 'it' | 'en', packageName?: string): string {
  const email = 'booking@podadj.it';
  
  if (locale === 'it') {
    const pkgText = packageName ? ` (${packageName})` : '';
    const subject = encodeURIComponent(`Richiesta Preventivo Service - [Nome Evento]`);
    const body = encodeURIComponent(
`Ciao Luca,

Vorrei richiedere un preventivo per il seguente evento${pkgText}:

- Tipo di evento (privato, festa, open-air, aziendale):
- Data e orari indicativi:
- Location (città, indoor/outdoor):
- Numero previsto di persone:
- Pacchetto di interesse (Audio + Luci, Solo Audio, Solo Casse, Solo Console, Altro): ${packageName || ''}
- Eventuali esigenze extra (monitor spia, microfoni, ecc.):

Grazie!`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  } else {
    const pkgText = packageName ? ` (${packageName})` : '';
    const subject = encodeURIComponent(`Service Quote Request - [Event Name]`);
    const body = encodeURIComponent(
`Hi Luca,

I would like to request a quote for the following event${pkgText}:

- Event type (private, party, open-air, corporate):
- Indicative date and times:
- Location (city, indoor/outdoor):
- Expected number of guests:
- Package of interest (Audio + Lighting, Full Audio, PA Speakers Only, DJ Console Only, Other): ${packageName || ''}
- Any extra needs (booth monitor, microphones, etc.):

Thank you!`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }
}
