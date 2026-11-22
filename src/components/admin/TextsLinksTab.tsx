import React, { useMemo, useState } from 'react';
import { I18nSchema } from '../../schemas/i18n';
import { SiteLinksSchema, type SiteLinks } from '../../schemas/siteLinks';
import { AiBilingualField } from './AiBilingualField';
import { useAdminWorkspace } from './AdminWorkspaceContext';

const SITE_LINKS_PATH = 'src/data/siteLinks.json';
const IT_PATH = 'src/i18n/it.json';
const EN_PATH = 'src/i18n/en.json';

type SectionMode = 'links' | 'i18n';

interface SocialFieldMeta {
  key: keyof SiteLinks['socials'];
  label: string;
  icon: string;
}

const SOCIAL_FIELDS: SocialFieldMeta[] = [
  { key: 'instagramPoda', label: 'Instagram PODA', icon: 'fab fa-instagram' },
  { key: 'tiktok', label: 'TikTok PODA', icon: 'fab fa-tiktok' },
  { key: 'soundcloud', label: 'SoundCloud', icon: 'fab fa-soundcloud' },
  { key: 'mixcloud', label: 'Mixcloud', icon: 'fab fa-mixcloud' },
  { key: 'instagramPartyhive', label: 'Instagram Partyhive', icon: 'fab fa-instagram' },
];

const GROUP_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  meta: {
    label: 'SEO Meta Tags & Titoli Pagina',
    desc: 'Title e Description per Home, Format, Demo/Live, Tech, Eventi',
    icon: 'fa-magnifying-glass',
  },
  header: {
    label: 'Header, Tagline & Bio',
    desc: 'Sottotitoli rotanti e presentazione principale in Home',
    icon: 'fa-heading',
  },
  nav: {
    label: 'Navigazione & Pulsanti Rapidi',
    desc: 'Etichette menu, breadcrumb e anchor jump links',
    icon: 'fa-compass',
  },
  cards: {
    label: 'Card Home Page',
    desc: 'Testi, badge e CTA delle card principali della landing page',
    icon: 'fa-grid-2',
  },
  formatPages: {
    label: 'Pagine Format (Mainstage, Party, Groove)',
    desc: 'Testi specifici delle tre pagine identity/format',
    icon: 'fa-sliders',
  },
  demoLive: {
    label: 'Pagina Demo & Live Sets',
    desc: 'Intestazioni e filtri della sezione ascolto',
    icon: 'fa-music',
  },
  techSide: {
    label: 'Pagina The Tech Side (Testi UI)',
    desc: 'Introduzione, FAQ, callout preventivo e checklist tech',
    icon: 'fa-screwdriver-wrench',
  },
  partyhive: {
    label: 'Pagina Partyhive Collective',
    desc: 'Testi e manifest del collettivo Partyhive',
    icon: 'fa-fire',
  },
  liveSets: {
    label: 'Player & Lista Live Sets',
    desc: 'Etichette metadata dei live set registrati',
    icon: 'fa-compact-disc',
  },
  footer: {
    label: 'Footer & Contatti',
    desc: 'Contatti rapidi, zone servite, copyright e link legali',
    icon: 'fa-address-card',
  },
  common: {
    label: 'Stringhe Comuni & Pulsanti Globali',
    desc: 'CTA riutilizzate su tutto il sito',
    icon: 'fa-tags',
  },
  eventsPage: {
    label: 'Pagina Eventi & Schede Evento',
    desc: 'Testi della timeline pubblica e dei dettagli evento',
    icon: 'fa-calendar-days',
  },
};

interface FlattenedLeaf {
  path: string[];
  dotKey: string;
  label: string;
}

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function collectStringLeaves(node: unknown, prefix: string[] = []): FlattenedLeaf[] {
  if (!isPlainRecord(node)) return [];
  const out: FlattenedLeaf[] = [];
  for (const [k, v] of Object.entries(node)) {
    const nextPath = [...prefix, k];
    if (typeof v === 'string') {
      out.push({
        path: nextPath,
        dotKey: nextPath.join('.'),
        label: nextPath.slice(1).join(' / ') || k,
      });
    } else if (isPlainRecord(v)) {
      out.push(...collectStringLeaves(v, nextPath));
    }
  }
  return out;
}

