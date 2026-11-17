import { z } from 'zod';
import { EventFormatSchema, LocalizedTextSchema } from './common';

export const EventTrackSchema = z.object({
  index: z.number().int().positive(),
  title: z.string().min(1),
  artist: z.string().min(1),
  bpm: z.number().positive().optional(),
  key: z.string().min(1).optional(),
});

export type EventTrack = z.infer<typeof EventTrackSchema>;

export const EventSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  title: LocalizedTextSchema,
  location: z.string().min(1),
  venue: z.string().optional(),
  format: EventFormatSchema,
  audioSetup: z.string().min(1),
  notes: LocalizedTextSchema,
  tracklist: z.array(EventTrackSchema).default([]),
});

export type EventData = z.infer<typeof EventSchema>;
