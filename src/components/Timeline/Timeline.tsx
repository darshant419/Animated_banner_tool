import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import {
  Play, Pause, Eye, EyeOff, Lock, Unlock, Square, Circle,
  Image as ImageIcon, ScrollText, Shapes, Code2, Repeat, Trash2,
  Sparkles, Plus, Minus, SkipBack, Magnet, Maximize2, Sliders,
  LogIn, LogOut, Timer, Video, Type, PanelTop, ChevronDown,
} from 'lucide-react';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import { seekAllMasters } from '../Canvas/AnimationHelpers';
import {
  getElementBaseState,
  type ElementAnimationSegment,
} from '../../utils/keyframes';
import { buildTrackModel, type TrackSegment } from './trackModel';

/*
 * Timeline — TheBrief-style layout:
 *  - compact layer rows (type icon + name; eye / lock / delete on hover),
 *  - one "lifetime" pill per layer tinted by layer type, with a solid entrance
 *    block at its start and an exit block at its end,
 *  - loop / timed blocks striped inside the pill, the text effect as a thin
 *    strip along its bottom edge, manual keyframes as diamonds on top,
 *  - a ruler that runs past the banner end, with a draggable end marker and
 *    the time after it greyed out.
 */

const ROW_H = 32;
const RULER_H = 30;
const PILL_H = 22;
const DEFAULT_PPS = 100;
const MIN_PPS = 20;
const MAX_PPS = 240;

const ACCENT = '#f26b4b';
const PANEL_BG = '#101017';
const TRACK_BG = '#0c0c13';
const LINE = '#1c1c28';

const layerIcon = (type: DesignElement['type'], size = 13) => {
  switch (type) {
    case 'text': return <span className="font-bold leading-none" style={{ fontSize: 10, letterSpacing: '-0.02em' }}>Aa</span>;
    case 'rect': return <Square size={size} />;
    case 'circle': return <Circle size={size} />;
    case 'image': return <ImageIcon size={size} />;
    case 'video': return <Video size={size} />;
    case 'isiScroll': return <ScrollText size={size} />;
    case 'piStrip': return <PanelTop size={size} />;
    case 'shape': return <Shapes size={size} />;
    case 'html': return <Code2 size={size} />;
  }
};

