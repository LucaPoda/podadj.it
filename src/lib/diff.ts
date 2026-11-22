export type DiffChangeKind = 'added' | 'modified' | 'deleted';

export interface FieldChange {
  path: string;
  kind: DiffChangeKind;
  before?: string;
  after?: string;
}

export interface FileDiffSummary {
  filePath: string;
  status: DiffChangeKind;
  changes: FieldChange[];
}

export interface SnapshotOperations {
  upserts: Array<{ path: string; data: unknown }>;
  deletes: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatPreviewValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length > 140 ? `${value.slice(0, 137)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const serialized = JSON.stringify(value);
  return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

function getArrayItemKey(item: unknown): string | null {
  if (!isPlainObject(item)) return null;
  if (typeof item.id === 'string' && item.id.length > 0) return `id=${item.id}`;
  if (typeof item.index === 'number') return `#${item.index}`;
  return null;
}

function collectFieldChanges(
  before: unknown,
  after: unknown,
  currentPath: string,
  out: FieldChange[]
): void {
  if (deepEqual(before, after)) return;

  if (before === undefined) {
    out.push({
      path: currentPath || '<file>',
      kind: 'added',
      after: formatPreviewValue(after),
    });
    return;
  }

  if (after === undefined) {
    out.push({
      path: currentPath || '<file>',
      kind: 'deleted',
      before: formatPreviewValue(before),
    });
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    for (const key of keys) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      collectFieldChanges(before[key], after[key], nextPath, out);
    }
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const canKeyById =
      (before.length === 0 || before.every((x) => getArrayItemKey(x) !== null)) &&
      (after.length === 0 || after.every((x) => getArrayItemKey(x) !== null));

    if (canKeyById && (before.length > 0 || after.length > 0)) {
      const beforeMap = new Map<string, unknown>();
      const afterMap = new Map<string, unknown>();
      const allKeys: string[] = [];

      for (const item of before) {
        const k = getArrayItemKey(item)!;
        if (!beforeMap.has(k)) {
          beforeMap.set(k, item);
          allKeys.push(k);
        }
      }
      for (const item of after) {
        const k = getArrayItemKey(item)!;
        if (!afterMap.has(k)) {
          afterMap.set(k, item);
          if (!allKeys.includes(k)) allKeys.push(k);
        }
      }

      // If keys are identical, check whether order changed too
      const beforeOrder = before.map((x) => getArrayItemKey(x)!);
      const afterOrder = after.map((x) => getArrayItemKey(x)!);
      const sameKeySet =
        beforeOrder.length === afterOrder.length &&
        beforeOrder.every((k) => afterMap.has(k));
      if (sameKeySet && !deepEqual(beforeOrder, afterOrder)) {
        out.push({
          path: `${currentPath || 'items'} (ordine)`,
          kind: 'modified',
          before: beforeOrder.join(', '),
          after: afterOrder.join(', '),
        });
      }

      for (const key of allKeys) {
        const nextPath = `${currentPath}[${key}]`;
        collectFieldChanges(beforeMap.get(key), afterMap.get(key), nextPath, out);
      }
      return;
    }

    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i += 1) {
      const nextPath = `${currentPath}[${i}]`;
      collectFieldChanges(before[i], after[i], nextPath, out);
    }
    return;
  }

  out.push({
    path: currentPath || '<file>',
    kind: 'modified',
    before: formatPreviewValue(before),
    after: formatPreviewValue(after),
  });
}

export function computeReadableDiff(
  baselineFiles: Record<string, unknown>,
  workingFiles: Record<string, unknown>
): FileDiffSummary[] {
  const allPaths = Array.from(
    new Set([...Object.keys(baselineFiles), ...Object.keys(workingFiles)])
  ).sort();

  const summaries: FileDiffSummary[] = [];

  for (const filePath of allPaths) {
    const inBefore = Object.prototype.hasOwnProperty.call(baselineFiles, filePath);
    const inAfter = Object.prototype.hasOwnProperty.call(workingFiles, filePath);

    if (!inBefore && inAfter) {
      const changes: FieldChange[] = [];
      collectFieldChanges(undefined, workingFiles[filePath], '', changes);
      summaries.push({ filePath, status: 'added', changes });
      continue;
    }

    if (inBefore && !inAfter) {
      const changes: FieldChange[] = [];
      collectFieldChanges(baselineFiles[filePath], undefined, '', changes);
      summaries.push({ filePath, status: 'deleted', changes });
      continue;
    }

    const beforeVal = baselineFiles[filePath];
    const afterVal = workingFiles[filePath];
    if (!deepEqual(beforeVal, afterVal)) {
      const changes: FieldChange[] = [];
      collectFieldChanges(beforeVal, afterVal, '', changes);
      summaries.push({ filePath, status: 'modified', changes });
    }
  }

  return summaries;
}

export function buildSnapshotOperations(
  baselineFiles: Record<string, unknown>,
  workingFiles: Record<string, unknown>
): SnapshotOperations {
  const diffs = computeReadableDiff(baselineFiles, workingFiles);
  const upserts: Array<{ path: string; data: unknown }> = [];
  const deletes: string[] = [];

  for (const diff of diffs) {
    if (diff.status === 'deleted') {
      deletes.push(diff.filePath);
    } else {
      upserts.push({ path: diff.filePath, data: workingFiles[diff.filePath] });
    }
  }

  return { upserts, deletes };
}
