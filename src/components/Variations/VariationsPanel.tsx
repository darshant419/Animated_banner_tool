import React from 'react';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Path } from 'react-konva';
import { useDesignStore, reflowElements, type DesignElement } from '../../store/designStore';
import useImage from 'use-image';
import { ISIScroll } from '../Canvas/ISIScroll';

const URLImage = ({ image, ...props }: any) => {
    const [img] = useImage(image.src);
    return <KonvaImage image={img} {...props} />;
};

const VariationThumbnail = ({
    width,
    height,
    label,
    elements,
    baseWidth,
    baseHeight,
    active,
    onSelect,
}: {
    width: number;
    height: number;
    label: string;
    elements: DesignElement[];
    baseWidth: number;
    baseHeight: number;
    active: boolean;
    onSelect: () => void;
}) => {
    const scale = Math.min(240 / width, 180 / height, 1);
    const previewW = width * scale;
    const previewH = height * scale;
    const previewElements = reflowElements(elements, baseWidth, baseHeight, width, height);

    return (
        <div className="space-y-2 group">
            <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium px-1">
                <span className={`text-gray-200 font-semibold ${active ? 'text-red-500' : ''}`}>{label}</span>
                <span className="text-gray-500">{width}x{height}</span>
            </div>
            <div
                className={`bg-[#1a1a21] border rounded-lg p-4 flex items-center justify-center cursor-pointer transition-all hover:shadow-sm group-hover:bg-[#15151c] ${active ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#232330] hover:border-red-500/40'}`}
                onClick={onSelect}
            >
                <div style={{ width: previewW, height: previewH }} className="shadow-md bg-[#15151c] overflow-hidden rounded relative">
                    <Stage width={previewW} height={previewH} scaleX={scale} scaleY={scale}>
                        <Layer>
                            <Rect width={width} height={height} fill="#ffffff" />
                            {previewElements.map((el) => {
                                const props = {
                                    ...el,
                                    id: el.id + '-var',
                                    draggable: false,
                                    visible: el.visible !== false,
                                };

                                if (el.type === 'rect') return <Rect key={props.id} {...props} />;
                                if (el.type === 'circle') return <Circle key={props.id} {...props} radius={(el.width || 100) / 2} />;
                                if (el.type === 'text') return (
                                    <Text
                                        key={props.id}
                                        {...props}
                                        align={el.textAlign || 'left'}
                                        textDecoration={el.textDecoration}
                                        text={el.text || ''}
                                    />
                                );
                                if (el.type === 'image') return <URLImage key={props.id} image={el} x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation} />;
                                if (el.type === 'isiScroll') return (
                                    <ISIScroll
                                        key={props.id}
                                        {...props}
                                        width={el.width || 300}
                                        height={el.height || 200}
                                        isiText={el.isiText || ''}
                                        isAnimating={false}
                                        draggable={false}
                                    />
                                );
                                if (el.type === 'shape') return (
                                    <Path
                                        key={props.id}
                                        {...props}
                                        data={el.path || ''}
                                        scaleX={(el.width || 50) / 24}
                                        scaleY={(el.height || 50) / 24}
                                    />
                                );
                                return null;
                            })}
                        </Layer>
                    </Stage>
                </div>
            </div>
        </div>
    );
};

export const VariationsPanel: React.FC = () => {
    const {
        elements,
        canvasWidth,
        canvasHeight,
        artboards,
        activeArtboardId,
        setActiveArtboard,
    } = useDesignStore();

    return (
        <div className="w-80 bg-[#15151c] border-r border-[#2a2a35] flex flex-col h-full z-10 overflow-y-auto">
            <div className="p-4 border-b border-[#232330] bg-[#1a1a21]/50">
                <h2 className="text-sm font-semibold text-gray-100">Multi-size Preview</h2>
                <p className="text-xs text-gray-500 mt-1">Smart-resize preview across all artboards</p>
            </div>

            <div className="p-4 space-y-6">
                {artboards.map((ab) => (
                    <VariationThumbnail
                        key={ab.id}
                        width={ab.width}
                        height={ab.height}
                        label={ab.label}
                        elements={elements}
                        baseWidth={canvasWidth}
                        baseHeight={canvasHeight}
                        active={activeArtboardId === ab.id}
                        onSelect={() => setActiveArtboard(ab.id)}
                    />
                ))}
            </div>
        </div>
    );
};