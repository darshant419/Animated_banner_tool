import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { DesignElement } from '../../store/designStore';
import { escapeHtml, sanitizeRichText } from '../../utils/richText';

interface InlineTextEditorProps {
  element: DesignElement;
  canvasBackground: string;
  onCommit: (richText: string, text: string) => void;
  onCancel: () => void;
}

const fontSizes = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const lineHeights = [14, 16, 18, 20, 24, 28, 32];

const isSafeLink = (url: string) => /^(https?:|mailto:|tel:|\/|#)/i.test(url.trim());

const colorToHex = (value: string) => {
  const hex = /^#[0-9a-f]{6}$/i.exec(value.trim());
  if (hex) return hex[0];
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value);
  if (!rgb) return '#000000';
  return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
};

const getInlineElement = (node: Node | null): HTMLElement | null => {
  const element = node instanceof HTMLElement ? node : node?.parentElement;
  return element || null;
};

const isRangeWithin = (range: Range, element: HTMLElement) =>
  element.contains(range.startContainer) && element.contains(range.endContainer);

const isFormatActive = (
  range: Range,
  editor: HTMLElement,
  tagNames: string[],
  property?: 'fontWeight' | 'fontStyle' | 'textDecoration' | 'verticalAlign',
) => {
  const findFormat = (node: Node) => {
    let element = getInlineElement(node);
    while (element && editor.contains(element)) {
      if (tagNames.includes(element.tagName)) return true;
      element = element.parentElement;
    }
    return false;
  };
  if (findFormat(range.startContainer) && findFormat(range.endContainer)) return true;
  if (!property) return false;
  const start = getInlineElement(range.startContainer) || editor;
  const end = getInlineElement(range.endContainer) || editor;
  const isActive = (value: string) => {
    if (property === 'fontWeight') return value === 'bold' || Number.parseInt(value, 10) >= 600;
    if (property === 'fontStyle') return value === 'italic' || value === 'oblique';
    if (property === 'textDecoration') return value.includes('underline');
    return value === 'super';
  };
  return isActive(window.getComputedStyle(start)[property]) && isActive(window.getComputedStyle(end)[property]);
};

const unwrapTags = (root: Node, tagNames: string[]) => {
  Array.from(root.childNodes).forEach((child) => {
    if (child instanceof HTMLElement && tagNames.includes(child.tagName)) {
      const parent = child.parentNode;
      if (!parent) return;
      while (child.firstChild) parent.insertBefore(child.firstChild, child);
      parent.removeChild(child);
    } else {
      unwrapTags(child, tagNames);
    }
  });
};

