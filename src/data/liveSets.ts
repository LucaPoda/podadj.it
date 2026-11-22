import liveSetsJson from './liveSets.json';
import type { LiveSet, MediaType } from '../schemas/liveSets';
import type { LocalizedText, MusicFormat } from '../schemas/common';

export type LiveSetFormat = MusicFormat;
export type { LiveSet, MediaType, LocalizedText };

export const liveSetsData: LiveSet[] = liveSetsJson as LiveSet[];
