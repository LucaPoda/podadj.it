import {
  normalizeRating,
  parseYear,
  type RawRekordboxTrack,
} from './trackNormalizer';

export interface RekordboxPlaylistNode {
  name: string;
  type: 'folder' | 'playlist';
  path: string;
  isHistory: boolean;
  historyScope?: string;
  trackIds: string[];
  children: RekordboxPlaylistNode[];
}

export interface ParsedRekordboxXml {
  totalTracks: number;
  tracksById: Record<string, RawRekordboxTrack>;
  playlists: RekordboxPlaylistNode[];
  historyNodes: RekordboxPlaylistNode[];
}

interface LightweightXmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: LightweightXmlNode[];
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseAttributes(attrSource: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([A-Za-z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(attrSource)) !== null) {
    attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3] ?? '');
  }
  return attrs;
}

/**
 * Pure-TS fallback XML parser used when running outside the browser DOM (e.g. Node tsx unit tests).
 */
function parseLightweightXml(xmlText: string): LightweightXmlNode {
  const root: LightweightXmlNode = { tagName: '#root', attributes: {}, children: [] };
  const stack: LightweightXmlNode[] = [root];
  const tagRe = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<\/([A-Za-z0-9_:-]+)\s*>|<([A-Za-z0-9_:-]+)([^>]*?)(\/?)>/g;

  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(xmlText)) !== null) {
    if (match[1]) {
      // Closing tag
      for (let i = stack.length - 1; i >= 1; i -= 1) {
        if (stack[i].tagName === match[1]) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (match[2]) {
      const node: LightweightXmlNode = {
        tagName: match[2],
        attributes: parseAttributes(match[3] || ''),
        children: [],
      };
      stack[stack.length - 1].children.push(node);
      if (!match[4]) {
        stack.push(node);
      }
    }
  }

  return root;
}

function domElementToLightweight(el: Element): LightweightXmlNode {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i += 1) {
    const attr = el.attributes[i];
    attributes[attr.name] = attr.value;
  }
  const children: LightweightXmlNode[] = [];
  for (let i = 0; i < el.children.length; i += 1) {
    children.push(domElementToLightweight(el.children[i]));
  }
  return {
    tagName: el.tagName,
    attributes,
    children,
  };
}

function findFirstChild(node: LightweightXmlNode, tagName: string): LightweightXmlNode | undefined {
  return node.children.find((c) => c.tagName.toUpperCase() === tagName.toUpperCase());
}

function findChildren(node: LightweightXmlNode, tagName: string): LightweightXmlNode[] {
  return node.children.filter((c) => c.tagName.toUpperCase() === tagName.toUpperCase());
}

function parseMyTags(attrs: Record<string, string>, trackNode: LightweightXmlNode): string[] {
  // Explicitly NEVER read `Comments` attribute to prevent duplicate/unwanted comments import
  const raw =
    attrs.MyTag ||
    attrs.MyTags ||
    attrs.myTag ||
    findChildren(trackNode, 'MY_TAG')
      .map((n) => n.attributes.Name || n.attributes.Value || '')
      .filter(Boolean)
      .join(',');

  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,;/]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

function parseTrackNode(node: LightweightXmlNode): RawRekordboxTrack | null {
  const attrs = node.attributes;
  const trackId = (attrs.TrackID || attrs.ID || '').trim();
  if (!trackId) return null;

  const location = attrs.Location?.trim() || undefined;
  const kind = attrs.Kind?.trim() || undefined;
  const locLower = (location || '').toLowerCase();
  const isStreaming =
    locLower.startsWith('beatport:') ||
    locLower.startsWith('beatsource:') ||
    locLower.startsWith('soundcloud:') ||
    locLower.startsWith('tidal:') ||
    kind === 'Unknown Format';

  const bpmNum = attrs.AverageBpm ? Number(attrs.AverageBpm) : undefined;

  return {
    trackId,
    title: (attrs.Name || attrs.Title || '').trim(),
    artist: (attrs.Artist || '').trim(),
    ...(attrs.Album?.trim() ? { album: attrs.Album.trim() } : {}),
    ...(attrs.Genre?.trim() ? { genre: attrs.Genre.trim() } : {}),
    ...(attrs.Label?.trim() ? { label: attrs.Label.trim() } : {}),
    ...(bpmNum && Number.isFinite(bpmNum) && bpmNum > 0 ? { bpm: bpmNum } : {}),
    ...(attrs.Tonality?.trim() ? { key: attrs.Tonality.trim() } : {}),
    year: parseYear(attrs.Year),
    rating: normalizeRating(attrs.Rating),
    location,
    kind,
    ...(attrs.Remixer?.trim() ? { remixer: attrs.Remixer.trim() } : {}),
    ...(attrs.Mix?.trim() ? { mix: attrs.Mix.trim() } : {}),
    myTags: parseMyTags(attrs, node),
    isStreaming,
  };
}