const elementLabel = (el: DesignElement) =>
  el.name || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} ${el.id.slice(-4)}`;

/** Hex colour + alpha byte (e.g. '#8b7cf6', 0.2 → '#8b7cf633'). */
const alpha = (hex: string, a: number) =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

export const Timeline: React.FC = () => {
  const {
    elements,
    selectedId,
    selectedKeyframe,
    autoKeyframe,
    toggleAutoKeyframe,
    recordCanvasKeyframe,
    playheadTime,
    isPlaying,
    totalDuration,
    loop,
    setPlayheadTime,
    setIsPlaying,
    setTotalDuration,
    setLoop,
    selectElement,
    selectKeyframe,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    toggleVisibility,
    toggleLock,
    removeElement,
    updateElement,
    moveElement,
    previewPaused,
  } = useDesignStore();

  const [pps, setPps] = useState(DEFAULT_PPS);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<{ active: boolean }>({ active: false });
  const dragKfRef = useRef<{ elementId: string; keyframeId: string; offset: number } | null>(null);
  const dragSegmentRef = useRef<{
    elementId: string;
    segmentId: string;
    type: 'move' | 'resize-end';
    startX: number;
    /** Value of the field the drag rewrites (delay / start), at drag start. */
    initialValue: number;
    initialDuration: number;
  } | null>(null);
  const endMarkerRef = useRef<{ pointerId: number } | null>(null);

  const rowDragRef = useRef<{
    id: string;
    fromIndex: number;
    pointerId: number;
    startY: number;
    side: 'left' | 'right';
    thresholdPassed: boolean;
    captured: boolean;
    overIndex: number;
  } | null>(null);
  const [rowDragOver, setRowDragOver] = useState<{ id: string; fromIndex: number; overIndex: number; dy: number } | null>(null);
  const leftRowsRef = useRef<HTMLDivElement>(null);
  const rightRowsRef = useRef<HTMLDivElement>(null);

  const lastTimeRef = useRef<number>(0);
  const needleRef = useRef<HTMLDivElement>(null);
  const rulerNeedleRef = useRef<HTMLDivElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const playheadRef = useRef(playheadTime);
  const scrubRafRef = useRef<number>(0);

  // During playback / scrubbing the needle + timecode are moved through the DOM
  // (updateNeedleDOM) and the canvases are seeked directly (seekAllMasters):
  // the store is NOT written per frame, because every whole-store subscriber
  // (layout, every artboard canvas, panels) re-rendered on each write and those
  // render spikes made playback and scrubbing stutter. React only renders the
  // settled time.
  const displayTime = playheadTime;

  // Responsive: shorter panel on short screens, narrower layer column and
  // icon-only header buttons on small widths, and a collapse toggle so the
  // canvas can take the full height.
  const isMd = useMediaQuery(BREAKPOINTS.md);
  const isLgW = useMediaQuery(BREAKPOINTS.lg);
  const isShort = useMediaQuery('(max-height: 760px)');
  const [collapsed, setCollapsed] = useState(false);
  const panelHeight = collapsed ? 38 : isShort ? 210 : 280;
  const layerColW = isMd ? 220 : 136;

  const [viewW, setViewW] = useState(0);
  // The ruler runs past the banner end (TheBrief-style) so the end marker can
  // be dragged out to lengthen the banner.
  const rulerEnd = Math.max(totalDuration + 10, Math.ceil(Math.max(0, viewW - 40) / pps));
  const trackWidth = Math.max(viewW, rulerEnd * pps + 40);
  const [trackMinHeight, setTrackMinHeight] = useState(0);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const measure = () => {
      setTrackMinHeight(el.clientHeight);
      setViewW(el.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      playheadRef.current = playheadTime;
    }
  }, [isPlaying, playheadTime]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      if (!previewPaused) {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = now;
        const next = playheadRef.current + dt;

        if (next >= totalDuration) {
          if (loop) {
            playheadRef.current = 0;
            updateNeedleDOM(0);
            seekAllMasters(0);
          } else {
            playheadRef.current = totalDuration;
            updateNeedleDOM(totalDuration);
            seekAllMasters(totalDuration);
            // setIsPlaying(false) adopts the live playhead (= totalDuration).
            setIsPlaying(false);
            return;
          }
        } else {
          playheadRef.current = next;
          updateNeedleDOM(next);
          seekAllMasters(next);
        }
      } else {
        lastTimeRef.current = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, totalDuration, loop, setIsPlaying, previewPaused, pps]);

  const timeFromEvent = useCallback(
    (clientX: number, snap = snapToGrid) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const offset = clientX - rect.left;
      let raw = Math.max(0, Math.min(totalDuration, offset / pps));
      if (snap) {
        const step = pps >= 120 ? 0.05 : 0.1;
        raw = Math.round(raw / step) * step;
      }
      return Math.round(raw * 100) / 100;
    },
    [pps, totalDuration, snapToGrid],
  );

  /** Directly update needle + ruler indicator + timecode via DOM (no React re-render). */
  const updateNeedleDOM = (t: number) => {
    const px = `${t * pps}px`;
    if (needleRef.current) needleRef.current.style.transform = `translateX(${px})`;
    if (rulerNeedleRef.current) rulerNeedleRef.current.style.left = px;
    if (timecodeRef.current) timecodeRef.current.textContent = formatTimecode(t);
  };

  const scrubTo = (t: number, syncStore = true) => {
    playheadRef.current = t;
    updateNeedleDOM(t);
    seekAllMasters(t);
    if (syncStore) setPlayheadTime(t);
  };

  const startScrub = (e: React.PointerEvent) => {
    scrubRef.current.active = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsPlaying(false);
    scrubTo(timeFromEvent(e.clientX, false), true);
  };

  const scrubMove = (e: React.PointerEvent) => {
    if (!scrubRef.current.active) return;
    const t = timeFromEvent(e.clientX, false);
    playheadRef.current = t;

    // Cancel any pending RAF from a previous pointer event within the same
    // frame so we coalesce to one seek per animation frame (smooth 60fps).
    if (scrubRafRef.current) cancelAnimationFrame(scrubRafRef.current);

    scrubRafRef.current = requestAnimationFrame(() => {
      scrubRafRef.current = 0;
      const curT = playheadRef.current;
      updateNeedleDOM(curT);
      seekAllMasters(curT);
      // The store is synced once on release (endScrub), not per frame.
    });
  };

  const endScrub = () => {
    if (!scrubRef.current.active) return;
    scrubRef.current.active = false;
    if (scrubRafRef.current) {
      cancelAnimationFrame(scrubRafRef.current);
      scrubRafRef.current = 0;
    }
    // Final sync: ensure canvas and store are at the exact release position
    const finalT = playheadRef.current;
    updateNeedleDOM(finalT);
    seekAllMasters(finalT);
    setPlayheadTime(finalT);
    setIsPlaying(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(!isPlaying);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrubTo(Math.max(0, playheadTime - (e.shiftKey ? 0.5 : 0.1)));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrubTo(Math.min(totalDuration, playheadTime + (e.shiftKey ? 0.5 : 0.1)));
    } else if (e.key === 'Home') {
      e.preventDefault(); scrubTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); scrubTo(totalDuration);
    } else if (selectedKeyframe && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      removeKeyframe(selectedKeyframe.elementId, selectedKeyframe.keyframeId);
    }
  };

  const handleAddKeyframe = (el: DesignElement, offset = 0) => (e: React.MouseEvent) => {
    if (e.detail !== 2) return;
    const time = Math.max(0, timeFromEvent(e.clientX) - offset);
    const base = getElementBaseState(el);
    addKeyframe(el.id, {
      id: `kf-${Date.now()}`,
      time,
      x: base.x, y: base.y,
      opacity: base.opacity,
      rotation: base.rotation,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      blur: base.blur,
      easing: 'power1.inOut',
    });
  };

  const addKeyframeAtPlayhead = () => {
    if (!selectedId) return;
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
    const base = getElementBaseState(el);
    recordCanvasKeyframe(el.id, {
      x: base.x,
      y: base.y,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      rotation: base.rotation,
    });
  };

  const startDragKf = (el: DesignElement, kfId: string, offset = 0) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    selectKeyframe({ elementId: el.id, keyframeId: kfId });
    dragKfRef.current = { elementId: el.id, keyframeId: kfId, offset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragKf = (e: React.PointerEvent) => {
    if (!dragKfRef.current) return;
    setIsPlaying(false);
    const time = Math.max(0, timeFromEvent(e.clientX) - dragKfRef.current.offset);
    updateKeyframe(dragKfRef.current.elementId, dragKfRef.current.keyframeId, { time });
  };

  const endDragKf = () => {
    dragKfRef.current = null;
    setIsPlaying(true);
  };

  const startDragSegment = (
    el: DesignElement,
    segment: ElementAnimationSegment,
    type: 'move' | 'resize-end',
  ) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    selectElement(el.id);
    let initialValue = 0;
    if (segment.id === 'enter' || segment.id === 'main') initialValue = el.enterDelay ?? el.animationDelay ?? 0;
    else if (segment.id === 'exit') initialValue = el.exitDelay || 0;
    else if (segment.id === 'text') initialValue = el.textAnimationDelay || 0;
    else {
      const block = el.animations?.find((b) => b.id === segment.id);
      initialValue = block ? block.start : 0;
    }
    dragSegmentRef.current = {
      elementId: el.id,
      segmentId: segment.id,
      type,
      startX: e.clientX,
      initialValue,
      initialDuration: Math.max(0.1, segment.end - segment.start),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragSegment = (e: React.PointerEvent) => {
    if (!dragSegmentRef.current) return;
    const { elementId, segmentId, type, startX, initialValue, initialDuration } = dragSegmentRef.current;
    // The automatic end-fade ("Disappear") is derived from the banner length,
    // not from a field the drag could rewrite, so it never re-times.
    if (segmentId === 'hide') return;
    const el = elements.find((x) => x.id === elementId);
    if (!el) return;
    const deltaSeconds = (e.clientX - startX) / pps;
    const snap = (v: number) => Math.max(0, Math.round(v * 20) / 20);
    if (type === 'move') {
      // Every field is a delay/offset: apply the drag delta to its value at
      // drag start (the exit's delay is a gap after the entrance, not an
      // absolute time, so writing the absolute start made it jump).
      const next = snap(initialValue + deltaSeconds);
      if (segmentId === 'enter') updateElement(elementId, { enterDelay: next });
      else if (segmentId === 'main') {
        // A distinct main animation chains after the entrance: not movable.
        if (!el.enterAnimation) updateElement(elementId, { enterDelay: next, animationDelay: next });
      } else if (segmentId === 'exit') updateElement(elementId, { exitDelay: next });
      else if (segmentId === 'text') updateElement(elementId, { textAnimationDelay: next });
      else if (el.animations?.some((b) => b.id === segmentId)) {
        updateElement(elementId, {
          animations: el.animations.map((b) => (b.id === segmentId ? { ...b, start: next } : b)),
        });
      }
    } else if (type === 'resize-end') {
      const newDuration = Math.max(0.1, Math.round((initialDuration + deltaSeconds) * 20) / 20);
      updateElement(elementId, { animationDuration: newDuration });
    }
  };

  // Banner end marker on the ruler: drag to change the banner duration.
  const startEndMarker = (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    endMarkerRef.current = { pointerId: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveEndMarker = (e: React.PointerEvent) => {
    if (!endMarkerRef.current) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = Math.round(((e.clientX - rect.left) / pps) * 2) / 2;
    const next = Math.max(0.5, Math.min(60, t));
    if (next !== totalDuration) setTotalDuration(next);
  };
  const endEndMarker = () => { endMarkerRef.current = null; };

  const endDragSegment = () => { dragSegmentRef.current = null; };

  const startRowDrag = (el: DesignElement, fromIndex: number, side: 'left' | 'right') => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault(); e.stopPropagation();
    selectElement(el.id);
    rowDragRef.current = {
      id: el.id, fromIndex, pointerId: e.pointerId, startY: e.clientY,
      side, thresholdPassed: false, captured: false, overIndex: fromIndex,
    };
  };

  const moveRowDrag = (e: React.PointerEvent) => {
    const d = rowDragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (!d.thresholdPassed) {
      if (Math.abs(dy) < 10) return;
      d.thresholdPassed = true;
      if (!d.captured) {
        d.captured = true;
        (e.currentTarget as HTMLElement).setPointerCapture(d.pointerId);
      }
    }
    e.preventDefault();
    const scroller = d.side === 'left' ? leftRowsRef.current : scrollContainerRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (e.clientY < rect.top + 28) scroller.scrollTop -= 12;
      else if (e.clientY > rect.bottom - 28) scroller.scrollTop += 12;
    }
    let yContent: number;
    if (d.side === 'left') {
      const box = leftRowsRef.current;
      if (!box) return;
      yContent = (e.clientY - box.getBoundingClientRect().top) + box.scrollTop;
    } else {
      const box = rightRowsRef.current;
      if (!box) return;
      yContent = e.clientY - box.getBoundingClientRect().top;
    }
    const pointerRow = Math.max(0, Math.min(elements.length - 1, Math.floor(yContent / ROW_H)));
    let overIndex = pointerRow;
    if (pointerRow > d.fromIndex) overIndex = Math.min(elements.length, pointerRow + 1);
    d.overIndex = overIndex;
    setRowDragOver({ id: d.id, fromIndex: d.fromIndex, overIndex, dy });
  };

  const endRowDrag = () => {
    const d = rowDragRef.current;
    if (!d) return;
    rowDragRef.current = null;
    if (d.thresholdPassed && d.overIndex !== d.fromIndex) moveElement(d.id, d.overIndex);
    setRowDragOver(null);
  };

  const handleFitZoom = () => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 40;
    if (containerWidth > 0 && totalDuration > 0) {
      const targetPps = Math.max(MIN_PPS, Math.min(MAX_PPS, Math.floor(containerWidth / totalDuration)));
      setPps(targetPps);
    }
  };

  // Ruler: whole seconds labelled (every 2s when zoomed far out), half-second
  // minor ticks. It runs past the banner end like TheBrief's timeline.
  const ticks = useMemo(() => {
    const list: Array<{ time: number; isMajor: boolean; label?: string }> = [];
    const labelEvery = pps < 40 ? 2 : 1;
    const step = pps >= 60 ? 0.5 : 1;
    for (let t = 0; t <= rulerEnd + 0.001; t += step) {
      const rounded = Math.round(t * 100) / 100;
      const isMajor = rounded % 1 === 0;
      list.push({
        time: rounded,
        isMajor,
        label: isMajor && rounded % labelEvery === 0 ? String(rounded) : undefined,
      });
    }
    return list;
  }, [rulerEnd, pps]);

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const models = useMemo(
    () => new Map(elements.map((el) => [el.id, buildTrackModel(el, totalDuration)])),
    [elements, totalDuration],
  );

  const endX = totalDuration * pps;

  const iconBtn = (active = false): React.CSSProperties => ({
    border: `1px solid ${active ? alpha(ACCENT, 0.45) : '#24243a'}`,
    background: active ? alpha(ACCENT, 0.12) : 'transparent',
    color: active ? ACCENT : '#8a8aa0',
  });

  /** One coloured block (entrance / exit / loop / timed / text) inside a pill. */
  const renderSegment = (el: DesignElement, seg: TrackSegment, color: string) => {
    const left = seg.start * pps;
    const width = Math.max(seg.kind === 'text' ? 6 : 24, (seg.end - seg.start) * pps);
    const common = {
      key: seg.id + seg.kind,
      title: `${seg.label} · ${seg.start.toFixed(2)}s → ${seg.end.toFixed(2)}s\nDrag to re-time · Double-click for Animation Studio`,
      onPointerDown: seg.id === 'hide' ? undefined : startDragSegment(el, seg, 'move'),
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        selectElement(el.id);
        const tab = seg.kind === 'enter' ? 'in' : seg.kind === 'exit' ? 'out' : seg.kind === 'text' ? 'text' : 'loop';
        window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab } }));
      },
    };

    if (seg.kind === 'text') {
      return (
        <div
          {...common}
          className="absolute cursor-grab active:cursor-grabbing"
          style={{ left, width, bottom: 3, height: 4, borderRadius: 2, background: seg.color, zIndex: 6, boxShadow: `0 0 6px ${alpha(seg.color, 0.4)}` }}
        />
      );
    }

    if (seg.kind === 'loop' || seg.kind === 'block') {
      return (
        <div
          {...common}
          className="absolute flex items-center gap-1 px-1.5 cursor-grab active:cursor-grabbing overflow-hidden"
          style={{
            left,
            width,
            top: 4,
            height: PILL_H - 8,
            borderRadius: 4,
            background: `repeating-linear-gradient(135deg, ${alpha(color, 0.55)} 0 5px, ${alpha(color, 0.3)} 5px 10px)`,
            border: `1px solid ${alpha(color, 0.7)}`,
            color: '#fff',
            zIndex: 4,
          }}
        >
          <Repeat size={9} className="shrink-0 pointer-events-none" />
          {width > 60 && <span className="text-[9px] font-semibold truncate pointer-events-none">{seg.label}</span>}
          {seg.kind === 'loop' && width > 34 && (
            <span className="ml-auto text-[9px] font-bold pointer-events-none">{seg.plays ? `×${seg.plays}` : '∞'}</span>
          )}
        </div>
      );
    }

    const isEnter = seg.kind === 'enter';
    return (
      <div
        {...common}
        className="absolute flex items-center gap-1 cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          left,
          width,
          top: 0,
          height: PILL_H,
          borderRadius: 6,
          background: isEnter ? alpha(color, 0.95) : alpha(color, 0.6),
          color: '#fff',
          zIndex: 5,
          padding: isEnter ? '0 6px 0 2px' : '0 6px',
          justifyContent: isEnter ? 'flex-start' : 'flex-end',
        }}
      >
        {isEnter && (
          <span
            className="flex items-center justify-center shrink-0 pointer-events-none"
            style={{ width: 20, height: 18, borderRadius: 4, background: 'rgba(0,0,0,0.22)' }}
          >
            <LogIn size={11} />
          </span>
        )}
        {width > 70 && <span className="text-[9px] font-semibold truncate pointer-events-none">{seg.label}</span>}
        {!isEnter && <LogOut size={11} className="shrink-0 pointer-events-none" />}
        {isEnter && (
          <div
            className="absolute top-0 right-0 h-full cursor-ew-resize hover:bg-white/25"
            style={{ width: 6 }}
            onPointerDown={startDragSegment(el, seg, 'resize-end')}
            title="Drag to change the entrance duration"
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col z-10 select-none outline-none"
      style={{ height: panelHeight, background: PANEL_BG, borderTop: `1px solid ${LINE}`, transition: 'height 0.18s ease-out' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 38, borderBottom: `1px solid ${LINE}` }}
      >
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-semibold rounded px-1 -ml-1 hover:bg-white/5 transition"
            style={{ color: '#d8d8e6' }}
            title={collapsed ? 'Expand timeline' : 'Collapse timeline'}
          >
            <ChevronDown size={13} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }} />
            Timeline
          </button>
          {collapsed && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center justify-center rounded-md"
              style={{ width: 24, height: 22, background: ACCENT, color: '#fff' }}
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
            </button>
          )}

          {/* Banner duration chip */}
          <label
            className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg text-[11px]"
            style={{ background: alpha(ACCENT, 0.12), border: `1px solid ${alpha(ACCENT, 0.35)}`, color: '#f3c2b6' }}
            title="Banner duration (seconds) — or drag the end marker on the ruler"
          >
            <Timer size={12} style={{ color: ACCENT }} />
            <input
              type="number"
              min="0.5" max="60" step="0.5"
              value={totalDuration}
              onChange={(e) => setTotalDuration(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-10 bg-transparent text-[11px] font-semibold font-mono focus:outline-none"
              style={{ color: '#fff' }}
            />
            <span style={{ color: '#a08078' }}>s</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={addKeyframeAtPlayhead}
            disabled={!selectedId}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition disabled:opacity-30"
            style={iconBtn()}
            title="Add keyframe at playhead (double-click a row also adds one)"
          >
            <Plus size={12} />{isLgW && ' Keyframe'}
          </button>
          <button
            onClick={toggleAutoKeyframe}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition"
            style={iconBtn(autoKeyframe)}
            title={autoKeyframe
              ? 'Auto-Keyframe ON: moving or scaling on canvas records keyframes at the playhead'
              : 'Auto-Keyframe OFF: click to record canvas moves as keyframes'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoKeyframe ? 'animate-pulse' : ''}`} style={{ background: autoKeyframe ? ACCENT : '#5a5a6a' }} />
            {isLgW && 'Auto-key'}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'sequence' } }))}
            className="p-1.5 rounded-md transition"
            style={iconBtn()}
            title="Stagger all layers"
          >
            <Sliders size={13} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'in' } }))}
            className="p-1.5 rounded-md transition"
            style={iconBtn()}
            title="Open Animation Studio"
          >
            <Sparkles size={13} />
          </button>
          <div style={{ width: 1, height: 16, background: '#24243a' }} />
          <button onClick={() => setLoop(!loop)} className="p-1.5 rounded-md transition" style={iconBtn(loop)} title="Loop playback">
            <Repeat size={13} />
          </button>
          <button onClick={() => setSnapToGrid(!snapToGrid)} className="p-1.5 rounded-md transition" style={iconBtn(snapToGrid)} title="Snap to 0.1s grid">
            <Magnet size={13} />
          </button>
        </div>
      </div>

      {/* ── Workspace ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0" style={{ display: collapsed ? 'none' : undefined }}>
        {/* Left: transport + layer list */}
        <div className="shrink-0 flex flex-col" style={{ width: layerColW, borderRight: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-1.5 px-2 shrink-0" style={{ height: RULER_H, borderBottom: `1px solid ${LINE}` }}>
            <button
              onClick={() => scrubTo(0)}
              className="p-1 rounded transition hover:bg-white/5"
              style={{ color: '#8a8aa0' }}
              title="Jump to start (Home)"
            >
              <SkipBack size={13} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center justify-center rounded-md transition"
              style={{ width: 24, height: 22, background: ACCENT, color: '#fff', boxShadow: `0 2px 8px ${alpha(ACCENT, 0.35)}` }}
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
            </button>
            <span ref={timecodeRef} className="ml-1 font-mono text-[11px] font-semibold" style={{ color: '#d8d8e6' }}>
              {formatTimecode(displayTime)}
            </span>
            {isMd && <span className="font-mono text-[10px]" style={{ color: '#55556a' }}>/ {formatTimecode(totalDuration)}</span>}
          </div>

          <div
            ref={leftRowsRef}
            className="flex-1 overflow-y-auto relative"
            style={{ overflowX: 'hidden', scrollbarWidth: 'none' }}
            onScroll={(e) => {
              const right = scrollContainerRef.current;
              if (right && right.scrollTop !== e.currentTarget.scrollTop) right.scrollTop = e.currentTarget.scrollTop;
            }}
          >
            {rowDragOver && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{ top: rowDragOver.overIndex * ROW_H, height: 2, background: ACCENT }}
              />
            )}

            {elements.map((el, i) => {
              const isSelected = selectedId === el.id;
              const isDragSource = rowDragOver?.id === el.id;
              const hidden = el.visible === false;
              const color = models.get(el.id)?.color || '#8a94a8';
              return (
                <div
                  key={el.id}
                  onClick={() => selectElement(el.id)}
                  onPointerDown={startRowDrag(el, i, 'left')}
                  onPointerMove={moveRowDrag}
                  onPointerUp={endRowDrag}
                  onPointerCancel={endRowDrag}
                  className={`flex items-center gap-2 pl-3 pr-2 group select-none ${isDragSource ? 'z-30 cursor-grabbing' : 'cursor-pointer'}`}
                  style={{
                    height: ROW_H,
                    background: isSelected ? alpha(color, 0.12) : isDragSource ? '#1a1a26' : undefined,
                    opacity: hidden ? 0.45 : 1,
                    transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined,
                  }}
                >
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 16, color: isSelected ? color : '#8a8aa0' }}>
                    {layerIcon(el.type)}
                  </span>
                  <span className="text-[11.5px] truncate flex-1" style={{ color: isSelected ? '#f0f0f6' : '#b4b4c4' }}>
                    {elementLabel(el)}
                  </span>
                  {el.textAnimation && <Type size={10} className="shrink-0" style={{ color: '#f5b942' }} />}

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                    className={`shrink-0 transition ${hidden ? '' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ color: '#8a8aa0' }}
                    title={hidden ? 'Show layer' : 'Hide layer'}
                  >
                    {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                    className={`shrink-0 transition ${el.locked ? '' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ color: '#8a8aa0' }}
                    title={el.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition hover:!text-[#e4567d]"
                    style={{ color: '#6a6a80' }}
                    title="Delete layer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}

            {elements.length === 0 && (
              <div className="p-6 text-[11px] text-center" style={{ color: '#55556a' }}>
                Add elements to start animating
              </div>
            )}
          </div>
        </div>

        {/* Right: ruler + tracks */}
        <div className="flex-1 relative min-w-0">
          <div
            className="absolute inset-0 overflow-auto"
            ref={scrollContainerRef}
            style={{ background: TRACK_BG }}
            onScroll={(e) => {
              // Keep the layer list aligned with the tracks.
              const left = leftRowsRef.current;
              if (left && left.scrollTop !== e.currentTarget.scrollTop) left.scrollTop = e.currentTarget.scrollTop;
            }}
          >
            <div
              ref={trackRef}
              style={{ width: trackWidth, position: 'relative', minHeight: trackMinHeight || undefined }}
              className="min-h-full"
              onPointerMove={(e) => { moveDragSegment(e); moveEndMarker(e); }}
              onPointerUp={() => { endDragSegment(); endEndMarker(); }}
              onPointerCancel={() => { endDragSegment(); endEndMarker(); }}
            >
              {/* ── Ruler ── */}
              <div
                className="sticky top-0 z-30 cursor-pointer touch-none"
                style={{ height: RULER_H, background: PANEL_BG, borderBottom: `1px solid ${LINE}` }}
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              >
                {ticks.map((t, idx) => (
                  <div
                    key={idx}
                    className="absolute bottom-0 pointer-events-none"
                    style={{
                      left: t.time * pps,
                      height: t.isMajor ? 8 : 4,
                      borderLeft: `1px solid ${t.time > totalDuration ? '#2a2a36' : t.isMajor ? '#4a4a5e' : '#30303e'}`,
                    }}
                  >
                    {t.label && (
                      <span
                        className="absolute font-mono select-none"
                        style={{
                          bottom: 9,
                          left: 0,
                          transform: 'translateX(-50%)',
                          fontSize: 10,
                          color: t.time > totalDuration ? '#3c3c4c' : '#8a8aa0',
                        }}
                      >
                        {t.label}
                      </span>
                    )}
                  </div>
                ))}

                {/* Past the banner end: greyed */}
                <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: endX, right: 0, background: 'rgba(0,0,0,0.25)' }} />

                {/* Draggable banner end marker */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-10"
                  style={{ left: endX - 5, width: 10 }}
                  onPointerDown={startEndMarker}
                  title={`Banner end · ${totalDuration}s — drag to change the duration`}
                >
                  <div className="absolute" style={{ left: 4, top: 4, bottom: 0, width: 2, borderRadius: 1, background: '#d8d8e6' }} />
                </div>
              </div>

              {/* ── Rows ── */}
              <div ref={rightRowsRef} className="relative" style={{ height: elements.length * ROW_H }}>
                {rowDragOver && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-10"
                    style={{ top: rowDragOver.overIndex * ROW_H, height: 2, background: ACCENT }}
                  />
                )}

                {elements.map((el, i) => {
                  const m = models.get(el.id)!;
                  const isSelected = selectedId === el.id;
                  const isDragSource = rowDragOver?.id === el.id;
                  const manualKfs = el.anim?.keyframes || [];
                  const lifeLeft = m.lifeStart * pps;
                  const lifeWidth = Math.max(8, (m.lifeEnd - m.lifeStart) * pps);

                  return (
                    <div
                      key={el.id}
                      className={`absolute left-0 right-0 select-none ${isDragSource ? 'z-30 cursor-grabbing' : ''}`}
                      style={{
                        top: i * ROW_H,
                        height: ROW_H,
                        background: isSelected ? alpha(m.color, 0.06) : undefined,
                        transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined,
                        opacity: el.visible === false ? 0.45 : 1,
                      }}
                      onClick={() => selectElement(el.id)}
                      onDoubleClick={handleAddKeyframe(el, m.keyframeOffset)}
                      onPointerDown={startRowDrag(el, i, 'right')}
                      onPointerMove={moveRowDrag}
                      onPointerUp={endRowDrag}
                      onPointerCancel={endRowDrag}
                    >
                      {/* Lifetime pill + its blocks */}
                      <div
                        className="absolute"
                        style={{ top: (ROW_H - PILL_H) / 2, left: 0, right: 0, height: PILL_H }}
                      >
                        <div
                          className={`absolute ${m.enter ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          style={{
                            left: lifeLeft,
                            width: lifeWidth,
                            height: PILL_H,
                            borderRadius: 6,
                            background: alpha(m.color, isSelected ? 0.3 : 0.2),
                            boxShadow: isSelected ? `inset 0 0 0 1.5px ${alpha(m.color, 0.9)}` : `inset 0 0 0 1px ${alpha(m.color, 0.25)}`,
                          }}
                          title={m.enter ? 'Drag to move this layer in time' : undefined}
                          onPointerDown={m.enter ? startDragSegment(el, m.enter, 'move') : undefined}
                        />

                        {m.middles.map((seg) => renderSegment(el, seg, m.color))}
                        {m.enter && renderSegment(el, m.enter, m.color)}
                        {m.exit && renderSegment(el, m.exit, m.color)}
                        {m.text && renderSegment(el, m.text, m.color)}

                        {/* Manual keyframes */}
                        {manualKfs.map((kf) => {
                          const isKfSelected = selectedKeyframe?.elementId === el.id && selectedKeyframe.keyframeId === kf.id;
                          const t = kf.time + m.keyframeOffset;
                          return (
                            <div
                              key={kf.id}
                              className="absolute cursor-grab active:cursor-grabbing"
                              style={{
                                top: '50%',
                                left: t * pps,
                                width: isKfSelected ? 11 : 9,
                                height: isKfSelected ? 11 : 9,
                                transform: 'translate(-50%, -50%) rotate(45deg)',
                                borderRadius: 2,
                                background: isKfSelected ? '#fff' : m.color,
                                border: `1.5px solid ${isKfSelected ? m.color : '#fff'}`,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                                zIndex: isKfSelected ? 12 : 10,
                              }}
                              title={`Keyframe · ${t.toFixed(2)}s (drag to move, Delete to remove)`}
                              onPointerDown={startDragKf(el, kf.id, m.keyframeOffset)}
                              onPointerMove={moveDragKf}
                              onPointerUp={endDragKf}
                              onPointerCancel={endDragKf}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectElement(el.id);
                                selectKeyframe({ elementId: el.id, keyframeId: kf.id });
                                setPlayheadTime(t);
                                seekAllMasters(t);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Past the banner end: greyed over the rows */}
              <div
                className="absolute bottom-0 pointer-events-none z-20"
                style={{ top: RULER_H, left: endX, right: 0, background: 'rgba(0,0,0,0.28)', borderLeft: '1px solid #3a3a4a' }}
              />

              {/* ── Playhead ── */}
              <div
                ref={needleRef}
                className="absolute top-0 bottom-0 pointer-events-none z-40 will-change-transform"
                style={{ width: 1, background: '#f0f0f6', transform: `translateX(${displayTime * pps}px)` }}
              >
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize touch-none pointer-events-auto"
                  style={{ left: -3, width: 7 }}
                  onPointerDown={startScrub}
                  onPointerMove={scrubMove}
                  onPointerUp={endScrub}
                  onPointerCancel={endScrub}
                />
                <div
                  className="absolute cursor-ew-resize pointer-events-auto"
                  style={{
                    top: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 11,
                    height: 14,
                    background: '#f0f0f6',
                    clipPath: 'polygon(0 0, 100% 0, 100% 65%, 50% 100%, 0 65%)',
                    borderRadius: 2,
                  }}
                  onPointerDown={startScrub}
                  onPointerMove={scrubMove}
                  onPointerUp={endScrub}
                  onPointerCancel={endScrub}
                />
              </div>
              <div ref={rulerNeedleRef} className="hidden" />

              {/* Scrub zone below the rows */}
              <div
                className="absolute left-0 right-0 bottom-0 cursor-pointer touch-none"
                style={{ top: RULER_H + elements.length * ROW_H, zIndex: 5 }}
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              />
            </div>
          </div>

          {/* Zoom — floating bottom-right like TheBrief */}
          <div
            className="absolute bottom-3 right-4 z-50 flex items-center gap-1 px-1.5 py-1 rounded-lg"
            style={{ background: '#16161f', border: '1px solid #26263a', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}
          >
            <button
              onClick={() => setPps((p) => Math.max(MIN_PPS, p - 20))}
              disabled={pps <= MIN_PPS}
              className="p-1 rounded transition disabled:opacity-30 hover:bg-white/5"
              style={{ color: '#a0a0b4' }}
              title="Zoom out"
            >
              <Minus size={12} />
            </button>
            <span className="text-[11px] font-mono w-10 text-center" style={{ color: '#d8d8e6' }}>
              {Math.round((pps / DEFAULT_PPS) * 100)}%
            </span>
            <button
              onClick={() => setPps((p) => Math.min(MAX_PPS, p + 20))}
              disabled={pps >= MAX_PPS}
              className="p-1 rounded transition disabled:opacity-30 hover:bg-white/5"
              style={{ color: '#a0a0b4' }}
              title="Zoom in"
            >
              <Plus size={12} />
            </button>
            <button onClick={handleFitZoom} className="p-1 rounded transition hover:bg-white/5" style={{ color: '#a0a0b4' }} title="Fit banner to view">
              <Maximize2 size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
