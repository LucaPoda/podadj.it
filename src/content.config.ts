import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: z.object({
    id: z.string(),
    date: z.string(),
    title: z.object({
      it: z.string(),
      en: z.string(),
    }),
    location: z.string(),
    venue: z.string().optional(),
    format: z.enum(['THE PARTY SIDE', 'THE GROOVE SIDE', 'THE MAINSTAGE SIDE', 'THE TECH SIDE']),
    audioSetup: z.string(),
    notes: z.object({
      it: z.string(),
      en: z.string(),
    }),
    tracklist: z.array(
      z.object({
        index: z.number(),
        title: z.string(),
        artist: z.string(),
        bpm: z.number().optional(),
        key: z.string().optional(),
      })
    ).default([]),
  }),
});

const liveSets = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/live-sets' }),
  schema: z.object({
    id: z.string(),
    date: z.string(),
    title: z.string(),
    format: z.enum(['THE PARTY SIDE', 'THE GROOVE SIDE', 'THE MAINSTAGE SIDE']),
    subgenre: z.string(),
    soundCloudUrl: z.string(),
    duration: z.string().optional(),
  }),
});

export const collections = {
  events,
  'live-sets': liveSets,
};
