import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Stage, Layer, Rect, Circle, Line, Text, Transformer, Image as KonvaImage, Path, Group,
} from 'react-konva';
import { useDesignStore, type Artboard, type DesignElement } from '../../store/designStore';
import { LayoutGrid, Square, Maximize, Minimize, Grid, Ruler } from 'lucide-react';
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
  onSelect: (id: string, e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
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
    selectedIds,
    updateElement,
    selectElement,
    selectElements,
    addElement,
    duplicateElement,
    removeElement,
    removeElements,
    reorderElement,
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [snapToGrid] = useState(false);
  const [gridSize] = useState(20);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [manualGuides] = useState<Array<{ x?: number; y?: number }>>([]);
  const [showSafeZone, setShowSafeZone] = useState(false);

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

  // Enhanced snapping with grid and manual guides
  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const lineGuideStops = getLineGuideStops(e.target.id());
    const itemBounds = getObjectSnappingEdges(e.target);
    const resultGuides: { x?: number, y?: number }[] = [];

    // Smart guides (other elements)
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

    // Manual guides
    manualGuides.forEach((guide) => {
      const gx = guide.x;
      const gy = guide.y;
      if (gx !== undefined) {
        itemBounds.vertical.forEach((itemBound) => {
          if (Math.abs(gx - itemBound.guide) < GUIDELINE_OFFSET) {
            resultGuides.push({ x: gx });
            e.target.x(gx - itemBound.offset);
          }
        });
      }
      if (gy !== undefined) {
        itemBounds.horizontal.forEach((itemBound) => {
          if (Math.abs(gy - itemBound.guide) < GUIDELINE_OFFSET) {
            resultGuides.push({ y: gy });
            e.target.y(gy - itemBound.offset);
          }
        });
      }
    });

    // Grid snap
    if (snapToGrid) {
      const snappedX = Math.round(e.target.x() / gridSize) * gridSize;
      const snappedY = Math.round(e.target.y() / gridSize) * gridSize;
      if (Math.abs(snappedX - e.target.x()) < GUIDELINE_OFFSET) {
        resultGuides.push({ x: snappedX });
        e.target.x(snappedX);
      }
      if (Math.abs(snappedY - e.target.y()) < GUIDELINE_OFFSET) {
        resultGuides.push({ y: snappedY });
        e.target.y(snappedY);
      }
    }

    setGuides(resultGuides);
  }, [getLineGuideStops, manualGuides, snapToGrid, gridSize]);

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

  // Zoom/pan handlers
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const pos = stage.position();
    const mousePointTo = {
      x: (pointer.x - pos.x) / oldScale,
      y: (pointer.y - pos.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    stage.scale({ x: clampedScale, y: clampedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    stage.position(newPos);
    setZoom(clampedScale);
    setPan(newPos);
  }, []);

  

  const handleStageMouseUp = useCallback(() => {
    const container = stageRef.current?.container();
    if (container) container.style.cursor = 'default';
  }, []);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (pointer) {
      // Update cursor position for rulers
    }

    // Pan with middle mouse or Alt+drag
    if (e.evt.buttons === 4 || (e.evt.buttons === 1 && e.evt.altKey)) {
      e.evt.preventDefault();
      const pos = stage.position();
      const newPos = {
        x: pos.x + e.evt.movementX,
        y: pos.y + e.evt.movementY,
      };
      stage.position(newPos);
      setPan(newPos);
      const container = stageRef.current?.container();
      if (container) container.style.cursor = 'grabbing';
      return;
    }

    const onEmpty = e.target === stage || e.target.name() === 'canvas-bg';
    const container = stage.container();
    if (container) container.style.cursor = onEmpty ? 'default' : 'pointer';
  }, []);

  const handleStageMouseLeave = useCallback(() => {
    const container = stageRef.current?.container();
    if (container) container.style.cursor = 'default';
  }, []);

  // Selection box (marquee select)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    activate();
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'canvas-bg';
    if (clickedOnEmpty) {
      if (!e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
        selectElement(null);
      }
      // Start selection box
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (pointer) {
        setSelectionBox({ x1: pointer.x, y1: pointer.y, x2: pointer.x, y2: pointer.y });
      }
    }
  }, [activate, selectElement]);

  const handleStageDragMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox) return;
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (pointer) {
      setSelectionBox({ ...selectionBox, x2: pointer.x, y2: pointer.y });
    }
  }, [selectionBox]);

  const handleStageDragEnd = useCallback(() => {
    if (!selectionBox) return;
    const stage = stageRef.current;
    if (!stage) return;

    const x1 = Math.min(selectionBox.x1, selectionBox.x2);
    const y1 = Math.min(selectionBox.y1, selectionBox.y2);
    const x2 = Math.max(selectionBox.x1, selectionBox.x2);
    const y2 = Math.max(selectionBox.y1, selectionBox.y2);

    const selected: string[] = [];
    elements.forEach((el) => {
      const node = nodeRefs.current.get(el.id);
      if (node) {
        const box = node.getClientRect();
        if (box.x >= x1 && box.y >= y1 && box.x + box.width <= x2 && box.y + box.height <= y2) {
          selected.push(el.id);
        }
      }
    });

    if (selected.length > 0) {
      selectElements(selected);
    }
    setSelectionBox(null);
  }, [selectionBox, elements, selectElements]);

  const handleContextMenuAction = useCallback((action: string, elementId: string) => {
    switch (action) {
      case 'duplicate':
        duplicateElement(elementId);
        break;
      case 'delete':
        removeElement(elementId);
        break;
      case 'bring-front':
        reorderElement(elementId, 'top');
        break;
      case 'bring-forward':
        reorderElement(elementId, 'up');
        break;
      case 'send-back':
        reorderElement(elementId, 'bottom');
        break;
      case 'send-backward':
        reorderElement(elementId, 'down');
        break;
      case 'copy-style': {
        // Store style for paste
        const el = elements.find(e => e.id === elementId);
        if (el) {
          localStorage.setItem('copiedStyle', JSON.stringify({
            fill: el.fill,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            shadowBlur: el.shadowBlur,
            shadowColor: el.shadowColor,
            shadowOffsetX: el.shadowOffsetX,
            shadowOffsetY: el.shadowOffsetY,
            shadowOpacity: el.shadowOpacity,
            cornerRadius: el.cornerRadius,
            opacity: el.opacity,
          }));
        }
        break;
      }
      case 'paste-style': {
        try {
          const style = JSON.parse(localStorage.getItem('copiedStyle') || '{}');
          updateElement(elementId, style);
        } catch { /* ignore */ }
        break;
      }
      case 'flip-horizontal': {
        const el = elements.find(e => e.id === elementId);
        if (el) {
          const node = nodeRefs.current.get(elementId);
          if (node) {
            const centerX = node.x() + node.width() / 2;
            node.scaleX(-node.scaleX());
            node.x(centerX - node.width() * node.scaleX() / 2);
            handleTransformEnd({ target: node });
          }
        }
        break;
      }
      case 'flip-vertical': {
        const el = elements.find(e => e.id === elementId);
        if (el) {
          const node = nodeRefs.current.get(elementId);
          if (node) {
            const centerY = node.y() + node.height() / 2;
            node.scaleY(-node.scaleY());
              node.y(centerY - node.height() * node.scaleY() / 2);
              handleTransformEnd({ target: node });
            }
          }
        }
        break;
    }
  }, [elements, duplicateElement, removeElement, reorderElement, updateElement, handleTransformEnd, nodeRefs]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (isPlaying) return;

      const selected = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected.length > 0) {
          e.preventDefault();
          if (selected.length === 1) {
            removeElement(selected[0]);
          } else {
            removeElements(selected);
          }
        }
      }

      // Duplicate (Cmd+D)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        selected.forEach(id => duplicateElement(id));
      }

      // Copy (Cmd+C) - copy style
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (selected.length === 1) {
          const el = elements.find(e => e.id === selected[0]);
          if (el) {
            localStorage.setItem('copiedStyle', JSON.stringify({
              fill: el.fill,
              stroke: el.stroke,
              strokeWidth: el.strokeWidth,
              shadowBlur: el.shadowBlur,
              shadowColor: el.shadowColor,
              shadowOffsetX: el.shadowOffsetX,
              shadowOffsetY: el.shadowOffsetY,
              shadowOpacity: el.shadowOpacity,
              cornerRadius: el.cornerRadius,
              opacity: el.opacity,
            }));
          }
        }
      }

      // Paste style (Cmd+Shift+V)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        try {
          const style = JSON.parse(localStorage.getItem('copiedStyle') || '{}');
          selected.forEach(id => updateElement(id, style));
        } catch { /* ignore */ }
      }

      // Select all (Cmd+A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectElements(elements.map(e => e.id));
      }

      // Nudge with arrows
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        selected.forEach(id => {
          const el = elements.find(e => e.id === id);
          if (!el || el.locked) return;
          const updates: Partial<DesignElement> = {};
          if (e.key === 'ArrowUp') updates.y = (el.y || 0) - step;
          else if (e.key === 'ArrowDown') updates.y = (el.y || 0) + step;
          else if (e.key === 'ArrowLeft') updates.x = (el.x || 0) - step;
          else if (e.key === 'ArrowRight') updates.x = (el.x || 0) + step;
          updateElement(id, updates);
        });
      }

      // Tool shortcuts
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': // Select tool
            // Handled by toolbar
            break;
          case 'h': // Hand tool (pan)
            // Space+drag handled by mouse
            break;
          case 't': // Text tool
            addElement({
              id: `el-${Date.now()}`,
              type: 'text',
              x: board.width / 2,
              y: board.height / 2,
              width: 200,
              height: 60,
              text: 'Double click to edit',
              fontSize: 24,
              fill: '#000000',
            });
            break;
          case 'r': // Rectangle tool
            addElement({
              id: `el-${Date.now()}`,
              type: 'rect',
              x: board.width / 2 - 50,
              y: board.height / 2 - 50,
              width: 100,
              height: 100,
              fill: '#3b82f6',
            });
            break;
          case 'o': // Circle tool
            addElement({
              id: `el-${Date.now()}`,
              type: 'circle',
              x: board.width / 2 - 50,
              y: board.height / 2 - 50,
              width: 100,
              height: 100,
              fill: '#ef4444',
            });
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isPlaying, selectedId, selectedIds, elements, board.width, board.height, addElement, duplicateElement, removeElement, removeElements, updateElement, selectElements]);

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

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    activate();
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'canvas-bg';
    if (clickedOnEmpty) selectElement(null);
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

  // Enhanced Transformer for multi-select
  const getTransformerNodes = useCallback(() => {
    if (!isActive) return [];
    const nodes: Konva.Node[] = [];
    selectedIds.forEach(id => {
      const node = trRef.current?.getStage()?.findOne('#' + id);
      if (node) nodes.push(node);
    });
    return nodes;
  }, [selectedIds, isActive]);

  // Update transformer for multi-select
  useEffect(() => {
    if (!trRef.current) return;
    if (!isActive) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
      return;
    }
    const nodes = getTransformerNodes();
    if (nodes.length > 0) {
      trRef.current.nodes(nodes);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, selectedId, elements, isActive, getTransformerNodes]);

  return (
    <div
      className={`relative bg-white overflow-hidden transition-shadow ${isActive ? 'ring-2 ring-red-500 shadow-xl' : 'shadow-md ring-1 ring-black/10 hover:ring-red-400/60'
        }`}
      style={{ width: board.width, height: board.height }}
    >
      {/* Top Ruler */}
      {showRulers && (
        <div className="absolute top-0 left-0 right-0 h-6 bg-[#1a1a21] border-b border-[#2a2a35] flex items-center justify-between px-2 z-10 pointer-events-none">
          <div className="flex-1 overflow-hidden">
            {Array.from({ length: Math.ceil(board.width / 50) + 1 }, (_, i) => i * 50).map((x) => (
              <div key={x} className="absolute bottom-0 w-px h-4 bg-[#333]" style={{ left: x }} />
            ))}
            {Array.from({ length: Math.ceil(board.width / 10) + 1 }, (_, i) => i * 10).map((x) => (
              <div key={x} className="absolute bottom-0 w-px h-2 bg-[#444]" style={{ left: x }} />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono bg-[#15151c] px-2 py-0.5 rounded-r border-l border-[#2a2a35]">
            {Math.round(pan.x / zoom * -1)}px
          </div>
        </div>
      )}

      {/* Left Ruler */}
      {showRulers && (
        <div className="absolute top-0 left-0 bottom-0 w-6 bg-[#1a1a21] border-r border-[#2a2a35] flex flex-col items-end justify-between py-2 z-10 pointer-events-none">
          <div className="flex-1 overflow-hidden">
            {Array.from({ length: Math.ceil(board.height / 50) + 1 }, (_, i) => i * 50).map((y) => (
              <div key={y} className="absolute right-0 w-4 h-px bg-[#333]" style={{ top: y }} />
            ))}
            {Array.from({ length: Math.ceil(board.height / 10) + 1 }, (_, i) => i * 10).map((y) => (
              <div key={y} className="absolute right-0 w-2 h-px bg-[#444]" style={{ top: y }} />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono bg-[#15151c] px-1 py-0.5 rounded-t border-t border-[#2a2a35] writing-mode-vertical-lr">
            {Math.round(pan.y / zoom * -1)}px
          </div>
        </div>
      )}

      {/* Canvas Toolbar */}
      <div className="absolute top-8 left-2 z-20 flex flex-col gap-1">
        <div className="bg-[#15151c]/90 border border-[#2a2a35] rounded-lg p-1.5 flex flex-col gap-1">
          <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded ${showGrid ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/10'}`} title="Toggle Grid (G)">
            <Grid size={14} />
          </button>
          <button onClick={() => setShowRulers(!showRulers)} className={`p-1.5 rounded ${showRulers ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/10'}`} title="Toggle Rulers (Ctrl+R)">
            <Ruler size={14} />
          </button>
          <button onClick={() => setShowSafeZone(!showSafeZone)} className={`p-1.5 rounded ${showSafeZone ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/10'}`} title="Toggle Safe Zone">
            <Square size={14} className="opacity-50" />
          </button>
          <div className="h-px bg-[#2a2a35]" />
          <button onClick={() => setZoom(1)} className="p-1.5 rounded text-gray-400 hover:bg-white/10" title="Reset Zoom (100%)">
            <Minimize size={14} />
          </button>
          <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="p-1.5 rounded text-gray-400 hover:bg-white/10" title="Zoom In">
            <Maximize size={14} />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} className="p-1.5 rounded text-gray-400 hover:bg-white/10" title="Zoom Out">
            <Maximize size={14} className="rotate-180" />
          </button>
          <span className="text-[10px] text-gray-400 text-center px-1">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <Stage
        ref={(stage) => {
          stageRef.current = stage;
          registerStage?.(board.id, stage ?? null);
        }}
        width={board.width}
        height={board.height}
        scale={{ x: zoom, y: zoom }}
        position={{ x: pan.x, y: pan.y }}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        onWheel={handleWheel}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onClick={handleStageClick}
        onDragMove={handleStageDragMove}
        onDragEnd={handleStageDragEnd}
      >
        <Layer>
          {/* Grid */}
          {showGrid && (
            <Group>
              {Array.from({ length: Math.ceil(board.width / gridSize) + 1 }, (_, i) => i * gridSize).map((x) => (
                <Line key={`v-${x}`} points={[x, 0, x, board.height]} stroke="#e0e0e0" strokeWidth={0.5} />
              ))}
              {Array.from({ length: Math.ceil(board.height / gridSize) + 1 }, (_, i) => i * gridSize).map((y) => (
                <Line key={`h-${y}`} points={[0, y, board.width, y]} stroke="#e0e0e0" strokeWidth={0.5} />
              ))}
            </Group>
          )}

          {/* Safe Zone */}
          {showSafeZone && (
            <Rect
              x={board.width * 0.1}
              y={board.height * 0.1}
              width={board.width * 0.8}
              height={board.height * 0.8}
              stroke="rgb(255, 100, 100)"
              strokeWidth={1}
              strokeStyle={[2, 4]}
              fillEnabled={false}
            />
          )}

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
              onSelect={(id, e) => {
                activate();
                const evt = e?.evt;
                if (evt && (evt.shiftKey || evt.metaKey || evt.ctrlKey)) {
                  if (selectedIds.includes(id)) {
                    selectElements(selectedIds.filter(sid => sid !== id));
                  } else {
                    selectElements([...selectedIds, id]);
                  }
                } else {
                  selectElement(id);
                }
              }}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
              onEditText={startEditText}
              onEditISI={startEditISI}
            />
          ))}

          {/* Manual guides */}
          {manualGuides.map((guide, i) => {
            const gx = guide.x;
            const gy = guide.y;
            return gx !== undefined ? (
              <Line
                key={`mg-${i}`}
                points={[gx, 0, gx, board.height]}
                stroke="rgb(255, 200, 0)"
                strokeWidth={1}
                dash={[8, 4]}
              />
            ) : gy !== undefined ? (
              <Line
                key={`mg-${i}`}
                points={[0, gy, board.width, gy]}
                stroke="rgb(255, 200, 0)"
                strokeWidth={1}
                dash={[8, 4]}
              />
            ) : null;
          })}

          {/* Smart guides */}
          {guides.map((guide, i) => {
            const gx = guide.x;
            const gy = guide.y;
            return gx !== undefined ? (
              <Line
                key={i}
                points={[gx, 0, gx, board.height]}
                stroke="rgb(0, 161, 255)"
                strokeWidth={1}
                dash={[4, 6]}
              />
            ) : gy !== undefined ? (
              <Line
                key={i}
                points={[0, gy, board.width, gy]}
                stroke="rgb(0, 161, 255)"
                strokeWidth={1}
                dash={[4, 6]}
              />
            ) : null;
          })}

          {/* Selection box (marquee) */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              stroke="rgb(0, 161, 255)"
              strokeWidth={1}
              strokeStyle={[4, 4]}
              fill="rgb(0, 161, 255)"
              fillOpacity={0.1}
            />
          )}

          {/* Enhanced Transformer with rotation, flip */}
          {isActive && selectedIds.length > 0 && (
            <Transformer
              ref={trRef}
              nodes={getTransformerNodes()}
              keepRatio={true}
              rotateEnabled={true}
              rotateAnchorOffset={50}
              borderEnabled={true}
              borderStroke="rgb(239, 68, 68)"
              borderStrokeWidth={1}
              borderDash={[4, 4]}
              anchorFill="rgb(239, 68, 68)"
              anchorStroke="white"
              anchorSize={8}
              anchorCornerRadius={0}
              boundBoxFunc={(oldBox, newBox) => {
                // Prevent scaling below minimum size
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          )}

          {/* Flip controls for transformer */}
          {isActive && selectedIds.length > 0 && (
            <Group>
              {getTransformerNodes().map((node) => {
                const box = node.getClientRect();
                return (
                  <Group key={`controls-${node.id()}`}>
                    {/* Flip Horizontal */}
                    <Rect
                      x={box.x - 30}
                      y={box.y + box.height / 2 - 12}
                      width={24}
                      height={24}
                      fill="rgb(239, 68, 68)"
                      stroke="white"
                      strokeWidth={1}
                      cornerRadius={3}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleContextMenuAction('flip-horizontal', node.id());
                      }}
                      onMouseOver={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseOut={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    >
                      <Text x={box.x - 18} y={box.y + box.height / 2 + 4} text="⇄" fontSize={12} fill="white" />
                    </Rect>
                    {/* Flip Vertical */}
                    <Rect
                      x={box.x + box.width + 6}
                      y={box.y + box.height / 2 - 12}
                      width={24}
                      height={24}
                      fill="rgb(239, 68, 68)"
                      stroke="white"
                      strokeWidth={1}
                      cornerRadius={3}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleContextMenuAction('flip-vertical', node.id());
                      }}
                      onMouseOver={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseOut={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    >
                      <Text x={box.x + box.width + 18} y={box.y + box.height / 2 + 4} text="⇅" fontSize={12} fill="white" />
                    </Rect>
                  </Group>
                );
              })}
            </Group>
          )}
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
