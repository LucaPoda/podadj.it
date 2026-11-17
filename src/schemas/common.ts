import { z } from 'zod';

export const LocalizedTextSchema = z.object({
  it: z.string().min(1),
  en: z.string().min(1),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const CANONICAL_FORMATS = ['mainstage', 'party', 'groove', 'tech', 'other'] as const;
export const CanonicalFormatSchema = z.enum(CANONICAL_FORMATS);
export type CanonicalFormat = z.infer<typeof CanonicalFormatSchema>;

export const MusicFormatSchema = z.enum(['mainstage', 'party', 'groove', 'other']);
export type MusicFormat = z.infer<typeof MusicFormatSchema>;

export const LegacyEventFormatSchema = z.enum([
  'THE MAINSTAGE SIDE',
  'THE PARTY SIDE',
  'THE GROOVE SIDE',
  'THE TECH SIDE',
]);
export type LegacyEventFormat = z.infer<typeof LegacyEventFormatSchema>;

export const EventFormatSchema = z.union([CanonicalFormatSchema, LegacyEventFormatSchema]);
export type EventFormat = z.infer<typeof EventFormatSchema>;

export interface FormatMetadata {
  id: CanonicalFormat;
  fullTitle: string;
  shortLabel: string;
  badgeClass: string;
  eventBadgeClass: string;
  accentHex: string;
}

export const FORMAT_META: Record<CanonicalFormat, FormatMetadata> = {
  mainstage: {
    id: 'mainstage',
    fullTitle: 'THE MAINSTAGE SIDE',
    shortLabel: 'Mainstage',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    eventBadgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentHex: '#f59e0b',
  },
  party: {
    id: 'party',
    fullTitle: 'THE PARTY SIDE',
    shortLabel: 'Party',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    eventBadgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    accentHex: '#d946ef',
  },
  groove: {
    id: 'groove',
    fullTitle: 'THE GROOVE SIDE',
    shortLabel: 'Groove',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    eventBadgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentHex: '#06b6d4',
  },
  tech: {
    id: 'tech',
    fullTitle: 'THE TECH SIDE',
    shortLabel: 'Tech',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    eventBadgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    accentHex: '#3b82f6',
  },
  other: {
    id: 'other',
    fullTitle: 'EXTRA & ECLECTIC',
    shortLabel: 'Eclectic',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    eventBadgeClass: 'bg-neonPurple/20 text-purple-300 border-neonPurple/40',
    accentHex: '#a855f7',
  },
};

const LEGACY_TO_CANONICAL: Record<string, CanonicalFormat> = {
  mainstage: 'mainstage',
  'the mainstage side': 'mainstage',
  party: 'party',
  'the party side': 'party',
  groove: 'groove',
  'the groove side': 'groove',
  tech: 'tech',
  'the tech side': 'tech',
  other: 'other',
};

export function normalizeFormat(input: string): CanonicalFormat {
  const key = input.trim().toLowerCase();
  return LEGACY_TO_CANONICAL[key] ?? 'other';
}

export function getFormatMeta(input: string): FormatMetadata {
  return FORMAT_META[normalizeFormat(input)];
}
