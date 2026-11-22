import { z } from 'zod';
import { LocalizedTextSchema } from './common';

export const TechPackageSchema = z.object({
  id: z.string().min(1),
  name: LocalizedTextSchema,
  tag: LocalizedTextSchema,
  badge: LocalizedTextSchema.optional(),
  capacity: LocalizedTextSchema,
  description: LocalizedTextSchema,
  isFeatured: z.boolean().optional(),
  features: z.array(LocalizedTextSchema).min(1),
});

export type TechPackage = z.infer<typeof TechPackageSchema>;

export const EquipmentSpecSchema = z.object({
  category: LocalizedTextSchema,
  model: z.string().min(1),
  highlight: LocalizedTextSchema,
  specs: z.array(LocalizedTextSchema).min(1),
  icon: z.string().min(1),
});

export type EquipmentSpec = z.infer<typeof EquipmentSpecSchema>;

export const GalleryItemSchema = z.object({
  id: z.string().min(1),
  imageWebp: z.string().min(1),
  imageJpg: z.string().min(1),
  title: LocalizedTextSchema,
  caption: LocalizedTextSchema,
  tag: LocalizedTextSchema,
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const TechSideDataSchema = z.object({
  techPackages: z.array(TechPackageSchema).min(1),
  equipmentBreakdown: z.array(EquipmentSpecSchema).min(1),
  techGallery: z.array(GalleryItemSchema).min(1),
});

export type TechSideData = z.infer<typeof TechSideDataSchema>;
