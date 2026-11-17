import type { LocalizedText } from './liveSets';

export interface TrackHighlight {
  artist: string;
  title: string;
  remix?: string;
}

export interface Demo {
  id: string;
  title: LocalizedText;
  date: string;
  format: 'mainstage' | 'party' | 'groove' | 'other';
  badge?: LocalizedText;
  soundcloudUrl: string;
  duration?: string;
  description: LocalizedText;
  styleNotes?: LocalizedText;
  tags: string[];
  tracklistHighlights: TrackHighlight[];
}

export const demosData: Demo[] = [
  {
    id: 'demo-mainstage',
    title: {
      it: 'The Mainstage Side — Festival Demo 2026',
      en: 'The Mainstage Side — Festival Demo 2026',
    },
    date: '2026-03-01',
    format: 'mainstage',
    badge: {
      it: 'FESTIVAL ENERGY',
      en: 'FESTIVAL ENERGY',
    },
    soundcloudUrl: 'https://soundcloud.com/poda-dj',
    duration: '28:45',
    description: {
      it: 'Mixato promozionale ideato per grandi palchi all\'aperto e prime slot di festival elettronici. Scaletta costruita per un impatto istantaneo senza momenti di calo.',
      en: 'Promotional studio mix engineered for massive open-air stages and festival prime slots. Track selection built for immediate adrenaline with zero downtime.',
    },
    styleNotes: {
      it: 'Inizio su ritmi Festival Techno martellanti a 135 BPM, rapida ascesa verso Hard Techno e chiusura ad altissima intensità con kick Hardstyle e Rawstyle a 155 BPM. Drop energici e bassi devastanti.',
      en: 'Opens with pounding Festival Techno at 135 BPM, escalating through driving Hard Techno, culminating in high-velocity Hardstyle and Rawstyle kicks at 155 BPM.',
    },
    tags: ['Festival Techno', 'Hardstyle', 'Rawstyle', 'Rave EDM', 'Hard Dance'],
    tracklistHighlights: [
      { artist: 'Maddix', title: 'Heute Nacht', remix: 'Festival VIP Edit' },
      { artist: 'Hardwell & Sub Zero Project', title: 'Judgement Day' },
      { artist: 'Rebelion', title: 'City Lights', remix: 'PODA Festival Rework' },
      { artist: 'Creeds', title: 'Push Up', remix: 'Mainstage Tool' },
      { artist: 'PODA', title: 'Overdrive Anthem', remix: 'Original Edit' },
    ],
  },
  {
    id: 'demo-party',
    title: {
      it: 'The Party Side — Club & Vocal House Edits 2026',
      en: 'The Party Side — Club & Vocal House Edits 2026',
    },
    date: '2026-02-15',
    format: 'party',
    badge: {
      it: 'COMMERCIAL & VOCAL EDM',
      en: 'COMMERCIAL & VOCAL EDM',
    },
    soundcloudUrl: 'https://soundcloud.com/poda-dj',
    duration: '32:10',
    description: {
      it: 'Il lato più fresco e coinvolgente: una selezione studiata per feste universitarie, aperitivi dinamici ed eventi privati in cui la pista deve cantare e muoversi all\'unisono.',
      en: 'The freshest and most infectious side: curated for university events, upbeat aperitifs, and private parties where the whole crowd moves and sings together.',
    },
    styleNotes: {
      it: 'House solare e moderna, remix club attuali di hit pop e rielaborazioni di grandi classici da discoteca. Nessuna deriva trap o commerciale banale: solo ritmo pulsante a 126-128 BPM.',
      en: 'Vibrant modern house, upfront club remixes of pop hits, and reworked dancefloor anthems. Zero generic trap or radio trash: pure 126-128 BPM bounce and groove.',
    },
    tags: ['Commercial EDM', 'Vocal House', 'Club Edits', 'Dance Classics', 'House Reworks'],
    tracklistHighlights: [
      { artist: 'John Summit & Hayla', title: 'Where You Are', remix: 'Extended Club Mix' },
      { artist: 'FISHER & Aatig', title: 'Take It Off' },
      { artist: 'David Guetta vs Benny Benassi', title: 'Satisfaction', remix: '2026 Edit' },
      { artist: 'Fred again..', title: 'Danielle (smile on my face)', remix: 'PODA VIP Edit' },
      { artist: 'Peggy Gou', title: '(It Goes Like) Nanana', remix: 'House Rework' },
    ],
  },
  {
    id: 'demo-groove',
    title: {
      it: 'The Groove Side — Tech House & Hypnotic Techno 2026',
      en: 'The Groove Side — Tech House & Hypnotic Techno 2026',
    },
    date: '2026-01-20',
    format: 'groove',
    badge: {
      it: 'CLUBBING & UNDERGROUND',
      en: 'CLUBBING & UNDERGROUND',
    },
    soundcloudUrl: 'https://soundcloud.com/poda-dj',
    duration: '35:20',
    description: {
      it: 'Un viaggio pensato per gli amanti del clubbing underground. Dalle percussioni calde del warmup fino al cuore pulsante della notte tra synth acidi e linee di basso oscure.',
      en: 'A dedicated underground clubbing journey. From warm warmup percussions to the driving dark heart of the night loaded with acid synths and deep basslines.',
    },
    styleNotes: {
      it: 'Tech House serrata con sfumature Deep per poi addentrarsi nell\'Hypnotic Techno e nell\'Acid Techno in stile Drumcode. Precisione nei mix e flusso continuo senza pause.',
      en: 'Tight Tech House with deep rolling grooves progressing into hypnotic techno and Drumcode-style acid textures. Seamless layering and constant floor momentum.',
    },
    tags: ['Tech House', 'Hypnotic Techno', 'Deep House', 'Acid 303', 'Underground'],
    tracklistHighlights: [
      { artist: 'Dom Dolla', title: 'Rhyme Dust', remix: 'Dimension & PODA Edit' },
      { artist: 'Mau P', title: 'Drugs From Amsterdam', remix: 'Underground Mix' },
      { artist: 'Adam Beyer', title: 'Your Mind', remix: 'Hypnotic 2026 Cut' },
      { artist: 'Enrico Sangiuliano', title: 'The Sound of Techno' },
      { artist: 'PODA', title: 'Resonance 303', remix: 'Club Dub' },
    ],
  },
  {
    id: 'demo-eclectic-afro',
    title: {
      it: 'Afro House & Melodic Sunset Odyssey',
      en: 'Afro House & Melodic Sunset Odyssey',
    },
    date: '2026-04-05',
    format: 'other',
    badge: {
      it: 'SPECIAL SELECTION',
      en: 'SPECIAL SELECTION',
    },
    soundcloudUrl: 'https://soundcloud.com/poda-dj',
    duration: '40:15',
    description: {
      it: 'Set e registrazioni fuori dai format standard. Selezione elegante e ipnotica con percussioni africane organiche, vocal caldi e synth melodici eterei.',
      en: 'Sets and recordings outside standard formats. Elegant and hypnotic selection with organic Afro percussions, warm vocals, and ethereal melodic synths.',
    },
    styleNotes: {
      it: 'Ispirato alle atmosfere di Ibiza e Mykonos (Keinemusik, Black Coffee, &ME). Calibrato per terrazze panoramiche, tramonti sul lago e cocktail party esclusivi.',
      en: 'Inspired by the sonic landscapes of Ibiza and Mykonos (Keinemusik, Black Coffee, &ME). Perfect for rooftop lounges, lakeside sunsets, and exclusive cocktail parties.',
    },
    tags: ['Afro House', 'Organic House', 'Melodic Sunset', 'Deep Lounge', 'Keinemusik Vibe'],
    tracklistHighlights: [
      { artist: '&ME, Rampa, Adam Port', title: 'Say What' },
      { artist: 'Black Coffee ft. Sabrina Claudio', title: 'SBCNCSLY' },
      { artist: 'Moojo & Demayä', title: 'Lotus' },
      { artist: 'PODA', title: 'Safari Dreams', remix: 'Organic Mix' },
    ],
  },
  {
    id: 'demo-eclectic-acid',
    title: {
      it: 'Deep Hypnotic & Industrial Live Session',
      en: 'Deep Hypnotic & Industrial Live Session',
    },
    date: '2026-03-20',
    format: 'other',
    badge: {
      it: 'EXPERIMENTAL',
      en: 'EXPERIMENTAL',
    },
    soundcloudUrl: 'https://soundcloud.com/poda-dj',
    duration: '45:00',
    description: {
      it: 'Esplorazione sonora sperimentale per appassionati di musica elettronica pura. Sintetizzatori analogici, drum machine Roland e texture industriali ipnotiche.',
      en: 'Experimental sound exploration for pure electronic music enthusiasts. Analog synthesizers, Roland drum machines, and hypnotic industrial textures.',
    },
    styleNotes: {
      it: 'Nessun vocal radiofonico: groove minimali serrati a 132 BPM, modulazioni di filtri in tempo reale e riverberi profondi per clubroom oscure.',
      en: 'No radio vocals: tight minimalist grooves at 132 BPM, real-time filter modulations, and deep subterranean reverbs for dark clubrooms.',
    },
    tags: ['Industrial Techno', 'Modular Synth', 'Deep Hypnosis', 'Acid 303', 'Raw Sound'],
    tracklistHighlights: [
      { artist: 'Planetary Assault Systems', title: 'In From The Night' },
      { artist: 'DVS1', title: 'Black Russian' },
      { artist: 'Robert Hood', title: 'Drive (The Age of Automation)' },
      { artist: 'PODA', title: 'Analog Pulse 02', remix: 'Live Mod Jam' },
    ],
  },
];
