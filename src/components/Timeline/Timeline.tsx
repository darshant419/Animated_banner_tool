import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import {
  Play, Pause, Eye, EyeOff, Lock, Unlock, Type, Square, Circle,
  Image as ImageIcon, ScrollText, Shapes, Code2, Repeat, Trash2,
  ZoomIn, ZoomOut, Sparkles, Plus, SkipBack, SkipForward,
  ChevronLeft, ChevronRight, Magnet, Maximize2, Zap, FastForward,
  RotateCcw, Sliders, GripVertical, Film,
} from 'lucide-react';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import { seekAllMasters } from '../Canvas/AnimationHelpers';
import {
  getElementKeyframes,
  getElementBaseState,
  getElementAnimationSegments,
  type ElementAnimationSegment,
} from '../../utils/keyframes';

const ROW_H = 44;
const RULER_H = 28;
const DEFAULT_PPS = 100;
const MIN_PPS = 30;
const MAX_PPS = 240;

const typeIcon = (type: DesignElement['type'], size = 13) => {
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

// TheBrief-style segment colors
const SEGMENT_STYLES = {
  enter: {
    bg: 'bg-gradient-to-r from-[#1bbfa7] to-[#0ea99a]',
    border: 'border-[#1bbfa7]/50',
    shadow: 'shadow-[#1bbfa7]/20',
    dot: 'bg-[#1bbfa7]',
    label: 'text-white',
  },
  exit: {
    bg: 'bg-gradient-to-r from-[#e4567d] to-[#c73d6c]',
    border: 'border-[#e4567d]/50',
    shadow: 'shadow-[#e4567d]/20',
    dot: 'bg-[#e4567d]',
    label: 'text-white',
  },
  loop: {
    bg: 'bg-gradient-to-r from-[#9b7df8] to-[#7c5de8]',
    border: 'border-[#9b7df8]/50',
    shadow: 'shadow-[#9b7df8]/20',
    dot: 'bg-[#9b7df8]',
    label: 'text-white',
  },
  main: {
    bg: 'bg-gradient-to-r from-[#4d9de0] to-[#3680cc]',
    border: 'border-[#4d9de0]/50',
    shadow: 'shadow-[#4d9de0]/20',
    dot: 'bg-[#4d9de0]',
    label: 'text-white',
  },
};

const getSegmentStyle = (segId: string) => {
  if (segId === 'enter') return SEGMENT_STYLES.enter;
  if (segId === 'exit') return SEGMENT_STYLES.exit;
  if (segId === 'loop' || segId === 'main') return SEGMENT_STYLES.main;
  return SEGMENT_STYLES.loop;
};

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
  const [uiTime, setUiTime] = useState(playheadTime);
  const needleRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(playheadTime);
  const lastStoreSyncRef = useRef(0);

  const trackWidth = Math.max(800, totalDuration * pps + 120);
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

  useEffect(() => {
    if (!isPlaying) {
      setUiTime(playheadTime);
      playheadRef.current = playheadTime;
    }
  }, [isPlaying, playheadTime]);

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
            if (needleRef.current) needleRef.current.style.transform = `translateX(0px)`;
            setUiTime(0);
            setPlayheadTime(0);
            seekAllMasters(0);
          } else {
            playheadRef.current = totalDuration;
            if (needleRef.current) needleRef.current.style.transform = `translateX(${totalDuration * pps}px)`;
            setUiTime(totalDuration);
            setPlayheadTime(totalDuration);
            seekAllMasters(totalDuration);
            setIsPlaying(false);
            return;
          }
        } else {
          playheadRef.current = next;
          setUiTime(next);
          if (needleRef.current) needleRef.current.style.transform = `translateX(${next * pps}px)`;
          seekAllMasters(next);
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
  }, [isPlaying, totalDuration, loop, setPlayheadTime, setIsPlaying, previewPaused, pps]);

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

  const scrubTo = (t: number) => {
    setPlayheadTime(t);
    playheadRef.current = t;
    setUiTime(t);
    if (needleRef.current) needleRef.current.style.transform = `translateX(${t * pps}px)`;
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

  const endScrub = () => { scrubRef.current.active = false; };

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

  const handleAddKeyframe = (el: DesignElement) => (e: React.MouseEvent) => {
    if (e.detail !== 2) return;
    const time = timeFromEvent(e.clientX);
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
    addKeyframe(el.id, {
      id: `kf-${Date.now()}`,
      time: Math.round(playheadTime * 100) / 100,
      x: base.x, y: base.y,
      opacity: base.opacity,
      rotation: base.rotation,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
      blur: base.blur,
      easing: 'power1.inOut',
    });
  };

  const startDragKf = (el: DesignElement, kfId: string) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    selectKeyframe({ elementId: el.id, keyframeId: kfId });
    dragKfRef.current = { elementId: el.id, keyframeId: kfId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDragKf = (e: React.PointerEvent) => {
    if (!dragKfRef.current) return;
    const time = timeFromEvent(e.clientX);
    updateKeyframe(dragKfRef.current.elementId, dragKfRef.current.keyframeId, { time });
  };

  const endDragKf = () => { dragKfRef.current = null; };

  const startDragSegment = (
    el: DesignElement,
    segment: ElementAnimationSegment,
    type: 'move' | 'resize-end',
  ) => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
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
      if (segmentId === 'enter') updateElement(elementId, { enterDelay: newStart });
      else if (segmentId === 'exit') updateElement(elementId, { exitDelay: newStart });
      else updateElement(elementId, { animationDelay: newStart });
    } else if (type === 'resize-end') {
      const newDuration = Math.max(0.1, Math.round((initialDuration + deltaSeconds) * 20) / 20);
      updateElement(elementId, { animationDuration: newDuration });
    }
  };

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

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex flex-col z-10 select-none outline-none"
      style={{ height: 280, background: '#0d0d12', borderTop: '1px solid #1e1e2e' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ── Header toolbar ────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 44, background: '#11111a', borderBottom: '1px solid #1e1e2e' }}
      >
        {/* Left: transport */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrubTo(0)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition"
            title="Jump to Start"
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={() => scrubTo(Math.max(0, playheadTime - 0.1))}
            className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition"
            title="Step Back"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
              isPlaying
                ? 'bg-[#f0a050] text-black'
                : 'bg-[#1bbfa7] text-black hover:bg-[#1dd8be]'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => scrubTo(Math.min(totalDuration, playheadTime + 0.1))}
            className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition"
            title="Step Forward"
          >
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => scrubTo(totalDuration)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition"
            title="Jump to End"
          >
            <SkipForward size={13} />
          </button>

          {/* Timecode */}
          <div
            className="ml-2 flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded"
            style={{ background: '#08080e', border: '1px solid #222230' }}
          >
            <span style={{ color: '#f0a050', fontWeight: 700 }}>{formatTimecode(uiTime)}</span>
            <span style={{ color: '#3a3a4a' }}>/</span>
            <span style={{ color: '#5a5a6a' }}>{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Center: shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'sequence' } }))}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
            style={{ border: '1px solid #222232' }}
            title="Stagger All Layers"
          >
            <Sliders size={12} style={{ color: '#1bbfa7' }} />
            <span>Stagger</span>
          </button>

          <button
            onClick={addKeyframeAtPlayhead}
            disabled={!selectedId}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-gray-400 hover:text-gray-200 transition disabled:opacity-30"
            style={{ border: '1px solid #222232' }}
            title="Add Keyframe at Playhead"
          >
            <Plus size={12} />
            <span>Keyframe</span>
          </button>
        </div>

        {/* Right: settings */}
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-[11px]" style={{ color: '#5a5a6a' }}>
            <span>Duration</span>
            <input
              type="number"
              min="0.5" max="60" step="0.5"
              value={totalDuration}
              onChange={(e) => setTotalDuration(parseFloat(e.target.value) || 1)}
              className="w-12 rounded px-2 py-0.5 text-[11px] text-center font-mono focus:outline-none"
              style={{
                background: '#08080e',
                border: '1px solid #222232',
                color: '#e0e0e0',
              }}
            />
            <span>s</span>
          </label>

          <button
            onClick={() => setLoop(!loop)}
            className="p-1.5 rounded transition"
            style={{
              border: `1px solid ${loop ? '#1bbfa740' : '#222232'}`,
              background: loop ? '#1bbfa710' : 'transparent',
              color: loop ? '#1bbfa7' : '#5a5a6a',
            }}
            title="Loop Playback"
          >
            <Repeat size={13} />
          </button>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className="p-1.5 rounded transition"
            style={{
              border: `1px solid ${snapToGrid ? '#f0a05040' : '#222232'}`,
              background: snapToGrid ? '#f0a05010' : 'transparent',
              color: snapToGrid ? '#f0a050' : '#5a5a6a',
            }}
            title="Snap to Grid"
          >
            <Magnet size={13} />
          </button>

          <div style={{ width: 1, height: 16, background: '#222232' }} />

          {/* Zoom */}
          <div
            className="flex items-center gap-0.5 px-1.5 py-1 rounded"
            style={{ background: '#08080e', border: '1px solid #222232' }}
          >
            <button
              onClick={() => setPps((p) => Math.max(MIN_PPS, p - 20))}
              disabled={pps <= MIN_PPS}
              className="p-1 rounded text-gray-500 hover:text-gray-200 disabled:opacity-30 transition"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[10px] font-mono w-8 text-center" style={{ color: '#5a5a6a' }}>
              {Math.round((pps / DEFAULT_PPS) * 100)}%
            </span>
            <button
              onClick={() => setPps((p) => Math.min(MAX_PPS, p + 20))}
              disabled={pps >= MAX_PPS}
              className="p-1 rounded text-gray-500 hover:text-gray-200 disabled:opacity-30 transition"
            >
              <ZoomIn size={12} />
            </button>
            <button
              onClick={handleFitZoom}
              className="p-1 rounded text-gray-500 hover:text-[#1bbfa7] transition"
              title="Fit to window"
            >
              <Maximize2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main workspace ────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Left: Layers panel */}
        <div
          className="shrink-0 flex flex-col"
          style={{ width: 220, background: '#0f0f18', borderRight: '1px solid #1a1a28' }}
        >
          {/* Layers header aligned with ruler */}
          <div
            className="flex items-center px-3 shrink-0"
            style={{
              height: RULER_H,
              background: '#0b0b14',
              borderBottom: '1px solid #1a1a28',
            }}
          >
            <Film size={11} style={{ color: '#3a3a55', marginRight: 6 }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#3a3a55' }}>
              Layers
            </span>
            <span className="ml-auto text-[9px] font-mono rounded px-1" style={{ background: '#1a1a28', color: '#4a4a65' }}>
              {elements.length}
            </span>
          </div>

          {/* Layer rows */}
          <div ref={leftRowsRef} className="flex-1 overflow-y-auto relative" style={{ overflowX: 'hidden' }}>
            {/* Drop indicator */}
            {rowDragOver && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{
                  top: rowDragOver.overIndex * ROW_H,
                  height: 2,
                  background: '#f0a050',
                  boxShadow: '0 0 6px #f0a05080',
                }}
              />
            )}

            {elements.map((el, i) => {
              const isSelected = selectedId === el.id;
              const hasAnim = !!(el.enterAnimation || el.animation);
              const isDragSource = rowDragOver?.id === el.id;

              return (
                <div
                  key={el.id}
                  onClick={() => selectElement(el.id)}
                  onPointerDown={startRowDrag(el, i, 'left')}
                  onPointerMove={moveRowDrag}
                  onPointerUp={endRowDrag}
                  onPointerCancel={endRowDrag}
                  className={`flex items-center gap-1.5 px-2 group transition select-none ${
                    isDragSource ? 'z-30 cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    height: ROW_H,
                    borderBottom: '1px solid #161624',
                    borderLeft: `2px solid ${isSelected ? '#1bbfa7' : 'transparent'}`,
                    background: isSelected
                      ? '#1bbfa708'
                      : isDragSource
                      ? '#1a1a2a'
                      : undefined,
                    opacity: el.visible === false ? 0.35 : 1,
                    transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined,
                  }}
                >
                  {/* Drag handle */}
                  <GripVertical size={11} style={{ color: '#2a2a3a', flexShrink: 0 }} className="group-hover:!text-gray-400 transition" />

                  {/* Eye */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                    className="transition shrink-0"
                    style={{ color: el.visible === false ? '#3a3a4a' : '#5a5a6a' }}
                    title="Toggle visibility"
                  >
                    {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>

                  {/* Lock */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                    className="transition shrink-0"
                    style={{ color: el.locked ? '#e4567d' : '#5a5a6a' }}
                    title="Toggle lock"
                  >
                    {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>

                  {/* Type icon */}
                  <span
                    className="transition shrink-0"
                    style={{ color: isSelected ? '#1bbfa7' : '#4a4a6a' }}
                  >
                    {typeIcon(el.type)}
                  </span>

                  {/* Label */}
                  <span
                    className="text-[11px] font-medium truncate flex-1"
                    style={{ color: isSelected ? '#e0e0e0' : '#8a8a9a' }}
                  >
                    {elementLabel(el)}
                  </span>

                  {/* Sparkles if animated */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(el.id);
                      window.dispatchEvent(new CustomEvent('open-animation-studio', { detail: { tab: 'in' } }));
                    }}
                    className="transition shrink-0"
                    style={{
                      color: hasAnim ? '#f0a050' : '#3a3a4a',
                      opacity: hasAnim ? 1 : 0,
                    }}
                    title="Edit animations"
                  >
                    <Sparkles size={11} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                    className="opacity-0 group-hover:opacity-100 transition shrink-0"
                    style={{ color: '#5a5a6a' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#e4567d')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5a5a6a')}
                    title="Delete layer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}

            {elements.length === 0 && (
              <div className="p-6 text-[11px] text-center" style={{ color: '#3a3a4a' }}>
                Add elements to start animating
              </div>
            )}
          </div>
        </div>

        {/* Right: Track area */}
        <div
          className="flex-1 overflow-auto relative"
          ref={scrollContainerRef}
          style={{ background: '#0c0c15' }}
        >
          <div
            ref={trackRef}
            style={{ width: trackWidth, position: 'relative', minHeight: trackMinHeight || undefined }}
            className="min-h-full"
            onPointerDown={moveDragSegment}
            onPointerMove={moveDragSegment}
            onPointerUp={endDragSegment}
          >
            {/* ── Ruler ── */}
            <div
              className="relative cursor-grab active:cursor-grabbing touch-none"
              style={{
                height: RULER_H,
                background: '#0b0b14',
                borderBottom: '1px solid #1a1a28',
              }}
              onPointerDown={startScrub}
              onPointerMove={scrubMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            >
              {ticks.map((t, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-full"
                  style={{
                    left: t.time * pps,
                    borderLeft: `1px solid ${t.isMajor ? '#252535' : '#18182a'}`,
                  }}
                >
                  {t.label && (
                    <span
                      className="absolute font-mono select-none"
                      style={{
                        top: 7,
                        left: 4,
                        fontSize: 9,
                        color: '#3a3a55',
                        fontWeight: 500,
                      }}
                    >
                      {t.label}
                    </span>
                  )}
                </div>
              ))}

              {/* Ruler playhead indicator */}
              <div
                className="absolute top-0 h-full pointer-events-none"
                style={{
                  left: uiTime * pps,
                  width: 1,
                  background: '#f0a050',
                  opacity: 0.4,
                }}
              />
            </div>

            {/* ── Element rows ── */}
            <div
              ref={rightRowsRef}
              className="relative will-change-transform"
              style={{ height: elements.length * ROW_H }}
            >
              {/* Drop indicator */}
              {rowDragOver && (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-10"
                  style={{
                    top: rowDragOver.overIndex * ROW_H,
                    height: 2,
                    background: '#f0a050',
                    boxShadow: '0 0 6px #f0a05080',
                  }}
                />
              )}

              {elements.map((el, i) => {
                const kfs = getElementKeyframes(el, totalDuration);
                const segments = getElementAnimationSegments(el);
                const isSelected = selectedId === el.id;
                const isDragSource = rowDragOver?.id === el.id;

                // Compute element's full animation span for the "lifetime" bar
                const allTimes = kfs.map((k) => k.time);
                const lifeStart = allTimes.length > 0 ? Math.min(...allTimes) : 0;
                const lifeEnd = allTimes.length > 0 ? Math.max(...allTimes) : totalDuration;

                return (
                  <div
                    key={el.id}
                    className={`absolute left-0 right-0 select-none transition-colors ${
                      isDragSource ? 'z-30 cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      top: i * ROW_H,
                      height: ROW_H,
                      borderBottom: '1px solid #14141e',
                      background: isSelected ? '#1bbfa705' : undefined,
                      transform: isDragSource && rowDragOver ? `translateY(${rowDragOver.dy}px)` : undefined,
                    }}
                    onClick={() => selectElement(el.id)}
                    onDoubleClick={handleAddKeyframe(el)}
                    onPointerDown={startRowDrag(el, i, 'right')}
                    onPointerMove={moveRowDrag}
                    onPointerUp={endRowDrag}
                    onPointerCancel={endRowDrag}
                  >
                    {/* Vertical grid lines */}
                    {ticks.filter((t) => t.isMajor).map((t, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 pointer-events-none"
                        style={{ left: t.time * pps, borderLeft: '1px solid #181828' }}
                      />
                    ))}

                    {/* Element "lifetime" bar — spans full animation window */}
                    {allTimes.length > 0 && (
                      <div
                        className="absolute pointer-events-none rounded-sm"
                        style={{
                          top: '50%',
                          transform: 'translateY(-50%)',
                          left: lifeStart * pps,
                          width: Math.max(4, (lifeEnd - lifeStart) * pps),
                          height: 6,
                          background: '#1e1e30',
                          borderRadius: 2,
                        }}
                      />
                    )}

                    {/* Animation segment bars (TheBrief-style colored pills) */}
                    {segments
                      .filter((seg) => seg.end > seg.start)
                      .map((seg) => {
                        const segLeft = seg.start * pps;
                        const segWidth = Math.max(12, (seg.end - seg.start) * pps);
                        const style = getSegmentStyle(seg.id);
                        const isEntrance = seg.id === 'enter';
                        const isExit = seg.id === 'exit';

                        return (
                          <div
                            key={seg.id}
                            className={`absolute rounded flex items-center gap-1 text-[10px] font-semibold cursor-grab active:cursor-grabbing transition-all ${style.bg} ${style.label}`}
                            style={{
                              top: '50%',
                              transform: 'translateY(-50%)',
                              left: segLeft,
                              width: segWidth,
                              height: 22,
                              border: `1px solid`,
                              borderColor: style.border.replace('border-', '').replace('[', '').replace(']', '').replace('/50', '80'),
                              boxShadow: `0 1px 8px ${
                                isEntrance ? '#1bbfa730' : isExit ? '#e4567d30' : '#9b7df820'
                              }`,
                              padding: '0 6px',
                              overflow: 'hidden',
                            }}
                            title={`${seg.label} — ${seg.start.toFixed(2)}s → ${seg.end.toFixed(2)}s\nDrag to re-time · Double-click to open Studio`}
                            onPointerDown={startDragSegment(el, seg, 'move')}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              selectElement(el.id);
                              window.dispatchEvent(new CustomEvent('open-animation-studio', {
                                detail: { tab: isEntrance ? 'in' : 'out' },
                              }));
                            }}
                          >
                            <span className="flex items-center gap-0.5 truncate pointer-events-none">
                              {isEntrance && <Zap size={9} className="shrink-0 opacity-90" />}
                              {isExit && <FastForward size={9} className="shrink-0 opacity-90" />}
                              {!isEntrance && !isExit && <RotateCcw size={9} className="shrink-0 opacity-90" />}
                              {segWidth > 48 && (
                                <span className="truncate text-[9px] opacity-90">{seg.label}</span>
                              )}
                            </span>

                            {/* Resize handle (entrance only) */}
                            {isEntrance && (
                              <div
                                className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-white/25 rounded-r transition"
                                onPointerDown={startDragSegment(el, seg, 'resize-end')}
                              />
                            )}
                          </div>
                        );
                      })}

                    {/* Keyframe diamonds */}
                    {kfs.map((kf) => {
                      const isKfSelected =
                        selectedKeyframe?.elementId === el.id && selectedKeyframe.keyframeId === kf.id;
                      return (
                        <div
                          key={kf.id}
                          className="absolute cursor-grab active:cursor-grabbing transition-transform"
                          style={{
                            top: '50%',
                            left: kf.time * pps,
                            transform: `translate(-50%, -50%) rotate(45deg) scale(${isKfSelected ? 1.3 : 1})`,
                            width: 10,
                            height: 10,
                            background: isKfSelected ? '#f0a050' : '#1bbfa7',
                            boxShadow: isKfSelected
                              ? '0 0 8px #f0a05080'
                              : '0 0 6px #1bbfa740',
                            zIndex: isKfSelected ? 20 : 10,
                            borderRadius: 2,
                          }}
                          title={`Keyframe at ${kf.time.toFixed(2)}s`}
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

            {/* ── Playhead needle ── */}
            <div
              ref={needleRef}
              className="absolute top-0 bottom-0 pointer-events-none z-40 will-change-transform"
              style={{
                width: 1,
                background: '#f0a050',
                boxShadow: '0 0 6px #f0a05060',
                transform: `translateX(${uiTime * pps}px)`,
              }}
            >
              {/* Grab strip */}
              <div
                className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing touch-none pointer-events-auto"
                style={{ left: -3, width: 7 }}
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              />

              {/* Head diamond */}
              <div
                className="absolute cursor-grab active:cursor-grabbing pointer-events-auto"
                style={{
                  top: 3,
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 12,
                  height: 12,
                  background: '#f0a050',
                  borderRadius: 2,
                  boxShadow: '0 0 10px #f0a05090',
                }}
                onPointerDown={startScrub}
                onPointerMove={scrubMove}
                onPointerUp={endScrub}
                onPointerCancel={endScrub}
              />
            </div>

            {/* Scrub dead zone below rows */}
            <div
              className="absolute left-0 right-0 bottom-0 cursor-grab active:cursor-grabbing touch-none"
              style={{ top: RULER_H + elements.length * ROW_H, zIndex: 5 }}
              onPointerDown={startScrub}
              onPointerMove={scrubMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            />
          </div>
        </div>
      </div>

      {/* ── Legend / shortcuts footer ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 28,
          background: '#09090f',
          borderTop: '1px solid #1a1a28',
          fontSize: 9,
          color: '#3a3a4a',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Animation type legend */}
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#1bbfa7' }} />
            <span>In</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#e4567d' }} />
            <span>Out</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#9b7df8' }} />
            <span>Loop</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#f0a050' }} />
            <span>Keyframe</span>
          </span>

          <span style={{ color: '#252535' }}>|</span>

          <span>
            <kbd className="px-1 py-0.5 rounded" style={{ background: '#151520', color: '#5a5a6a', border: '1px solid #222232' }}>Space</kbd> Play
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded" style={{ background: '#151520', color: '#5a5a6a', border: '1px solid #222232' }}>← →</kbd> Step
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded" style={{ background: '#151520', color: '#5a5a6a', border: '1px solid #222232' }}>Dbl-click</kbd> Add KF / Open Studio
          </span>
        </div>

        <div style={{ color: '#3a3a50', fontFamily: 'monospace' }}>
          {snapToGrid ? 'Snap 0.1s' : 'Free scrub'}
        </div>
      </div>
    </div>
  );
};
