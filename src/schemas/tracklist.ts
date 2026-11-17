import { z } from 'zod';

export const TRACK_TYPES = ['original', 'remix', 'edit', 'bootleg', 'mashup'] as const;
export const TrackTypeSchema = z.enum(TRACK_TYPES);
export type TrackType = z.infer<typeof TrackTypeSchema>;

export const TRACKLIST_SOURCE_TYPES = ['history', 'playlist', 'manual'] as const;
export const TracklistSourceTypeSchema = z.enum(TRACKLIST_SOURCE_TYPES);
export type TracklistSourceType = z.infer<typeof TracklistSourceTypeSchema>;

export const OriginalTrackRefSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  spotifyUrl: z.string().url().optional(),
  soundcloudUrl: z.string().url().optional(),
});

export type OriginalTrackRef = z.infer<typeof OriginalTrackRefSchema>;

export const PlayedVersionSchema = z.object({
  label: z.string().min(1).optional(),
  spotifyUrl: z.string().url().optional(),
  soundcloudUrl: z.string().url().optional(),
});

export type PlayedVersion = z.infer<typeof PlayedVersionSchema>;

export const TrackSyncMetaSchema = z.object({
  normalizedTitle: z.string(),
  normalizedArtists: z.string(),
  filePathHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'filePathHash deve essere uno SHA-256 esadecimale valido')
    .optional(),
  lastRekordboxTrackId: z.string().min(1).optional(),
});

export type TrackSyncMeta = z.infer<typeof TrackSyncMetaSchema>;

export const TracklistEntrySchema = z.object({
  index: z.number().int().positive(),
  title: z.string().min(1),
  artist: z.string().min(1),
  trackType: TrackTypeSchema.default('original'),
  playedVersion: PlayedVersionSchema.default({}),
  originalTracks: z.array(OriginalTrackRefSchema).default([]),
  bpm: z.number().positive().optional(),
  key: z.string().min(1).optional(),
  genre: z.string().min(1).optional(),
  myTags: z.array(z.string().min(1)).default([]),
  rating: z.number().int().min(0).max(5).optional(),
  label: z.string().min(1).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  syncMeta: TrackSyncMetaSchema,
});

export type TracklistEntry = z.infer<typeof TracklistEntrySchema>;

export const TracklistSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'ID tracklist deve essere uno slug lowercase alfanumerico'),
  title: z.string().min(1),
  sourceType: TracklistSourceTypeSchema,
  sourceName: z.string().min(1),
  recordedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'recordedDate deve essere in formato YYYY-MM-DD')
    .optional(),
  updatedAt: z.string().min(1),
  tracks: z.array(TracklistEntrySchema),
});

export type TracklistData = z.infer<typeof TracklistSchema>;
