import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play, Pause, Eye, EyeOff, Lock, Unlock, Type, Square, Circle,
  Image as ImageIcon, ScrollText, Shapes, Code2, Repeat, Trash2,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { useDesignStore, type DesignElement } from '../../store/designStore';
import { getElementKeyframes, getElementBaseState, getElementAnimationSegments } from '../../utils/keyframes';

const ROW_H = 34;
const DEFAULT_PPS = 80;
const MIN_PPS = 30;
const MAX_PPS = 200;

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
    previewPaused,
  } = useDesignStore();

  const [pps, setPps] = useState(DEFAULT_PPS);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<{ active: boolean }>({ active: false });
  const dragKfRef = useRef<{ elementId: string; keyframeId: string } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  const trackWidth = totalDuration * pps;

  // Playback loop: advance the playhead using the store's isPlaying flag.
  // When previewPaused is true (e.g., hovering ISI content), the playhead
  // freezes so the timeline visually stops until the mouse leaves.
  // Throttle state updates to ~30fps to avoid excessive re-renders.
  useEffect(() => {
    if (!isPlaying) return;
    let raf: number;
    lastTimeRef.current = performance.now();
    frameCountRef.current = 0;
    const tick = (now: number) => {
      if (!previewPaused) {
        const dt = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;
        const next = playheadTime + dt;
        if (next >= totalDuration) {
          if (loop) {
            setPlayheadTime(0);
          } else {
            setPlayheadTime(totalDuration);
            setIsPlaying(false);
          }
        } else {
          // Throttle state updates to ~30fps (every 2 frames at 60fps)
          frameCountRef.current++;
          if (frameCountRef.current % 2 === 0) {
            setPlayheadTime(next);
          }
        }
      } else {
        // Still update 'last' so we don't jump forward when unpausing.
        lastTimeRef.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playheadTime, totalDuration, loop, setPlayheadTime, setIsPlaying, previewPaused]);

  const timeFromEvent = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const offset = clientX - rect.left;
    return Math.max(0, Math.min(totalDuration, offset / pps));
  }, [pps, totalDuration]);

  const startScrub = (e: React.PointerEvent) => {
    scrubRef.current.active = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPlayheadTime(timeFromEvent(e.clientX));
  };

  const scrubMove = (e: React.PointerEvent) => {
    if (!scrubRef.current.active) return;
    setPlayheadTime(timeFromEvent(e.clientX));
  };

  const endScrub = () => {
    scrubRef.current.active = false;
  };

  const handleAddKeyframe = (el: DesignElement) => (e: React.MouseEvent) => {
    if (e.detail !== 2) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const time = Math.max(0, Math.min(totalDuration, (e.clientX - rect.left) / pps));
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
      easing: 'power1.inOut',
    });
  };

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

  const handleDeleteKf = (e: React.KeyboardEvent) => {
    if (selectedKeyframe && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      removeKeyframe(selectedKeyframe.elementId, selectedKeyframe.keyframeId);
    }
  };

  const ticks: number[] = [];
  const step = pps >= 60 ? 0.5 : 1;
  for (let t = 0; t <= totalDuration + 0.001; t += step) {
    ticks.push(Math.round(t * 100) / 100);
  }

  return (
    <div
      className="h-72 bg-[#15151c] border-t border-[#2a2a35] flex flex-col z-10 select-none"
      onKeyDown={handleDeleteKf}
      tabIndex={0}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#232330] bg-[#1a1a21]/60">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${isPlaying
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-red-600 text-white hover:bg-red-700'
            }`}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>

        <div className="text-xs font-mono text-gray-400 bg-[#15151c] border border-[#2a2a35] rounded px-2 py-1 min-w-[64px] text-center">
          {playheadTime.toFixed(2)}s
        </div>

        <div className="h-5 w-px bg-[#26262f]" />

        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          Duration
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={totalDuration}
            onChange={(e) => setTotalDuration(parseFloat(e.target.value) || 1)}
            className="w-16 border border-[#2a2a35] rounded px-2 py-1 text-xs focus:outline-none focus:border-red-500 bg-[#1a1a21] text-gray-100"
          />
          s
        </label>

        <label className="flex items-center gap-1.5 text-xs text-gray-400 ml-1">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
            className="rounded border-[#33333f] text-red-500 focus:ring-red-500"
          />
          <Repeat size={12} /> Loop
        </label>

        <div className="flex-1" />

        {/* Zoom Control — fully styled, theme-matched */}
        <div className="flex items-center gap-2 bg-[#15151c] border border-[#2a2a35] rounded-lg px-2 py-1">
          <button
            onClick={() => setPps(p => Math.max(MIN_PPS, p - 20))}
            disabled={pps <= MIN_PPS}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>

          <div className="relative w-32">
            <input
              type="range"
              min={MIN_PPS}
              max={MAX_PPS}
              value={pps}
              onChange={(e) => setPps(Number(e.target.value))}
              className="w-full h-1.5 appearance-none bg-[#26262f] rounded-full cursor-pointer accent-red-500"
              style={{
                background: `linear-gradient(to right, #ef4444 ${((pps - MIN_PPS) / (MAX_PPS - MIN_PPS)) * 100}%, #26262f ${((pps - MIN_PPS) / (MAX_PPS - MIN_PPS)) * 100}%)`,
              }}
            />
          </div>

          <button
            onClick={() => setPps(p => Math.min(MAX_PPS, p + 20))}
            disabled={pps >= MAX_PPS}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={() => setPps(DEFAULT_PPS)}
            className="px-2 py-1 rounded text-[10px] font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
            title="Reset zoom (100%)"
          >
            {Math.round((pps / DEFAULT_PPS) * 100)}%
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Layers column */}
        <div className="w-60 border-r border-[#2a2a35] flex flex-col bg-[#15151c] shrink-0">
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#232330] bg-[#1a1a21]/60">
            Layers
          </div>
          <div className="flex-1 overflow-y-auto">
            {elements.map((el) => (
              <div
                key={el.id}
                onClick={() => selectElement(el.id)}
                className={`flex items-center gap-2 px-2 cursor-pointer border-b border-[#1a1a21] group ${selectedId === el.id ? 'bg-red-500/10' : 'hover:bg-[#1e1e26]'
                  } ${el.visible === false ? 'opacity-40' : ''}`}
                style={{ height: ROW_H }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                  className="text-gray-500 hover:text-white"
                  title="Toggle visibility"
                >
                  {el.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                  className={`${el.locked ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title="Toggle lock"
                >
                  {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <span className="text-gray-500">{typeIcon(el.type)}</span>
                <span className="text-xs text-gray-200 truncate flex-1">{elementLabel(el)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                  className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete layer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {elements.length === 0 && (
              <div className="p-4 text-xs text-gray-500 text-center">
                Add elements from the toolbar to animate them.
              </div>
            )}
          </div>
        </div>

        {/* Track */}
        <div className="flex-1 overflow-auto relative" ref={trackRef}>
          <div style={{ width: trackWidth, position: 'relative' }} className="min-h-full">
            {/* Ruler */}
            <div className="h-6 border-b border-[#232330] bg-[#1a1a21]/40 relative">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full border-l border-[#2a2a35]"
                  style={{ left: t * pps }}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] text-gray-500 font-mono">
                    {t}s
                  </span>
                </div>
              ))}
            </div>

            {/* Element rows */}
            <div className="relative" style={{ height: elements.length * ROW_H }}>
              {elements.map((el, i) => {
                const kfs = getElementKeyframes(el, totalDuration);
                return (
                  <div
                    key={el.id}
                    className={`absolute left-0 right-0 border-b border-[#1a1a21] ${selectedId === el.id ? 'bg-red-500/15' : 'hover:bg-[#1e1e26]/60'
                      }`}
                    style={{ top: i * ROW_H, height: ROW_H }}
                    onClick={() => selectElement(el.id)}
                    onDoubleClick={handleAddKeyframe(el)}
                  >
                    {/* Animation timeframe segments (entrance / main / timed blocks / exit) */}
                    {getElementAnimationSegments(el)
                      .filter((seg) => seg.end > seg.start)
                      .map((seg) => (
                        <div
                          key={seg.id}
                          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full opacity-60"
                          style={{
                            left: seg.start * pps + 4,
                            width: Math.max(4, (seg.end - seg.start) * pps - 8),
                            background: seg.color,
                          }}
                          title={`${seg.label} ${seg.start.toFixed(2)}s – ${seg.end.toFixed(2)}s`}
                        />
                      ))}

                    {kfs.map((kf) => {
                      const isSelected =
                        selectedKeyframe?.elementId === el.id && selectedKeyframe.keyframeId === kf.id;
                      return (
                        <div
                          key={kf.id}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-grab active:cursor-grabbing ${isSelected
                            ? 'bg-red-600 ring-2 ring-red-500/40'
                            : 'bg-red-500 hover:bg-red-500/100'
                            }`}
                          style={{ left: kf.time * pps, zIndex: 10 }}
                          title={`${kf.time.toFixed(2)}s`}
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

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
              style={{ left: playheadTime * pps }}
            >
              <div className="absolute -top-0.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
            </div>

            {/* Scrub overlay */}
            <div
              className="absolute inset-0 z-[5] cursor-col-resize"
              onPointerDown={startScrub}
              onPointerMove={scrubMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-1 text-[10px] text-gray-500 border-t border-[#232330] bg-[#1a1a21]/60 flex items-center gap-4">
        <span>Double-click a row to add a keyframe</span>
        <span>Drag diamonds to re-time</span>
        <span>Del removes the selected keyframe</span>
      </div>
    </div>
  );
};