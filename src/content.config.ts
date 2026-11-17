import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { EventSchema } from './schemas/events';

const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: EventSchema,
});

export const collections = {
  events,
};
