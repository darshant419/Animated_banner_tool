import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Stage, Layer, Rect, Circle, Line, Text, Transformer, Image as KonvaImage, Path,
} from 'react-konva';
import { useDesignStore, type Artboard, type DesignElement } from '../../store/designStore';
import { LayoutGrid, Square } from 'lucide-react';
import Konva from 'konva';
import useImage from 'use-image';
import { ISIScroll } from './ISIScroll';
import { ISIOverlay } from './ISIOverlay';
import JSZip from 'jszip';
import { buildMasterTimeline, applyHoverEffect, resetHoverEffect } from './AnimationHelpers';
import { getElementBaseState, getElementKeyframes } from '../../utils/keyframes';

const URLImage = React.forwardRef<Konva.Image, any>(function URLImage({ image, ...props }, ref) {
  const [img] = useImage(image.src);
  return <KonvaImage ref={ref} image={img} {...props} />;
});

const BackgroundImage = ({ src, width, height }: { src: string, width: number, height: number }) => {
  const [img] = useImage(src);
  return <KonvaImage image={img} width={width} height={height} />;
};

const GUIDELINE_OFFSET = 5;

const parseHex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec((c || '').trim());
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

const luminance = (c: string): number => {
  const [r, g, b] = parseHex(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

// Picks a readable text color for the inline editor: keeps the element's fill
// when it contrasts with the canvas, otherwise flips to the opposite of the bg.
const editorTextColor = (fill: string | undefined, bg: string | undefined): string => {
  const fillColor = fill || '#000000';
  const bgColor = bg || '#ffffff';
  if (Math.abs(luminance(fillColor) - luminance(bgColor)) > 100) return fillColor;
  return luminance(bgColor) > 128 ? '#111111' : '#f5f5f5';
};

interface ShapeProps {
  el: DesignElement;
  isPlaying: boolean;
  registerNode: (id: string, node: Konva.Node | null) => void;
  onSelect: (id: string) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: any) => void;
  onEditText: (id: string) => void;
  onEditISI: (id: string) => void;
}

const ElementShape = memo(function ElementShape({
  el,
  isPlaying,
  registerNode,
  onSelect,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onEditText,
  onEditISI,
}: ShapeProps) {
  const commonProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: el.width || 300,
    height: el.height || 200,
    fill: el.fill,
    draggable: !el.locked && !isPlaying,
    visible: el.visible !== false,
    cornerRadius: el.cornerRadius,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    shadowBlur: el.shadowBlur,
    shadowColor: el.shadowColor,
    shadowOffsetX: el.shadowOffsetX,
    shadowOffsetY: el.shadowOffsetY,
    shadowOpacity: el.shadowOpacity,
    // Perf: skip perfect-pixel redraws so dragging stays smooth (esp. with shadows)
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false,
    onClick: () => onSelect(el.id),
    onTap: () => onSelect(el.id),
    onDragMove,
    onDragEnd,
    onTransformEnd,
    onMouseEnter: (e: any) => applyHoverEffect(e.target, el),
    onMouseLeave: (e: any) => resetHoverEffect(e.target, el),
  };

  const ref = (node: Konva.Node | null) => registerNode(el.id, node);

  switch (el.type) {
    case 'rect':
      return <Rect ref={ref as any} {...commonProps} />;
    case 'circle':
      return <Circle ref={ref as any} {...commonProps} radius={(el.width || 100) / 2} />;
    case 'image':
      return <URLImage ref={ref as any} image={el} {...commonProps} />;
    case 'text': {
      // Konva has no separate fontWeight: it must be combined into fontStyle
      // (e.g. "bold", "italic", "bold italic"), otherwise bold text won't
      // render in the canvas preview.
      const konvaFontStyle =
        [el.fontWeight === 'bold' ? 'bold' : '', el.fontStyle === 'italic' ? 'italic' : '']
          .filter(Boolean)
          .join(' ') || 'normal';
      return (
        <Text
          ref={ref as any}
          {...commonProps}
          text={el.text}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily}
          fontStyle={konvaFontStyle}
          align={el.textAlign || 'left'}
          letterSpacing={el.letterSpacing || 0}
          lineHeight={el.lineHeight || 1.2}
          onDblClick={() => onEditText(el.id)}
        />
      );
    }
    case 'isiScroll':
      return (
        <ISIScroll
          ref={ref as any}
          id={el.id}
          x={el.x}
          y={el.y}
          width={el.width || 300}
          height={el.height || 200}
          draggable={!el.locked && !isPlaying}
          isAnimating={isPlaying}
          isiText={el.isiText || ''}
          isiScrollSpeed={el.isiScrollSpeed}
          fontSize={el.fontSize}
          fill={el.fill}
          hideText={!isPlaying}
          isiLogoSrc={el.isiLogoSrc}
          isiLogoWidth={el.isiLogoWidth}
          isiLogoPosition={el.isiLogoPosition}
          isiPadding={el.isiPadding}
          isiBackgroundColor={el.isiBackgroundColor}
          isiScrollbarColor={el.isiScrollbarColor}
          isiScrollbarTrackColor={el.isiScrollbarTrackColor}
          isiScrollbarMarginTop={el.isiScrollbarMarginTop}
          isiScrollbarMarginRight={el.isiScrollbarMarginRight}
          isiScrollbarPadding={el.isiScrollbarPadding}
          isiScrollbarHeight={el.isiScrollbarHeight}
          isiScrollbarWidth={el.isiScrollbarWidth}
          isiHeaderText={el.isiHeaderText}
          isiHeaderLink={el.isiHeaderLink}
          isiHeaderColor={el.isiHeaderColor}
          isiHeaderBackground={el.isiHeaderBackground}
          isiHeaderHeight={el.isiHeaderHeight}
          isiLineHeight={el.isiLineHeight}
          isiLetterSpacing={el.isiLetterSpacing}
          isiFontFamily={el.isiFontFamily}
          isiFontWeight={el.isiFontWeight}
          isiFontStyle={el.isiFontStyle}
          onClick={() => onSelect(el.id)}
          onDblClick={() => onEditISI(el.id)}
          onDragEnd={onDragEnd}
        />
      );
    case 'shape':
      return (
        <Path
          ref={ref as any}
          {...commonProps}
          data={el.path || ''}
          scaleX={(el.width || 50) / 24}
          scaleY={(el.height || 50) / 24}
        />
      );
    default:
      return null;
  }
});

