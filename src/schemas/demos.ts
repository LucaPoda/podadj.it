import { z } from 'zod';
import { LocalizedTextSchema, MusicFormatSchema } from './common';

export const TrackHighlightSchema = z.object({
  artist: z.string().min(1),
  title: z.string().min(1),
  remix: z.string().min(1).optional(),
});

export type TrackHighlight = z.infer<typeof TrackHighlightSchema>;

export const DemoSchema = z.object({
  id: z.string().min(1),
  title: LocalizedTextSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  format: MusicFormatSchema,
  badge: LocalizedTextSchema.optional(),
  soundcloudUrl: z.string().url(),
  duration: z.string().min(1).optional(),
  description: LocalizedTextSchema,
  styleNotes: LocalizedTextSchema.optional(),
  tags: z.array(z.string().min(1)),
  tracklistId: z.string().min(1).optional(),
  tracklistHighlights: z.array(TrackHighlightSchema),
});

export type Demo = z.infer<typeof DemoSchema>;

export const DemosDataSchema = z.array(DemoSchema).min(1);
