import fs from 'node:fs/promises';
import path from 'node:path';
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
} from '../src/schemas';

const DATA_SCHEMA_MAP: Record<string, ZodTypeAny> = {
  'siteLinks.json': SiteLinksSchema,
  'demos.json': DemosDataSchema,
  'liveSets.json': LiveSetsDataSchema,
  'techSide.json': TechSideDataSchema,
  'imageFraming.json': ImageFramingConfigSchema,
};

interface ValidationResult {
  file: string;
  ok: boolean;
  error?: string;
}

async function validateJsonFile(filePath: string, schema: ZodTypeAny): Promise<ValidationResult> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `  - [${issue.path.join('.') || '<root>'}] ${issue.message}`)
        .join('\n');
      return { file: filePath, ok: false, error: `Schema validation failed:\n${details}` };
    }
    return { file: filePath, ok: true };
  } catch (err) {
    return {
      file: filePath,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const results: ValidationResult[] = [];

  // 1. Validate src/data/*.json
  const dataDir = 'src/data';
  const dataFiles = (await fs.readdir(dataDir)).filter((f) => f.endsWith('.json')).sort();
  for (const file of dataFiles) {
    const schema = DATA_SCHEMA_MAP[file];
    const filePath = path.join(dataDir, file);
    if (!schema) {
      results.push({
        file: filePath,
        ok: false,
        error: `No Zod schema registered for data file "${file}"`,
      });
      continue;
    }
    results.push(await validateJsonFile(filePath, schema));
  }

  // Ensure every registered data file exists
  for (const expectedFile of Object.keys(DATA_SCHEMA_MAP)) {
    if (!dataFiles.includes(expectedFile)) {
      results.push({
        file: path.join(dataDir, expectedFile),
        ok: false,
        error: `Expected data file is missing`,
      });
    }
  }

  // 2. Validate src/i18n/*.json
  const i18nDir = 'src/i18n';
  const i18nFiles = (await fs.readdir(i18nDir)).filter((f) => f.endsWith('.json')).sort();
  for (const file of i18nFiles) {
    results.push(await validateJsonFile(path.join(i18nDir, file), I18nSchema));
  }

  // 3. Validate src/content/events/*.json
  const eventsDir = 'src/content/events';
  const eventFiles = (await fs.readdir(eventsDir)).filter((f) => f.endsWith('.json')).sort();
  for (const file of eventFiles) {
    results.push(await validateJsonFile(path.join(eventsDir, file), EventSchema));
  }

  // 4. Validate src/content/tracklists/*.json (if any)
  const tracklistsDir = 'src/content/tracklists';
  try {
    const tracklistFiles = (await fs.readdir(tracklistsDir)).filter((f) => f.endsWith('.json')).sort();
    for (const file of tracklistFiles) {
      results.push(await validateJsonFile(path.join(tracklistsDir, file), TracklistSchema));
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  let hasError = false;
  for (const res of results) {
    if (res.ok) {
      console.log(`PASS  ${res.file}`);
    } else {
      hasError = true;
      console.error(`FAIL  ${res.file}\n${res.error}`);
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nValidated ${results.length} JSON files: ${passed} passed, ${results.length - passed} failed.`);

  if (hasError) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error during data validation:', err);
  process.exit(1);
});
