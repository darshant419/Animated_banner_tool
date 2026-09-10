import React from 'react';
import {
  MousePointer2, Type, Image as ImageIcon,
  ScrollText, Layers, Shapes, Layout, FileJson,
} from 'lucide-react';
import { useDesignStore, type ElementType } from '../../store/designStore';
import { EMR_ISI_TEXT } from '../../templates/emrTemplates';

export type ToolType =
  | 'select' | 'text' | 'upload'
  | 'isiScroll' | 'assets' | 'templates' | 'layers' | 'variations';

interface ToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange }) => {
    const { addElement } = useDesignStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleToolClick = (tool: ToolType) => {
        onToolChange(tool);

        if (tool === 'upload') {
            fileInputRef.current?.click();
            return;
        }

        if (tool === 'assets' || tool === 'templates' || tool === 'layers' || tool === 'variations') {
            return;
        }

        const defaults: Record<string, { type: ElementType; x: number; y: number; width: number; height: number; fill?: string; text?: string; fontSize?: number }> = {
            text: { type: 'text', x: 100, y: 80, width: 200, height: 60, text: 'Double click to edit', fontSize: 24, fill: '#000000' },
        };

        const preset = defaults[tool];
        if (preset) {
            addElement({
                id: Date.now().toString(),
                ...preset,
            });
            onToolChange('select');
            return;
        }

        if (tool === 'isiScroll') {
            addElement({
                id: Date.now().toString(),
                type: 'isiScroll',
                x: 0,
                y: 162,
                width: 300,
                height: 88,
                isiText: EMR_ISI_TEXT,
                isiScrollSpeed: 30,
                isiAutoStart: true,
                fontSize: 12,
                fill: '#006937',
            });
            onToolChange('select');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    addElement({
                        id: Date.now().toString(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        width: 300,
                        height: (300 / img.width) * img.height,
                        src: event.target?.result as string,
                    });
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
        onToolChange('select');
    };

    return (
        <div className="w-16 bg-black border-r border-white/10 flex flex-col items-center py-4 gap-3 z-10 overflow-y-auto">
            <ToolButton
                icon={<MousePointer2 size={20} />}
                label="Select"
                isActive={activeTool === 'select'}
                onClick={() => handleToolClick('select')}
            />
            <div className="w-8 h-px bg-[#15151c]/10" />
            <ToolButton
                icon={<Type size={20} />}
                label="Text"
                isActive={activeTool === 'text'}
                onClick={() => handleToolClick('text')}
            />
            <ToolButton
                icon={<ImageIcon size={20} />}
                label="Image"
                isActive={activeTool === 'upload'}
                onClick={() => handleToolClick('upload')}
            />
            <ToolButton
                icon={<ScrollText size={20} />}
                label="ISI"
                isActive={activeTool === 'isiScroll'}
                onClick={() => handleToolClick('isiScroll')}
            />
            <div className="w-8 h-px bg-[#15151c]/10" />
            <ToolButton
                icon={<Shapes size={20} />}
                label="Assets"
                isActive={activeTool === 'assets'}
                onClick={() => handleToolClick('assets')}
            />
            <ToolButton
                icon={<FileJson size={20} />}
                label="Templates"
                isActive={activeTool === 'templates'}
                onClick={() => handleToolClick('templates')}
            />
            <div className="flex-1" />
            <ToolButton
                icon={<Layers size={20} />}
                label="Layers"
                isActive={activeTool === 'layers'}
                onClick={() => handleToolClick('layers')}
            />
            <ToolButton
                icon={<Layout size={20} />}
                label="Sizes"
                isActive={activeTool === 'variations'}
                onClick={() => handleToolClick('variations')}
            />

            {/* Hidden Upload Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        title={label}
        className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors
      ${isActive ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}
    `}
    >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);