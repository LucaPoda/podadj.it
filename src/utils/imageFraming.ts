import { cardFramingConfig, type CardFraming } from '../config/imageFraming';

export function getFramingStyle(
  key: string,
  device: 'desktop' | 'mobile',
  fallbackWebp: string,
  fallbackJpg?: string
): string {
  const conf = cardFramingConfig[key]?.[device] || {
    position: 'center center',
    zoom: 1.0,
  };
  const webp = conf.imageWebp || fallbackWebp;
  const jpg = conf.imageJpg || fallbackJpg || fallbackWebp.replace('.webp', '.jpg');
  const zoom = conf.zoom || 1.0;
  const origin = conf.transformOrigin ? ` transform-origin: ${conf.transformOrigin};` : '';

  return `background-image: url('${webp}'), url('${jpg}'); background-position: ${conf.position}; transform: scale(${zoom});${origin}`;
}

export function getFramingConfig(key: string): CardFraming | undefined {
  return cardFramingConfig[key];
}
