import React, { useLayoutEffect, useRef, useState } from 'react';
import type { FramingUsage } from '../../config/framingRegistry';
import { FRAMING_KEYS_META } from '../../config/framingRegistry';
import type { CardDeviceConfig } from '../../schemas/imageFraming';
import { buildFramingInlineStyles } from '../../utils/imageFraming';

interface ScaledViewportFrameProps {
  virtualWidth: number;
  align?: 'center' | 'left';
  children: React.ReactNode;
}

/**
 * Renders its children at an exact fixed virtual width (e.g. 1152px Desktop Bento,
 * 1024px Dedicated Pages, 358px Mobile content) and proportionally scales the stage
 * to fit the available panel width, preserving exact 1:1 page form-factor and proportions.
 */
export const ScaledViewportFrame: React.FC<ScaledViewportFrameProps> = ({
  virtualWidth,
  align = 'center',
  children,
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(virtualWidth);
  const [innerHeight, setInnerHeight] = useState<number>(300);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const cw = outer.clientWidth;
      if (cw > 0) setContainerWidth(cw);
      const ih = inner.offsetHeight;
      if (ih > 0) setInnerHeight(ih);
    };

    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(outer);
    ro.observe(inner);

    return () => ro.disconnect();
  }, [virtualWidth]);

  const scale = Math.min(1, Math.max(0.2, containerWidth / virtualWidth));
  const scaledWidth = Math.round(virtualWidth * scale);
  const scaledHeight = Math.ceil(innerHeight * scale);

  return (
    <div
      ref={outerRef}
      className={`w-full flex ${align === 'center' ? 'justify-center' : 'justify-start'}`}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: `${virtualWidth}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

interface FramingPreviewCardProps {
  usage: FramingUsage;
  viewport: 'desktop' | 'mobile';
  deviceConf: CardDeviceConfig | undefined;
  overridePreviewUrl?: string;
  selected?: boolean;
  onSelect?: () => void;
  styleHeightOverride?: number;
}

export const FramingPreviewCard: React.FC<FramingPreviewCardProps> = ({
  usage,
  viewport,
  deviceConf,
  overridePreviewUrl,
  selected = false,
  onSelect,
  styleHeightOverride,
}) => {
  const keyMeta = FRAMING_KEYS_META[usage.framingKey];
  const built = buildFramingInlineStyles(
    deviceConf,
    keyMeta.defaultWebp,
    keyMeta.defaultJpg,
    {
      insetExpand: usage.insetExpand,
      overridePreviewUrl,
      filter: usage.filterCss,
    }
  );

  const realHeightPx =
    styleHeightOverride ??
    (viewport === 'mobile' ? usage.mobileHeightPx : usage.desktopHeightPx);

  const borderRadiusClass =
    usage.variant === 'bento-row' ||
    usage.variant === 'bento-tall' ||
    usage.variant === 'bento-bottom'
      ? 'rounded-[1.25rem]'
      : usage.variant === 'hero-banner'
        ? 'rounded-3xl'
        : 'rounded-2xl';

  const WrapperTag = onSelect ? 'button' : 'div';

  return (
    <WrapperTag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      style={realHeightPx ? { height: `${realHeightPx}px` } : undefined}
      className={`group text-left w-full relative overflow-hidden ${borderRadiusClass} border transition-all bg-[#07070b] shadow-2xl ${
        selected
          ? 'border-neonPurple ring-2 ring-neonPurple/70 shadow-[0_0_26px_rgba(168,85,247,0.45)]'
          : 'border-white/20 hover:border-white/45'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Background Framed Layer — exact production CSS via buildFramingInlineStyles */}
      <div className="absolute pointer-events-none" style={built.reactStyle} />

      {/* Atmospheric Overlay Layer matching real public component */}
      <div className={`absolute inset-0 pointer-events-none ${usage.overlayClassName}`} />

      {/* ==================== HERO BANNER (DESKTOP 1024px / MOBILE 358px) ==================== */}
      {usage.variant === 'hero-banner' && (
        <div className="relative z-10 w-full">
          {/* Top Navigation Bar matching HeroBanner.astro */}
          <div
            className={`flex items-center justify-between w-full ${
              viewport === 'desktop' ? 'p-5' : 'p-3.5'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-gray-300 bg-black/55 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded-lg">
              <i className="fas fa-arrow-left text-[10px]" />
              <span>Torna alla Home</span>
            </span>

            <span className="inline-flex items-center gap-1 bg-black/60 border border-white/20 backdrop-blur-md rounded-full p-1 text-xs tracking-wider">
              <span className="px-2.5 py-0.5 rounded-full font-bold text-white bg-neonPurple/40 border border-neonPurple/50">
                IT
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-medium text-gray-400">EN</span>
            </span>
          </div>

          {/* Center Title + optional Subtitle matching HeroBanner.astro */}
          <div
            className={`flex flex-col items-center justify-center text-center px-4 pt-2 max-w-3xl mx-auto ${
              usage.previewSubtitle
                ? viewport === 'desktop'
                  ? 'pb-9'
                  : 'pb-7'
                : viewport === 'desktop'
                  ? 'pb-11'
                  : 'pb-8'
            }`}
          >
            <h4
              className={`font-black text-white uppercase tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] ${
                viewport === 'desktop' ? 'text-5xl leading-none' : 'text-2xl leading-tight'
              }`}
            >
              {usage.previewTitle}
            </h4>
            {usage.previewSubtitle && (
              <p
                className={`text-gray-200 font-normal leading-relaxed max-w-xl mt-2.5 px-2 drop-shadow ${
                  viewport === 'desktop' ? 'text-sm' : 'text-xs'
                }`}
              >
                {usage.previewSubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ==================== QUICK-NAV CARD (DEMO & LIVE SETS) ==================== */}
      {usage.variant === 'quick-nav-card' && (
        <div className="relative z-10 h-full flex flex-col justify-end p-5">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`font-black text-white uppercase tracking-wider drop-shadow ${
                viewport === 'desktop' ? 'text-lg' : 'text-base'
              }`}
            >
              {usage.previewTitle}
            </h4>
            <i className="fas fa-arrow-right text-xs text-white/75 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* ==================== BENTO DESKTOP CARDS ==================== */}
      {(usage.variant === 'bento-row' ||
        usage.variant === 'bento-tall' ||
        usage.variant === 'bento-bottom') && (
        <div className="relative z-10 h-full flex items-center justify-center p-4 text-center">
          <h4
            className={`font-extrabold tracking-wider text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${
              usage.variant === 'bento-tall'
                ? 'text-3xl'
                : usage.variant === 'bento-row'
                  ? 'text-3xl'
                  : 'text-2xl'
            }`}
          >
            {usage.previewTitle}
          </h4>
        </div>
      )}

      {/* ==================== MOBILE LINKTREE CARDS ==================== */}
      {usage.variant === 'mobile-expandable' && (
        <div className="relative z-10 h-full flex items-center justify-between px-4">
          <h4 className="text-lg font-extrabold uppercase tracking-wider text-white drop-shadow leading-tight pr-2">
            {usage.previewTitle}
          </h4>
          <div className="flex items-center gap-2 flex-none">
            <span className="w-9 h-9 rounded-full bg-black/40 border border-white/30 flex items-center justify-center text-white/90 text-xs">
              <i className="fas fa-arrow-right" />
            </span>
            <span className="w-7 h-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/80 text-xs">
              <i className="fas fa-chevron-down" />
            </span>
          </div>
        </div>
      )}

      {usage.variant === 'mobile-tall' && (
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          <div className="flex justify-end gap-2">
            <span className="w-9 h-9 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white/90 text-xs">
              <i className="fas fa-arrow-right" />
            </span>
            <span className="w-7 h-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/80 text-xs self-center">
              <i className="fas fa-chevron-down" />
            </span>
          </div>
          <h4 className="text-xl font-extrabold uppercase tracking-wider text-white drop-shadow leading-tight">
            {usage.previewTitle}
          </h4>
        </div>
      )}

      {usage.variant === 'mobile-grid-square' && (
        <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
          <div className="flex justify-end">
            <span className="w-7 h-7 rounded-full bg-black/50 border border-white/30 flex items-center justify-center text-white/90 text-[10px]">
              <i className="fas fa-arrow-right" />
            </span>
          </div>
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-white drop-shadow leading-tight">
            {usage.previewTitle}
          </h4>
        </div>
      )}

      {usage.variant === 'mobile-wide' && (
        <div className="relative z-10 h-full flex flex-col justify-between p-4">
          <div className="flex justify-end gap-2">
            <span className="w-8 h-8 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white/90 text-xs">
              <i className="fab fa-instagram" />
            </span>
            <span className="w-7 h-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white/80 text-xs self-center">
              <i className="fas fa-chevron-down" />
            </span>
          </div>
          <h4 className="text-xl font-extrabold uppercase tracking-wider text-white drop-shadow leading-tight">
            {usage.previewTitle}
          </h4>
        </div>
      )}

      {/* Selected indicator / Quick readout on hover */}
      <div
        className={`pointer-events-none absolute top-2 left-2 z-30 px-2 py-0.5 rounded text-[10px] font-mono transition-opacity ${
          selected
            ? 'bg-neonPurple text-white font-bold opacity-100 shadow'
            : 'bg-black/75 text-gray-200 opacity-0 group-hover:opacity-100'
        }`}
      >
        {usage.configKey} · {built.position} · {Math.round(built.zoom * 100)}%
      </div>
    </WrapperTag>
  );
};
