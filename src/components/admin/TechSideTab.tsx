import React, { useMemo, useState } from 'react';
import {
  TechSideDataSchema,
  type EquipmentSpec,
  type GalleryItem,
  type TechPackage,
  type TechSideData,
} from '../../schemas/techSide';
import { compressImageForRepoUpload, slugifyAssetName } from '../../lib/imageUpload';
import { AiBilingualField } from './AiBilingualField';
import { useAdminWorkspace } from './AdminWorkspaceContext';

type TechSubTab = 'packages' | 'equipment' | 'gallery';

const TECH_SIDE_PATH = 'src/data/techSide.json';

const FONT_AWESOME_ICONS = [
  { value: 'fas fa-volume-high', label: 'Speaker / Audio PA' },
  { value: 'fas fa-compact-disc', label: 'Console DJ / Deck' },
  { value: 'fas fa-sliders', label: 'Mixer FOH / EQ' },
  { value: 'fas fa-lightbulb', label: 'Luci DMX / Show' },
  { value: 'fas fa-shield-halved', label: 'Backup / Sicurezza' },
  { value: 'fas fa-wave-square', label: 'Subwoofer / Frequenze' },
  { value: 'fas fa-headphones', label: 'Monitoraggio / Booth' },
  { value: 'fas fa-plug', label: 'Cablaggi / Power' },
  { value: 'fas fa-bolt', label: 'Potenza / Amp' },
  { value: 'fas fa-tower-broadcast', label: 'Wireless / Regia Wi-Fi' },
];

const EXISTING_PUBLIC_ASSETS = [
  { label: 'Setup Impianto Tech (bg-tech)', webp: '/assets/bg-tech.webp', jpg: '/assets/bg-tech.jpg' },
  { label: 'Console Mainstage (bg-mainstage)', webp: '/assets/bg-mainstage.webp', jpg: '/assets/bg-mainstage.jpg' },
  { label: 'Show Luci Party (bg-party)', webp: '/assets/bg-party.webp', jpg: '/assets/bg-party.jpg' },
  { label: 'Folla & Dancefloor (bg-events)', webp: '/assets/bg-events.webp', jpg: '/assets/bg-events.jpg' },
  { label: 'Club Groove Vibe (bg-groove)', webp: '/assets/bg-groove.webp', jpg: '/assets/bg-groove.jpg' },
  { label: 'Live Sets Cover (bg-livesets)', webp: '/assets/bg-livesets.webp', jpg: '/assets/bg-livesets.jpg' },
  { label: 'Partyhive Open-Air (bg-partyhive)', webp: '/assets/bg-partyhive.webp', jpg: '/assets/bg-partyhive.jpg' },
];

const FALLBACK_TECH_DATA: TechSideData = {
  techPackages: [
    {
      id: 'new-package',
      name: { it: 'Nuovo Pacchetto', en: 'New Package' },
      tag: { it: 'Setup Audio', en: 'Audio Setup' },
      capacity: { it: 'Fino a 150 persone', en: 'Up to 150 guests' },
      description: { it: 'Descrizione pacchetto.', en: 'Package description.' },
      isFeatured: false,
      features: [{ it: 'Caratteristica principale', en: 'Key feature' }],
    },
  ],
  equipmentBreakdown: [
    {
      category: { it: 'Sistema Audio', en: 'Sound System' },
      model: 'PA System',
      highlight: { it: 'Diffusori ad alta definizione', en: 'High-definition speakers' },
      icon: 'fas fa-volume-high',
      specs: [{ it: 'Specifiche principali', en: 'Primary specs' }],
    },
  ],
  techGallery: [
    {
      id: 'setup-1',
      imageWebp: '/assets/bg-tech.webp',
      imageJpg: '/assets/bg-tech.jpg',
      title: { it: 'Setup Audio', en: 'Audio Setup' },
      caption: { it: 'Configurazione live.', en: 'Live configuration.' },
      tag: { it: 'Tech Side', en: 'Tech Side' },
    },
  ],
};

