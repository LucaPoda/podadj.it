import imageFramingJson from '../data/imageFraming.json';
import type { CardDeviceConfig, CardFraming, ImageFramingConfig } from '../schemas/imageFraming';

export type { CardDeviceConfig, CardFraming, ImageFramingConfig };

export const cardFramingConfig: ImageFramingConfig = imageFramingJson as ImageFramingConfig;
