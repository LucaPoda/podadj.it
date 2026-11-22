import demosJson from './demos.json';
import type { Demo, TrackHighlight } from '../schemas/demos';
import type { LocalizedText, MusicFormat } from '../schemas/common';

export type { Demo, TrackHighlight, LocalizedText, MusicFormat };

export const demosData: Demo[] = demosJson as Demo[];