function collectAllLeafPaths(node: unknown, prefix: string[] = []): string[] {
  if (typeof node === 'string') return [prefix.join('.')];
  if (Array.isArray(node)) return [`${prefix.join('.')}[]`];
  if (!isPlainRecord(node)) return [];
  return Object.entries(node).flatMap(([k, v]) => collectAllLeafPaths(v, [...prefix, k]));
}

function getAtPath(obj: Record<string, unknown>, path: string[]): string {
  let cur: unknown = obj;
  for (const seg of path) {
    if (!isPlainRecord(cur)) return '';
    cur = cur[seg];
  }
  return typeof cur === 'string' ? cur : '';
}

function setAtPathImmutable(
  obj: Record<string, unknown>,
  path: string[],
  value: string
): Record<string, unknown> {
  if (path.length === 0) return obj;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...obj, [head]: value };
  }
  const existingChild = isPlainRecord(obj[head]) ? (obj[head] as Record<string, unknown>) : {};
  return {
    ...obj,
    [head]: setAtPathImmutable(existingChild, rest, value),
  };
}

export const TextsLinksTab: React.FC = () => {
  const { workingSnapshot, updateContentFile, siteLinks } = useAdminWorkspace();

  const [mode, setMode] = useState<SectionMode>('links');
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    header: true,
    meta: false,
  });

  const itData = useMemo(() => {
    const raw = workingSnapshot[IT_PATH];
    return isPlainRecord(raw) ? raw : {};
  }, [workingSnapshot]);

  const enData = useMemo(() => {
    const raw = workingSnapshot[EN_PATH];
    return isPlainRecord(raw) ? raw : {};
  }, [workingSnapshot]);

  const linksValidation = useMemo(() => SiteLinksSchema.safeParse(siteLinks), [siteLinks]);
  const itValidation = useMemo(() => I18nSchema.safeParse(itData), [itData]);
  const enValidation = useMemo(() => I18nSchema.safeParse(enData), [enData]);

  const keyParity = useMemo(() => {
    const itKeys = new Set(collectAllLeafPaths(itData));
    const enKeys = new Set(collectAllLeafPaths(enData));
    const missingInEn = Array.from(itKeys).filter((k) => !enKeys.has(k));
    const missingInIt = Array.from(enKeys).filter((k) => !itKeys.has(k));
    return {
      ok: missingInEn.length === 0 && missingInIt.length === 0,
      missingInEn,
      missingInIt,
    };
  }, [itData, enData]);

  function syncFooterFields(nextLinks: SiteLinks) {
    const syncFooter = (doc: Record<string, unknown>): Record<string, unknown> => {
      const existingFooter = isPlainRecord(doc.footer) ? doc.footer : {};
      return {
        ...doc,
        footer: {
          ...existingFooter,
          email: nextLinks.email,
          instagram: nextLinks.socials.instagramPoda.handle,
          tiktok: nextLinks.socials.tiktok.handle,
          soundcloud: nextLinks.socials.soundcloud.displayLabel,
          mixcloud: nextLinks.socials.mixcloud.displayLabel,
        },
      };
    };
    updateContentFile(IT_PATH, syncFooter(itData));
    updateContentFile(EN_PATH, syncFooter(enData));
  }

  function updateSiteLinks(nextLinks: SiteLinks, syncFooter = true) {
    updateContentFile(SITE_LINKS_PATH, nextLinks);
    if (syncFooter) {
      syncFooterFields(nextLinks);
    }
  }

  function toggleGroup(groupKey: string) {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

  // Group top-level keys of IT/EN JSON
  const topGroups = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(itData), ...Object.keys(enData)]));
    return keys;
  }, [itData, enData]);

  const itHeaderTagline = useMemo(() => {
    const hdr = isPlainRecord(itData.header) ? itData.header : {};
    return Array.isArray(hdr.tagline) ? hdr.tagline.map((x) => String(x ?? '')) : [];
  }, [itData]);

  const enHeaderTagline = useMemo(() => {
    const hdr = isPlainRecord(enData.header) ? enData.header : {};
    return Array.isArray(hdr.tagline) ? hdr.tagline.map((x) => String(x ?? '')) : [];
  }, [enData]);

  function updateTaglinePair(idx: number, lang: 'it' | 'en', value: string) {
    if (lang === 'it') {
      const hdr = isPlainRecord(itData.header) ? itData.header : {};
      const next = [...itHeaderTagline];
      next[idx] = value;
      updateContentFile(IT_PATH, { ...itData, header: { ...hdr, tagline: next } });
    } else {
      const hdr = isPlainRecord(enData.header) ? enData.header : {};
      const next = [...enHeaderTagline];
      next[idx] = value;
      updateContentFile(EN_PATH, { ...enData, header: { ...hdr, tagline: next } });
    }
  }

  function addTaglineRow() {
    const itHdr = isPlainRecord(itData.header) ? itData.header : {};
    const enHdr = isPlainRecord(enData.header) ? enData.header : {};
    updateContentFile(IT_PATH, {
      ...itData,
      header: { ...itHdr, tagline: [...itHeaderTagline, 'Nuovo tagline'] },
    });
    updateContentFile(EN_PATH, {
      ...enData,
      header: { ...enHdr, tagline: [...enHeaderTagline, 'New tagline'] },
    });
  }

  function removeTaglineRow(idx: number) {
    if (itHeaderTagline.length <= 1) return;
    const itHdr = isPlainRecord(itData.header) ? itData.header : {};
    const enHdr = isPlainRecord(enData.header) ? enData.header : {};
    updateContentFile(IT_PATH, {
      ...itData,
      header: { ...itHdr, tagline: itHeaderTagline.filter((_, i) => i !== idx) },
    });
    updateContentFile(EN_PATH, {
      ...enData,
      header: { ...enHdr, tagline: enHeaderTagline.filter((_, i) => i !== idx) },
    });
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-4">
      {/* Top Mode Switcher & Health Badges (Mobile + Desktop Responsive) */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setMode('links')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'links'
                  ? 'bg-neonPurple/25 border border-neonPurple/60 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <i className="fas fa-link" />
              <span>Link &amp; Social</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('i18n')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'i18n'
                  ? 'bg-neonPurple/25 border border-neonPurple/60 text-white'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <i className="fas fa-language" />
              <span>Testi Sito IT / EN</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                linksValidation.success ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              <i
                className={`fas ${
                  linksValidation.success ? 'fa-circle-check' : 'fa-triangle-exclamation'
                }`}
              />
              <span>siteLinks.json</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                itValidation.success && enValidation.success ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              <i
                className={`fas ${
                  itValidation.success && enValidation.success
                    ? 'fa-circle-check'
                    : 'fa-triangle-exclamation'
                }`}
              />
              <span>IT/EN Schema</span>
            </span>

            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                keyParity.ok ? 'text-sky-300' : 'text-amber-300'
              }`}
            >
              <i className={`fas ${keyParity.ok ? 'fa-code-compare' : 'fa-circle-exclamation'}`} />
              <span>
                {keyParity.ok
                  ? 'Parità chiavi IT/EN OK'
                  : `Chiavi disallineate (${keyParity.missingInEn.length + keyParity.missingInIt.length})`}
              </span>
            </span>
          </div>
        </div>

        {!linksValidation.success && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            Errore in <code>siteLinks.json</code>:{' '}
            {linksValidation.error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ')}
          </div>
        )}
        {(!itValidation.success || !enValidation.success) && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            Errore schema IT/EN:{' '}
            {!itValidation.success &&
              `IT: ${itValidation.error.issues[0]?.path.join('.')} (${itValidation.error.issues[0]?.message}) `}
            {!enValidation.success &&
              `EN: ${enValidation.error.issues[0]?.path.join('.')} (${enValidation.error.issues[0]?.message})`}
          </div>
        )}
      </div>

      {/* ================= MODE 1: SITE LINKS ================= */}
      {mode === 'links' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-black text-white">Contatti Email &amp; Policy</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                L&apos;email ufficiale viene usata sia nel footer IT/EN sia nei link di richiesta
                preventivo Tech Side.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Email Ufficiale
                </label>
                <input
                  type="email"
                  value={siteLinks.email}
                  onChange={(e) => updateSiteLinks({ ...siteLinks, email: e.target.value })}
                  className="w-full rounded-xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Email Secondaria (opzionale)
                </label>
                <input
                  type="email"
                  value={siteLinks.secondaryEmail ?? ''}
                  placeholder="opzionale@podadj.it"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    updateSiteLinks(
                      { ...siteLinks, secondaryEmail: val ? val : undefined },
                      false
                    );
                  }}
                  className="w-full rounded-xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Link / Route Privacy Policy
                </label>
                <input
                  type="text"
                  value={siteLinks.legal.privacyPolicyUrl}
                  onChange={(e) =>
                    updateSiteLinks(
                      { ...siteLinks, legal: { privacyPolicyUrl: e.target.value } },
                      false
                    )
                  }
                  placeholder="/privacy oppure https://..."
                  className="w-full rounded-xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {SOCIAL_FIELDS.map((meta) => {
              const entry = siteLinks.socials[meta.key];
              return (
                <div
                  key={meta.key}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-neonPurple/15 border border-neonPurple/35 flex items-center justify-center text-neonPurple">
                        <i className={meta.icon} />
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        {meta.label}
                      </h4>
                    </div>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-300 hover:text-white inline-flex items-center gap-1"
                    >
                      <span>Apri</span>
                      <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Handle
                      </label>
                      <input
                        type="text"
                        value={entry.handle}
                        onChange={(e) =>
                          updateSiteLinks({
                            ...siteLinks,
                            socials: {
                              ...siteLinks.socials,
                              [meta.key]: { ...entry, handle: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                        Etichetta Visibile (Footer)
                      </label>
                      <input
                        type="text"
                        value={entry.displayLabel}
                        onChange={(e) =>
                          updateSiteLinks({
                            ...siteLinks,
                            socials: {
                              ...siteLinks.socials,
                              [meta.key]: { ...entry, displayLabel: e.target.value },
                            },
                          })
                        }
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      URL Completo
                    </label>
                    <input
                      type="url"
                      value={entry.url}
                      onChange={(e) =>
                        updateSiteLinks(
                          {
                            ...siteLinks,
                            socials: {
                              ...siteLinks.socials,
                              [meta.key]: { ...entry, url: e.target.value },
                            },
                          },
                          false
                        )
                      }
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODE 2: I18N STRINGS IT / EN ================= */}
      {mode === 'i18n' && (
        <div className="space-y-3">
          {/* Search + expand/collapse toolbar */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <i className="fas fa-search text-gray-500 text-xs absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca chiave o testo IT / EN (es. bio, Mainstage, quote...)"
                className="w-full rounded-xl bg-black/50 border border-white/15 focus:border-neonPurple focus:outline-none pl-8 pr-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allOpen: Record<string, boolean> = {};
                  topGroups.forEach((g) => {
                    allOpen[g] = true;
                  });
                  setOpenGroups(allOpen);
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-gray-200"
              >
                Espandi tutto
              </button>
              <button
                type="button"
                onClick={() => setOpenGroups({})}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-gray-200"
              >
                Chiudi tutto
              </button>
            </div>
          </div>

          {!keyParity.ok && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-1">
              {keyParity.missingInEn.length > 0 && (
                <div>
                  <strong>Mancanti in EN:</strong> {keyParity.missingInEn.join(', ')}
                </div>
              )}
              {keyParity.missingInIt.length > 0 && (
                <div>
                  <strong>Mancanti in IT:</strong> {keyParity.missingInIt.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Accordion Groups */}
          {topGroups.map((groupKey) => {
            const meta = GROUP_LABELS[groupKey] ?? {
              label: groupKey,
              desc: `Sezione ${groupKey}`,
              icon: 'fa-folder-open',
            };
            const leaves = collectStringLeaves(itData[groupKey], [groupKey]);
            const filteredLeaves = normalizedQuery
              ? leaves.filter((leaf) => {
                  const itVal = getAtPath(itData, leaf.path).toLowerCase();
                  const enVal = getAtPath(enData, leaf.path).toLowerCase();
                  return (
                    leaf.dotKey.toLowerCase().includes(normalizedQuery) ||
                    itVal.includes(normalizedQuery) ||
                    enVal.includes(normalizedQuery)
                  );
                })
              : leaves;

            const showTaglineBlock =
              groupKey === 'header' &&
              (!normalizedQuery ||
                'header.tagline'.includes(normalizedQuery) ||
                itHeaderTagline.some((t) => t.toLowerCase().includes(normalizedQuery)) ||
                enHeaderTagline.some((t) => t.toLowerCase().includes(normalizedQuery)));

            if (normalizedQuery && filteredLeaves.length === 0 && !showTaglineBlock) {
              return null;
            }

            const isOpen = Boolean(normalizedQuery) || Boolean(openGroups[groupKey]);
            const aiContext = groupKey === 'meta' ? 'seo_meta' : 'site_copy';

            return (
              <div
                key={groupKey}
                className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-neonPurple/15 border border-neonPurple/35 flex items-center justify-center text-neonPurple flex-shrink-0 text-xs">
                      <i className={`fas ${meta.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white truncate">
                        {meta.label}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">{meta.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-gray-400">
                      {filteredLeaves.length + (groupKey === 'header' ? 1 : 0)}
                    </span>
                    <i
                      className={`fas ${
                        isOpen ? 'fa-chevron-up' : 'fa-chevron-down'
                      } text-xs text-gray-400`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-4">
                    {/* Special Header Tagline Array */}
                    {showTaglineBlock && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white">
                              header.tagline (righe sottotitolo Home)
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Lista ordinata di tagline visibili nell&apos;header della landing page.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={addTaglineRow}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neonPurple/20 hover:bg-neonPurple/35 border border-neonPurple/40 text-purple-200 text-[11px] font-bold flex-shrink-0"
                          >
                            <i className="fas fa-plus" />
                            <span>Riga</span>
                          </button>
                        </div>

                        {Array.from({
                          length: Math.max(itHeaderTagline.length, enHeaderTagline.length),
                        }).map((_, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-white/10 bg-black/30 p-2.5 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-purple-300">
                                Tagline #{idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={itHeaderTagline.length <= 1}
                                onClick={() => removeTaglineRow(idx)}
                                className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 disabled:opacity-30 text-[10px]"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                            <AiBilingualField
                              labelIt={`Tagline #${idx + 1} (IT)`}
                              labelEn={`Tagline #${idx + 1} (EN)`}
                              valueIt={itHeaderTagline[idx] ?? ''}
                              valueEn={enHeaderTagline[idx] ?? ''}
                              onChangeIt={(val) => updateTaglinePair(idx, 'it', val)}
                              onChangeEn={(val) => updateTaglinePair(idx, 'en', val)}
                              context="site_copy"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Standard string leaves */}
                    {filteredLeaves.map((leaf) => {
                      const valIt = getAtPath(itData, leaf.path);
                      const valEn = getAtPath(enData, leaf.path);
                      const isLong =
                        valIt.length > 85 ||
                        valEn.length > 85 ||
                        valIt.includes('\n') ||
                        valEn.includes('\n');
                      return (
                        <div
                          key={leaf.dotKey}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                        >
                          <div className="text-[10px] font-mono text-purple-300/80 mb-2">
                            {leaf.dotKey}
                          </div>
                          <AiBilingualField
                            labelIt={`${leaf.label} (IT)`}
                            labelEn={`${leaf.label} (EN)`}
                            valueIt={valIt}
                            valueEn={valEn}
                            onChangeIt={(next) =>
                              updateContentFile(IT_PATH, setAtPathImmutable(itData, leaf.path, next))
                            }
                            onChangeEn={(next) =>
                              updateContentFile(EN_PATH, setAtPathImmutable(enData, leaf.path, next))
                            }
                            context={aiContext}
                            multiline={isLong}
                            rows={3}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
