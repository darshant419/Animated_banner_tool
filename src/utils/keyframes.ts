import type { AnimationKeyframe, DesignElement } from '../store/designStore';
import { ANIMISTA_ANIMATIONS, animationLabel } from './animations';

export const EASINGS: Array<{ id: string; label: string }> = [
    { id: 'power1.inOut', label: 'Ease (default)' },
    { id: 'linear', label: 'Linear' },
    { id: 'power1.in', label: 'Ease In' },
    { id: 'power1.out', label: 'Ease Out' },
    { id: 'power2.inOut', label: 'Ease In/Out' },
    { id: 'power2.out', label: 'Smooth Out' },
    { id: 'power3.inOut', label: 'Strong In/Out' },
    { id: 'sine.inOut', label: 'Sine' },
    { id: 'back.out', label: 'Back Out' },
    { id: 'back.inOut', label: 'Back In/Out' },
    { id: 'elastic.out', label: 'Elastic' },
    { id: 'bounce.out', label: 'Bounce' },
    { id: 'expo.out', label: 'Expo Out' },
];

export const easingLabel = (id: string) =>
    EASINGS.find((e) => e.id === id)?.label || id;

export interface ElementBaseState {
    x: number;
    y: number;
    opacity: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

export const getElementBaseState = (el: DesignElement): ElementBaseState => ({
    x: el.x,
    y: el.y,
    opacity: el.opacity !== undefined ? el.opacity : 100,
    rotation: el.rotation || 0,
    scaleX: el.scaleX || 1,
    scaleY: el.scaleY || 1,
});

const uid = () => `kf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const kf = (time: number, partial: Omit<AnimationKeyframe, 'id' | 'time' | 'easing'> & { easing?: string }): AnimationKeyframe => ({
    id: uid(),
    time,
    easing: 'power1.inOut',
    ...partial,
});

/**
 * Converts a preset animation into keyframes.
 * Build-in animations start from a hidden/offset state and arrive at the resting state.
 * The optional overrides let callers reuse a preset (e.g. entrance/exit) with custom
 * timing without mutating the element.
 */
export const presetToKeyframes = (
    el: DesignElement,
    animationOverride?: string,
    delayOverride?: number,
    durationOverride?: number,
): AnimationKeyframe[] => {
    const animation = animationOverride || el.animation || 'none';
    if (animation === 'none') return [];

    const base = getElementBaseState(el);
    const duration = durationOverride ?? el.animationDuration ?? 1;
    const delay = delayOverride ?? el.animationDelay ?? 0;

    const animista = ANIMISTA_ANIMATIONS[animation];
    if (animista) return animista.frames(base, duration, delay, el);

    const end = delay + duration;
    const px = 150;

    const toKeyframes = (from: Partial<AnimationKeyframe>, loop?: boolean): AnimationKeyframe[] => {
        const frames: AnimationKeyframe[] = [
            kf(delay > 0 ? delay : 0, { ...base, ...from, opacity: from.opacity ?? 0 }),
            kf(end, { ...base, opacity: base.opacity }),
        ];
        if (loop && frames.length >= 2) {
            const last = frames[frames.length - 1];
            frames.push(kf(end + duration / 2, { ...base, ...from, opacity: from.opacity ?? 0 }));
            frames.push({ ...last, id: uid(), time: end + duration });
        }
        return frames;
    };

    switch (animation) {
        case 'slideInTop': return toKeyframes({ x: base.x, y: base.y - px });
        case 'slideInBottom': return toKeyframes({ x: base.x, y: base.y + px });
        case 'slideInLeft': return toKeyframes({ x: base.x - px, y: base.y });
        case 'slideInRight': return toKeyframes({ x: base.x + px, y: base.y });
        case 'slideInTopLeft': return toKeyframes({ x: base.x - px, y: base.y - px });
        case 'slideInTopRight': return toKeyframes({ x: base.x + px, y: base.y - px });
        case 'slideInBottomLeft': return toKeyframes({ x: base.x - px, y: base.y + px });
        case 'slideInBottomRight': return toKeyframes({ x: base.x + px, y: base.y + px });
        case 'fadeIn': return toKeyframes({ opacity: 0 });
        case 'fadeOut':
            return [
                kf(delay, { ...base, opacity: base.opacity }),
                kf(end, { ...base, opacity: 0 }),
            ];
        case 'fadeInOut':
            return toKeyframes({ opacity: 0 }, true);
        case 'zoomIn': return toKeyframes({ scaleX: 0.1, scaleY: 0.1 });
        case 'zoomOut': return toKeyframes({ scaleX: 1.6, scaleY: 1.6 });
        case 'pulse':
            return [
                kf(0, { ...base }),
                kf(duration / 2, { ...base, scaleX: 1.12, scaleY: 1.12 }),
                kf(duration, { ...base }),
            ];
        case 'spin':
        case 'rotate360':
            return [
                kf(0, { ...base, rotation: base.rotation - 360, opacity: 0 }),
                kf(end, { ...base }),
            ];
        case 'flip':
            return [
                kf(0, { ...base, scaleX: 0.1, opacity: 0 }),
                kf(end, { ...base }),
            ];
        case 'shake':
            return [
                kf(0, { ...base, x: base.x - 10 }),
                kf(0.1, { ...base, x: base.x + 10 }),
                kf(0.2, { ...base, x: base.x - 8 }),
                kf(0.3, { ...base, x: base.x + 6 }),
                kf(0.4, { ...base }),
            ];
        case 'skew':
            return [
                kf(0, { ...base, scaleX: 0.9, scaleY: 0.9, opacity: 0 }),
                kf(end, { ...base }),
            ];
        case 'float':
            return [
                kf(0, { ...base }),
                kf(duration / 2, { ...base, y: base.y - 15 }),
                kf(duration, { ...base }),
            ];
        case 'bounce':
            return [
                kf(0, { ...base }),
                kf(duration / 2, { ...base, y: base.y - 20 }),
                kf(duration, { ...base }),
            ];
        case 'swing':
            return [
                kf(0, { ...base }),
                kf(duration / 2, { ...base, rotation: base.rotation + 12 }),
                kf(duration, { ...base }),
            ];
        case 'continuousSlideX':
            return [
                kf(0, { ...base }),
                kf(duration, { ...base, x: base.x + 100 }),
            ];
        case 'continuousSlideY':
            return [
                kf(0, { ...base }),
                kf(duration, { ...base, y: base.y + 100 }),
            ];
        default:
            return [];
    }
};

/**
 * Returns the effective keyframes for an element:
 * entrance animation (optional) + explicit/preset main animation +
 * additional timed animation blocks + exit animation (optional).
 * Frames are sorted by time so preview, timeline and export stay in sync.
 * `totalDuration` bounds how far a `loop`ed timed block repeats.
 */
export const getElementKeyframes = (el: DesignElement, totalDuration?: number): AnimationKeyframe[] => {
    const enter = el.enterAnimation
        ? presetToKeyframes(el, el.enterAnimation, el.enterDelay || 0)
        : [];
    const enterEnd = enter.length > 0 ? Math.max(...enter.map((f) => f.time)) : 0;

    const main = el.anim && el.anim.keyframes.length > 0 ? el.anim.keyframes : presetToKeyframes(el);
    const mainFrames = enterEnd > 0
        ? main.map((f) => ({ ...f, id: uid(), time: f.time + enterEnd }))
        : main;
    const mainEnd = mainFrames.length > 0 ? Math.max(...mainFrames.map((f) => f.time)) : 0;

    const blocks = (el.animations || [])
        .filter((b) => b.preset && b.preset !== 'none')
        .map((b) => {
            const pattern = presetToKeyframes(el, b.preset, 0, b.duration).map((f) => ({
                ...f,
                id: uid(),
                time: f.time + b.start + (b.delay || 0),
            }));
            let frames = pattern;
            if (b.loop && b.duration > 0) {
                const windowStart = b.start + (b.delay || 0);
                const bound = totalDuration && totalDuration > windowStart ? totalDuration : windowStart + b.duration;
                frames = [];
                let offset = 0;
                while (windowStart + offset < bound) {
                    pattern.forEach((f) => frames.push({ ...f, id: uid(), time: f.time + offset }));
                    offset += b.duration;
                }
            }
            const easeOverride = b.ease;
            if (easeOverride) frames = frames.map((f) => ({ ...f, easing: easeOverride }));
            return frames;
        })
        .flat();

    const exit = el.exitAnimation
        ? presetToKeyframes(el, el.exitAnimation, 0).map((f) => ({
            ...f,
            id: uid(),
            time: f.time + mainEnd + (el.exitDelay || 0),
        }))
        : [];

    return [...enter, ...mainFrames, ...blocks, ...exit].sort((a, b) => a.time - b.time);
};

/** A colored segment describing one animation block's timeframe on the timeline. */
export interface ElementAnimationSegment {
    id: string;
    start: number;
    end: number;
    label: string;
    color: string;
}

/** Computes the timeframe segments (entrance, main, timed blocks, exit) for an element. */
export const getElementAnimationSegments = (el: DesignElement): ElementAnimationSegment[] => {
    const segments: ElementAnimationSegment[] = [];

    const enter = el.enterAnimation
        ? presetToKeyframes(el, el.enterAnimation, el.enterDelay || 0)
        : [];
    const enterEnd = enter.length > 0 ? Math.max(...enter.map((f) => f.time)) : 0;

    const main = el.anim && el.anim.keyframes.length > 0 ? el.anim.keyframes : presetToKeyframes(el);
    const mainEnd = main.length > 0 ? Math.max(...main.map((f) => f.time)) : 0;

    if (enter.length > 0) {
        const s = Math.min(...enter.map((f) => f.time));
        segments.push({ id: 'enter', start: s, end: enterEnd, label: 'Entrance', color: '#f59e0b' });
    }
    if (main.length > 0) {
        segments.push({ id: 'main', start: enterEnd, end: enterEnd + mainEnd, label: 'Main', color: '#3b82f6' });
    }
    (el.animations || [])
        .filter((b) => b.preset && b.preset !== 'none')
        .forEach((b) => {
            segments.push({
                id: b.id,
                start: b.start + (b.delay || 0),
                end: b.start + (b.delay || 0) + b.duration,
                label: animationLabel(b.preset),
                color: '#8b5cf6',
            });
        });
    if (el.exitAnimation) {
        const exit = presetToKeyframes(el, el.exitAnimation, 0);
        const exitDur = exit.length > 0 ? Math.max(...exit.map((f) => f.time)) : 1;
        const s = mainEnd + (el.exitDelay || 0);
        segments.push({ id: 'exit', start: s, end: s + exitDur, label: 'Exit', color: '#ef4444' });
    }
    return segments;
};

/** End time of an element's animation (0 if none). */
export const elementEndTime = (el: DesignElement): number => {
    const frames = getElementKeyframes(el);
    if (frames.length === 0) return 0;
    return Math.max(...frames.map((f) => f.time));
};

/** Suggested total duration for a set of elements (max end time rounded up to 0.5). */
export const suggestedDuration = (elements: DesignElement[]): number => {
    const end = Math.max(1, ...elements.map(elementEndTime));
    return Math.max(3, Math.ceil(end * 2) / 2);
};
