import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import {
  Play, Pause, Eye, EyeOff, Lock, Unlock, Type, Square, Circle,
  Image as ImageIcon, ScrollText, Shapes, Code2, Repeat, Trash2,
  ZoomIn, ZoomOut, Sparkles, Plus, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Magnet, Maximize2, Zap, FastForward,
  RotateCcw, Sliders, GripVertical,
} from 'lucide-react';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import { seekAllMasters } from '../Canvas/AnimationHelpers';
import {
  getElementKeyframes,
  getElementBaseState,
  getElementAnimationSegments,
  type ElementAnimationSegment,
} from '../../utils/keyframes';

const ROW_H = 38;
/** Height of the ruler strip (Tailwind `h-7`) that sits above the element rows. */
const RULER_H = 28;
const DEFAULT_PPS = 100;
const MIN_PPS = 30;
const MAX_PPS = 240;

const typeIcon = (type: DesignElement['type'], size = 14) => {
  switch (type) {
    case 'text': return <Type size={size} />;
    case 'rect': return <Square size={size} />;
    case 'circle': return <Circle size={size} />;
    case 'image': return <ImageIcon size={size} />;
    case 'isiScroll': return <ScrollText size={size} />;
    case 'shape': return <Shapes size={size} />;
    case 'html': return <Code2 size={size} />;
  }
};