function parsePlaylistNode(
  node: LightweightXmlNode,
  parentPath: string,
  parentIsHistory: boolean,
  parentScope: string | undefined,
  historyNodes: RekordboxPlaylistNode[]
): RekordboxPlaylistNode {
  const name = (node.attributes.Name || 'Unnamed').trim();
  const nodeType = node.attributes.Type === '1' ? 'playlist' : 'folder';
  const currentPath = parentPath ? `${parentPath} / ${name}` : name;

  const isEventsYearFolder = nodeType === 'folder' && /^events\s+\d{4}$/i.test(name);
  const currentScope = isEventsYearFolder ? name : parentScope;

  const isHistoriesFolder =
    nodeType === 'folder' &&
    (name.toUpperCase() === 'HISTORIES' || name.toUpperCase() === 'HISTORY');
  const isHistory = parentIsHistory || isHistoriesFolder;

  const trackIds = findChildren(node, 'TRACK')
    .map((t) => (t.attributes.Key || t.attributes.TrackID || '').trim())
    .filter(Boolean);

  const children = findChildren(node, 'NODE').map((child) =>
    parsePlaylistNode(child, currentPath, isHistory, currentScope, historyNodes)
  );

  const parsed: RekordboxPlaylistNode = {
    name,
    type: nodeType,
    path: currentPath,
    isHistory,
    ...(currentScope ? { historyScope: currentScope } : {}),
    trackIds,
    children,
  };

  if (isHistory && nodeType === 'playlist') {
    historyNodes.push(parsed);
  }

  return parsed;
}

export function parseRekordboxXml(xmlText: string): ParsedRekordboxXml {
  let rootNode: LightweightXmlNode;

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML Rekordbox non valido: ${parserError.textContent || 'Errore di sintassi'}`);
    }
    if (!doc.documentElement) {
      throw new Error('XML Rekordbox vuoto o privo di elemento radice.');
    }
    rootNode = {
      tagName: '#root',
      attributes: {},
      children: [domElementToLightweight(doc.documentElement)],
    };
  } else {
    rootNode = parseLightweightXml(xmlText);
  }

  const djPlaylists =
    findFirstChild(rootNode, 'DJ_PLAYLISTS') ||
    rootNode.children.find((c) => c.tagName.toUpperCase() === 'DJ_PLAYLISTS');

  if (!djPlaylists) {
    throw new Error('File XML non riconosciuto come export Rekordbox (<DJ_PLAYLISTS> mancante).');
  }

  const tracksById: Record<string, RawRekordboxTrack> = {};
  const collection = findFirstChild(djPlaylists, 'COLLECTION');
  if (collection) {
    for (const trackEl of findChildren(collection, 'TRACK')) {
      const parsed = parseTrackNode(trackEl);
      if (parsed) {
        tracksById[parsed.trackId] = parsed;
      }
    }
  }

  const playlistsRoot = findFirstChild(djPlaylists, 'PLAYLISTS');
  const historyNodes: RekordboxPlaylistNode[] = [];
  const playlists: RekordboxPlaylistNode[] = [];

  if (playlistsRoot) {
    for (const node of findChildren(playlistsRoot, 'NODE')) {
      playlists.push(parsePlaylistNode(node, '', false, undefined, historyNodes));
    }
  }

  historyNodes.sort((a, b) => b.path.localeCompare(a.path));

  return {
    totalTracks: Object.keys(tracksById).length,
    tracksById,
    playlists,
    historyNodes,
  };
}
