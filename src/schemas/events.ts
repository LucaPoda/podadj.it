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

const IsoDateTimeSchema = z
  .string()
  .min(1)
  .refine((val) => !Number.isNaN(Date.parse(val)), 'Deve essere un datetime ISO valido');

export const EventNotesSchema = z.object({
  it: z.string().default(''),
  en: z.string().default(''),
});

export const EventSchema = z
  .object({
    id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    title: LocalizedTextSchema,
    location: z.string().min(1),
    venue: z.string().optional(),
    format: EventFormatSchema,
    audioSetup: z.string().default(''),
    notes: EventNotesSchema.default({ it: '', en: '' }),
    tracklistId: z.string().min(1).optional(),
    liveSetId: z.string().min(1).optional(),
    tracklist: z.array(EventTrackSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const startMs = Date.parse(data.startAt);
    const endMs = Date.parse(data.endAt);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endAt'],
        message: 'L\'orario di fine (endAt) deve essere successivo all\'orario di inizio (startAt)',
      });
    }
  });

export type EventData = z.infer<typeof EventSchema>;