const elementLabel = (el: DesignElement) =>
  el.name || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} ${el.id.slice(-4)}`;

export const Timeline: React.FC = () => {
  const {
    elements,
    selectedId,
    selectedKeyframe,
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
  const dragKfRef = useRef<{ elementId: string; keyframeId: string } | null>(null);
  const dragSegmentRef = useRef<{
    elementId: string;
    segmentId: string;
    type: 'move' | 'resize-end';
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  // Drag-to-reorder element rows (vertical z-order).
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
  /** Rendered while a row drag is in progress (drives the drop line + lifted row). */
  const [rowDragOver, setRowDragOver] = useState<{ id: string; fromIndex: number; overIndex: number; dy: number } | null>(null);
  const leftRowsRef = useRef<HTMLDivElement>(null);
  const rightRowsRef = useRef<HTMLDivElement>(null);

  const lastTimeRef = useRef<number>(0);

  // Local playhead used to render the needle + timecode smoothly at 60fps while
  // the global store is only synced ~30x/sec (so panels don't re-render per frame).
  const [uiTime, setUiTime] = useState(playheadTime);
  // Ref to the playhead needle DOM element for direct manipulation (avoids
  // re-rendering the whole timeline on every animation frame).
  const needleRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(playheadTime);
  const lastStoreSyncRef = useRef(0);

  const trackWidth = Math.max(800, totalDuration * pps + 120);

  // The tracks rail must always be at least as tall as the visible workspace so
  // the red playhead line runs the FULL height of the timeline (instead of
  // stopping right under the last element row). `min-h-full` alone relies on the
  // scroll container having a resolvable definite height, so we also measure the
  // workspace explicitly and feed it back as an inline min-height.
  const [trackMinHeight, setTrackMinHeight] = useState(0);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const measure = () => setTrackMinHeight(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // When not playing, keep the local playhead in sync with the store (scrub,
  // undo, keyboard stepping, loading templates, etc.).
  useEffect(() => {
    if (!isPlaying) {
      setUiTime(playheadTime);
      playheadRef.current = playheadTime;
    }
  }, [isPlaying, playheadTime]);

  // Playback loop — advances every frame, drives every board's canvas at 60fps
  // via gsap seeks, renders the needle from local state, and throttles writes to
  // the global store so the whole app doesn't re-render on every animation frame.
  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    lastTimeRef.current = performance.now();
    lastStoreSyncRef.current = performance.now();

    const tick = (now: number) => {
      if (!previewPaused) {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = now;
        const next = playheadRef.current + dt;

        if (next >= totalDuration) {
          if (loop) {
            playheadRef.current = 0;
            if (needleRef.current) {
              needleRef.current.style.transform = `translateX(0px)`;
            }
            setUiTime(0);
            setPlayheadTime(0);
            seekAllMasters(0);
          } else {
            playheadRef.current = totalDuration;
            if (needleRef.current) {
              needleRef.current.style.transform = `translateX(${totalDuration * pps}px)`;
            }
            setUiTime(totalDuration);
            setPlayheadTime(totalDuration);
            seekAllMasters(totalDuration);
            setIsPlaying(false);
            return; // effect cleanup on isPlaying change cancels the loop
          }
        } else {
          playheadRef.current = next;
          setUiTime(next);
          // Update needle position directly via DOM (no re-render needed)
          if (needleRef.current) {
            needleRef.current.style.transform = `translateX(${next * pps}px)`;
          }
          seekAllMasters(next);
          // Throttle the global sync so panels re-render at most ~30x/sec.
          if (now - lastStoreSyncRef.current >= 33) {
            lastStoreSyncRef.current = now;
            setPlayheadTime(next);
          }
        }
      } else {
        lastTimeRef.current = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // playheadTime intentionally not a dependency — we track it in a ref.
    // `pps` IS a dependency: the needle is positioned in pixels via DOM, so a
    // zoom change mid-playback must refresh the closure (the RAF loop simply
    // restarts; playheadRef preserves the position).
  }, [isPlaying, totalDuration, loop, setPlayheadTime, setIsPlaying, previewPaused, pps]);

  // Convert clientX to timeline seconds with optional grid snapping
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

  // Scrubbing
  const scrubTo = (t: number) => {
    setPlayheadTime(t);
    playheadRef.current = t;
    setUiTime(t);
    // Update needle position directly during scrubbing
    if (needleRef.current) {
      needleRef.current.style.transform = `translateX(${t * pps}px)`;
    }
  };

  const startScrub = (e: React.PointerEvent) => {
    scrubRef.current.active = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrubTo(timeFromEvent(e.clientX, false));
  };

  const scrubMove = (e: React.PointerEvent) => {
    if (!scrubRef.current.active) return;
    scrubTo(timeFromEvent(e.clientX, false));
  };

  const endScrub = () => {
    scrubRef.current.active = false;
  };

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(!isPlaying);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.shiftKey ? 0.5 : 0.1;
      scrubTo(Math.max(0, playheadTime - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.shiftKey ? 0.5 : 0.1;
      scrubTo(Math.min(totalDuration, playheadTime + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrubTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrubTo(totalDuration);
    } else if (selectedKeyframe && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      removeKeyframe(selectedKeyframe.elementId, selectedKeyframe.keyframeId);
    }
  };

  // Add Keyframe at clicked spot
  const handleAddKeyframe = (el: DesignElement) => (e: React.MouseEvent) => {
    if (e.detail !== 2) return;
    const time = timeFromEvent(e.clientX);
    const base = getElementBaseState(el);
    addKeyframe(el.id, {
      id: `kf-${Date.now()}`,
      time,
      x: base.x,
      y: base.y,
      opacity: base.opacity,
      rotation: base.rotation,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      blur: base.blur,
      easing: 'power1.inOut',
    });
  };

  // Add Keyframe at current playhead position for selected element
  const addKeyframeAtPlayhead = () => {
    if (!selectedId) return;
    const el = elements.find((x) => x.id === selectedId);
    if (!el) return;
    const base = getElementBaseState(el);
    addKeyframe(el.id, {
      id: `kf-${Date.now()}`,
      time: Math.round(playheadTime * 100) / 100,
      x: base.x,
      y: base.y,
      opacity: base.opacity,
      rotation: base.rotation,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      blur: base.blur,
      easing: 'power1.inOut',
    });
  };

  // Dragging keyframes
  const startDragKf = (el: DesignElement, kfId: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectKeyframe({ elementId: el.id, keyframeId: kfId });
    dragKfRef.current = { elementId: el.id, keyframeId: kfId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragKf = (e: React.PointerEvent) => {
    if (!dragKfRef.current) return;
    const time = timeFromEvent(e.clientX);
    updateKeyframe(dragKfRef.current.elementId, dragKfRef.current.keyframeId, { time });
  };

  const endDragKf = () => {
    dragKfRef.current = null;
  };

  // Dragging / Resizing Segment Bars
  const startDragSegment = (
    el: DesignElement,
    segment: ElementAnimationSegment,
    type: 'move' | 'resize-end',
  ) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectElement(el.id);
    dragSegmentRef.current = {
      elementId: el.id,
      segmentId: segment.id,
      type,
      startX: e.clientX,
      initialStart: segment.start,
      initialDuration: Math.max(0.1, segment.end - segment.start),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragSegment = (e: React.PointerEvent) => {
    if (!dragSegmentRef.current) return;
    const { elementId, segmentId, type, startX, initialStart, initialDuration } = dragSegmentRef.current;
    const deltaSeconds = (e.clientX - startX) / pps;

    if (type === 'move') {
      const newStart = Math.max(0, Math.round((initialStart + deltaSeconds) * 20) / 20);
      if (segmentId === 'enter') {
        updateElement(elementId, { enterDelay: newStart });
      } else if (segmentId === 'exit') {
        updateElement(elementId, { exitDelay: newStart });
      } else {
        updateElement(elementId, { animationDelay: newStart });
      }
    } else if (type === 'resize-end') {
      const newDuration = Math.max(0.1, Math.round((initialDuration + deltaSeconds) * 20) / 20);
      updateElement(elementId, { animationDuration: newDuration });
    }
  };

  const endDragSegment = () => {
    dragSegmentRef.current = null;
  };

  // --- Drag rows to rearrange z-order (bottom row = bottom of the stack) ---
  const startRowDrag = (el: DesignElement, fromIndex: number, side: 'left' | 'right') => (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(el.id);
    rowDragRef.current = {
      id: el.id,
      fromIndex,
      pointerId: e.pointerId,
      startY: e.clientY,
      side,
      thresholdPassed: false,
      captured: false,
      overIndex: fromIndex,
    };
  };

  const moveRowDrag = (e: React.PointerEvent) => {
    const d = rowDragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;

    // Small dead-zone so plain clicks still select the row / hit row buttons.
    if (!d.thresholdPassed) {
      if (Math.abs(dy) < 10) return;
      d.thresholdPassed = true;
      // Capture only once the drag is real so child buttons keep their clicks.
      if (!d.captured) {
        d.captured = true;
        (e.currentTarget as HTMLElement).setPointerCapture(d.pointerId);
      }
    }
    e.preventDefault();

    // Auto-scroll the list when hovering near its top / bottom edge.
    const scroller = d.side === 'left' ? leftRowsRef.current : scrollContainerRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (e.clientY < rect.top + 28) scroller.scrollTop -= 12;
      else if (e.clientY > rect.bottom - 28) scroller.scrollTop += 12;
    }

    // Map the pointer Y to a row index (scroll-aware per side).
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

    // Final-position semantics: dragging up inserts at the hovered row's slot,
    // dragging down inserts one below it (so the row follows the cursor).
    let overIndex = pointerRow;
    if (pointerRow > d.fromIndex) overIndex = Math.min(elements.length, pointerRow + 1);

    d.overIndex = overIndex;
    setRowDragOver({ id: d.id, fromIndex: d.fromIndex, overIndex, dy });
  };

  const endRowDrag = () => {
    const d = rowDragRef.current;
    if (!d) return;
    rowDragRef.current = null;
    if (d.thresholdPassed && d.overIndex !== d.fromIndex) {
      moveElement(d.id, d.overIndex);
    }
    setRowDragOver(null);
  };

  // Fit to screen zoom calculation
  const handleFitZoom = () => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 40;
    if (containerWidth > 0 && totalDuration > 0) {
      const targetPps = Math.max(MIN_PPS, Math.min(MAX_PPS, Math.floor(containerWidth / totalDuration)));
      setPps(targetPps);
    }
  };

  // Generate ruler tick marks
  const ticks = useMemo(() => {
    const list: Array<{ time: number; isMajor: boolean; label?: string }> = [];
    const step = pps >= 140 ? 0.2 : pps >= 70 ? 0.5 : 1;
    for (let t = 0; t <= totalDuration + 0.001; t += step) {
      const rounded = Math.round(t * 100) / 100;
      const isMajor = rounded % 1 === 0;
      list.push({
        time: rounded,
        isMajor,
        label: isMajor ? `${rounded}s` : pps >= 140 ? `${rounded.toFixed(1)}s` : undefined,
      });
    }
    return list;
  }, [totalDuration, pps]);

  // Format digital readout time
  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="h-80 bg-[#121218] border-t border-[#232330] flex flex-col z-10 select-none text-gray-200 outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 1. Header Toolbar Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#232330] bg-[#171722]">
        {/* Left: Playback & Step Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scrubTo(0)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Jump to Start (Home)"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={() => scrubTo(Math.max(0, playheadTime - 0.1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Step Back 0.1s (←)"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20'
                : 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => scrubTo(Math.min(totalDuration, playheadTime + 0.1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Step Forward 0.1s (→)"
          >
            <ChevronRight size={15} />
          </button>

          <button
            onClick={() => scrubTo(totalDuration)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Jump to End (End)"
          >
            <SkipForward size={14} />
          </button>

          {/* Timecode Readout */}
          <div className="ml-2 flex items-center gap-1.5 font-mono text-xs bg-[#101015] border border-[#262635] px-2.5 py-1 rounded-lg">
            <span className="text-red-400 font-bold">{formatTimecode(uiTime)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Center: Sequencer Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'sequence' } }))}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#20202c] hover:bg-[#2a2a3a] text-gray-200 border border-[#2e2e40] rounded-lg text-xs font-semibold transition"
            title="Sequence & Stagger All Layers"
          >
            <Sliders size={13} className="text-emerald-400" />
            <span>Stagger All</span>
          </button>

          <button
            onClick={addKeyframeAtPlayhead}
            disabled={!selectedId}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#20202c] hover:bg-[#2a2a3a] text-gray-300 border border-[#2e2e40] rounded-lg text-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
            title="Add Keyframe at Playhead"
          >
            <Plus size={13} />
            <span>Keyframe</span>
          </button>
        </div>

        {/* Right: Duration, Loop, Snap, Zoom */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Duration:</span>
            <input
              type="number"
              min="0.5"
              max="60"
              step="0.5"
              value={totalDuration}
              onChange={(e) => setTotalDuration(parseFloat(e.target.value) || 1)}
              className="w-14 border border-[#2a2a38] rounded-lg px-2 py-0.5 text-xs focus:border-red-500 focus:outline-none bg-[#121217] text-gray-100 font-mono text-center"
            />
            <span>s</span>
          </label>

          <button
            onClick={() => setLoop(!loop)}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-medium ${
              loop
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'text-gray-400 border-[#262635] hover:text-white bg-[#121217]'
            }`}
            title="Loop Playback"
          >
            <Repeat size={13} />
          </button>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded-lg border transition ${
              snapToGrid
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'text-gray-400 border-[#262635] hover:text-white bg-[#121217]'
            }`}
            title="Snap to 0.1s Grid"
          >
            <Magnet size={13} />
          </button>

          <div className="h-4 w-px bg-[#262635]" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#121217] border border-[#262635] rounded-lg px-2 py-1">
            <button
              onClick={() => setPps((p) => Math.max(MIN_PPS, p - 20))}
              disabled={pps <= MIN_PPS}
              className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>

            <span className="text-[10px] font-mono text-gray-400 w-9 text-center">
              {Math.round((pps / DEFAULT_PPS) * 100)}%
            </span>

            <button
              onClick={() => setPps((p) => Math.min(MAX_PPS, p + 20))}
              disabled={pps >= MAX_PPS}
              className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 transition"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>

            <button
              onClick={handleFitZoom}
              className="p-1 rounded text-gray-400 hover:text-red-400 transition ml-0.5"
              title="Fit to Timeline Window"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Timeline Workspace (Layers on Left, Tracks on Right) */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Layers Sidebar */}
        <div className="w-64 border-r border-[#232330] flex flex-col bg-[#14141c] shrink-0">
          <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-[#232330] bg-[#111116] flex items-center justify-between">
            <span>Layers ({elements.length})</span>
            <span className="text-gray-500">Actions</span>
          </div>

          <div ref={leftRowsRef} className="flex-1 overflow-y-auto relative">
            {/* Drop indicator line while reordering rows */}
            {rowDragOver && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-amber-400 pointer-events-none z-10"
                style={{ top: rowDragOver.overIndex * ROW_H }}
              />
            )}

            {elements.map((el, i) => {
              const isSelected = selectedId === el.id;
              const hasEnter = el.enterAnimation || el.animation;
              const isDragSource = rowDragOver?.id === el.id;
              return (
                <div
                  key={el.id}
                  onClick={() => selectElement(el.id)}
                  onPointerDown={startRowDrag(el, i, 'left')}
                  onPointerMove={moveRowDrag}
                  onPointerUp={endRowDrag}
                  onPointerCancel={endRowDrag}
                  className={`flex items-center gap-2 px-3 border-b border-[#1b1b26] group transition select-none ${
                    isSelected
                      ? 'bg-red-500/15 border-l-2 border-l-red-500'
                      : 'hover:bg-[#1c1c28] border-l-2 border-l-transparent'
                  } ${el.visible === false ? 'opacity-40' : ''} ${
                    isDragSource
                      ? 'z-30 shadow-lg shadow-amber-500/15 cursor-grabbing transition-none'
                      : 'cursor-grab'
                  }`}
                  style={{ height: ROW_H, transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined }}
                  title="Drag to reorder · lower in list = in front on canvas"
                >
                  {/* Always-visible drag/reorder handle */}
                  <span className="text-gray-500 group-hover:text-white shrink-0 select-none" title="Drag to reorder">
                    <GripVertical size={12} />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVisibility(el.id);
                    }}
                    className="text-gray-500 hover:text-white transition"
                    title="Toggle visibility"
                  >
                    {el.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLock(el.id);
                    }}
                    className={`${el.locked ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'} transition`}
                    title="Toggle lock"
                  >
                    {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>

                  <span className="text-gray-400 group-hover:text-red-400 transition">
                    {typeIcon(el.type)}
                  </span>

                  <span className="text-xs text-gray-200 font-medium truncate flex-1">
                    {elementLabel(el)}
                  </span>

                  {/* Quick Animation Studio Trigger Badge */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(el.id);
                      window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'in' } }));
                    }}
                    className={`p-1 rounded-md text-[10px] transition flex items-center gap-1 ${
                      hasEnter
                        ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                        : 'text-gray-500 hover:text-gray-200 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Edit Animation in Studio"
                  >
                    <Sparkles size={11} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeElement(el.id);
                    }}
                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    title="Delete layer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            {elements.length === 0 && (
              <div className="p-6 text-xs text-gray-500 text-center">
                Add text, images, or shapes to begin animating.
              </div>
            )}
          </div>
        </div>

        {/* Right: Tracks & Playhead Workspace */}
        <div className="flex-1 overflow-auto relative bg-[#0f0f15]" ref={scrollContainerRef}>
          <div
            ref={trackRef}
            style={{ width: trackWidth, position: 'relative', minHeight: trackMinHeight || undefined }}
            className="min-h-full"
            onPointerDown={moveDragSegment}
            onPointerMove={moveDragSegment}
            onPointerUp={endDragSegment}
          >
            {/* 2A. Timeline Ruler */}
            <div
              className="border-b border-[#232330] bg-[#15151e] relative cursor-grab active:cursor-grabbing touch-none"
              style={{ height: RULER_H }}
              onPointerDown={startScrub}
              onPointerMove={scrubMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            >
              {ticks.map((t, idx) => (
                <div
                  key={idx}
                  className={`absolute top-0 h-full border-l ${
                    t.isMajor ? 'border-[#333346]' : 'border-[#20202e]'
                  }`}
                  style={{ left: t.time * pps }}
                >
                  {t.label && (
                    <span className="absolute top-1 left-1.5 text-[9px] text-gray-400 font-mono font-medium select-none">
                      {t.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 2B. Element Rows with Visual Animation Segments & Keyframes */}
            <div ref={rightRowsRef} className="relative will-change-transform" style={{ height: elements.length * ROW_H }}>
              {/* Drop indicator line while reordering rows */}
              {rowDragOver && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-amber-400 pointer-events-none z-10"
                  style={{ top: rowDragOver.overIndex * ROW_H }}
                />
              )}

              {elements.map((el, i) => {
                const kfs = getElementKeyframes(el, totalDuration);
                const segments = getElementAnimationSegments(el);
                const isSelected = selectedId === el.id;
                const isDragSource = rowDragOver?.id === el.id;

                return (
                  <div
                    key={el.id}
                    className={`absolute left-0 right-0 border-b border-[#181822] relative transition-colors select-none ${
                      isSelected ? 'bg-red-500/10' : 'hover:bg-white/[0.02]'
                    } ${
                      isDragSource
                        ? 'z-30 shadow-lg shadow-amber-500/15 cursor-grabbing transition-none'
                        : 'cursor-grab'
                    }`}
                    style={{
                      top: i * ROW_H,
                      height: ROW_H,
                      transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined,
                    }}
                    onClick={() => selectElement(el.id)}
                    onDoubleClick={handleAddKeyframe(el)}
                    onPointerDown={startRowDrag(el, i, 'right')}
                    onPointerMove={moveRowDrag}
                    onPointerUp={endRowDrag}
                    onPointerCancel={endRowDrag}
                  >
                    {/* Drag / reorder handle (always visible so users know rows can be rearranged) */}
                    <div
                      className="absolute top-0 bottom-0 left-0 w-4 flex items-center justify-center text-gray-600 opacity-70 group-hover:opacity-100 cursor-grab select-none"
                      title="Drag to reorder row"
                    >
                      <GripVertical size={12} />
                    </div>

                    {/* Grid vertical guidelines */}
                    {ticks.filter((t) => t.isMajor).map((t, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 border-l border-[#1c1c28] pointer-events-none"
                        style={{ left: t.time * pps }}
                      />
                    ))}

                    {/* Rich Interactive Animation Segment Bars (Pills) */}
                    {segments
                      .filter((seg) => seg.end > seg.start)
                      .map((seg) => {
                        const segLeft = seg.start * pps;
                        const segWidth = Math.max(12, (seg.end - seg.start) * pps);
                        const isEntrance = seg.id === 'enter';
                        const isLoop = seg.id !== 'enter' && seg.id !== 'exit';
                        const isExit = seg.id === 'exit';

                        return (
                          <div
                            key={seg.id}
                            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-lg px-2 flex items-center justify-between text-[11px] font-semibold text-white shadow-md cursor-grab active:cursor-grabbing group/seg transition-all ${
                              isEntrance
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-400/40 shadow-amber-500/20'
                                : isExit
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 border border-red-500/40 shadow-red-500/20'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-500/40 shadow-purple-500/20'
                            }`}
                            style={{
                              left: segLeft,
                              width: segWidth,
                            }}
                            title={`${seg.label} (${seg.start.toFixed(2)}s – ${seg.end.toFixed(
                              2,
                            )}s)\nDrag to re-time · Double click to open Studio`}
                            onPointerDown={startDragSegment(el, seg, 'move')}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              selectElement(el.id);
                              const tab = isEntrance ? 'in' : isExit ? 'out' : 'loop';
                              window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab } }));
                            }}
                          >
                            <div className="flex items-center gap-1 truncate pointer-events-none">
                              {isEntrance && <Zap size={11} className="shrink-0" />}
                              {isLoop && <RotateCcw size={11} className="shrink-0" />}
                              {isExit && <FastForward size={11} className="shrink-0" />}
                              <span className="truncate text-[10px]">
                                {segWidth > 55 ? seg.label : ''}
                              </span>
                            </div>

                            {/* Resize Handle at the right edge of Entrance segment */}
                            {isEntrance && (
                              <div
                                className="w-2 h-full absolute right-0 top-0 cursor-ew-resize hover:bg-white/30 rounded-r-lg transition"
                                title="Drag to adjust animation duration"
                                onPointerDown={startDragSegment(el, seg, 'resize-end')}
                              />
                            )}
                          </div>
                        );
                      })}

                    {/* Keyframe Diamonds (◆) */}
                    {kfs.map((kf) => {
                      const isKfSelected =
                        selectedKeyframe?.elementId === el.id && selectedKeyframe.keyframeId === kf.id;
                      return (
                        <div
                          key={kf.id}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 cursor-grab active:cursor-grabbing transition-transform ${
                            isKfSelected
                              ? 'bg-amber-400 ring-2 ring-amber-300 shadow-lg shadow-amber-400/40 z-20 scale-125'
                              : 'bg-red-500 hover:bg-red-400 hover:scale-110 shadow-md shadow-red-500/30 z-10'
                          }`}
                          style={{ left: kf.time * pps }}
                          title={`Keyframe at ${kf.time.toFixed(2)}s\nDrag to move · Click to edit`}
                          onPointerDown={startDragKf(el, kf.id)}
                          onPointerMove={moveDragKf}
                          onPointerUp={endDragKf}
                          onPointerCancel={endDragKf}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectKeyframe({ elementId: el.id, keyframeId: kf.id });
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* 2C. Playhead Needle Line & Scrub Handle */}
            {/* Spans the full rail (top -> bottom) so the red line always runs the
                entire height of the timeline, ruler included. */}
            <div
              ref={needleRef}
              className="absolute top-0 bottom-0 w-[3px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.55)] pointer-events-none z-40 will-change-transform"
              style={{ transform: `translateX(${uiTime * pps}px)` }}
            >
              {/* Grabbable strip on the line itself: gives the hand (grab) cursor
                  on the red line and lets you scrub from anywhere along it. */}
              <div
                className="absolute -left-[2.5px] top-0 bottom-0 w-2 pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                title="Drag to scrub"
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              />

              {/* Diamond handle — kept inside the rail's top edge so it is never
                  clipped by the workspace' overflow. */}
              <div
                className="absolute left-1/2 top-1 -translate-x-1/2 rotate-45 w-4 h-4 bg-red-500 rounded-[3px] shadow-[0_0_10px_rgba(239,68,68,0.85)] flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                title="Drag to scrub"
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              >
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            </div>

            {/* Scrub Hit Target: only the empty space BELOW the element rows (the
                ruler above is scrubbable too). Leaving the rows uncovered keeps
                keyframes / segment pills draggable with their own grab cursor. */}
            <div
              className="absolute left-0 right-0 bottom-0 z-[5] cursor-grab active:cursor-grabbing touch-none"
              style={{ top: RULER_H + elements.length * ROW_H }}
              onPointerDown={startScrub}
              onPointerMove={scrubMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            />
          </div>
        </div>
      </div>

      {/* 3. Bottom Keyboard Shortcuts Footer */}
      <div className="px-4 py-1.5 text-[10px] text-gray-500 border-t border-[#232330] bg-[#111116] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="bg-[#20202c] text-gray-300 px-1.5 py-0.5 rounded border border-[#2d2d3d] mr-1">Space</kbd> Play/Pause
          </span>
          <span>
            <kbd className="bg-[#20202c] text-gray-300 px-1.5 py-0.5 rounded border border-[#2d2d3d] mr-1">← / →</kbd> Step 0.1s
          </span>
          <span>
            <kbd className="bg-[#20202c] text-gray-300 px-1.5 py-0.5 rounded border border-[#2d2d3d] mr-1">Drag Red Line</kbd> Scrub Playhead
          </span>
          <span>
            <kbd className="bg-[#20202c] text-gray-300 px-1.5 py-0.5 rounded border border-[#2d2d3d] mr-1">Drag Segment</kbd> Adjust Timing
          </span>
          <span>
            <kbd className="bg-[#20202c] text-gray-300 px-1.5 py-0.5 rounded border border-[#2d2d3d] mr-1">Double Click</kbd> Open Studio / Add KF
          </span>
        </div>

        <div className="text-gray-400 font-mono">
          {snapToGrid ? 'Snap: 0.1s' : 'Smooth Scrub'}
        </div>
      </div>
    </div>
  );
};
