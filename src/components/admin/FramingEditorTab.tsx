import React, { useMemo, useState } from 'react';
import { cardFramingConfig } from '../../config/imageFraming';
import {
  FRAMING_KEYS_META,
  FRAMING_PAGES,
  FRAMING_USAGES,
  getConfigKeysForGroup,
  getFramingAssetGroups,
  getFramingUsagesByKey,
  getFramingUsagesByPage,
  getGroupForConfigKey,
  KNOWN_PUBLIC_ASSET_OPTIONS,
  type FramingConfigKeyId,
  type FramingKeyId,
  type FramingPageId,
  type FramingUsage,
} from '../../config/framingRegistry';
import {
  ImageFramingConfigSchema,
  type CardDeviceConfig,
  type CardFraming,
  type ImageFramingConfig,
} from '../../schemas/imageFraming';
import type { TechSideData } from '../../schemas/techSide';
import { compressImageForRepoUpload } from '../../lib/imageUpload';
import {
  formatPositionString,
  parsePositionString,
  percentToZoom,
  zoomToPercent,
  type PositionXMode,
  type PositionYMode,
} from '../../utils/imageFraming';
import { useAdminWorkspace } from './AdminWorkspaceContext';
import { FramingPreviewCard, ScaledViewportFrame } from './FramingPreviewCard';

const IMAGE_FRAMING_PATH = 'src/data/imageFraming.json';
const TECH_SIDE_PATH = 'src/data/techSide.json';

type ViewMode = 'by-page' | 'by-image';
type OriginPreset = 'none' | 'center' | 'left' | 'right' | 'top' | 'bottom' | 'custom';

function cloneFraming(raw: unknown): ImageFramingConfig {
  const parsed = ImageFramingConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return JSON.parse(JSON.stringify(cardFramingConfig)) as ImageFramingConfig;
}

function classifyOrigin(origin?: string): { preset: OriginPreset; customPercent: number } {
  const trimmed = (origin ?? '').trim();
  if (!trimmed) return { preset: 'none', customPercent: 50 };
  const lower = trimmed.toLowerCase();
  if (
    lower === 'center' ||
    lower === 'left' ||
    lower === 'right' ||
    lower === 'top' ||
    lower === 'bottom'
  ) {
    return { preset: lower, customPercent: 50 };
  }
  const pctMatch = /^(\d{1,3})%$/.exec(trimmed);
  if (pctMatch) {
    return {
      preset: 'custom',
      customPercent: Math.max(0, Math.min(100, Number(pctMatch[1]))),
    };
  }
  return { preset: 'custom', customPercent: 50 };
}