interface BoardStageProps {
  board: Artboard;
  isActive: boolean;
  registerStage?: (id: string, stage: Konva.Stage | null) => void;
}

/**
 * A fully interactive editing surface for one artboard. Used both for the
 * focused single-size view and for each tile of the multi-size view, so every
 * banner size can be edited without switching away from the others.
 */
const BoardStage: React.FC<BoardStageProps> = ({ board, isActive, registerStage }) => {
  const {
    selectedId,
    updateElement,
    selectElement,
    totalDuration,
    isPlaying,
    playheadTime,
    canvasBackground,
    canvasBackgroundImage,
    setActiveArtboard,
  } = useDesignStore();

  const trRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const [guides, setGuides] = useState<{ x?: number, y?: number }[]>([]);
  const [editingText, setEditingText] = useState<{ id: string; value: string } | null>(null);
  const [editingISI, setEditingISI] = useState<{ id: string; header: string; html: string } | null>(null);

  const elements = board.elements;

  const registerNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  // Clicking anywhere on a non-focused board makes it the active editing target.
  const activate = useCallback(() => {
    if (!isActive) setActiveArtboard(board.id);
  }, [isActive, board.id, setActiveArtboard]);

  const getLineGuideStops = useCallback((skipShapeId: string) => {
    const vertical = [0, board.width / 2, board.width];
    const horizontal = [0, board.height / 2, board.height];
    elements.forEach((el) => {
      if (el.id === skipShapeId) return;
      vertical.push(el.x, el.x + (el.width || 0) / 2, el.x + (el.width || 0));
      horizontal.push(el.y, el.y + (el.height || 0) / 2, el.y + (el.height || 0));
    });
    return {
      vertical: Array.from(new Set(vertical)),
      horizontal: Array.from(new Set(horizontal)),
    };
  }, [elements, board.width, board.height]);

  const getObjectSnappingEdges = (node: Konva.Node) => {
    const box = node.getClientRect();
    return {
      vertical: [
        { guide: box.x, offset: box.x - node.x(), snap: 'start' },
        { guide: box.x + box.width / 2, offset: (box.x + box.width / 2) - node.x(), snap: 'center' },
        { guide: box.x + box.width, offset: (box.x + box.width) - node.x(), snap: 'end' },
      ],
      horizontal: [
        { guide: box.y, offset: box.y - node.y(), snap: 'start' },
        { guide: box.y + box.height / 2, offset: (box.y + box.height / 2) - node.y(), snap: 'center' },
        { guide: box.y + box.height, offset: (box.y + box.height) - node.y(), snap: 'end' },
      ],
    };
  };

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const lineGuideStops = getLineGuideStops(e.target.id());
    const itemBounds = getObjectSnappingEdges(e.target);
    const resultGuides: { x?: number, y?: number }[] = [];

    itemBounds.vertical.forEach((itemBound) => {
      lineGuideStops.vertical.forEach((guide) => {
        if (Math.abs(guide - itemBound.guide) < GUIDELINE_OFFSET) {
          resultGuides.push({ x: guide });
          e.target.x(guide - itemBound.offset);
        }
      });
    });
    itemBounds.horizontal.forEach((itemBound) => {
      lineGuideStops.horizontal.forEach((guide) => {
        if (Math.abs(guide - itemBound.guide) < GUIDELINE_OFFSET) {
          resultGuides.push({ y: guide });
          e.target.y(guide - itemBound.offset);
        }
      });
    });
    setGuides(resultGuides);
  }, [getLineGuideStops]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setGuides([]);
    updateElement(e.target.id(), { x: e.target.x(), y: e.target.y() });
  }, [updateElement]);

  const handleTransformEnd = useCallback((e: any) => {
    const node = e.target;
    updateElement(node.id(), {
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
    });
    node.scaleX(1);
    node.scaleY(1);
  }, [updateElement]);

  // Build this board's animation timeline and seek it with the shared playhead,
  // so previews animate on every visible size during playback.
  useLayoutEffect(() => {
    if (masterRef.current) masterRef.current.kill();
    masterRef.current = buildMasterTimeline(
      nodeRefs.current,
      elements,
      totalDuration,
      false,
    );
    masterRef.current.seek(playheadTime, false);
    return () => {
      masterRef.current?.kill();
      masterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playheadTime intentionally excluded: it only seeks, and rebuilding each tick is wasteful.
  }, [elements, totalDuration, board.width, board.height]);

  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.seek(playheadTime, false);
    }
  }, [playheadTime]);

  // Transformer selection — only the active board shows selection handles, so
  // picking a component in the multi-size view never highlights other sizes.
  useEffect(() => {
    if (!trRef.current) return;
    if (!isActive) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
      return;
    }
    const node = trRef.current.getStage()?.findOne('#' + selectedId);
    if (selectedId && node) {
      trRef.current.nodes([node]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, elements, isActive]);

  // Keyboard nudging — only the active board handles it (others are mounted too).
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!selectedId || isPlaying) return;
      const el = elements.find((el) => el.id === selectedId);
      if (!el || el.locked) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') { updateElement(selectedId, { y: (el.y || 0) - step }); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { updateElement(selectedId, { y: (el.y || 0) + step }); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { updateElement(selectedId, { x: (el.x || 0) - step }); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { updateElement(selectedId, { x: (el.x || 0) + step }); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedId, elements, updateElement, isPlaying]);

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    activate();
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'canvas-bg';
    if (clickedOnEmpty) selectElement(null);
  };

  // Hand cursor over elements, default arrow over the empty canvas.
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const onEmpty = e.target === stage || e.target.name() === 'canvas-bg';
    stage.container().style.cursor = onEmpty ? 'default' : 'pointer';
  };

  const handleStageMouseLeave = () => {
    const container = stageRef.current?.container();
    if (container) container.style.cursor = 'default';
  };

  // Inline text editing (double-click a text element on canvas).
  const startEditText = useCallback((id: string) => {
    if (!isActive || isPlaying) return;
    const el = elements.find((e) => e.id === id);
    if (!el || el.locked) return;
    setEditingText({ id, value: el.text || '' });
  }, [isActive, isPlaying, elements]);

  const commitText = () => {
    if (editingText) {
      updateElement(editingText.id, { text: editingText.value });
    }
    setEditingText(null);
  };

  // On-canvas ISI editor (double-click the ISI tray).
  const startEditISI = useCallback((id: string) => {
    if (!isActive || isPlaying) return;
    const el = elements.find((e) => e.id === id);
    if (!el || el.locked) return;
    setEditingISI({ id, header: el.isiHeaderText || '', html: el.isiText || '' });
  }, [isActive, isPlaying, elements]);

  const commitISI = () => {
    if (editingISI) {
      updateElement(editingISI.id, { isiText: editingISI.html, isiHeaderText: editingISI.header });
    }
    setEditingISI(null);
  };

  const editingElement = editingText ? elements.find((e) => e.id === editingText.id) : null;

  return (
    <div
      className={`relative bg-white overflow-hidden transition-shadow ${isActive ? 'ring-2 ring-red-500 shadow-xl' : 'shadow-md ring-1 ring-black/10 hover:ring-red-400/60'
        }`}
      style={{ width: board.width, height: board.height }}
    >
      <Stage
        ref={(stage) => {
          stageRef.current = stage;
          registerStage?.(board.id, stage ?? null);
        }}
        width={board.width}
        height={board.height}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
      >
        <Layer>
          <Rect
            name="canvas-bg"
            width={board.width}
            height={board.height}
            fill={canvasBackground}
            onClick={() => selectElement(null)}
            onTap={() => selectElement(null)}
          />
          {canvasBackgroundImage && (
            <BackgroundImage src={canvasBackgroundImage} width={board.width} height={board.height} />
          )}

          {elements.map((el) => (
            <ElementShape
              key={el.id}
              el={el}
              isPlaying={isPlaying}
              registerNode={registerNode}
              onSelect={(id) => { activate(); selectElement(id); }}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
              onEditText={startEditText}
              onEditISI={startEditISI}
            />
          ))}

          {guides.map((guide, i) => (
            <Line
              key={i}
              points={guide.x !== undefined ? [guide.x, 0, guide.x, board.height] : [0, guide.y!, board.width, guide.y!]}
              stroke="rgb(0, 161, 255)"
              strokeWidth={1}
              dash={[4, 6]}
            />
          ))}

          {isActive && selectedId && <Transformer ref={trRef} keepRatio={true} />}
        </Layer>
      </Stage>

      {!isPlaying && elements.some((el) => el.type === 'isiScroll') && (
        elements.filter((el) => el.type === 'isiScroll').map((el) => (
          <ISIOverlay key={el.id} element={el} isActive={true} />
        ))
      )}

      {/* Inline text editor overlay (matches the element's text style) */}
      {editingElement && (
        <textarea
          value={editingText!.value}
          autoFocus
          onChange={(e) => setEditingText({ id: editingElement.id, value: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setEditingText(null);
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          style={{
            position: 'absolute',
            left: editingElement.x,
            top: editingElement.y,
            width: editingElement.width || 300,
            height: editingElement.height || 60,
            fontSize: editingElement.fontSize || 24,
            fontFamily: editingElement.fontFamily || 'Arial, sans-serif',
            fontWeight: editingElement.fontWeight || 'normal',
            fontStyle: editingElement.fontStyle || 'normal',
            textDecoration: editingElement.textDecoration || 'none',
            textAlign: editingElement.textAlign || 'left',
            lineHeight: editingElement.lineHeight || 1.2,
            letterSpacing: `${editingElement.letterSpacing || 0}px`,
            color: editorTextColor(editingElement.fill, canvasBackground),
            background: canvasBackground || '#ffffff',
            border: '1px dashed #ef4444',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            zIndex: 200,
            cursor: 'text',
          }}
        />
      )}

      {/* On-canvas ISI rich-content editor — rendered via a portal so the banner's
          overflow-hidden wrapper can't clip or misposition it */}
      {editingISI && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60" onClick={commitISI}>
          <div className="bg-[#15151c] border border-[#2a2a35] rounded-xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#232330]">
              <div>
                <h3 className="font-semibold text-gray-50 text-sm">Edit ISI content</h3>
                <p className="text-xs text-gray-400 mt-0.5">Rich HTML — double-click the ISI tray on canvas to reopen</p>
              </div>
              <button onClick={commitISI} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">Header text (patient link strip)</label>
                <input
                  type="text"
                  value={editingISI.header}
                  onChange={(e) => setEditingISI({ ...editingISI, header: e.target.value })}
                  className="w-full border border-[#2a2a35] rounded px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none bg-[#1a1a21] text-gray-100"
                  placeholder="e.g. Prescribing Information & Important Safety Information"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">ISI body HTML</label>
                <textarea
                  value={editingISI.html}
                  onChange={(e) => setEditingISI({ ...editingISI, html: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      commitISI();
                    }
                  }}
                  className="w-full border border-[#2a2a35] rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:outline-none resize-y bg-[#1a1a21] transition-all font-mono min-h-[280px] text-gray-100"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#232330]">
              <button onClick={commitISI} className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700">
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export const DesignCanvas: React.FC = () => {
  const {
    elements,
    artboards,
    activeArtboardId,
    setMultiArtboardView,
    multiArtboardView,
    selectElement,
    canvasWidth,
    canvasHeight,
    totalDuration,
    loop,
    canvasBackground,
    canvasBackgroundImage,
  } = useDesignStore();

  // Live stage instances by artboard id — lets exports grab the focused board's stage.
  const stageRegistry = useRef<Map<string, Konva.Stage>>(new Map());
  const registerStage = useCallback((id: string, stage: Konva.Stage | null) => {
    if (stage) stageRegistry.current.set(id, stage);
    else stageRegistry.current.delete(id);
  }, []);

  const activeBoard = artboards.find((a) => a.id === activeArtboardId) ?? artboards[0];

  // Export PNG (focused size).
  useEffect(() => {
    const handleExport = () => {
      const stage = stageRegistry.current.get(activeArtboardId);
      if (stage) {
        selectElement(null);
        setTimeout(() => {
          const dataURL = stage.toDataURL({ pixelRatio: 2 });
          const link = document.createElement('a');
          link.download = `banner-${canvasWidth}x${canvasHeight}.png`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 0);
      }
    };
    window.addEventListener('export-canvas', handleExport);
    return () => window.removeEventListener('export-canvas', handleExport);
  }, [selectElement, activeArtboardId, canvasWidth, canvasHeight]);

  // Export HTML package in traditional banner format with CSS classes and setTimeout timeline.
  useEffect(() => {
    const handleExportHTML = async () => {
      const zip = new JSZip();
      const imgFolder = zip.folder('images');
      const cssFolder = zip.folder('css');
      const jsFolder = zip.folder('js');

      const cssLines: string[] = [
        '* { box-sizing: border-box; margin: 0; padding: 0; }',
        'body { margin: 0; padding: 0; background: #f0f0f0; font-family: Arial, Helvetica, sans-serif; }',
        '#banner { position: relative; width: ' + canvasWidth + 'px; height: ' + canvasHeight + 'px; background: ' + canvasBackground + '; overflow: hidden; }',
        // ISI styles
        '.isi-main { position: absolute; overflow: hidden; }',
        '.isi-main * { pointer-events: all; }',
        '.patient_link p { font-size: 10px; padding: 3px 5px 5px 11px; background-color: #E8FFF9; font-family: Arial, Helvetica, sans-serif; font-weight: bold; margin: 5px 0 10px 0; }',
        '.patient_link a { color: #000000; text-decoration: underline; text-underline-offset: 1px; font-weight: bold; }',
        '.isi_wrapper { background-color: #fff; display: block; overflow: hidden; padding-right: 10px; position: relative; }',
        '.isi { padding-left: 10px; padding-bottom: 10px; padding-right: 4px; }',
        '.isi h2 { font-weight: 700; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 14px; color: #006937; margin: 0; }',
        '.isi p { font-size: 12px; font-family: Arial, Helvetica, sans-serif; line-height: 14px; margin: 0 0 6px 0; color: #000; }',
        '.isi ul { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 14px; padding-left: 11px; color: #000; margin-top: 0; margin-bottom: 4px; }',
        '.isi ul li { list-style: none; text-indent: -2px; margin-left: -3px; margin-bottom: 4px; }',
        '.isi ul li::before { content: "\\2022"; display: inline-block; font-weight: 700; font-size: 12px; line-height: 13px; left: -4px; color: #61AE99; vertical-align: top; }',
        '.isi a { color: #000000; text-decoration: underline; }',
        '.isi .isi-logo { position: relative; width: 187px; height: auto; bottom: 0; left: 0; }',
        '.isi .mb-0 { margin-bottom: 0; }',
        '.isi .mb-2 { margin-bottom: 2px !important; }',
        '.isi .mb-7 { margin-bottom: 7px !important; }',
        '.isi .mb-10 { margin-bottom: 10px !important; }',
        '.isi .mb-10-title { margin-bottom: 4px !important; }',
        '.isi .mt-5 { margin-top: 5px; }',
        '.iScrollVerticalScrollbar { background-color: #006937; border-radius: 5px; border-top: 1px solid #006937; border-bottom: 1px solid #006937; top: 0px !important; right: 3px !important; height: 66% !important; width: 8px !important; position: absolute; z-index: 9999; overflow: visible !important; margin-top: 5px; padding: 0px; }',
        '.iScrollIndicator { border-radius: 5px; width: 6px !important; height: 13px !important; margin-top: 0px !important; right: 1px !important; position: absolute; background: #f2f2f2; cursor: pointer; display: block !important; }',
      ];

      const htmlBodyParts: string[] = [];
      const timelineEvents: string[] = [];
      const imagePromises: Promise<void>[] = [];

      const htmlParts: string[] = [
        '<!DOCTYPE html>',
        '<html class="no-js" lang="en">',
        '',
        '<head>',
        '  <meta charset="utf-8" />',
        '  <meta http-equiv="X-UA-Compatible" content="IE=edge" />',
        '  <meta name="format-detection" content="telephone=no" />',
        '  <title>' + canvasWidth + 'x' + canvasHeight + '</title>',
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
        '  <link rel="stylesheet" href="css/styles.css" />',
        '  <meta name="ad.size" content="width=' + canvasWidth + ',height=' + canvasHeight + '" />',
        '  <script type="text/javascript">',
        '    var clickTag1 = "' + canvasBackground + '";',
        '    var clickTag2 = "#";',
        '    var clickTag3 = "#";',
        '  </script>',
        '  <script src="js/main.js"></script>',
        '</head>',
        '',
        '<body>',
        '  <div id="banner">',
      ];

      if (canvasBackgroundImage) {
        const bgImgName = 'bg.png';
        htmlParts.push('    <div style="position:absolute; inset:0; background-image:url(\'images/' + bgImgName + '\'); background-size:cover; z-index: 0;"></div>');
        if (canvasBackgroundImage.startsWith('data:')) {
          imgFolder?.file(bgImgName, canvasBackgroundImage.split(',')[1], { base64: true });
        } else {
          imagePromises.push(
            (async () => {
              try {
                const blob = await (await fetch(canvasBackgroundImage)).blob();
                imgFolder?.file(bgImgName, blob);
              } catch { /* ignore */ }
            })()
          );
        }
      }

      if (canvasBackgroundImage) {
        const bgImgName = 'bg.png';
        htmlParts.push('          <div style="position:absolute; inset:0; background-image:url(\'images/' + bgImgName + '\'); background-size:cover;"></div>');
        if (canvasBackgroundImage.startsWith('data:')) {
          imgFolder?.file(bgImgName, canvasBackgroundImage.split(',')[1], { base64: true });
        } else {
          try {
            const blob = await (await fetch(canvasBackgroundImage)).blob();
            imgFolder?.file(bgImgName, blob);
          } catch { /* ignore */ }
        }
      }

      elements.forEach((el, index) => {
        const id = 'el-' + el.id;
        const base = getElementBaseState(el);
        const z = index;

        if (el.type === 'isiScroll') {
          const fontCol = el.fill || '#000000';
          const bgCol = el.isiBackgroundColor || '#ffffff';
          const scrollCol = el.isiScrollbarColor || '#006937';
          const indicatorCol = el.isiScrollbarTrackColor || '#f2f2f2';
          const headerBg = el.isiHeaderBackground || '#E8FFF9';
          const headerCol = el.isiHeaderColor || '#000000';
          const headerHeight = el.isiHeaderText ? (el.isiHeaderHeight || 20) : 0;
          const bodyHeight = Math.max(0, (el.height || 200) - headerHeight);
          const logoWidth = el.isiLogoWidth || 187;
          cssLines.push(
            '#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; background: ' + bgCol + '; color: ' + fontCol + '; font-size: ' + (el.fontSize || 12) + 'px; font-family: ' + (el.isiFontFamily || 'Arial, Helvetica, sans-serif') + '; font-weight: ' + (el.isiFontWeight || 'normal') + '; font-style: ' + (el.isiFontStyle || 'normal') + '; line-height: ' + (el.isiLineHeight || 1.4) + '; letter-spacing: ' + (el.isiLetterSpacing || 0) + 'px; border: ' + (el.isiBorderWidth || 0) + 'px solid ' + (el.isiBorderColor || 'transparent') + '; }',
            '#' + id + ' .patient_link p { background-color: ' + headerBg + '; }',
            '#' + id + ' .patient_link a { color: ' + headerCol + '; }',
            '#' + id + ' .isi_wrapper { height: ' + bodyHeight + 'px; }',
            '#' + id + ' .iScrollVerticalScrollbar { background-color: ' + scrollCol + '; border-top: 1px solid ' + scrollCol + '; border-bottom: 1px solid ' + scrollCol + '; right: ' + (el.isiScrollbarMarginRight ?? 3) + 'px !important; width: ' + (el.isiScrollbarWidth ?? 8) + 'px !important; height: ' + (el.isiScrollbarHeight ?? 66) + '% !important; margin-top: ' + (el.isiScrollbarMarginTop ?? 5) + 'px !important; padding: ' + (el.isiScrollbarPadding ?? 0) + 'px !important; }',
            '#' + id + ' .iScrollIndicator { background: ' + indicatorCol + '; }',
            '#' + id + ' .isi .isi-logo { width: ' + logoWidth + 'px; }',
          );
          let inner = '';
          if (el.isiLogoSrc && (el.isiLogoPosition || 'bottom') === 'top') {
            inner += '<img src="' + el.isiLogoSrc + '" style="width: ' + logoWidth + 'px; height: auto; display:block; margin-bottom:10px;">';
          }
          inner += '<div>' + (el.isiText || '') + '</div>';
          if (el.isiLogoSrc && (el.isiLogoPosition || 'bottom') !== 'top') {
            inner += '<img class="mb-10 isi-logo" src="' + el.isiLogoSrc + '" style="width: ' + logoWidth + 'px; height: auto;">';
          }
          const headerMarkup = el.isiHeaderText
            ? '        <div class="patient_link">\n          <p style="font-size:10px;padding: 3px 5px 5px 11px;background-color: ' + headerBg + ';font-family: Arial, Helvetica, sans-serif;font-weight: bold;margin: 5px 0 10px 0;">\n            <a href="' + (el.isiHeaderLink || '#') + '" target="_blank" style="color:' + headerCol + ';text-decoration:underline;text-underline-offset: 1px;font-weight:bold;">' + (el.isiHeaderText) + '</a>\n          </p>\n        </div>'
            : '';
          const isiElemId = 'isi-content-' + el.id;
          const isiIndicatorId = 'isi-indicator-' + el.id;

          // ISI scroll animation via setTimeout + requestAnimationFrame
          timelineEvents.push(
            '      { time: 0, action: () => {\n' +
            '        const content = document.getElementById("' + isiElemId + '");\n' +
            '        const indicator = document.getElementById("' + isiIndicatorId + '");\n' +
            '        if (content && content.parentElement) {\n' +
            '          const parent = content.parentElement;\n' +
            '          const maxScroll = content.scrollHeight - parent.clientHeight;\n' +
            '          if (maxScroll > 0) {\n' +
            '            const track = parent.querySelector(".iScrollVerticalScrollbar");\n' +
            '            const duration = maxScroll / ' + (el.isiScrollSpeed || 30) + ';\n' +
            '            let start = null;\n' +
            '            const animate = (timestamp) => {\n' +
            '              if (!start) start = timestamp;\n' +
            '              const elapsed = (timestamp - start) / 1000;\n' +
            '              const progress = Math.min(elapsed / duration, 1);\n' +
            '              content.style.transform = "translateY(" + (-maxScroll * progress) + "px)";\n' +
            '              if (indicator && track) {\n' +
            '                const indicatorY = progress * (track.clientHeight - (indicator.clientHeight || 13));\n' +
            '                indicator.style.transform = "translateY(" + indicatorY + "px)";\n' +
            '              }\n' +
            '              if (progress < 1) requestAnimationFrame(animate);\n' +
            '            };\n' +
            '            requestAnimationFrame(animate);\n' +
            '          }\n' +
            '        }\n' +
            '      } },'
          );

          htmlBodyParts.push(
            '          <div id="' + id + '" class="isi-main">',
            headerMarkup,
            '          <div class="isi_wrapper">',
            '            <div class="isi" id="' + isiElemId + '">' + inner + '</div>',
            '            <div class="iScrollVerticalScrollbar" style="overflow: hidden;"><div class="iScrollIndicator" id="' + isiIndicatorId + '"></div></div>',
            '          </div>',
            '          </div>',
          );
          return;
        }

        if (el.type === 'rect') {
          htmlBodyParts.push('          <div id="' + id + '" class="element"></div>');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; background: ' + (el.fill) + '; border-radius: ' + (el.cornerRadius || 0) + 'px; ' + (el.stroke ? 'border: ' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';' : '') + ' }');
        } else if (el.type === 'circle') {
          htmlBodyParts.push('          <div id="' + id + '" class="element"></div>');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 100) + 'px; height: ' + (el.width || 100) + 'px; z-index: ' + z + '; background: ' + (el.fill) + '; border-radius: 50%; ' + (el.stroke ? 'border: ' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';' : '') + ' }');
        } else if (el.type === 'text') {
          htmlBodyParts.push('          <div id="' + id + '" class="element">' + (el.text || '') + '</div>');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 60) + 'px; z-index: ' + z + '; color: ' + (el.fill) + '; font-size: ' + (el.fontSize || 12) + 'px; font-family: ' + (el.fontFamily || 'Arial, sans-serif') + '; font-weight: ' + (el.fontWeight || 'normal') + '; font-style: ' + (el.fontStyle || 'normal') + '; text-decoration: ' + (el.textDecoration || 'none') + '; text-align: ' + (el.textAlign || 'left') + '; white-space: pre-wrap; line-height: ' + (el.lineHeight || 1.2) + '; letter-spacing: ' + (el.letterSpacing || 0) + 'px; overflow: hidden; }');
        } else if (el.type === 'image' && el.src) {
          const imgName = 'image-' + el.id + '.png';
          if (el.src.startsWith('data:')) {
            imgFolder?.file(imgName, el.src.split(',')[1], { base64: true });
          } else {
            imagePromises.push(
              fetch(el.src).then((res) => res.blob()).then((blob) => {
                imgFolder?.file(imgName, blob);
              }).catch(() => {}),
            );
          }
          htmlBodyParts.push('          <img id="' + id + '" class="element" src="images/' + imgName + '" style="width: ' + (el.width || 200) + 'px; height: ' + (el.height || 150) + 'px;">');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 200) + 'px; height: ' + (el.height || 150) + 'px; z-index: ' + z + '; }');
        } else if (el.type === 'video' && el.src) {
          const videoName = 'video-' + el.id + '.mp4';
          if (el.src.startsWith('data:')) {
            imgFolder?.file(videoName, el.src.split(',')[1], { base64: true });
          } else {
            imagePromises.push(
              fetch(el.src).then((res) => res.blob()).then((blob) => {
                imgFolder?.file(videoName, blob);
              }).catch(() => {}),
            );
          }
          htmlBodyParts.push('          <video id="' + id + '" class="element" src="images/' + videoName + '" style="width: ' + (el.width || 320) + 'px; height: ' + (el.height || 180) + 'px;" muted playsinline></video>');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 320) + 'px; height: ' + (el.height || 180) + 'px; z-index: ' + z + '; }');
          // Auto-play video on load
          timelineEvents.push(
            '      { time: 0, action: () => {\n' +
            '        var v = document.getElementById("' + id + '");\n' +
            '        if (v) v.play().catch(() => {});\n' +
            '      } },'
          );
        } else if (el.type === 'shape' && el.path) {
          htmlBodyParts.push(
            '          <div id="' + id + '" class="element">',
            '            <svg width="100%" height="100%" viewBox="0 0 24 24" preserveAspectRatio="none"><path d="' + el.path + '" fill="' + (el.fill || '#000000') + '" /></svg>',
            '          </div>',
          );
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 50) + 'px; height: ' + (el.height || 50) + 'px; z-index: ' + z + '; }');
        } else if (el.type === 'html' && el.htmlContent) {
          htmlBodyParts.push('          <div id="' + id + '" class="element">' + el.htmlContent + '</div>');
          cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; overflow: hidden; }');
        } else {
          return;
        }

        // Convert keyframes to CSS animation + setTimeout timeline event
        const kfs = getElementKeyframes(el, totalDuration);
        const loopAnim = el.anim?.loop === true || el.animationLoop === true;

        if (kfs.length > 0) {
          const animName = 'anim-' + id;
          cssLines.push('@keyframes ' + animName + ' {');
          kfs.forEach((k) => {
            const pct = (k.time / totalDuration * 100).toFixed(2);
            const parts: string[] = [];
            parts.push('opacity: ' + (k.opacity !== undefined ? k.opacity / 100 : base.opacity / 100) + ';');
            const x = k.x !== undefined ? k.x - el.x : 0;
            const y = k.y !== undefined ? k.y - el.y : 0;
            let transformStr = 'translate(' + x + 'px, ' + y + 'px)';
            if (k.rotation !== undefined) transformStr += ' rotate(' + k.rotation + 'deg)';
            if (k.scaleX !== undefined) transformStr += ' scaleX(' + k.scaleX + ')';
            if (k.scaleY !== undefined) transformStr += ' scaleY(' + k.scaleY + ')';
            transformStr += '';
            parts.push('transform: ' + transformStr + ';');
            if (k.letterSpacing !== undefined) parts.push('letter-spacing: ' + k.letterSpacing + 'px;');
            cssLines.push('  ' + pct + '% { ' + parts.join(' ') + ' }');
          });
          cssLines.push('}');

          // Add initial state via JS and timeline event to start animation
          const delayMs = Math.round((kfs[0].time || 0) * 1000);
          const fullDurationMs = Math.round(totalDuration * 1000);
          const repeatStr = loopAnim ? ' infinite' : '';
          timelineEvents.push(
            '      { time: ' + delayMs + ', action: () => {\n' +
            '        var el = document.getElementById("' + id + '");\n' +
            '        if (el) {\n' +
            '          el.style.animation: ' + fullDurationMs + 'ms linear' + repeatStr + ' ' + animName + ';\n' +
            '          el.style.animationFillMode = "forwards";\n' +
            '        }\n' +
            '      } },'
          );
        }
      });

      await Promise.all(imagePromises);

      // Close HTML body parts
      const htmlContent = [
        ...htmlParts,
        ...htmlBodyParts,
        '  </div>',
        '',
        '</body>',
        '',
        '</html>',
      ].join('\n');

      // Build JS file
      const jsLines: string[] = [];
      jsLines.push('// Banner animation timeline');
      jsLines.push('var clickTag1 = "' + canvasBackground + '";');
      jsLines.push('var clickTag2 = "#";');
      jsLines.push('var clickTag3 = "#";');
      jsLines.push('');
      jsLines.push('var animationTimeline = [');
      jsLines.push(...timelineEvents);
      jsLines.push('];');
      jsLines.push('');
      jsLines.push('window.onload = function() {');
      jsLines.push('  animationTimeline.forEach(function(event) {');
      jsLines.push('    setTimeout(event.action, event.time);');
      jsLines.push('  });');
      jsLines.push('};');

      cssFolder?.file('styles.css', cssLines.join('\n'));
      jsFolder?.file('main.js', jsLines.join('\n'));
      zip.file('index.html', htmlContent);

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'banner-package-' + canvasWidth + 'x' + canvasHeight + '.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    window.addEventListener('export-html', handleExportHTML);
    return () => window.removeEventListener('export-html', handleExportHTML);
  }, [elements, canvasWidth, canvasHeight, loop, totalDuration, canvasBackground, canvasBackgroundImage]);

  const segBtn = (active: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
      active ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div className="flex-1 bg-gray-100 flex flex-col items-center justify-start overflow-auto p-8 pt-16 relative">
      {/* View mode toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-[#15151c] border border-[#2a2a35] rounded-lg p-1 shadow-lg">
        <button
          onClick={() => setMultiArtboardView(false)}
          className={segBtn(!multiArtboardView)}
          title="Edit one size at a time"
        >
          <Square size={12} /> Single
        </button>
        <button
          onClick={() => setMultiArtboardView(true)}
          className={segBtn(multiArtboardView)}
          title="Show and edit all sizes together"
        >
          <LayoutGrid size={12} /> All sizes ({artboards.length})
        </button>
      </div>

      {multiArtboardView ? (
        /* Multi-size view — every artboard live & editable side by side */
        <div className="w-full min-h-full flex flex-wrap items-start justify-center gap-x-8 gap-y-10">
          {artboards.map((ab) => (
            <div
              key={ab.id}
              className={`rounded-xl border p-2 ${activeArtboardId === ab.id ? 'border-red-500 bg-red-500/5' : 'border-[#2a2a35] bg-[#15151c]'}`}
            >
              <div className="flex items-center justify-between gap-3 px-1 pb-2">
                <span className="text-[11px] font-semibold text-gray-100">{ab.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono">{ab.width}×{ab.height}</span>
                  {activeArtboardId === ab.id ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold tracking-wide">EDITING</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">click to edit</span>
                  )}
                </span>
              </div>
              <BoardStage
                board={ab}
                isActive={activeArtboardId === ab.id}
                registerStage={registerStage}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Focused single-size view */
        activeBoard && (
          <div className="m-auto">
            <BoardStage
              board={activeBoard}
              isActive={true}
              registerStage={registerStage}
            />
          </div>
        )
      )}
    </div>
  );
};
