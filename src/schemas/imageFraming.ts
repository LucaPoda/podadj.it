import { z } from 'zod';

export const CardDeviceConfigSchema = z.object({
  position: z.string().min(1),
  zoom: z.number().positive().optional(),
  transformOrigin: z.string().min(1).optional(),
  imageWebp: z.string().min(1).optional(),
  imageJpg: z.string().min(1).optional(),
});

export type CardDeviceConfig = z.infer<typeof CardDeviceConfigSchema>;

export const CardFramingSchema = z.object({
  desktop: CardDeviceConfigSchema,
  mobile: CardDeviceConfigSchema,
});

export type CardFraming = z.infer<typeof CardFramingSchema>;

export const ImageFramingConfigSchema = z.record(z.string().min(1), CardFramingSchema);

export type ImageFramingConfig = z.infer<typeof ImageFramingConfigSchema>;
