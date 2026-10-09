import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { DesignElement } from '../../store/designStore';
import { getIsiBulletSpacing, getPiStripStyle } from '../../utils/bannerExport';
interface ISIOverlayProps {
  element: DesignElement;
  isActive: boolean;
  /** True while the preview is playing. The ISI tray has NO animation — it is
   *  a static tray with the editable content + logo. This flag only toggles
   *  the tray's interactivity (manual wheel / scrollbar while previewing). */
  isAnimating?: boolean;
  /** All design elements — lets the tray find a PI strip docked to it so it
   *  can render the strip as a pinned, full-bleed header. */
  allElements?: DesignElement[];
}

export const ISIOverlay: React.FC<ISIOverlayProps> = ({ element, isAnimating = false, allElements }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Pinned PI header: a strip with dockedIsiId === this tray's id (and still
  // visible) renders INSIDE the tray — end-to-end across the top — instead of
  // as a free layer. The scrolling body is offset below it.
  const dockedStrip = useMemo(
    () => (allElements || []).find((el) => el.type === 'piStrip' && el.dockedIsiId === element.id && el.visible !== false),
    [allElements, element.id],
  );
  const dockedStyle = useMemo(() => (dockedStrip ? getPiStripStyle(dockedStrip) : null), [dockedStrip]);
  const pinnedHeight = dockedStrip ? (dockedStrip.height || 20) : 0;

  // NO ANIMATION BY DEFAULT: the ISI tray is static — editable content + logo.
  // OPTIONAL auto-scroll: when "Auto ISI Scroll" is enabled (isiAutoStart),
  // the tray scrolls on its OWN clock — fully independent of the banner
  // (master) animation timeline. It waits "Start scrolling at" seconds
  // (isiStartDelay, measured on the ISI's own clock) holding at the top, then
  // loops top→bottom over "Scroll Duration" seconds (isiScrollDuration, default
  // 60), then resets and repeats. It NEVER reads or syncs with the banner
  // playhead. Hovering (preview) freezes it; the wheel / scrollbar drag can
  // also scroll it manually.
  const autoScroll = element.isiAutoStart !== false;
  const startDelayS = Math.max(0, element.isiStartDelay || 0);
  const scrollDurationS = Math.max(1, element.isiScrollDuration || 60);
  // Once the content has scrolled fully to the bottom it holds there before
  // snapping back to the top, so the last lines stay readable.
  const holdDurationS = Math.max(0, element.isiHoldDuration ?? 3);

  const latestRef = useRef({ element, scrollDurationS, holdDurationS, autoScroll, startDelayS });

  useEffect(() => {
    latestRef.current = { element, scrollDurationS, holdDurationS, autoScroll, startDelayS };
  }, [element, scrollDurationS, holdDurationS, autoScroll, startDelayS]);

  const getMaxScroll = useCallback((): number => {
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content || !container) return 0;
    // No header band sits inside the tray any more, so the whole content scrolls.
    return content.scrollHeight - container.clientHeight;
  }, []);

  // Manual scroll writer (wheel / scrollbar drag) — kept in sync so the auto
  // pass can resume seamlessly from wherever the user scrolled to.
  const scrollYRef = useRef(0);
  const manualOffsetRef = useRef<number | null>(null);
  const scrollbarDragRef = useRef<{ pointerId: number; track: HTMLDivElement } | null>(null);

  const applyScroll = useCallback((v: number) => {
    const max = getMaxScroll();
    scrollYRef.current = Math.max(0, Math.min(max, v));
    setScrollY(scrollYRef.current);
  }, [getMaxScroll]);

  // Optional auto-scroll — the ISI tray's OWN clock, independent of the banner
  // timeline. It holds at the top for "Start scrolling at" seconds first.
  // Hovering (preview only) freezes it; leaving resumes from the current spot.
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const ownClockRef = useRef(0);        // seconds since the tray (re)started
  const isiClockRef = useRef(0);        // seconds since the current pass began
  const isHoveredRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    // Restart the ISI's own clock whenever auto-scroll or the start delay
    // changes, so a newly configured delay counts from now.
    ownClockRef.current = 0;

    if (!autoScroll) {
      // Auto-scroll disabled → static tray parked at the top.
      isiClockRef.current = 0;
      manualOffsetRef.current = null;
      applyScroll(0);
      return;
    }

    const tick = (now: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = now;
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.1);
      lastFrameRef.current = now;

      const { scrollDurationS: dur, holdDurationS: hold } = latestRef.current;
      const maxScroll = getMaxScroll();

      if (maxScroll > 0 && !isHoveredRef.current) {
        // Advance the ISI tray's OWN clock — the banner playhead is never read.
        ownClockRef.current += dt;

        if (ownClockRef.current < startDelayS) {
          // Still inside the "Start scrolling at" delay: hold at the top.
          isiClockRef.current = 0;
          manualOffsetRef.current = null;
          applyScroll(0);
        } else {
          isiClockRef.current += dt;
          const scrollEnd = dur;
          const holdEnd = dur + hold;
          if (isiClockRef.current >= holdEnd) {
            // Hold finished → snap back to the top and start the next pass.
            isiClockRef.current = 0;
            manualOffsetRef.current = null;
            applyScroll(0);
          } else if (isiClockRef.current >= scrollEnd) {
            // Reached the bottom → hold there so the last lines stay readable.
            manualOffsetRef.current = null;
            applyScroll(maxScroll);
          } else if (manualOffsetRef.current === null) {
            applyScroll((maxScroll * isiClockRef.current) / dur);
          }
          // While hovered / manual-scrolled: the wheel / scrollbar handlers
          // drive scrollY directly (the auto clock is frozen) — do NOT touch
          // scrollY here.
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    const cancel = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastFrameRef.current = null;
    };
    return cancel;
  }, [autoScroll, startDelayS, applyScroll, getMaxScroll]);

  // Calculate effective padding (individual sides override single value)
  const paddingTop = element.isiPaddingTop ?? element.isiPadding ?? 10;
  const paddingRight = element.isiPaddingRight ?? element.isiPadding ?? 10;
  const paddingBottom = element.isiPaddingBottom ?? element.isiPadding ?? 10;
  const paddingLeft = element.isiPaddingLeft ?? element.isiPadding ?? 10;

  // Calculate effective margin (individual sides override single value)
  const marginTop = element.isiMarginTop ?? element.isiMargin ?? 0;
  const marginLeft = element.isiMarginLeft ?? element.isiMargin ?? 0;

  // Apply margin to position
  const effectiveX = (element.x || 0) + marginLeft;
  const effectiveY = (element.y || 0) + marginTop;

  // Designer-controlled bullet spacing, scoped to this tray only.
  //
  // Scoped by ID, not by class, and that detail is load-bearing. The canvas
  // stylesheet reaches the same bullet through
  // `.isi-rich-overlay .isi .mb-7` — three classes, specificity 30 — and it is
  // declared `!important`. A class-based scope here (e.g.
  // `.isi-bullets-x .isi ul li`, specificity 22) would LOSE to it, so the Gap
  // control would silently do nothing in the editor while still working in the
  // exported banner. An ID scores 100 and wins, exactly like the exporter's
  // `#el-<id> .isi ul li`.
  const bulletScopeId = `isi-overlay-${(element.id || 'x').replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const bulletCss = useMemo(() => {
    const { spacing, indent, itemIndent } = getIsiBulletSpacing(element);
    return (
      `#${bulletScopeId} .isi ul { padding-left: ${indent}px !important; } ` +
      `#${bulletScopeId} .isi ul li { margin-bottom: ${spacing}px !important; margin-left: 0; ` +
      `text-indent: -${itemIndent}px; padding-left: ${itemIndent}px; } ` +
      `#${bulletScopeId} .isi ul li::before { left: -${itemIndent}px; }`
    );
  }, [element, bulletScopeId]);

  // Measure the scrollable content height (drives the scrollbar indicator and
  // maxScroll math). ResizeObserver catches async image/logo loading too.
  useEffect(() => {
    if (!contentRef.current) return;
    const measure = () => setContentHeight(contentRef.current!.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [element.isiText, element.isiLogoSrc, element.fontSize, element.isiLineHeight, element.width, element.height]);

  // Mouse wheel over the ISI tray: scroll up/down manually. Works in edit mode
  // AND during preview — the ISI never requires the Play/Preview button. The
  // tray is click-through in edit mode (so the Konva shell underneath stays
  // selectable/draggable), so we listen on the parent zone and hit-test the
  // tray rect instead of relying on events reaching the tray itself.
  // When auto-scroll is enabled, a manual wheel simply resumes the auto pass
  // from the newly scrolled position (and skips any remaining start delay).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const zone = container.parentElement || container;
    const onWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      const max = getMaxScroll();
      if (max <= 0) return;
      e.preventDefault();
      e.stopPropagation();
      const base = manualOffsetRef.current ?? scrollYRef.current;
      applyScroll(base + e.deltaY * 0.5);
      const { autoScroll: auto, startDelayS: delay, scrollDurationS: dur } = latestRef.current;
      if (auto) {
        // Continue the auto pass from where the user scrolled to. Scrolling
        // past the bottom edge leaves the clock inside the hold window, so the
        // tray keeps the user's position instead of snapping back.
        ownClockRef.current = Math.max(ownClockRef.current, delay);
        isiClockRef.current = (scrollYRef.current / max) * dur;
        manualOffsetRef.current = null;
      } else {
        manualOffsetRef.current = scrollYRef.current;
      }
    };
    zone.addEventListener('wheel', onWheel, { passive: false });
    return () => zone.removeEventListener('wheel', onWheel);
  }, [applyScroll, getMaxScroll]);

  // Hover pause: the auto-scroll freezes while the pointer is over the tray and
  // resumes from the exact spot on leave. In edit mode the tray is click-through
  // (`pointerEvents: 'none'`) so React's onMouseEnter/onMouseLeave never fire —
  // we listen on the parent zone and hit-test the tray rect instead, matching the
  // wheel handler above so hover works identically in edit mode AND preview.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const zone = container.parentElement || container;

    const hits = (x: number, y: number) => {
      const rect = container.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const onPointerMove = (e: PointerEvent) => {
      const inside = hits(e.clientX, e.clientY);
      if (inside === isHoveredRef.current) return;
      isHoveredRef.current = inside;
      setIsHovered(inside);
      if (!inside) {
        // Hand control back to the auto pass from wherever the pointer left off.
        const { autoScroll: auto, scrollDurationS: dur } = latestRef.current;
        if (auto && !manualOffsetRef.current) {
          const max = getMaxScroll();
          if (max > 0) isiClockRef.current = (scrollYRef.current / max) * dur;
        }
        manualOffsetRef.current = null;
      }
    };

    const onPointerLeave = () => {
      if (!isHoveredRef.current) return;
      isHoveredRef.current = false;
      setIsHovered(false);
      const { autoScroll: auto, scrollDurationS: dur } = latestRef.current;
      if (auto && !manualOffsetRef.current) {
        const max = getMaxScroll();
        if (max > 0) isiClockRef.current = (scrollYRef.current / max) * dur;
      }
      manualOffsetRef.current = null;
    };

    zone.addEventListener('pointermove', onPointerMove);
    zone.addEventListener('pointerleave', onPointerLeave);
    return () => {
      zone.removeEventListener('pointermove', onPointerMove);
      zone.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [applyScroll, getMaxScroll]);

  // Scrollbar drag (preview only): pointer-drag the indicator (or click the
  // track) to scroll up/down manually — user-driven, never automated.
  const dragScrollTo = useCallback((clientY: number, track: HTMLDivElement) => {
    const max = getMaxScroll();
    if (max <= 0) return;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    manualOffsetRef.current = ratio * max;
    applyScroll(manualOffsetRef.current);
  }, [applyScroll, getMaxScroll]);

  const handleScrollbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    scrollbarDragRef.current = { pointerId: e.pointerId, track };
    track.setPointerCapture(e.pointerId);
    e.preventDefault();
    dragScrollTo(e.clientY, track);
  };
  const handleScrollbarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollbarDragRef.current) return;
    dragScrollTo(e.clientY, scrollbarDragRef.current.track);
  };
  const handleScrollbarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollbarDragRef.current) return;
    try {
      scrollbarDragRef.current.track.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
    scrollbarDragRef.current = null;
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: effectiveX,
    top: effectiveY,
    // Must match the Konva shell's fallbacks (DesignCanvas passes the same) —
    // without explicit size the absolute div auto-grows to the full content
    // height and covers the whole banner, hiding every other element.
    width: element.width || 300,
    height: element.height || 200,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: element.isiBackgroundColor || '#ffffff',
    color: element.fill || '#000000',
    fontSize: `${element.fontSize || 12}px`,
    fontFamily: element.isiFontFamily || 'Arial, Helvetica, sans-serif',
    fontWeight: element.isiFontWeight || 'normal',
    fontStyle: element.isiFontStyle || 'normal',
    lineHeight: element.isiLineHeight || 1.4,
    letterSpacing: `${element.isiLetterSpacing || 0}px`,
    border: `${element.isiBorderWidth || 0}px solid ${element.isiBorderColor || 'transparent'}`,
    overflow: 'hidden',
    // Bullet spacing is driven by a scoped <style> tag (rendered just below)
    // so the preview and the exported banner share identical bullet metrics.
    // SEPARATE LAYERS: the ISI tray is its own layer on top of the banner.
    // In edit mode it is semi-transparent with a dashed outline so banner
    // elements behind/added later stay visible & editable. During preview it
    // goes fully opaque and manually scrollable (wheel / scrollbar drag).
    pointerEvents: isAnimating ? 'auto' : 'none',
    opacity: isAnimating ? 1 : 0.55,
    outline: isAnimating ? 'none' : '1px dashed rgba(0, 105, 55, 0.6)',
    outlineOffset: -1,
    zIndex: 1000,
    boxShadow: isAnimating ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    cursor: 'default',
  };

  const scrollbarColor = element.isiScrollbarColor || '#006937';
  const indicatorColor = element.isiScrollbarTrackColor || '#f2f2f2';

  // The PI strip is its own layer now, so the tray is nothing but the scrolling
  // text — except when a strip is DOCKED: then it pins end-to-end across the
  // tray's top and the body scrolls in the space below it.
  const trayHeight = element.height || 200;
  const bodyHeight = Math.max(0, trayHeight - pinnedHeight);
  const maxScroll = contentHeight - bodyHeight;
  const logoWidth = element.isiLogoWidth || 187;

  return (
    <div
      ref={containerRef}
      style={style}
      id={bulletScopeId}
      className="isi-rich-overlay"
      data-isi-hovered={isHovered ? 'true' : undefined}
      data-isi-hold={holdDurationS}
    >
      {/* Designer-controlled bullet spacing. Scoped by the tray's generated ID and
          built from the same helper the exporter uses, so the canvas preview
          matches the downloaded banner exactly. */}
      <style>{bulletCss}</style>

      {/* Scrollable wrapper (mirrors .isi_wrapper) */}
      {/* Pinned PI header: a docked strip spans end-to-end across the tray's
          top and NEVER scrolls — the wrapper below scrolls under it. Full
          tray width (ignores the strip's own x/width), same background,
          padding, type and click-through as the exported .patient_link. */}
      {dockedStrip && dockedStyle && (
        <div
          className="patient_link"
          style={{
            flex: '0 0 auto',
            width: '100%',
            height: pinnedHeight,
            boxSizing: 'border-box',
            background: dockedStyle.background,
            borderRadius: dockedStyle.borderRadius,
            padding: `${dockedStyle.paddingTop}px ${dockedStyle.paddingRight}px ${dockedStyle.paddingBottom}px ${dockedStyle.paddingLeft}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: dockedStyle.align,
            overflow: 'hidden',
            zIndex: 2,
          }}
        >
          {dockedStrip.linkUrl ? (
            <a
              href={dockedStrip.linkUrl}
              target={dockedStrip.linkTarget || '_blank'}
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: dockedStrip.fill || '#000000',
                fontSize: `${dockedStrip.fontSize || 10}px`,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 'bold',
                textDecoration: 'underline',
                textUnderlineOffset: 1,
              }}
            >
              {dockedStrip.text || ''}
            </a>
          ) : (
            <span
              style={{
                color: dockedStrip.fill || '#000000',
                fontSize: `${dockedStrip.fontSize || 10}px`,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 'bold',
              }}
            >
              {dockedStrip.text || ''}
            </span>
          )}
        </div>
      )}
      <div className="isi_wrapper" style={{ position: 'relative', height: bodyHeight, paddingRight: 10, overflow: 'hidden' }}>
        <div
          ref={contentRef}
          className="isi"
          style={{ 
            transform: `translateY(-${scrollY}px)`, 
            transition: 'transform 0.1s linear', 
            width: element.width ? element.width - 14 : 280,
            paddingTop: `${paddingTop}px`,
            paddingRight: `${paddingRight}px`,
            paddingBottom: `${paddingBottom}px`,
            paddingLeft: `${paddingLeft}px`,
            boxSizing: 'border-box'
          }}
        >
          {/* Logo Integration */}
          {element.isiLogoSrc && (element.isiLogoPosition || 'bottom') === 'top' && (
            element.isiLogoLink ? (
              <a href={element.isiLogoLink} target="_blank" rel="noopener noreferrer">
                <img
                  src={element.isiLogoSrc}
                  style={{ width: logoWidth, height: 'auto', display: 'block', marginBottom: 10, border: 0 }}
                />
              </a>
            ) : (
              <img
                src={element.isiLogoSrc}
                style={{ width: logoWidth, height: 'auto', display: 'block', marginBottom: 10 }}
              />
            )
          )}

          {/* Rich Text Content */}
          <div
            dangerouslySetInnerHTML={{ __html: element.isiText || '' }}
            className="rich-isi-content"
          />

          {/* Bottom logo (reference: .isi-logo, 187px wide, bottom of content) */}
          {element.isiLogoSrc && (element.isiLogoPosition || 'bottom') !== 'top' && (
            element.isiLogoLink ? (
              <a href={element.isiLogoLink} target="_blank" rel="noopener noreferrer">
                <img className="mb-10 isi-logo" src={element.isiLogoSrc} style={{ width: logoWidth, height: 'auto', border: 0 }} />
              </a>
            ) : (
              <img className="mb-10 isi-logo" src={element.isiLogoSrc} style={{ width: logoWidth, height: 'auto' }} />
            )
          )}
        </div>

        {/* iScroll-style scrollbar (green track + fixed 13px light indicator).
            Interactive: drag the indicator or click the track to scroll up/down. */}
        <div
          className="iScrollVerticalScrollbar iScrollLoneScrollbar"
          onPointerDown={handleScrollbarPointerDown}
          onPointerMove={handleScrollbarPointerMove}
          onPointerUp={handleScrollbarPointerUp}
          onPointerCancel={handleScrollbarPointerUp}
          style={{
            top: 0,
            right: element.isiScrollbarMarginRight ?? 3,
            height: `${element.isiScrollbarHeight ?? 66}%`,
            width: element.isiScrollbarWidth ?? 8,
            padding: element.isiScrollbarPadding ?? 0,
            marginTop: element.isiScrollbarMarginTop ?? 5,
            position: 'absolute',
            zIndex: 9999,
            overflow: 'visible',
            backgroundColor: scrollbarColor,
            borderRadius: 5,
            borderTop: `1px solid ${scrollbarColor}`,
            borderBottom: `1px solid ${scrollbarColor}`,
            cursor: 'pointer',
            touchAction: 'none',
          }}
        >
          <div
            className="iScrollIndicator"
            style={{
              width: 6,
              height: 13,
              right: 1,
              position: 'absolute',
              background: indicatorColor,
              borderRadius: 5,
              top: `${Math.min(maxScroll > 0 ? (scrollY / maxScroll) * ((bodyHeight - 25) * 0.66 - 13) : 0, Math.max(0, (bodyHeight - 25) * 0.66 - 13))}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