function parseTechSideData(raw: unknown): TechSideData {
  const parsed = TechSideDataSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === 'object') {
    const obj = raw as Partial<TechSideData>;
    return {
      techPackages:
        Array.isArray(obj.techPackages) && obj.techPackages.length > 0
          ? obj.techPackages
          : FALLBACK_TECH_DATA.techPackages,
      equipmentBreakdown:
        Array.isArray(obj.equipmentBreakdown) && obj.equipmentBreakdown.length > 0
          ? obj.equipmentBreakdown
          : FALLBACK_TECH_DATA.equipmentBreakdown,
      techGallery:
        Array.isArray(obj.techGallery) && obj.techGallery.length > 0
          ? obj.techGallery
          : FALLBACK_TECH_DATA.techGallery,
    };
  }
  return FALLBACK_TECH_DATA;
}

function swapItems<T>(arr: T[], idxA: number, idxB: number): T[] {
  if (idxB < 0 || idxB >= arr.length) return arr;
  const next = [...arr];
  const tmp = next[idxA];
  next[idxA] = next[idxB];
  next[idxB] = tmp;
  return next;
}

export const TechSideTab: React.FC = () => {
  const {
    workingSnapshot,
    updateContentFile,
    pendingAssets,
    committedDraftAssets,
    stageBinaryAsset,
    unstageBinaryAsset,
  } = useAdminWorkspace();

  const data = useMemo(
    () => parseTechSideData(workingSnapshot[TECH_SIDE_PATH]),
    [workingSnapshot]
  );

  const schemaCheck = useMemo(() => TechSideDataSchema.safeParse(data), [data]);

  const [subTab, setSubTab] = useState<TechSubTab>('packages');
  const [selectedPackageIdx, setSelectedPackageIdx] = useState(0);
  const [selectedEquipmentIdx, setSelectedEquipmentIdx] = useState(0);
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const safePkgIdx = Math.min(selectedPackageIdx, Math.max(0, data.techPackages.length - 1));
  const safeEqIdx = Math.min(selectedEquipmentIdx, Math.max(0, data.equipmentBreakdown.length - 1));
  const safeGalIdx = Math.min(selectedGalleryIdx, Math.max(0, data.techGallery.length - 1));

  function commitData(next: TechSideData) {
    updateContentFile(TECH_SIDE_PATH, next);
  }

  // --- Packages handlers ---
  const activePackage = data.techPackages[safePkgIdx];

  function updatePackage(patch: Partial<TechPackage>) {
    const nextPackages = data.techPackages.map((pkg, idx) =>
      idx === safePkgIdx ? { ...pkg, ...patch } : pkg
    );
    commitData({ ...data, techPackages: nextPackages });
  }

  function addPackage() {
    const num = data.techPackages.length + 1;
    const newPkg: TechPackage = {
      id: `pacchetto-${num}`,
      name: { it: `Nuovo Pacchetto ${num}`, en: `New Package ${num}` },
      tag: { it: 'Setup Custom', en: 'Custom Setup' },
      capacity: { it: 'Fino a 150 persone', en: 'Up to 150 guests' },
      description: {
        it: 'Descrizione tecnica del setup audio/luci.',
        en: 'Technical description of the audio/lighting setup.',
      },
      isFeatured: false,
      features: [{ it: 'Sistema PA attivo + console DJ', en: 'Active PA system + DJ console' }],
    };
    commitData({ ...data, techPackages: [...data.techPackages, newPkg] });
    setSelectedPackageIdx(data.techPackages.length);
  }

  function removePackage(idx: number) {
    if (data.techPackages.length <= 1) return;
    const nextPackages = data.techPackages.filter((_, i) => i !== idx);
    commitData({ ...data, techPackages: nextPackages });
    setSelectedPackageIdx(Math.max(0, Math.min(safePkgIdx, nextPackages.length - 1)));
  }

  function movePackage(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= data.techPackages.length) return;
    commitData({ ...data, techPackages: swapItems(data.techPackages, idx, target) });
    if (safePkgIdx === idx) setSelectedPackageIdx(target);
  }

  // --- Equipment handlers ---
  const activeEquipment = data.equipmentBreakdown[safeEqIdx];

  function updateEquipment(patch: Partial<EquipmentSpec>) {
    const nextEq = data.equipmentBreakdown.map((item, idx) =>
      idx === safeEqIdx ? { ...item, ...patch } : item
    );
    commitData({ ...data, equipmentBreakdown: nextEq });
  }

  function addEquipment() {
    const newEq: EquipmentSpec = {
      category: { it: 'Nuova Categoria Gear', en: 'New Gear Category' },
      model: 'Nuovo Apparato / Serie',
      highlight: { it: 'Sintesi tecnica principale', en: 'Key technical highlight' },
      icon: 'fas fa-volume-high',
      specs: [{ it: 'Specifica tecnica dettagliata', en: 'Detailed technical specification' }],
    };
    commitData({ ...data, equipmentBreakdown: [...data.equipmentBreakdown, newEq] });
    setSelectedEquipmentIdx(data.equipmentBreakdown.length);
  }

  function removeEquipment(idx: number) {
    if (data.equipmentBreakdown.length <= 1) return;
    const nextEq = data.equipmentBreakdown.filter((_, i) => i !== idx);
    commitData({ ...data, equipmentBreakdown: nextEq });
    setSelectedEquipmentIdx(Math.max(0, Math.min(safeEqIdx, nextEq.length - 1)));
  }

  function moveEquipment(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= data.equipmentBreakdown.length) return;
    commitData({ ...data, equipmentBreakdown: swapItems(data.equipmentBreakdown, idx, target) });
    if (safeEqIdx === idx) setSelectedEquipmentIdx(target);
  }

  // --- Gallery handlers ---
  const activeGallery = data.techGallery[safeGalIdx];

  function updateGallery(patch: Partial<GalleryItem>) {
    const nextGallery = data.techGallery.map((item, idx) =>
      idx === safeGalIdx ? { ...item, ...patch } : item
    );
    commitData({ ...data, techGallery: nextGallery });
  }

  function addGalleryItem() {
    const num = data.techGallery.length + 1;
    const newItem: GalleryItem = {
      id: `setup-${num}`,
      imageWebp: '/assets/bg-tech.webp',
      imageJpg: '/assets/bg-tech.jpg',
      title: { it: `Nuovo Setup ${num}`, en: `New Setup ${num}` },
      caption: { it: 'Descrizione configurazione live.', en: 'Live configuration description.' },
      tag: { it: 'Tech Setup', en: 'Tech Setup' },
    };
    commitData({ ...data, techGallery: [...data.techGallery, newItem] });
    setSelectedGalleryIdx(data.techGallery.length);
  }

  function removeGalleryItem(idx: number) {
    if (data.techGallery.length <= 1) return;
    const nextGallery = data.techGallery.filter((_, i) => i !== idx);
    commitData({ ...data, techGallery: nextGallery });
    setSelectedGalleryIdx(Math.max(0, Math.min(safeGalIdx, nextGallery.length - 1)));
  }

  function moveGalleryItem(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= data.techGallery.length) return;
    commitData({ ...data, techGallery: swapItems(data.techGallery, idx, target) });
    if (safeGalIdx === idx) setSelectedGalleryIdx(target);
  }

  async function handleGalleryFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeGallery) return;

    setUploadError(null);
    setUploadSuccess(null);
    setUploadingImage(true);
    try {
      const slugHint = slugifyAssetName(activeGallery.id || activeGallery.title.it || file.name);
      const result = await compressImageForRepoUpload(file, {
        folder: 'tech-gallery',
        slugHint,
      });
      stageBinaryAsset({
        path: result.repoPath,
        base64: result.base64,
        previewDataUrl: result.previewDataUrl,
        mimeType: result.mimeType,
      });
      updateGallery({
        imageWebp: result.imageWebp,
        imageJpg: result.imageJpg,
      });
      setUploadSuccess(
        `Immagine pronta (${result.width}x${result.height}px, ${(result.byteSize / 1024).toFixed(
          0
        )} KB) -> ${result.repoPath}. Al salvataggio/pubblicazione GitHub Actions genererà automaticamente .webp + .jpg.`
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Errore upload immagine.');
    } finally {
      setUploadingImage(false);
    }
  }

  const allStagedAssets = useMemo(
    () => ({ ...committedDraftAssets, ...pendingAssets }),
    [committedDraftAssets, pendingAssets]
  );

  const matchedStagedAsset = useMemo(() => {
    if (!activeGallery) return null;
    const cleanJpgRepo = activeGallery.imageJpg.replace(/^\/+/, '');
    return allStagedAssets[cleanJpgRepo] ?? null;
  }, [activeGallery, allStagedAssets]);

  return (
    <div className="space-y-4">
      {/* Sub-navigation + validation pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'packages' as const, icon: 'fa-box-open', label: `Pacchetti (${data.techPackages.length})` },
            { id: 'equipment' as const, icon: 'fa-sliders', label: `Gear & Scheda Tecnica (${data.equipmentBreakdown.length})` },
            { id: 'gallery' as const, icon: 'fa-images', label: `Gallery Tech (${data.techGallery.length})` },
          ].map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-neonPurple/25 border border-neonPurple/60 text-white shadow-[0_0_14px_rgba(168,85,247,0.2)]'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <i className={`fas ${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {schemaCheck.success ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
              <i className="fas fa-circle-check" />
              <span>techSide.json valido (Zod)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-rose-300 font-semibold">
              <i className="fas fa-triangle-exclamation" />
              <span>{schemaCheck.error.issues[0]?.message ?? 'Errore validazione'}</span>
            </span>
          )}
        </div>
      </div>

      {/* ================= SUB-TAB 1: TECH PACKAGES ================= */}
      {subTab === 'packages' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                Pacchetti Setup
              </h3>
              <button
                type="button"
                onClick={addPackage}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/40 text-purple-200 text-[11px] font-bold"
              >
                <i className="fas fa-plus" />
                <span>Nuovo</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {data.techPackages.map((pkg, idx) => {
                const selected = idx === safePkgIdx;
                return (
                  <div
                    key={`${pkg.id}-${idx}`}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                      selected
                        ? 'bg-neonPurple/15 border-neonPurple/60'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                    onClick={() => setSelectedPackageIdx(idx)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {pkg.name.it || pkg.id}
                          </span>
                          {pkg.isFeatured && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-[9px] font-black text-amber-300">
                              TOP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          {pkg.capacity.it} • {pkg.features.length} punti
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePackage(idx, -1)}
                          title="Sposta su"
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-up" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === data.techPackages.length - 1}
                          onClick={() => movePackage(idx, 1)}
                          title="Sposta giù"
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-down" />
                        </button>
                        <button
                          type="button"
                          disabled={data.techPackages.length <= 1}
                          onClick={() => removePackage(idx)}
                          title="Elimina pacchetto"
                          className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activePackage && (
            <div className="col-span-8 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    ID Slug Pacchetto
                  </label>
                  <input
                    type="text"
                    value={activePackage.id}
                    onChange={(e) =>
                      updatePackage({ id: slugifyAssetName(e.target.value) || e.target.value })
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activePackage.isFeatured)}
                    onChange={(e) => updatePackage({ isFeatured: e.target.checked })}
                    className="accent-neonPurple"
                  />
                  <span className="text-xs font-bold text-white">Evidenziato (isFeatured)</span>
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activePackage.badge)}
                    onChange={(e) =>
                      updatePackage({
                        badge: e.target.checked ? { it: 'TOP CHOICE', en: 'TOP CHOICE' } : undefined,
                      })
                    }
                    className="accent-neonPurple"
                  />
                  <span className="text-xs font-bold text-white">Mostra Badge</span>
                </label>
              </div>

              {activePackage.badge && (
                <AiBilingualField
                  labelIt="Testo Badge (IT)"
                  labelEn="Badge Text (EN)"
                  valueIt={activePackage.badge.it}
                  valueEn={activePackage.badge.en}
                  onChangeIt={(it) =>
                    updatePackage({ badge: { it, en: activePackage.badge?.en ?? '' } })
                  }
                  onChangeEn={(en) =>
                    updatePackage({ badge: { it: activePackage.badge?.it ?? '', en } })
                  }
                  context="tech_package"
                />
              )}

              <AiBilingualField
                labelIt="Nome Pacchetto (IT)"
                labelEn="Package Name (EN)"
                valueIt={activePackage.name.it}
                valueEn={activePackage.name.en}
                onChangeIt={(it) => updatePackage({ name: { ...activePackage.name, it } })}
                onChangeEn={(en) => updatePackage({ name: { ...activePackage.name, en } })}
                context="tech_package"
              />

              <div className="grid grid-cols-1 gap-3">
                <AiBilingualField
                  labelIt="Sottotitolo / Tag (IT)"
                  labelEn="Subtitle / Tag (EN)"
                  valueIt={activePackage.tag.it}
                  valueEn={activePackage.tag.en}
                  onChangeIt={(it) => updatePackage({ tag: { ...activePackage.tag, it } })}
                  onChangeEn={(en) => updatePackage({ tag: { ...activePackage.tag, en } })}
                  context="tech_package"
                />

                <AiBilingualField
                  labelIt="Capienza Consigliata (IT)"
                  labelEn="Recommended Capacity (EN)"
                  valueIt={activePackage.capacity.it}
                  valueEn={activePackage.capacity.en}
                  onChangeIt={(it) => updatePackage({ capacity: { ...activePackage.capacity, it } })}
                  onChangeEn={(en) => updatePackage({ capacity: { ...activePackage.capacity, en } })}
                  context="tech_package"
                />

                <AiBilingualField
                  labelIt="Descrizione Pacchetto (IT)"
                  labelEn="Package Description (EN)"
                  valueIt={activePackage.description.it}
                  valueEn={activePackage.description.en}
                  onChangeIt={(it) =>
                    updatePackage({ description: { ...activePackage.description, it } })
                  }
                  onChangeEn={(en) =>
                    updatePackage({ description: { ...activePackage.description, en } })
                  }
                  context="tech_package"
                  multiline
                  rows={3}
                />
              </div>

              {/* Features List */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Dotazioni Incluse ({activePackage.features.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updatePackage({
                        features: [
                          ...activePackage.features,
                          { it: 'Nuova dotazione tecnica', en: 'New technical feature' },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                  >
                    <i className="fas fa-plus" />
                    <span>Aggiungi Dotazione</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {activePackage.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-purple-300">
                          Punto #{fIdx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={fIdx === 0}
                            onClick={() =>
                              updatePackage({
                                features: swapItems(activePackage.features, fIdx, fIdx - 1),
                              })
                            }
                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-arrow-up" />
                          </button>
                          <button
                            type="button"
                            disabled={fIdx === activePackage.features.length - 1}
                            onClick={() =>
                              updatePackage({
                                features: swapItems(activePackage.features, fIdx, fIdx + 1),
                              })
                            }
                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-arrow-down" />
                          </button>
                          <button
                            type="button"
                            disabled={activePackage.features.length <= 1}
                            onClick={() =>
                              updatePackage({
                                features: activePackage.features.filter((_, i) => i !== fIdx),
                              })
                            }
                            className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                      <AiBilingualField
                        labelIt="Voce IT"
                        labelEn="Item EN"
                        valueIt={feat.it}
                        valueEn={feat.en}
                        onChangeIt={(it) => {
                          const next = [...activePackage.features];
                          next[fIdx] = { ...next[fIdx], it };
                          updatePackage({ features: next });
                        }}
                        onChangeEn={(en) => {
                          const next = [...activePackage.features];
                          next[fIdx] = { ...next[fIdx], en };
                          updatePackage({ features: next });
                        }}
                        context="tech_package"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: EQUIPMENT BREAKDOWN ================= */}
      {subTab === 'equipment' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                Schede Equipment
              </h3>
              <button
                type="button"
                onClick={addEquipment}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/40 text-purple-200 text-[11px] font-bold"
              >
                <i className="fas fa-plus" />
                <span>Nuovo</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {data.equipmentBreakdown.map((eq, idx) => {
                const selected = idx === safeEqIdx;
                return (
                  <div
                    key={`${eq.model}-${idx}`}
                    onClick={() => setSelectedEquipmentIdx(idx)}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                      selected
                        ? 'bg-neonPurple/15 border-neonPurple/60'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-neonPurple/15 border border-neonPurple/30 flex items-center justify-center text-neonPurple flex-shrink-0 text-xs">
                          <i className={eq.icon} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{eq.model}</div>
                          <div className="text-[11px] text-gray-400 truncate">{eq.category.it}</div>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveEquipment(idx, -1)}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-up" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === data.equipmentBreakdown.length - 1}
                          onClick={() => moveEquipment(idx, 1)}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-down" />
                        </button>
                        <button
                          type="button"
                          disabled={data.equipmentBreakdown.length <= 1}
                          onClick={() => removeEquipment(idx)}
                          className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeEquipment && (
            <div className="col-span-8 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Modello / Hardware
                  </label>
                  <input
                    type="text"
                    value={activeEquipment.model}
                    onChange={(e) => updateEquipment({ model: e.target.value })}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-semibold"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Icona Predefinita
                  </label>
                  <select
                    value={
                      FONT_AWESOME_ICONS.some((ic) => ic.value === activeEquipment.icon)
                        ? activeEquipment.icon
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) updateEquipment({ icon: e.target.value });
                    }}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                  >
                    <option value="">Icona custom...</option>
                    {FONT_AWESOME_ICONS.map((ic) => (
                      <option key={ic.value} value={ic.value}>
                        {ic.label} ({ic.value})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Classe FA
                    </label>
                    <input
                      type="text"
                      value={activeEquipment.icon}
                      onChange={(e) => updateEquipment({ icon: e.target.value })}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div
                    className="w-9 h-9 rounded-xl bg-neonPurple/20 border border-neonPurple/40 flex items-center justify-center text-neonPurple flex-shrink-0"
                    title="Anteprima icona"
                  >
                    <i className={activeEquipment.icon} />
                  </div>
                </div>
              </div>

              <AiBilingualField
                labelIt="Categoria (IT)"
                labelEn="Category (EN)"
                valueIt={activeEquipment.category.it}
                valueEn={activeEquipment.category.en}
                onChangeIt={(it) =>
                  updateEquipment({ category: { ...activeEquipment.category, it } })
                }
                onChangeEn={(en) =>
                  updateEquipment({ category: { ...activeEquipment.category, en } })
                }
                context="tech_package"
              />

              <AiBilingualField
                labelIt="Highlight Principale (IT)"
                labelEn="Main Highlight (EN)"
                valueIt={activeEquipment.highlight.it}
                valueEn={activeEquipment.highlight.en}
                onChangeIt={(it) =>
                  updateEquipment({ highlight: { ...activeEquipment.highlight, it } })
                }
                onChangeEn={(en) =>
                  updateEquipment({ highlight: { ...activeEquipment.highlight, en } })
                }
                context="tech_package"
                multiline
                rows={2}
              />

              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                    Specifiche Dettagliate ({activeEquipment.specs.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateEquipment({
                        specs: [
                          ...activeEquipment.specs,
                          { it: 'Nuova specifica tecnica', en: 'New technical specification' },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                  >
                    <i className="fas fa-plus" />
                    <span>Aggiungi Specifica</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {activeEquipment.specs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-purple-300">
                          Spec #{sIdx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={sIdx === 0}
                            onClick={() =>
                              updateEquipment({
                                specs: swapItems(activeEquipment.specs, sIdx, sIdx - 1),
                              })
                            }
                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-arrow-up" />
                          </button>
                          <button
                            type="button"
                            disabled={sIdx === activeEquipment.specs.length - 1}
                            onClick={() =>
                              updateEquipment({
                                specs: swapItems(activeEquipment.specs, sIdx, sIdx + 1),
                              })
                            }
                            className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-arrow-down" />
                          </button>
                          <button
                            type="button"
                            disabled={activeEquipment.specs.length <= 1}
                            onClick={() =>
                              updateEquipment({
                                specs: activeEquipment.specs.filter((_, i) => i !== sIdx),
                              })
                            }
                            className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                      <AiBilingualField
                        labelIt="Specifica IT"
                        labelEn="Spec EN"
                        valueIt={spec.it}
                        valueEn={spec.en}
                        onChangeIt={(it) => {
                          const next = [...activeEquipment.specs];
                          next[sIdx] = { ...next[sIdx], it };
                          updateEquipment({ specs: next });
                        }}
                        onChangeEn={(en) => {
                          const next = [...activeEquipment.specs];
                          next[sIdx] = { ...next[sIdx], en };
                          updateEquipment({ specs: next });
                        }}
                        context="tech_package"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 3: TECH GALLERY ================= */}
      {subTab === 'gallery' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                Elementi Gallery
              </h3>
              <button
                type="button"
                onClick={addGalleryItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/40 text-purple-200 text-[11px] font-bold"
              >
                <i className="fas fa-plus" />
                <span>Nuova Foto</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {data.techGallery.map((gal, idx) => {
                const selected = idx === safeGalIdx;
                const staged = allStagedAssets[gal.imageJpg.replace(/^\/+/, '')];
                return (
                  <div
                    key={`${gal.id}-${idx}`}
                    onClick={() => {
                      setSelectedGalleryIdx(idx);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                      selected
                        ? 'bg-neonPurple/15 border-neonPurple/60'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={staged?.previewDataUrl || gal.imageWebp}
                          onError={(e) => {
                            if (gal.imageJpg && e.currentTarget.src !== gal.imageJpg) {
                              e.currentTarget.src = gal.imageJpg;
                            }
                          }}
                          alt={gal.title.it}
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0 bg-black"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {gal.title.it || gal.id}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {staged ? 'Upload in coda (bozza)' : gal.tag.it}
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveGalleryItem(idx, -1)}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-up" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === data.techGallery.length - 1}
                          onClick={() => moveGalleryItem(idx, 1)}
                          className="p-1 rounded bg-white/5 hover:bg-white/15 text-gray-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-arrow-down" />
                        </button>
                        <button
                          type="button"
                          disabled={data.techGallery.length <= 1}
                          onClick={() => removeGalleryItem(idx)}
                          className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeGallery && (
            <div className="col-span-8 rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
              {/* Preview + Upload block */}
              <div className="grid grid-cols-12 gap-4 items-start rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="col-span-5">
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/15 bg-black relative">
                    <img
                      src={matchedStagedAsset?.previewDataUrl || activeGallery.imageWebp}
                      onError={(e) => {
                        if (activeGallery.imageJpg && e.currentTarget.src !== activeGallery.imageJpg) {
                          e.currentTarget.src = activeGallery.imageJpg;
                        }
                      }}
                      alt={activeGallery.title.it}
                      className="w-full h-full object-cover"
                    />
                    {matchedStagedAsset && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-black">
                        In coda upload
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-7 space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      ID Univoco Foto
                    </label>
                    <input
                      type="text"
                      value={activeGallery.id}
                      onChange={(e) =>
                        updateGallery({ id: slugifyAssetName(e.target.value) || e.target.value })
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Carica Nuova Foto dal PC (Compressa &rarr; assets/tech-gallery/)
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neonPurple hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors">
                        <i
                          className={`fas ${
                            uploadingImage ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-up'
                          }`}
                        />
                        <span>{uploadingImage ? 'Ottimizzazione...' : 'Seleziona & Carica Foto'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingImage}
                          onChange={(e) => void handleGalleryFileUpload(e)}
                          className="hidden"
                        />
                      </label>
                      {matchedStagedAsset && pendingAssets[matchedStagedAsset.path] && (
                        <button
                          type="button"
                          onClick={() => unstageBinaryAsset(matchedStagedAsset.path)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold"
                        >
                          Rimuovi file in coda
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Oppure scegli un asset già presente in /assets/
                    </label>
                    <select
                      value={
                        EXISTING_PUBLIC_ASSETS.some(
                          (a) => a.webp === activeGallery.imageWebp && a.jpg === activeGallery.imageJpg
                        )
                          ? activeGallery.imageWebp
                          : ''
                      }
                      onChange={(e) => {
                        const found = EXISTING_PUBLIC_ASSETS.find((a) => a.webp === e.target.value);
                        if (found) {
                          updateGallery({ imageWebp: found.webp, imageJpg: found.jpg });
                        }
                      }}
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Path personalizzato / caricato...</option>
                      {EXISTING_PUBLIC_ASSETS.map((a) => (
                        <option key={a.webp} value={a.webp}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {uploadSuccess && (
                    <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-lg px-2.5 py-1.5">
                      {uploadSuccess}
                    </p>
                  )}
                  {uploadError && (
                    <p className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-lg px-2.5 py-1.5">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Path WebP Pubblico
                  </label>
                  <input
                    type="text"
                    value={activeGallery.imageWebp}
                    onChange={(e) => updateGallery({ imageWebp: e.target.value })}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Path JPG Fallback
                  </label>
                  <input
                    type="text"
                    value={activeGallery.imageJpg}
                    onChange={(e) => updateGallery({ imageJpg: e.target.value })}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <AiBilingualField
                labelIt="Titolo Foto (IT)"
                labelEn="Photo Title (EN)"
                valueIt={activeGallery.title.it}
                valueEn={activeGallery.title.en}
                onChangeIt={(it) => updateGallery({ title: { ...activeGallery.title, it } })}
                onChangeEn={(en) => updateGallery({ title: { ...activeGallery.title, en } })}
                context="tech_gallery"
              />

              <AiBilingualField
                labelIt="Badge / Tag (IT)"
                labelEn="Badge / Tag (EN)"
                valueIt={activeGallery.tag.it}
                valueEn={activeGallery.tag.en}
                onChangeIt={(it) => updateGallery({ tag: { ...activeGallery.tag, it } })}
                onChangeEn={(en) => updateGallery({ tag: { ...activeGallery.tag, en } })}
                context="tech_gallery"
              />

              <AiBilingualField
                labelIt="Didascalia (IT)"
                labelEn="Caption (EN)"
                valueIt={activeGallery.caption.it}
                valueEn={activeGallery.caption.en}
                onChangeIt={(it) => updateGallery({ caption: { ...activeGallery.caption, it } })}
                onChangeEn={(en) => updateGallery({ caption: { ...activeGallery.caption, en } })}
                context="tech_gallery"
                multiline
                rows={2}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