export function InlineTextEditor({ element, canvasBackground, onCommit, onCancel }: InlineTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false, superscript: false });
  const [topSpace, setTopSpace] = useState('0');
  const [textColor, setTextColor] = useState(colorToHex(element.fill || '#000000'));
  const [toolbarPosition, setToolbarPosition] = useState<{ left: number; top: number } | null>(null);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current && isRangeWithin(range, editorRef.current)) {
      selectionRef.current = range.cloneRange();
      const block = (range.startContainer instanceof HTMLElement
        ? range.startContainer.closest('p, div')
        : range.startContainer.parentElement?.closest('p, div')) as HTMLElement | null;
      setTopSpace(block && editorRef.current.contains(block) ? String(Number.parseFloat(block.style.marginTop) || 0) : '0');
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return false;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    const range = selectionRef.current;
    if (range && isRangeWithin(range, editor)) {
      selection.addRange(range);
    } else {
      const newRange = document.createRange();
      newRange.selectNodeContents(editor);
      newRange.collapse(false);
      selection.addRange(newRange);
    }
    return true;
  };

  const refreshFormats = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!editor || !range || !isRangeWithin(range, editor)) return;
    setActiveFormats({
      bold: isFormatActive(range, editor, ['B', 'STRONG'], 'fontWeight'),
      italic: isFormatActive(range, editor, ['I', 'EM'], 'fontStyle'),
      underline: isFormatActive(range, editor, ['U'], 'textDecoration'),
      superscript: isFormatActive(range, editor, ['SUP'], 'verticalAlign'),
    });
    const textElement = getInlineElement(range.startContainer) || editor;
    setTextColor(colorToHex(window.getComputedStyle(textElement).color));
  };

  const getSelectedBlock = (): HTMLElement | null => {
    let selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let range = selection.getRangeAt(0);
    const findBlock = (): HTMLElement | null => {
      const node = range.startContainer;
      return (node instanceof HTMLElement ? node.closest('p, div') : node.parentElement?.closest('p, div')) as HTMLElement | null;
    };
    let block = findBlock();
    if (!block || block === editorRef.current) {
      document.execCommand('formatBlock', false, 'p');
      selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      range = selection.getRangeAt(0);
      block = findBlock();
    }
    return block && block !== editorRef.current ? block : null;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
    refreshFormats();
  }, []);

  useLayoutEffect(() => {
    const updateToolbarPosition = () => {
      const editorBounds = editorRef.current?.getBoundingClientRect();
      const toolbarBounds = toolbarRef.current?.getBoundingClientRect();
      if (!editorBounds || !toolbarBounds) return;
      const left = Math.max(8, Math.min(editorBounds.left, window.innerWidth - toolbarBounds.width - 8));
      let top = editorBounds.bottom + 6;
      if (top + toolbarBounds.height > window.innerHeight - 8) {
        top = Math.max(8, editorBounds.top - toolbarBounds.height - 6);
      }
      setToolbarPosition({ left, top });
    };

    updateToolbarPosition();
    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateToolbarPosition);
    if (editorRef.current) observer?.observe(editorRef.current);
    return () => {
      window.removeEventListener('resize', updateToolbarPosition);
      window.removeEventListener('scroll', updateToolbarPosition, true);
      observer?.disconnect();
    };
  }, []);

  const toggleInlineTag = (
    tagName: string,
    activeTags: string[],
    property: 'fontWeight' | 'fontStyle' | 'textDecoration' | 'verticalAlign',
    normalStyle: Partial<CSSStyleDeclaration>,
  ) => {
    if (!restoreSelection()) return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const active = isFormatActive(range, editor, activeTags, property);
    if (range.collapsed) {
      const wrapper = document.createElement(active ? 'span' : tagName);
      if (active) Object.assign(wrapper.style, normalStyle);
      range.insertNode(wrapper);
      range.setStart(wrapper, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const fragment = range.extractContents();
      let firstNode: Node;
      let lastNode: Node;
      if (active) {
        unwrapTags(fragment, activeTags);
        const wrapper = document.createElement('span');
        if (normalStyle) Object.assign(wrapper.style, normalStyle);
        wrapper.appendChild(fragment);
        firstNode = wrapper;
        lastNode = wrapper;
        range.insertNode(wrapper);
      } else {
        const wrapper = document.createElement(tagName);
        wrapper.appendChild(fragment);
        firstNode = wrapper;
        lastNode = wrapper;
        range.insertNode(wrapper);
      }
      const selectedRange = document.createRange();
      selectedRange.setStartBefore(firstNode);
      selectedRange.setEndAfter(lastNode);
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
    saveSelection();
    refreshFormats();
  };

  const applyInlineStyle = (style: Partial<CSSStyleDeclaration>) => {
    if (!restoreSelection()) return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const wrapper = document.createElement('span');
    Object.assign(wrapper.style, style);
    if (range.collapsed) {
      range.insertNode(wrapper);
      range.setStart(wrapper, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
      const selectedRange = document.createRange();
      selectedRange.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
    saveSelection();
  };

  const applyFontSize = (size: number) => {
    applyInlineStyle({ fontSize: `${size}px` });
  };

  const applyLineHeight = (lineHeight: number) => {
    if (!restoreSelection()) return;
    const block = getSelectedBlock();
    if (block) block.style.lineHeight = `${lineHeight}px`;
    saveSelection();
  };

  const applyTopSpace = (value: string) => {
    setTopSpace(value);
    if (!restoreSelection()) return;
    const block = getSelectedBlock();
    if (block) block.style.marginTop = `${Math.max(0, Number(value) || 0)}px`;
    saveSelection();
  };

  const insertLink = () => {
    if (!restoreSelection()) return;
    const url = window.prompt('Enter a link URL');
    if (url === null || !url.trim()) return;
    if (!isSafeLink(url)) {
      window.alert('Use an http(s), mailto, tel, or relative link.');
      return;
    }
    if (!restoreSelection()) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const anchor = document.createElement('a');
    anchor.href = url.trim();
    anchor.rel = 'noopener noreferrer';
    if (range.collapsed) {
      anchor.textContent = url.trim();
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
      const selectedRange = document.createRange();
      selectedRange.selectNodeContents(anchor);
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
    saveSelection();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      const editor = editorRef.current;
      if (editor) onCommit(sanitizeRichText(editor.innerHTML), editor.innerText);
    }
  };

  const handleToolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    saveSelection();
    event.preventDefault();
  };

  const commit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onCommit(sanitizeRichText(editor.innerHTML), editor.innerText);
  };

  const toolbarStyle: CSSProperties = {
    position: 'fixed',
    left: toolbarPosition?.left ?? 8,
    top: toolbarPosition?.top ?? 8,
    zIndex: 10000,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    width: Math.min(Math.max(element.width || 300, 300), 560),
    padding: '9px 10px',
    border: '1px solid #dce1e8',
    borderRadius: 12,
    background: '#ffffff',
    color: '#334155',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
    font: '12px Arial, sans-serif',
  };

  const buttonStyle = (active = false): CSSProperties => ({
    minWidth: 26,
    height: 28,
    border: 0,
    borderRadius: 4,
    padding: '4px 6px',
    background: active ? '#e5e7eb' : 'transparent',
    color: '#334155',
    cursor: 'pointer',
  });

  const controlStyle: CSSProperties = {
    height: 28,
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    padding: '3px 6px',
    background: '#ffffff',
    color: '#334155',
    font: '12px Arial, sans-serif',
  };

  const initialHtml = element.richText || escapeHtml(element.text || '');
  const safeInitialHtml = useMemo(() => ({ __html: sanitizeRichText(initialHtml) }), [initialHtml]);

  return (
    <>
      {createPortal(
        <div ref={toolbarRef} role="toolbar" aria-label="Rich text formatting toolbar" style={toolbarStyle}>
        <button type="button" aria-label="Bold" aria-pressed={activeFormats.bold} style={buttonStyle(activeFormats.bold)} onMouseDown={handleToolbarMouseDown} onClick={() => toggleInlineTag('strong', ['B', 'STRONG'], 'fontWeight', { fontWeight: 'normal' })}>
          <strong>B</strong>
        </button>
        <button type="button" aria-label="Italic" aria-pressed={activeFormats.italic} style={buttonStyle(activeFormats.italic)} onMouseDown={handleToolbarMouseDown} onClick={() => toggleInlineTag('em', ['I', 'EM'], 'fontStyle', { fontStyle: 'normal' })}>
          <em>I</em>
        </button>
        <button type="button" aria-label="Underline" aria-pressed={activeFormats.underline} style={buttonStyle(activeFormats.underline)} onMouseDown={handleToolbarMouseDown} onClick={() => toggleInlineTag('u', ['U'], 'textDecoration', { textDecoration: 'none' })}>
          <u>U</u>
        </button>
        <button type="button" aria-label="Insert link" title="Insert link" style={buttonStyle()} onMouseDown={handleToolbarMouseDown} onClick={insertLink}>
          ↗
        </button>
        <button type="button" aria-label="Superscript" aria-pressed={activeFormats.superscript} title="Superscript" style={buttonStyle(activeFormats.superscript)} onMouseDown={handleToolbarMouseDown} onClick={() => toggleInlineTag('sup', ['SUP'], 'verticalAlign', { verticalAlign: 'baseline', fontSize: 'inherit' })}>
          x²
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Color
          <input
            type="color"
            aria-label="Text color"
            value={textColor}
            style={{ ...controlStyle, width: 36, padding: 2, cursor: 'pointer' }}
            onMouseDown={saveSelection}
            onChange={(event) => {
              setTextColor(event.target.value);
              applyInlineStyle({ color: event.target.value });
            }}
          />
        </label>
        <label>
          <span className="sr-only">Font size</span>
          <select aria-label="Font size" defaultValue="" style={controlStyle} onMouseDown={saveSelection} onChange={(event) => {
            const size = Number(event.target.value);
            if (size) applyFontSize(size);
            event.target.value = '';
          }}>
            <option value="" disabled>Size</option>
            {fontSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Line height</span>
          <select aria-label="Line height" defaultValue="" style={controlStyle} onMouseDown={saveSelection} onChange={(event) => {
            const height = Number(event.target.value);
            if (height) applyLineHeight(height);
            event.target.value = '';
          }}>
            <option value="" disabled>Line height</option>
            {lineHeights.map((height) => <option key={height} value={height}>{height}px line</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, flexBasis: '100%' }}>
          Top space
          <input
            type="number"
            aria-label="Space above selected paragraph in pixels"
            min={0}
            value={topSpace}
            onMouseDown={saveSelection}
            onChange={(event) => applyTopSpace(event.target.value)}
            style={{ ...controlStyle, width: 58 }}
          />
          px
        </label>
        <button type="button" style={{ ...buttonStyle(), marginLeft: 'auto' }} onClick={onCancel}>Cancel</button>
        <button type="button" style={{ ...buttonStyle(), background: '#111827', color: '#ffffff' }} onClick={commit}>Done</button>
        </div>,
        document.body,
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Edit rich text"
        aria-multiline="true"
        onInput={saveSelection}
        onMouseUp={() => { saveSelection(); refreshFormats(); }}
        onKeyUp={() => { saveSelection(); refreshFormats(); }}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        dangerouslySetInnerHTML={safeInitialHtml}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width || 300,
          height: element.height || 60,
          boxSizing: 'border-box',
          overflow: 'auto',
          padding: 2,
          border: '2px solid #3b82f6',
          borderRadius: 8,
          outline: 'none',
          background: canvasBackground || '#ffffff',
          color: element.fill || '#000000',
          fontSize: element.fontSize || 14,
          fontFamily: element.fontFamily || 'Arial, sans-serif',
          fontWeight: element.fontWeight || 'normal',
          fontStyle: element.fontStyle || 'normal',
          lineHeight: element.lineHeight || 1.2,
          textAlign: element.textAlign || 'left',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          zIndex: 200,
          cursor: 'text',
        }}
      />
    </>
  );
}
