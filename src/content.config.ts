import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { EventSchema } from './schemas/events';
import { TracklistSchema } from './schemas/tracklist';

const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: EventSchema,
});

const tracklists = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tracklists' }),
  schema: TracklistSchema,
});

export const collections = {
  events,
  tracklists,
};
