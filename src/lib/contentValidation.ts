import type { ZodTypeAny } from 'zod';
import {
  DemosDataSchema,
  EventSchema,
  I18nSchema,
  ImageFramingConfigSchema,
  LiveSetsDataSchema,
  SiteLinksSchema,
  TechSideDataSchema,
  TracklistSchema,
} from '../schemas';

const FIXED_DATA_SCHEMAS: Record<string, ZodTypeAny> = {
  'src/data/siteLinks.json': SiteLinksSchema,
  'src/data/demos.json': DemosDataSchema,
  'src/data/liveSets.json': LiveSetsDataSchema,
  'src/data/techSide.json': TechSideDataSchema,
  'src/data/imageFraming.json': ImageFramingConfigSchema,
  'src/i18n/it.json': I18nSchema,
  'src/i18n/en.json': I18nSchema,
};

const EVENT_PATH_RE = /^src\/content\/events\/[a-z0-9][a-z0-9_-]*\.json$/;
const TRACKLIST_PATH_RE = /^src\/content\/tracklists\/[a-z0-9][a-z0-9_-]*\.json$/;
const SAFE_BINARY_ASSET_RE =
  /^assets\/(?:tech-gallery|uploads)\/[a-z0-9][a-z0-9._-]*\.(?:jpg|jpeg|png|webp)$/i;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ContentValidationResult =
  | { ok: true; data: unknown }
  | { ok: false; issues: ValidationIssue[] };

export function isAllowedContentPath(filePath: string): boolean {
  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) {
    return false;
  }
  if (filePath in FIXED_DATA_SCHEMAS) {
    return true;
  }
  return EVENT_PATH_RE.test(filePath) || TRACKLIST_PATH_RE.test(filePath);
}

export function isEditableTreeJsonPath(filePath: string): boolean {
  return isAllowedContentPath(filePath);
}

export function isAllowedBinaryAssetPath(filePath: string): boolean {
  if (!filePath || filePath.includes('..') || filePath.startsWith('/')) {
    return false;
  }
  return SAFE_BINARY_ASSET_RE.test(filePath);
}

export function isAllowedRepoWritePath(filePath: string): boolean {
  return isAllowedContentPath(filePath) || isAllowedBinaryAssetPath(filePath);
}

export function getSchemaForContentPath(filePath: string): ZodTypeAny | null {
  if (filePath in FIXED_DATA_SCHEMAS) {
    return FIXED_DATA_SCHEMAS[filePath];
  }
  if (EVENT_PATH_RE.test(filePath)) {
    return EventSchema;
  }
  if (TRACKLIST_PATH_RE.test(filePath)) {
    return TracklistSchema;
  }
  return null;
}

export function validateContentFile(filePath: string, data: unknown): ContentValidationResult {
  if (!isAllowedContentPath(filePath)) {
    return {
      ok: false,
      issues: [{ path: '<file>', message: `Path "${filePath}" is not an allowed CMS JSON path` }],
    };
  }

  const schema = getSchemaForContentPath(filePath);
  if (!schema) {
    return {
      ok: false,
      issues: [{ path: '<file>', message: `No Zod schema registered for "${filePath}"` }],
    };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.') || '<root>',
        message: issue.message,
      })),
    };
  }

  return { ok: true, data: parsed.data };
}

export function validateSnapshotFiles(files: Record<string, unknown>): {
  ok: boolean;
  errors: Record<string, ValidationIssue[]>;
} {
  const errors: Record<string, ValidationIssue[]> = {};
  for (const [filePath, data] of Object.entries(files)) {
    const res = validateContentFile(filePath, data);
    if (!res.ok) {
      errors[filePath] = res.issues;
    }
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatCanonicalJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