export const FramingEditorTab: React.FC = () => {
  const {
    workingSnapshot,
    baselineSnapshot,
    updateContentFile,
    pendingAssets,
    committedDraftAssets,
    stageBinaryAsset,
  } = useAdminWorkspace();

  const framingData = useMemo(
    () => cloneFraming(workingSnapshot[IMAGE_FRAMING_PATH]),
    [workingSnapshot]
  );

  const baselineFraming = useMemo(
    () => cloneFraming(baselineSnapshot[IMAGE_FRAMING_PATH] ?? cardFramingConfig),
    [baselineSnapshot]
  );

  const schemaValidation = useMemo(
    () => ImageFramingConfigSchema.safeParse(framingData),
    [framingData]
  );

  // Separate top-level tabs: 'desktop' vs 'mobile'
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('by-page');
  const [selectedGroupKey, setSelectedGroupKey] = useState<FramingKeyId>('mainstage-side');
  const [selectedConfigKey, setSelectedConfigKey] = useState<FramingConfigKeyId>('mainstage-side');
  const [selectedPageId, setSelectedPageId] = useState<FramingPageId>('home-bento');
  const [uploadingDedicated, setUploadingDedicated] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);

  const keyOrder = useMemo(() => Object.keys(FRAMING_KEYS_META) as FramingKeyId[], []);

  const visiblePages = useMemo(
    () =>
      FRAMING_PAGES.filter(
        (p) => p.primaryViewport === 'both' || p.primaryViewport === viewport
      ),
    [viewport]
  );

  const allStagedAssets = useMemo(
    () => ({ ...committedDraftAssets, ...pendingAssets }),
    [committedDraftAssets, pendingAssets]
  );

  const extraAssetOptions = useMemo(() => {
    const out: { label: string; webp: string; jpg: string }[] = [];
    const seen = new Set(KNOWN_PUBLIC_ASSET_OPTIONS.map((o) => o.webp));

    const techRaw = workingSnapshot[TECH_SIDE_PATH] as Partial<TechSideData> | undefined;
    if (techRaw?.techGallery && Array.isArray(techRaw.techGallery)) {
      for (const item of techRaw.techGallery) {
        if (item.imageWebp && !seen.has(item.imageWebp)) {
          seen.add(item.imageWebp);
          out.push({
            label: `Gallery: ${item.title?.it || item.id}`,
            webp: item.imageWebp,
            jpg: item.imageJpg || item.imageWebp.replace('.webp', '.jpg'),
          });
        }
      }
    }

    for (const asset of Object.values(allStagedAssets)) {
      const jpgPath = asset.path.startsWith('/') ? asset.path : `/${asset.path}`;
      const webpPath = jpgPath.replace(/\.(jpe?g|png|webp)$/i, '.webp');
      if (!seen.has(webpPath)) {
        seen.add(webpPath);
        out.push({
          label: `Upload in coda: ${asset.path.split('/').pop()}`,
          webp: webpPath,
          jpg: jpgPath,
        });
      }
    }

    return [...KNOWN_PUBLIC_ASSET_OPTIONS, ...out];
  }, [workingSnapshot, allStagedAssets]);

  const assetGroups = useMemo(
    () =>
      getFramingAssetGroups(
        framingData,
        extraAssetOptions.map((o) => o.jpg)
      ),
    [framingData, extraAssetOptions]
  );

  function getCardFraming(configKey: FramingConfigKeyId): CardFraming {
    const groupFallback = getGroupForConfigKey(configKey);
    const meta = FRAMING_KEYS_META[groupFallback];
    return (
      framingData[configKey] ??
      framingData[groupFallback] ?? {
        desktop: {
          position: 'center center',
          zoom: 1,
          imageWebp: meta.defaultWebp,
          imageJpg: meta.defaultJpg,
        },
        mobile: {
          position: 'center center',
          zoom: 1,
          imageWebp: meta.defaultWebp,
          imageJpg: meta.defaultJpg,
        },
      }
    );
  }

  const currentCardConfig = getCardFraming(selectedConfigKey);
  const activeDeviceConf: CardDeviceConfig = currentCardConfig[viewport];

  const activeUsageMeta = useMemo(() => {
    const exactMatch = FRAMING_USAGES.find(
      (u) =>
        u.configKey === selectedConfigKey &&
        (u.viewportSupport === 'both' || u.viewportSupport === viewport)
    );
    return (
      exactMatch ??
      FRAMING_USAGES.find((u) => u.configKey === selectedConfigKey) ??
      FRAMING_USAGES[0]
    );
  }, [selectedConfigKey, viewport]);

  const parsedPos = useMemo(
    () => parsePositionString(activeDeviceConf.position),
    [activeDeviceConf.position]
  );
  const zoomPercent = zoomToPercent(activeDeviceConf.zoom);
  const originState = useMemo(
    () => classifyOrigin(activeDeviceConf.transformOrigin),
    [activeDeviceConf.transformOrigin]
  );

  function resolvePreviewUrl(deviceConf: CardDeviceConfig | undefined): string | undefined {
    const cleanJpg = (deviceConf?.imageJpg || '').replace(/^\/+/, '');
    if (cleanJpg && allStagedAssets[cleanJpg]) {
      return allStagedAssets[cleanJpg].previewDataUrl;
    }
    return undefined;
  }

  function flashApplyNotice(msg: string) {
    setApplyNotice(msg);
    setTimeout(() => {
      setApplyNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  }

  function switchDeviceTab(nextViewport: 'desktop' | 'mobile') {
    setViewport(nextViewport);
    if (nextViewport === 'desktop' && selectedPageId === 'home-mobile') {
      setSelectedPageId('home-bento');
    } else if (nextViewport === 'mobile' && selectedPageId === 'home-bento') {
      setSelectedPageId('home-mobile');
    }
  }

  function updateDeviceConf(patch: Partial<CardDeviceConfig>) {
    const nextConf: CardDeviceConfig = {
      ...activeDeviceConf,
      ...patch,
    };
    if (!nextConf.transformOrigin?.trim()) {
      delete nextConf.transformOrigin;
    }
    const nextAll: ImageFramingConfig = {
      ...framingData,
      [selectedConfigKey]: {
        ...currentCardConfig,
        [viewport]: nextConf,
      },
    };
    updateContentFile(IMAGE_FRAMING_PATH, nextAll);
  }

  function updateAxisX(nextMode: PositionXMode, nextPct = parsedPos.xPercent) {
    const formatted = formatPositionString({
      ...parsedPos,
      xMode: nextMode,
      xPercent: nextPct,
    });
    updateDeviceConf({ position: formatted });
  }

  function updateAxisY(nextMode: PositionYMode, nextPct = parsedPos.yPercent) {
    const formatted = formatPositionString({
      ...parsedPos,
      yMode: nextMode,
      yPercent: nextPct,
    });
    updateDeviceConf({ position: formatted });
  }

  function handleCopyOtherViewport() {
    const sourceViewport = viewport === 'desktop' ? 'mobile' : 'desktop';
    const source = currentCardConfig[sourceViewport];
    updateDeviceConf({
      position: source.position,
      zoom: source.zoom ?? 1,
      transformOrigin: source.transformOrigin,
      imageWebp: source.imageWebp,
      imageJpg: source.imageJpg,
    });
    flashApplyNotice(`Copiati i valori ${sourceViewport} → ${viewport} per ${selectedConfigKey}.`);
  }

  function handleApplyAllToGroup(mode: 'all' | 'image-only') {
    const groupKey = getGroupForConfigKey(selectedConfigKey);
    const groupConfigKeys = getConfigKeysForGroup(groupKey);
    const nextAll: ImageFramingConfig = { ...framingData };

    for (const targetKey of groupConfigKeys) {
      const existing = getCardFraming(targetKey);
      if (mode === 'image-only') {
        nextAll[targetKey] = {
          desktop: {
            ...existing.desktop,
            imageWebp: activeDeviceConf.imageWebp,
            imageJpg: activeDeviceConf.imageJpg,
          },
          mobile: {
            ...existing.mobile,
            imageWebp: activeDeviceConf.imageWebp,
            imageJpg: activeDeviceConf.imageJpg,
          },
        };
      } else {
        const cloned: CardDeviceConfig = {
          position: activeDeviceConf.position,
          zoom: activeDeviceConf.zoom ?? 1,
          ...(activeDeviceConf.transformOrigin
            ? { transformOrigin: activeDeviceConf.transformOrigin }
            : {}),
          ...(activeDeviceConf.imageWebp ? { imageWebp: activeDeviceConf.imageWebp } : {}),
          ...(activeDeviceConf.imageJpg ? { imageJpg: activeDeviceConf.imageJpg } : {}),
        };
        nextAll[targetKey] = {
          ...existing,
          [viewport]: cloned,
        };
      }
    }

    updateContentFile(IMAGE_FRAMING_PATH, nextAll);
    if (mode === 'image-only') {
      flashApplyNotice(
        `Immagine applicata a tutte le ${groupConfigKeys.length} occorrenze di ${FRAMING_KEYS_META[groupKey].title} (Desktop e Mobile).`
      );
    } else {
      flashApplyNotice(
        `Parametri e immagine (${viewport}) applicati a tutte le ${groupConfigKeys.length} occorrenze di ${FRAMING_KEYS_META[groupKey].title}.`
      );
    }
  }

  function handleResetToMain() {
    const groupFallback = getGroupForConfigKey(selectedConfigKey);
    const base =
      baselineFraming[selectedConfigKey]?.[viewport] ?? baselineFraming[groupFallback]?.[viewport];
    if (!base) return;
    const nextAll: ImageFramingConfig = {
      ...framingData,
      [selectedConfigKey]: {
        ...currentCardConfig,
        [viewport]: { ...base },
      },
    };
    updateContentFile(IMAGE_FRAMING_PATH, nextAll);
    flashApplyNotice(`Ripristinati i valori da main per ${selectedConfigKey} (${viewport}).`);
  }

  async function handleDedicatedImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploadingDedicated(true);
    try {
      const result = await compressImageForRepoUpload(file, {
        folder: 'uploads',
        slugHint: `${selectedConfigKey}-${viewport}`,
      });
      stageBinaryAsset({
        path: result.repoPath,
        base64: result.base64,
        previewDataUrl: result.previewDataUrl,
        mimeType: result.mimeType,
      });
      updateDeviceConf({
        imageWebp: result.imageWebp,
        imageJpg: result.imageJpg,
      });
      flashApplyNotice(
        `Immagine caricata solo per l'occorrenza ${selectedConfigKey} (${viewport}).`
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore caricamento immagine.');
    } finally {
      setUploadingDedicated(false);
    }
  }

  function selectGroup(groupKey: FramingKeyId) {
    setSelectedGroupKey(groupKey);
    const usages = getFramingUsagesByKey(groupKey);
    const alreadyInGroup = usages.some((u) => u.configKey === selectedConfigKey);
    if (!alreadyInGroup && usages[0]) {
      setSelectedConfigKey(usages[0].configKey);
    }
  }

  function selectPage(pageId: FramingPageId) {
    setSelectedPageId(pageId);
    const firstUsage = getFramingUsagesByPage(pageId)[0];
    if (firstUsage) {
      setSelectedGroupKey(firstUsage.framingKey);
      setSelectedConfigKey(firstUsage.configKey);
    }
  }

  function selectUsage(usage: FramingUsage) {
    setSelectedGroupKey(usage.framingKey);
    setSelectedConfigKey(usage.configKey);
  }

  const usagesForSelectedGroup = useMemo(() => {
    const raw = getFramingUsagesByKey(selectedGroupKey);
    const seen = new Set<string>();
    const out: FramingUsage[] = [];
    for (const u of raw) {
      if (u.viewportSupport !== 'both' && u.viewportSupport !== viewport) continue;
      if (!seen.has(u.configKey)) {
        seen.add(u.configKey);
        out.push(u);
      }
    }
    return out;
  }, [selectedGroupKey, viewport]);

  const effectivePageId =
    viewport === 'desktop' && selectedPageId === 'home-mobile'
      ? 'home-bento'
      : viewport === 'mobile' && selectedPageId === 'home-bento'
        ? 'home-mobile'
        : selectedPageId;

  const usagesForSelectedPage = useMemo(
    () => getFramingUsagesByPage(effectivePageId),
    [effectivePageId]
  );

  const activeKeyMeta = FRAMING_KEYS_META[selectedGroupKey];
  const groupConfigKeys = getConfigKeysForGroup(selectedGroupKey);
  const baseDeviceConf =
    baselineFraming[selectedConfigKey]?.[viewport] ??
    baselineFraming[selectedGroupKey]?.[viewport];
  const isDirtyVsMain = JSON.stringify(activeDeviceConf) !== JSON.stringify(baseDeviceConf);

  function renderInteractiveUsageCard(usage: FramingUsage, targetViewport: 'desktop' | 'mobile') {
    const conf = getCardFraming(usage.configKey)[targetViewport];
    return (
      <FramingPreviewCard
        key={usage.id}
        usage={usage}
        viewport={targetViewport}
        deviceConf={conf}
        overridePreviewUrl={resolvePreviewUrl(conf)}
        selected={selectedConfigKey === usage.configKey}
        onSelect={() => selectUsage(usage)}
      />
    );
  }

  // ==================== REUSABLE CONTROL SECTIONS ====================
  const renderOccurrenceHeader = () => (
    <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            {activeUsageMeta.slotLabel}
          </h3>
          <p className="text-[11px] text-purple-300 font-mono truncate">
            {selectedConfigKey} · {viewport} ({activeUsageMeta.dimensionsNote})
          </p>
        </div>
        <button
          type="button"
          disabled={!isDirtyVsMain}
          onClick={handleResetToMain}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 disabled:opacity-35 text-[10px] font-bold text-gray-200 transition-colors flex-shrink-0"
        >
          <i className="fas fa-rotate-left" />
          <span>Ripristina</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopyOtherViewport}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition-colors"
        >
          <i className="fas fa-clone" />
          <span>
            {viewport === 'mobile' ? 'Copia Desktop → Mobile' : 'Copia Mobile → Desktop'}
          </span>
        </button>

        {groupConfigKeys.length > 1 && (
          <button
            type="button"
            onClick={() => handleApplyAllToGroup('all')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/45 text-[10px] font-bold text-purple-200 transition-colors"
          >
            <i className="fas fa-layer-group" />
            <span>Apply to all ({groupConfigKeys.length})</span>
          </button>
        )}
      </div>

      {applyNotice && (
        <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-lg px-2.5 py-1.5">
          {applyNotice}
        </p>
      )}
    </div>
  );

  const renderPosXControl = () => (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold text-gray-300">Posizione X</label>
        <span className="text-[11px] font-mono text-purple-300">
          {parsedPos.xMode === 'custom' ? `${parsedPos.xPercent}%` : parsedPos.xMode}
        </span>
      </div>
      <select
        aria-label="Posizione X"
        value={parsedPos.xMode}
        onChange={(e) => updateAxisX(e.target.value as PositionXMode)}
        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
      >
        <option value="left">left (0%)</option>
        <option value="center">center (50%)</option>
        <option value="right">right (100%)</option>
        <option value="custom">custom (%)</option>
      </select>

      {parsedPos.xMode === 'custom' && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={parsedPos.xPercent}
            onChange={(e) => updateAxisX('custom', Number(e.target.value))}
            className="flex-1 accent-neonPurple"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={parsedPos.xPercent}
              onChange={(e) => updateAxisX('custom', Number(e.target.value))}
              className="w-16 rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-xs text-white font-mono text-right"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderPosYControl = () => (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold text-gray-300">Posizione Y</label>
        <span className="text-[11px] font-mono text-purple-300">
          {parsedPos.yMode === 'custom' ? `${parsedPos.yPercent}%` : parsedPos.yMode}
        </span>
      </div>
      <select
        aria-label="Posizione Y"
        value={parsedPos.yMode}
        onChange={(e) => updateAxisY(e.target.value as PositionYMode)}
        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
      >
        <option value="top">top (0%)</option>
        <option value="center">center (50%)</option>
        <option value="bottom">bottom (100%)</option>
        <option value="custom">custom (%)</option>
      </select>

      {parsedPos.yMode === 'custom' && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={parsedPos.yPercent}
            onChange={(e) => updateAxisY('custom', Number(e.target.value))}
            className="flex-1 accent-neonPurple"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={parsedPos.yPercent}
              onChange={(e) => updateAxisY('custom', Number(e.target.value))}
              className="w-16 rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-xs text-white font-mono text-right"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderZoomAndOriginControls = () => (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-gray-300">
            Zoom (%) — scala {percentToZoom(zoomPercent)}x
          </label>
          <span className="text-[11px] font-mono text-purple-300">{zoomPercent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={100}
            max={300}
            step={1}
            value={Math.min(300, Math.max(100, zoomPercent))}
            onChange={(e) => updateDeviceConf({ zoom: percentToZoom(Number(e.target.value)) })}
            className="flex-1 accent-neonPurple"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={50}
              max={400}
              step={1}
              aria-label="Zoom percentuale"
              value={zoomPercent}
              onChange={(e) => updateDeviceConf({ zoom: percentToZoom(Number(e.target.value)) })}
              className="w-16 rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-xs text-white font-mono text-right"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-gray-300">
            Transform Origin
          </label>
          <span className="text-[11px] font-mono text-purple-300">
            {activeDeviceConf.transformOrigin || 'Default'}
          </span>
        </div>
        <select
          aria-label="Preset Transform Origin"
          value={originState.preset}
          onChange={(e) => {
            const nextPreset = e.target.value as OriginPreset;
            if (nextPreset === 'none') {
              updateDeviceConf({ transformOrigin: undefined });
            } else if (nextPreset === 'custom') {
              updateDeviceConf({ transformOrigin: `${originState.customPercent}%` });
            } else {
              updateDeviceConf({ transformOrigin: nextPreset });
            }
          }}
          className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
        >
          <option value="none">Nessuno / Default</option>
          <option value="center">center</option>
          <option value="left">left</option>
          <option value="right">right</option>
          <option value="top">top</option>
          <option value="bottom">bottom</option>
          <option value="custom">custom % (es. 15% o 60%)</option>
        </select>

        {originState.preset === 'custom' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={originState.customPercent}
                onChange={(e) => updateDeviceConf({ transformOrigin: `${e.target.value}%` })}
                className="flex-1 accent-neonPurple"
              />
              <span className="text-xs font-mono text-white w-10 text-right">
                {originState.customPercent}%
              </span>
            </div>
            <input
              type="text"
              value={activeDeviceConf.transformOrigin ?? ''}
              onChange={(e) =>
                updateDeviceConf({
                  transformOrigin: e.target.value.trim() ? e.target.value : undefined,
                })
              }
              placeholder="es. 15% oppure 60% 40%"
              className="w-full rounded-lg bg-black/60 border border-white/15 px-2.5 py-1 text-xs text-white font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderImageReplaceControl = () => (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] uppercase font-bold text-gray-300">
          Sostituisci Immagine (questa occorrenza)
        </label>
        <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/40 text-purple-200 text-[10px] font-bold cursor-pointer">
          <i
            className={`fas ${
              uploadingDedicated ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-up'
            }`}
          />
          <span>{uploadingDedicated ? 'Upload...' : 'Carica nuova'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingDedicated}
            onChange={(e) => void handleDedicatedImageUpload(e)}
            className="hidden"
          />
        </label>
      </div>

      <select
        aria-label="Scegli immagine sostitutiva"
        value={
          extraAssetOptions.some(
            (o) =>
              o.webp === (activeDeviceConf.imageWebp ?? activeKeyMeta.defaultWebp) &&
              o.jpg === (activeDeviceConf.imageJpg ?? activeKeyMeta.defaultJpg)
          )
            ? activeDeviceConf.imageWebp ?? activeKeyMeta.defaultWebp
            : ''
        }
        onChange={(e) => {
          const chosen = extraAssetOptions.find((o) => o.webp === e.target.value);
          if (chosen) {
            updateDeviceConf({ imageWebp: chosen.webp, imageJpg: chosen.jpg });
          }
        }}
        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
      >
        <option value="">Path personalizzato...</option>
        {extraAssetOptions.map((opt) => (
          <option key={opt.webp} value={opt.webp}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[9px] uppercase text-gray-400 block mb-0.5">imageWebp</label>
          <input
            type="text"
            value={activeDeviceConf.imageWebp ?? ''}
            placeholder={activeKeyMeta.defaultWebp}
            onChange={(e) =>
              updateDeviceConf({
                imageWebp: e.target.value.trim() ? e.target.value.trim() : undefined,
              })
            }
            className="w-full rounded-lg bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] text-white font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase text-gray-400 block mb-0.5">imageJpg</label>
          <input
            type="text"
            value={activeDeviceConf.imageJpg ?? ''}
            placeholder={activeKeyMeta.defaultJpg}
            onChange={(e) =>
              updateDeviceConf({
                imageJpg: e.target.value.trim() ? e.target.value.trim() : undefined,
              })
            }
            className="w-full rounded-lg bg-black/60 border border-white/15 px-2.5 py-1 text-[11px] text-white font-mono"
          />
        </div>
      </div>

      {groupConfigKeys.length > 1 && (
        <button
          type="button"
          onClick={() => handleApplyAllToGroup('image-only')}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-gray-200 transition-colors"
        >
          <i className="fas fa-images text-[10px] text-neonPurple" />
          <span>Apply to all (Sostituisci su tutte le {groupConfigKeys.length})</span>
        </button>
      )}

      {uploadError && (
        <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-2 py-1">
          {uploadError}
        </p>
      )}
    </div>
  );

  // ==================== 1:1 PAGE STAGE RENDERERS ====================
  const renderDesktopPageStage = () => {
    const pageMeta = FRAMING_PAGES.find((p) => p.id === effectivePageId) ?? FRAMING_PAGES[0];
    return (
      <ScaledViewportFrame virtualWidth={pageMeta.desktopStageWidthPx}>
        <div className="w-full rounded-3xl bg-[#050508] border border-white/10 p-4">
          {effectivePageId === 'home-bento' ? (
            <div className="w-full flex flex-col">
              {/* Top Bento Grid matching BentoGridDesktop.astro (2fr_1fr, gap-5 = 20px, row h=148px) */}
              <div className="w-full grid grid-cols-[2fr_1fr] grid-rows-3 gap-5">
                <div className="col-start-1 row-start-1">
                  {renderInteractiveUsageCard(usagesForSelectedPage[0], 'desktop')}
                </div>
                <div className="col-start-1 row-start-2">
                  {renderInteractiveUsageCard(usagesForSelectedPage[1], 'desktop')}
                </div>
                <div className="col-start-1 row-start-3">
                  {renderInteractiveUsageCard(usagesForSelectedPage[2], 'desktop')}
                </div>
                <div className="col-start-2 row-start-1 row-span-3 h-full">
                  {renderInteractiveUsageCard(usagesForSelectedPage[3], 'desktop')}
                </div>
              </div>

              {/* Scroll Prompt placeholder matching BentoGridDesktop */}
              <div className="w-full flex justify-center mt-6">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 flex flex-col items-center gap-1">
                  <span>Demo, Eventi &amp; Progetti</span>
                  <i className="fas fa-chevron-down text-xs text-neonPurple" />
                </span>
              </div>

              {/* Lower Grid: 3 equal columns, h=148px, gap-5 */}
              <div className="w-full mt-10 grid grid-cols-3 gap-5">
                {usagesForSelectedPage
                  .slice(4, 7)
                  .map((u) => renderInteractiveUsageCard(u, 'desktop'))}
              </div>
            </div>
          ) : effectivePageId === 'demo-live-sets' ? (
            <div className="w-full flex flex-col gap-8">
              {renderInteractiveUsageCard(usagesForSelectedPage[0], 'desktop')}
              {/* Exact md:grid-cols-3 gap-4 Quick-Nav Cards (165px height) */}
              <div className="grid grid-cols-3 gap-4">
                {usagesForSelectedPage
                  .slice(1, 4)
                  .map((u) => renderInteractiveUsageCard(u, 'desktop'))}
              </div>
              {/* Realistic visual footer hint for 2 columns below */}
              <div className="grid grid-cols-2 gap-6 opacity-40 pointer-events-none">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Colonna Demo (chiuse)
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Colonna Live Sets (chiusi)
                </div>
              </div>
            </div>
          ) : effectivePageId === 'format-pages' ? (
            <div className="w-full flex flex-col gap-6">
              {usagesForSelectedPage.map((u) => (
                <div key={u.id} className="space-y-2">
                  {renderInteractiveUsageCard(u, 'desktop')}
                  <div className="rounded-2xl bg-black/40 border border-white/10 px-6 py-4 text-xs text-gray-400 opacity-50 pointer-events-none">
                    Descrizione format &amp; lista demo chiuse ({u.route})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {usagesForSelectedPage.map((u) => renderInteractiveUsageCard(u, 'desktop'))}
              <div className="rounded-2xl bg-black/40 border border-white/10 p-6 text-xs text-gray-400 opacity-45 pointer-events-none">
                Contenuto pagina {pageMeta.label} ({pageMeta.route})
              </div>
            </div>
          )}
        </div>
      </ScaledViewportFrame>
    );
  };

  const renderMobilePhoneStage = () => {
    return (
      <ScaledViewportFrame virtualWidth={390}>
        {/* Smartphone Bezel 390px wide (with 16px px-4 inner padding -> 358px content matching BaseLayout) */}
        <div className="w-[390px] rounded-[2.5rem] border-[6px] border-[#1f1f29] bg-[#050508] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden">
          {/* Minimal Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[10px] font-semibold text-gray-400">
            <span>podadj.it</span>
            <span className="w-20 h-3.5 rounded-full bg-black border border-white/10" />
            <span>390px</span>
          </div>

          <div className="px-4 pb-6 pt-2 flex flex-col">
            {effectivePageId === 'home-mobile' ? (
              <div className="flex flex-col w-full">
                {/* 3 Expandable Format Cards (min-h 92px, gap-3) */}
                <div className="flex flex-col gap-3 w-full mb-3">
                  {usagesForSelectedPage
                    .slice(0, 3)
                    .map((u) => renderInteractiveUsageCard(u, 'mobile'))}
                </div>

                {/* Tall Service Card (300px) */}
                {renderInteractiveUsageCard(usagesForSelectedPage[3], 'mobile')}

                {/* Archive & Projects Divider */}
                <div className="w-full flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Archive &amp; Projects
                  </span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* 2-Column Grid (144px, gap-3) */}
                <div className="grid grid-cols-2 gap-3 w-full mb-3">
                  {renderInteractiveUsageCard(usagesForSelectedPage[4], 'mobile')}
                  {renderInteractiveUsageCard(usagesForSelectedPage[5], 'mobile')}
                </div>

                {/* Full-width Partyhive Card (144px) */}
                {renderInteractiveUsageCard(usagesForSelectedPage[6], 'mobile')}
              </div>
            ) : effectivePageId === 'demo-live-sets' ? (
              <div className="flex flex-col gap-6 w-full">
                {renderInteractiveUsageCard(usagesForSelectedPage[0], 'mobile')}
                <div className="grid grid-cols-1 gap-4">
                  {usagesForSelectedPage
                    .slice(1, 4)
                    .map((u) => renderInteractiveUsageCard(u, 'mobile'))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 w-full">
                {usagesForSelectedPage.map((u) => (
                  <div key={u.id} className="space-y-2">
                    {renderInteractiveUsageCard(u, 'mobile')}
                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[10px] text-gray-400 opacity-50">
                      Contenuto pagina mobile ({u.route})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScaledViewportFrame>
    );
  };

  return (
    <div className="space-y-4">
      {/* ================= TOP PRIMARY DEVICE TABS (COMPLETELY SEPARATE) ================= */}
      <div className="rounded-2xl border border-white/10 bg-black/50 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchDeviceTab('desktop')}
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              viewport === 'desktop'
                ? 'bg-neonPurple text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <i className="fas fa-desktop" />
            <span>Tab Desktop (1024px–1152px)</span>
          </button>

          <button
            type="button"
            onClick={() => switchDeviceTab('mobile')}
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              viewport === 'mobile'
                ? 'bg-neonPurple text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <i className="fas fa-mobile-screen" />
            <span>Tab Mobile (390px)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-mode Switch: By Page vs By Image */}
          <div className="inline-flex rounded-xl bg-black/60 border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setViewMode('by-page')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'by-page'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fas fa-table-columns" />
              <span>Per Pagina (1:1)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('by-image')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'by-image'
                  ? 'bg-white/15 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fas fa-images" />
              <span>Per Immagine</span>
            </button>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              schemaValidation.success ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            <i
              className={`fas ${
                schemaValidation.success ? 'fa-circle-check' : 'fa-triangle-exclamation'
              }`}
            />
            <span>{schemaValidation.success ? 'Zod OK' : 'Errore'}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================
          TAB 1: DESKTOP DEDICATED LAYOUT
          Full-width 1:1 Widescreen Stage on top + 4-Column Control Dock below
         ======================================================================== */}
      {viewport === 'desktop' ? (
        <div className="space-y-4">
          {/* Desktop Selector Strip */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-wrap items-center gap-2">
            {viewMode === 'by-page' ? (
              visiblePages.map((pg) => {
                const active = effectivePageId === pg.id;
                return (
                  <button
                    key={pg.id}
                    type="button"
                    onClick={() => selectPage(pg.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-neonPurple/25 border-neonPurple/60 text-white'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{pg.label}</span>
                    <span className="ml-2 text-[10px] font-mono text-gray-400">
                      {pg.desktopStageWidthPx}px
                    </span>
                  </button>
                );
              })
            ) : (
              keyOrder.map((key) => {
                const meta = FRAMING_KEYS_META[key];
                const occCount = getConfigKeysForGroup(key).length;
                const active = selectedGroupKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectGroup(key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-neonPurple/25 border-neonPurple/60 text-white'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{meta.title}</span>
                    <span className="ml-1.5 text-[10px] font-mono text-gray-400">
                      ({occCount})
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* 1:1 Desktop Preview Stage (Widescreen) */}
          <section className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  {viewMode === 'by-page'
                    ? `Anteprima 1:1 Desktop — ${
                        FRAMING_PAGES.find((p) => p.id === effectivePageId)?.label
                      }`
                    : `Occorrenze Desktop 1:1 — ${activeKeyMeta.title}`}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Proporzioni reali della pagina desktop. Clicca su una card o banner per calibrarlo.
                </p>
              </div>
              <span className="text-xs font-mono text-purple-300">
                Selezione attiva: <strong>{selectedConfigKey}</strong>
              </span>
            </div>

            {viewMode === 'by-page' ? (
              renderDesktopPageStage()
            ) : (
              <div className="space-y-4">
                {usagesForSelectedGroup.map((usage) => {
                  const isSelectedOcc = selectedConfigKey === usage.configKey;
                  return (
                    <div
                      key={usage.configKey}
                      className={`rounded-2xl border p-3 space-y-2 ${
                        isSelectedOcc
                          ? 'border-neonPurple/50 bg-neonPurple/[0.04]'
                          : 'border-white/10 bg-black/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className={isSelectedOcc ? 'text-purple-200 font-bold' : 'text-gray-300 font-semibold'}>
                          {usage.slotLabel} ({usage.configKey})
                        </span>
                        <span className="font-mono text-gray-400">{usage.dimensionsNote}</span>
                      </div>
                      <ScaledViewportFrame virtualWidth={usage.desktopBoxWidthPx} align="left">
                        {renderInteractiveUsageCard(usage, 'desktop')}
                      </ScaledViewportFrame>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Horizontal Desktop Controls Dock */}
          <section className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
            {renderOccurrenceHeader()}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-start">
              {renderPosXControl()}
              {renderPosYControl()}
              {renderZoomAndOriginControls()}
              <div className="space-y-3">
                {renderImageReplaceControl()}
                <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-[10px] font-mono text-gray-300 break-all">
                  {selectedConfigKey} (desktop): {activeDeviceConf.position} · scale(
                  {activeDeviceConf.zoom ?? 1})
                  {activeDeviceConf.transformOrigin
                    ? ` · origin(${activeDeviceConf.transformOrigin})`
                    : ''}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* ========================================================================
           TAB 2: MOBILE DEDICATED LAYOUT (3-Column Smartphone Studio)
           Left Selector (3 col) | Centered 390px 1:1 Smartphone Frame (5 col) | Controls (4 col)
           ======================================================================== */
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* LEFT: Mobile Pages or Groups */}
          <aside className="col-span-3 rounded-2xl border border-white/10 bg-black/40 p-3 space-y-3">
            {viewMode === 'by-page' ? (
              <>
                <div className="pb-2 border-b border-white/10">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Pagine Mobile (390px)
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Form factor smartphone 1:1 reale.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {visiblePages.map((pg) => {
                    const active = effectivePageId === pg.id;
                    return (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => selectPage(pg.id)}
                        className={`w-full text-left rounded-xl border p-2.5 transition-all ${
                          active
                            ? 'bg-neonPurple/15 border-neonPurple/60 text-white'
                            : 'bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="text-xs font-bold">{pg.label}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">{pg.route}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="pb-2 border-b border-white/10">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Gruppi &amp; Asset Mobile
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Ogni occorrenza mobile è indipendente.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {keyOrder.map((key) => {
                    const meta = FRAMING_KEYS_META[key];
                    const conf = getCardFraming(key).mobile;
                    const occCount = getConfigKeysForGroup(key).length;
                    const active = selectedGroupKey === key;
                    const thumb = resolvePreviewUrl(conf) || conf?.imageWebp || meta.defaultWebp;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectGroup(key)}
                        className={`w-full text-left rounded-xl border p-2 transition-all flex items-center gap-2.5 ${
                          active
                            ? 'bg-neonPurple/15 border-neonPurple/60 text-white'
                            : 'bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <img
                          src={thumb}
                          onError={(e) => {
                            const jpgFallback = conf?.imageJpg || meta.defaultJpg;
                            if (jpgFallback && e.currentTarget.src !== jpgFallback) {
                              e.currentTarget.src = jpgFallback;
                            }
                          }}
                          alt={meta.title}
                          className="w-10 h-10 rounded-lg object-cover border border-white/15 flex-shrink-0 bg-black"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{meta.title}</div>
                          <div className="text-[10px] text-gray-400 font-mono truncate">
                            {occCount} occorrenze
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-gray-400">
                    Asset Rilevati ({assetGroups.length})
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {assetGroups.map((grp) => (
                      <button
                        key={grp.assetPath}
                        type="button"
                        onClick={() => {
                          if (grp.framingKeys[0]) selectGroup(grp.framingKeys[0]);
                          if (grp.configKeys[0]) setSelectedConfigKey(grp.configKeys[0]);
                        }}
                        className="w-full text-left px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-2 text-[10px]"
                      >
                        <span className="font-mono text-gray-300 truncate">{grp.assetPath}</span>
                        <span className="text-purple-300 flex-shrink-0">{grp.usagesCount} occ.</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </aside>

          {/* CENTER: 1:1 Smartphone Preview (390px Frame) */}
          <section className="col-span-5 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  {viewMode === 'by-page'
                    ? FRAMING_PAGES.find((p) => p.id === effectivePageId)?.label
                    : activeKeyMeta.title}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Viewport Smartphone 390px (1:1 reale)
                </p>
              </div>
              <span className="text-[11px] font-mono text-purple-300">{selectedConfigKey}</span>
            </div>

            {viewMode === 'by-page' ? (
              renderMobilePhoneStage()
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                {usagesForSelectedGroup.map((usage) => {
                  const isSelectedOcc = selectedConfigKey === usage.configKey;
                  return (
                    <div
                      key={usage.configKey}
                      className={`w-full max-w-[366px] rounded-2xl border p-2.5 space-y-1.5 ${
                        isSelectedOcc
                          ? 'border-neonPurple/50 bg-neonPurple/[0.04]'
                          : 'border-white/10 bg-black/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] px-0.5">
                        <span className={isSelectedOcc ? 'text-purple-200 font-bold' : 'text-gray-300'}>
                          {usage.slotLabel}
                        </span>
                        <span className="font-mono text-gray-400">{usage.dimensionsNote}</span>
                      </div>
                      <ScaledViewportFrame virtualWidth={usage.mobileBoxWidthPx}>
                        {renderInteractiveUsageCard(usage, 'mobile')}
                      </ScaledViewportFrame>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: Mobile Controls Column */}
          <section className="col-span-4 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
            {renderOccurrenceHeader()}
            {renderPosXControl()}
            {renderPosYControl()}
            {renderZoomAndOriginControls()}
            {renderImageReplaceControl()}

            <div className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-[10px] font-mono text-gray-300 break-all">
              {selectedConfigKey} (mobile): {activeDeviceConf.position} · scale(
              {activeDeviceConf.zoom ?? 1})
              {activeDeviceConf.transformOrigin
                ? ` · origin(${activeDeviceConf.transformOrigin})`
                : ''}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
