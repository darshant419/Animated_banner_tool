import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { DesignElement } from '../../store/designStore';
import { sanitizeRichText } from '../../utils/richText';
import {
    attachTextAnimation,
    ensureTextAnimationCss,
    getTextAnimation,
    plainTextToHtml,
    renderTextAnimationHtml,
} from '../../utils/textAnimations';

/** Seeks one text effect to a banner time (seconds). `settled` shows the final frame. */
export type TextAnimationSeeker = (timeSeconds: number, settled: boolean) => void;

interface TextAnimationLayerProps {
    el: DesignElement;
    zIndex: number;
    offsetX: number;
    offsetY: number;
    isPlaying: boolean;
    /** Positioning node shared with the rich-text overlay sync (left/top/transform). */
    registerBox: (node: HTMLDivElement | null) => void;
    registerSeeker: (seeker: TextAnimationSeeker | null) => void;
}

/**
 * HTML preview of a letter/word text effect. The Konva text underneath stays
 * (transparent) for selection and dragging; this layer draws the split letters
 * and is seeked from the shared playhead, so scrubbing and playback match the
 * exported banner frame for frame.
 */
// memo: the canvas re-renders ~30x/s while scrubbing (store playhead sync);
// this layer only needs to re-render when its element actually changes —
// the playhead reaches it through the seeker, not through props.
export const TextAnimationLayer = React.memo(function TextAnimationLayer({
    el,
    zIndex,
    offsetX,
    offsetY,
    isPlaying,
    registerBox,
    registerSeeker,
}: TextAnimationLayerProps) {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const setBox = useCallback(
        (node: HTMLDivElement | null) => {
            boxRef.current = node;
            registerBox(node);
        },
        [registerBox],
    );
    const effect = getTextAnimation(el.textAnimation);
    const contentHtml = el.richText ? sanitizeRichText(el.richText) : plainTextToHtml(el.text || '');
    const delay = el.textAnimationDelay || 0;
    const speed = el.textAnimationSpeed;

    useEffect(ensureTextAnimationCss, []);

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box || !effect) return;
        box.innerHTML = renderTextAnimationHtml(effect, contentHtml);
        const ctl = attachTextAnimation(box, effect, speed);
        const seeker: TextAnimationSeeker = (t, settled) => {
            ctl.seek(settled ? ctl.length : (t - delay) * 1000);
        };
        registerSeeker(seeker);
        return () => {
            registerSeeker(null);
            ctl.destroy();
        };
        // registerSeeker is stable per element id (see DesignCanvas).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effect, contentHtml, delay, speed]);

    if (!effect) return null;

    return (
        <div
            ref={setBox}
            aria-hidden="true"
            className="absolute"
            style={{
                left: el.x - offsetX,
                top: el.y - offsetY,
                width: el.width || 300,
                height: el.height || 60,
                zIndex,
                overflow: 'hidden',
                opacity: (el.opacity ?? 100) / 100,
                color: el.fill || '#000000',
                fontSize: el.fontSize || 12,
                fontFamily: el.fontFamily || 'Arial, sans-serif',
                fontWeight: el.fontWeight || 'normal',
                fontStyle: el.fontStyle || 'normal',
                textDecoration: el.textDecoration || 'none',
                textAlign: el.textAlign || 'left',
                lineHeight: el.lineHeight || 1.2,
                letterSpacing: `${el.letterSpacing || 0}px`,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word',
                transform: `rotate(${el.rotation || 0}deg) scale(${el.scaleX || 1}, ${el.scaleY || 1})`,
                transformOrigin: el.transformOrigin || '50% 50%',
                pointerEvents: isPlaying ? 'auto' : 'none',
            }}
        />
    );
});
