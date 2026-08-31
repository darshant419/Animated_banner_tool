import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { useDesignStore } from '../../store/designStore';

/** Strips HTML markup to plain text for the Konva preview (which can't render HTML). */
const stripHtml = (html: string): string =>
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>|<\/li>|<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&ge;/g, '≥')
        .replace(/&copy;/g, '©')
        .replace(/&eacute;/g, 'é')
        .replace(/&zwj;/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

interface ISIScrollProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isiText: string;
    isiScrollSpeed?: number;
    isiAutoStart?: boolean;
    fontSize?: number;
    fill?: string;
    onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onClick?: () => void;
    onDblClick?: () => void;
    onMouseEnter?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    onMouseLeave?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    draggable?: boolean;
    isAnimating?: boolean;
    // New Pro Features
    isiLogoSrc?: string;
    isiLogoWidth?: number;
    isiLogoPosition?: 'top' | 'bottom';
    isiPadding?: number;
    isiPaddingTop?: number;
    isiPaddingRight?: number;
    isiPaddingBottom?: number;
    isiPaddingLeft?: number;
    isiMargin?: number;
    isiMarginTop?: number;
    isiMarginRight?: number;
    isiMarginBottom?: number;
    isiMarginLeft?: number;
    isiBackgroundColor?: string;
    isiScrollbarColor?: string;
    isiScrollbarTrackColor?: string;
    isiScrollbarMarginTop?: number;
    isiScrollbarMarginRight?: number;
    isiScrollbarPadding?: number;
    isiScrollbarHeight?: number;
    isiScrollbarWidth?: number;
    isiLineHeight?: number;
    isiLetterSpacing?: number;
    isiFontFamily?: string;
    isiFontWeight?: string;
    isiFontStyle?: 'normal' | 'italic';
    hideText?: boolean;
    // Traditional ISI header bar
    isiHeaderText?: string;
    isiHeaderLink?: string;
    isiHeaderColor?: string;
    isiHeaderBackground?: string;
    isiHeaderHeight?: number;
}

