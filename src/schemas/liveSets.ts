import { z } from 'zod';
import { LocalizedTextSchema, MusicFormatSchema } from './common';

export const MediaTypeSchema = z.enum(['soundcloud', 'mixcloud', 'youtube']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const LiveSetSchema = z.object({
  id: z.string().min(1),
  title: LocalizedTextSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  venue: z.string().min(1),
  city: z.string().min(1),
  format: MusicFormatSchema,
  timeSlot: LocalizedTextSchema,
  description: LocalizedTextSchema,
  eventSlug: z.string().min(1),
  duration: z.string().min(1).optional(),
  mediaType: MediaTypeSchema.optional(),
  mediaUrl: z.string().url().optional(),
  soundcloudUrl: z.string().url().optional(),
  mixcloudUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
});

export type LiveSet = z.infer<typeof LiveSetSchema>;

export const LiveSetsDataSchema = z.array(LiveSetSchema);
