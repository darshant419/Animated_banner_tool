import type { DesignElement } from '../../store/designStore';
import {
    getElementAnimationSegments,
    getLoopPlays,
    type ElementAnimationSegment,
} from '../../utils/keyframes';
import { isAnimistaLoop } from '../../utils/animations';
import { sanitizeRichText } from '../../utils/richText';
import {
    getTextAnimation,
    getTextAnimationLength,
    plainTextToHtml,
    splitTextHtml,
} from '../../utils/textAnimations';

/** Per-layer-type colour, TheBrief-style: text purple, shapes blue, media amber. */
export const TYPE_COLORS: Record<DesignElement['type'], string> = {
    text: '#8b7cf6',
    rect: '#5b8def',
    circle: '#5b8def',
    shape: '#5b8def',
    image: '#d99a2b',
    video: '#d99a2b',
    isiScroll: '#1bbfa7',
    piStrip: '#22a3c4',
    html: '#8a94a8',
};

export interface TrackSegment extends ElementAnimationSegment {
    kind: 'enter' | 'exit' | 'loop' | 'block' | 'text';
    /** Loop segments: number of plays (0 = forever). */
    plays?: number;
}

export interface TrackModel {
    color: string;
    /** When the layer is on screen (entrance start → exit end / banner end). */
    lifeStart: number;
    lifeEnd: number;
    enter?: TrackSegment;
    exit?: TrackSegment;
    middles: TrackSegment[];
    text?: TrackSegment;
    /** Seconds added to manual keyframe times when drawn (they chain after the entrance). */
    keyframeOffset: number;
}

/**
 * Turns an element's animation setup into what one timeline row draws: a
 * lifetime pill with an entrance block at its start, an exit block at its end,
 * loop / timed blocks in between and the text-effect span along the bottom.
 */
export const buildTrackModel = (el: DesignElement, totalDuration: number): TrackModel => {
    const segments = getElementAnimationSegments(el, totalDuration);
    const color = TYPE_COLORS[el.type] || '#8a94a8';

    let enter: TrackSegment | undefined;
    let exit: TrackSegment | undefined;
    const middles: TrackSegment[] = [];

    const isLoopPreset = el.animationLoop === true || (!!el.animation && isAnimistaLoop(el.animation));

    segments.forEach((seg) => {
        if (seg.id === 'enter') {
            enter = { ...seg, kind: 'enter' };
        } else if (seg.id === 'exit' || seg.id === 'hide') {
            exit = { ...seg, kind: 'exit' };
        } else if (seg.id === 'main' || seg.id === 'loop') {
            if (isLoopPreset && seg.end > seg.start) {
                // A loop preset repeats N times (or until the banner ends).
                const plays = getLoopPlays(el.animationLoopCount);
                const span = seg.end - seg.start;
                const end = plays > 0 ? Math.min(totalDuration, seg.start + span * plays) : totalDuration;
                middles.push({ ...seg, end: Math.max(end, seg.end), kind: 'loop', plays });
            } else if (seg.id === 'main' && !el.enterAnimation) {
                // A lone (non-loop) preset on `animation` acts as the entrance.
                enter = { ...seg, kind: 'enter' };
            } else {
                middles.push({ ...seg, kind: 'loop', plays: 1 });
            }
        } else {
            middles.push({ ...seg, kind: 'block' });
        }
    });

    let text: TrackSegment | undefined;
    const effect = el.type === 'text' ? getTextAnimation(el.textAnimation) : undefined;
    if (effect) {
        const html = el.richText ? sanitizeRichText(el.richText) : plainTextToHtml(el.text || '');
        const count = splitTextHtml(html, effect.unit).count;
        const start = el.textAnimationDelay || 0;
        const len = getTextAnimationLength(effect, count, el.textAnimationSpeed) / 1000;
        text = { id: 'text', start, end: start + Math.max(0.1, len), label: effect.label, color: '#f5b942', kind: 'text' };
    }

    const starts = [enter?.start, text?.start].filter((v): v is number => v !== undefined);
    // Before its entrance a layer is hidden, so the pill starts there; without
    // an entrance it is on screen from the first frame.
    const lifeStart = enter ? Math.min(...starts) : 0;
    const lifeEnd = exit ? exit.end : totalDuration;

    return {
        color,
        lifeStart,
        lifeEnd: Math.max(lifeEnd, lifeStart + 0.1),
        enter,
        exit,
        middles,
        text,
        keyframeOffset: el.enterAnimation && el.anim?.keyframes?.length ? enter?.end ?? 0 : 0,
    };
};