export const ISIScroll = React.forwardRef<Konva.Group, ISIScrollProps>(function ISIScroll({
    id,
    x,
    y,
    width,
    height,
    isiText,
    isiScrollSpeed = 30,
    fontSize = 12,
    fill = '#000000',
    onDragEnd,
    onClick,
    onDblClick,
    draggable = true,
    isAnimating,
    isiLogoSrc,
    isiLogoWidth = 187,
    isiLogoPosition = 'bottom',
    isiPadding = 10,
    isiPaddingTop,
    isiPaddingRight,
    isiPaddingBottom,
    isiPaddingLeft,
    isiMargin = 0,
    isiMarginTop,
    isiMarginLeft,
    isiBackgroundColor = '#ffffff',
    isiScrollbarColor = '#006937',
    isiScrollbarTrackColor = '#f2f2f2',
    isiScrollbarMarginTop = 5,
    isiScrollbarMarginRight = 3,
    isiScrollbarPadding = 0,
    isiScrollbarHeight = 66,
    isiScrollbarWidth = 8,
    isiLineHeight = 1.4,
    isiLetterSpacing = 0,
    isiFontFamily = 'Arial, Helvetica, sans-serif',
    isiFontWeight = 'normal',
    isiFontStyle = 'normal',
    hideText = false,
    isiHeaderText,
    isiHeaderColor = '#000000',
    isiHeaderBackground = '#E8FFF9',
    isiHeaderHeight = 20,
}, forwardedRef) {
    const groupRef = useRef<Konva.Group>(null);
    const [scrollY, setScrollY] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isScrolling = isAnimating === true;
    const setPreviewPaused = useDesignStore((s) => s.setPreviewPaused);
    const hoverPausedRef = useRef(false);

    // Pause the global timeline while hovering this ISI content during playback.
    // setPreviewPaused only sets the pause (never clears) so other ISI instances
    // not being hovered don't cancel the existing hover-pause.
    useEffect(() => {
        if (isAnimating && isHovered) setPreviewPaused(true);
    }, [isAnimating, isHovered, setPreviewPaused]);

    // If this board unmounts while it had hover-paused the timeline, release it.
    useEffect(() => {
        return () => {
            if (hoverPausedRef.current) setPreviewPaused(false);
        };
    }, [setPreviewPaused]);

    const hasHeader = Boolean(isiHeaderText);
    const effectiveHeaderHeight = hasHeader ? isiHeaderHeight : 0;
    const bodyHeight = Math.max(0, height - effectiveHeaderHeight);

    // Calculate effective padding (individual sides override single value)
    const paddingTop = isiPaddingTop ?? isiPadding;
    const paddingRight = isiPaddingRight ?? isiPadding;
    const paddingBottom = isiPaddingBottom ?? isiPadding;
    const paddingLeft = isiPaddingLeft ?? isiPadding;

    // Calculate effective margin (individual sides override single value)
    const marginTop = isiMarginTop ?? isiMargin;
    const marginLeft = isiMarginLeft ?? isiMargin;

    // Apply margin to position
    const effectiveX = x + marginLeft;
    const effectiveY = y + marginTop;

    const [logoImg] = useImage(isiLogoSrc || '');

    // Layout calculations
    const logoHeight = useMemo(() => {
        if (!logoImg || !isiLogoWidth) return 0;
        return (logoImg.height / logoImg.width) * isiLogoWidth;
    }, [logoImg, isiLogoWidth]);

    const contentHeight = useMemo(() => {
        // Estimate height for Konva preview (actual scrolling uses HTML overlay logic in export)
        // This is a simplified preview height
        const charsPerLine = (width - paddingLeft - paddingRight) / (fontSize * 0.55);
        const lines = stripHtml(isiText || '').split('\n').reduce((acc, line) => acc + Math.ceil(line.length / charsPerLine), 0);
        return (lines * fontSize * isiLineHeight) + (logoHeight > 0 ? logoHeight + 10 : 0) + paddingTop + paddingBottom;
    }, [isiText, width, fontSize, isiLineHeight, logoHeight, paddingTop, paddingBottom, paddingLeft, paddingRight]);

    const maxScroll = useMemo(() => contentHeight - bodyHeight, [contentHeight, bodyHeight]);

    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Auto-scroll logic
    useEffect(() => {
        if (!isScrolling || isHovered) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const animate = (currentTime: number) => {
            if (!lastTimeRef.current) {
                lastTimeRef.current = currentTime;
            }

            const deltaTime = (currentTime - lastTimeRef.current) / 1000;
            lastTimeRef.current = currentTime;

            setScrollY((prevScrollY) => {
                const maxScroll = contentHeight - bodyHeight;

                if (maxScroll <= 0) return 0;

                const newScrollY = prevScrollY + isiScrollSpeed * deltaTime;

                if (newScrollY >= maxScroll) {
                    setTimeout(() => {
                        setScrollY(0);
                        lastTimeRef.current = 0;
                    }, 1000);
                    return maxScroll;
                }

                return newScrollY;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScrolling, isHovered, isiScrollSpeed, bodyHeight, contentHeight]);

    // Note: Link interaction and Rich Formatting are handled via the HTML Overlay in DesignCanvas.tsx
    // The Konva preview here shows the basic structure.

    const konvaFontStyle = useMemo(() => {
        const weight = (isiFontWeight || 'normal').toLowerCase();
        const style = (isiFontStyle || 'normal').toLowerCase();
        const isBold = weight === 'bold' || weight === '600' || weight === '700' || weight === '800' || weight === '900';
        const isItalic = style === 'italic';

        if (isBold && isItalic) return 'bold italic';
        if (isBold) return 'bold';
        if (isItalic) return 'italic';
        return 'normal';
    }, [isiFontWeight, isiFontStyle]);

    return (
        <Group
            ref={forwardedRef || groupRef}
            id={id}
            x={effectiveX}
            y={effectiveY}
            draggable={draggable}
            onDragEnd={onDragEnd}
            onClick={onClick}
            onTap={onClick}
            onDblClick={onDblClick}
            onMouseEnter={() => {
                setIsHovered(true);
                if (isAnimating) {
                    setPreviewPaused(true);
                    hoverPausedRef.current = true;
                }
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                if (isAnimating && hoverPausedRef.current) {
                    setPreviewPaused(false);
                    hoverPausedRef.current = false;
                }
            }}
        >
            {/* Background */}
            <Rect
                width={width}
                height={height}
                fill={isiBackgroundColor}
                stroke="#e2e8f0"
                strokeWidth={0.5}
            />

            {/* Traditional header bar ("Prescribing Information" strip) */}
            {hasHeader && (
                <Group y={0}>
                    <Rect
                        width={width}
                        height={effectiveHeaderHeight}
                        fill={isiHeaderBackground}
                    />
                    <Text
                        text={isiHeaderText || ''}
                        x={10}
                        y={effectiveHeaderHeight / 2}
                        height={effectiveHeaderHeight}
                        verticalAlign="middle"
                        fontSize={10}
                        fontFamily="Arial, Helvetica, sans-serif"
                        fontStyle="bold"
                        fill={isiHeaderColor}
                        lineHeight={1.2}
                        ellipsis
                        width={width - 20}
                        textDecoration="underline"
                    />
                </Group>
            )}

            {/* Content Clipping */}
            <Group clipFunc={(ctx) => ctx.rect(0, effectiveHeaderHeight, width, bodyHeight)} visible={!hideText}>
                <Group y={-scrollY + paddingTop + effectiveHeaderHeight}>
                    {/* Top Logo */}
                    {logoImg && isiLogoPosition === 'top' && (
                        <KonvaImage
                            image={logoImg}
                            x={paddingLeft}
                            width={isiLogoWidth}
                            height={logoHeight}
                            opacity={1}
                        />
                    )}

                    {/* Text Preview */}
                    <Text
                        text={hideText ? '' : stripHtml(isiText)}
                        x={paddingLeft}
                        y={logoImg && isiLogoPosition === 'top' ? logoHeight + 10 : 0}
                        fontSize={fontSize}
                        fontFamily={isiFontFamily}
                        fontStyle={konvaFontStyle}
                        fill={fill}
                        width={width - paddingLeft - paddingRight - 5}
                        lineHeight={isiLineHeight}
                        letterSpacing={isiLetterSpacing}
                    />

                    {/* Bottom Logo */}
                    {logoImg && isiLogoPosition === 'bottom' && (
                        <KonvaImage
                            image={logoImg}
                            x={paddingLeft}
                            y={contentHeight - logoHeight - paddingBottom}
                            width={isiLogoWidth}
                            height={logoHeight}
                        />
                    )}
                </Group>
            </Group>

{/* Professional Scrollbar */}
            {(() => {
                if (maxScroll > 0) {
                    const sbWidth = Math.max(2, isiScrollbarWidth || 8);
                    const pad = Math.max(0, isiScrollbarPadding || 0);
                    const pct = Math.min(100, Math.max(0, isiScrollbarHeight || 66)) / 100;
                    const avail = Math.max(0, bodyHeight - (isiScrollbarMarginTop || 0));
                    const scrollbarHeight = Math.min(avail, bodyHeight * pct);
                    const scrollbarY = effectiveHeaderHeight + (isiScrollbarMarginTop || 5);

                    const indicatorHeight = Math.max(13, (bodyHeight / contentHeight) * scrollbarHeight);
                    const indicatorY = (scrollY / maxScroll) * (scrollbarHeight - indicatorHeight);

                    return (
                        <Group x={width - sbWidth - (isiScrollbarMarginRight ?? 3)} y={0}>
                            {/* Track */}
                            <Rect
                                x={pad}
                                y={scrollbarY}
                                width={Math.max(1, sbWidth - pad * 2)}
                                height={scrollbarHeight}
                                fill={isiScrollbarColor}
                                opacity={0.2}
                                cornerRadius={4}
                            />
                            {/* Thumb (iScroll style: light indicator) */}
                            <Rect
                                x={pad + 1}
                                y={scrollbarY + indicatorY}
                                width={Math.max(1, sbWidth - pad * 2 - 2)}
                                height={indicatorHeight}
                                fill={isiScrollbarTrackColor}
                                cornerRadius={3}
                            />
                        </Group>
                    );
                }
                return null;
            })()}
        </Group>
    );
});
