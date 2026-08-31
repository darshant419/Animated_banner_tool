import React, { useState } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Type, Square, Circle,
  Image as ImageIcon, ScrollText, Shapes, Code2,
  ArrowUp, ArrowDown, Copy, Trash2,
} from 'lucide-react';
import { useDesignStore, type DesignElement } from '../../store/designStore';

const typeIcon = (type: DesignElement['type'], size = 16) => {
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

const label = (el: DesignElement) =>
  el.name || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} ${el.id.slice(-4)}`;

const RenameInput = ({ value, onCommit, onCancel }: { value: string; onCommit: (v: string) => void; onCancel: () => void }) => {
  const [text, setText] = useState(value);
  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(text);
        if (e.key === 'Escape') onCancel();
      }}
      className="w-full text-xs border border-red-500 rounded px-1 py-0.5 focus:outline-none bg-[#1a1a21] text-gray-100"
    />
  );
};

export const LayersPanel: React.FC = () => {
  const {
    elements,
    selectedId,
    selectElement,
    updateElement,
    duplicateElement,
    removeElement,
    toggleVisibility,
    toggleLock,
    reorderElement,
  } = useDesignStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Display front-most layer first (elements render in order, later = on top).
  const layers = [...elements].reverse();

  return (
    <div className="w-72 bg-[#15151c] border-r border-[#2a2a35] flex flex-col h-full z-10">
      <div className="p-4 border-b border-[#232330] bg-[#1a1a21]/50">
        <h2 className="text-sm font-semibold text-gray-100">Layers</h2>
        <p className="text-xs text-gray-500 mt-1">{elements.length} layer{elements.length === 1 ? '' : 's'} · click to select, double-click to rename</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {layers.map((el) => (
          <div
            key={el.id}
            onClick={() => selectElement(el.id)}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 cursor-pointer transition-colors ${selectedId === el.id ? 'bg-red-500/10 ring-1 ring-red-500/30' : 'hover:bg-[#1e1e26]'
              } ${el.visible === false ? 'opacity-40' : ''}`}
          >
            <span className="text-gray-500 shrink-0">{typeIcon(el.type)}</span>

            <div className="flex-1 min-w-0">
              {renamingId === el.id ? (
                <RenameInput
                  value={el.name || ''}
                  onCommit={(v) => {
                    updateElement(el.id, { name: v || undefined });
                    setRenamingId(null);
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <span
                  className="text-xs text-gray-100 truncate block"
                  onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(el.id); }}
                  title="Double-click to rename"
                >
                  {label(el)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); reorderElement(el.id, 'up'); }}
                className="p-1 text-gray-500 hover:text-red-500 rounded"
                title="Bring forward"
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); reorderElement(el.id, 'down'); }}
                className="p-1 text-gray-500 hover:text-red-500 rounded"
                title="Send backward"
              >
                <ArrowDown size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                className={`p-1 rounded ${el.visible === false ? 'text-gray-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle visibility"
              >
                {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }}
                className={`p-1 rounded ${el.locked ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle lock"
              >
                {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }}
                className="p-1 text-gray-500 hover:text-red-500 rounded"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                className="p-1 text-gray-500 hover:text-red-500 rounded"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {elements.length === 0 && (
          <div className="p-4 text-xs text-gray-500 text-center mt-4">
            No layers yet. Use the toolbar to add text, shapes, images & more.
          </div>
        )}
      </div>
    </div>
  );
};