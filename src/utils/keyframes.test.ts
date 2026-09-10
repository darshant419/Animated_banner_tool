import { describe, it, expect } from 'vitest';
import {
    easingLabel,
    getElementBaseState,
    presetToKeyframes,
    getElementKeyframes,
    getElementAnimationSegments,
    elementEndTime,
    suggestedDuration,
} from './keyframes';
import type { DesignElement } from '../store/designStore';

const makeElement = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'el-1',
    type: 'text',
    x: 100,
    y: 80,
    width: 200,
    height: 60,
    ...overrides,
});

describe('easingLabel', () => {
    it('returns a human label for known easings', () => {
        expect(easingLabel('power2.out')).toBe('Smooth Out');
        expect(easingLabel('linear')).toBe('Linear');
    });

    it('falls back to the raw id for unknown easings', () => {
        expect(easingLabel('not-a-real-easing')).toBe('not-a-real-easing');
    });
});

describe('getElementBaseState', () => {
    it('uses element x/y and sensible defaults', () => {
        const base = getElementBaseState(makeElement({ opacity: 50 }));
        expect(base).toMatchObject({ x: 100, y: 80, opacity: 50, rotation: 0, scaleX: 1, scaleY: 1 });
    });

    it('defaults opacity to 100 when unset', () => {
        expect(getElementBaseState(makeElement()).opacity).toBe(100);
    });
});

describe('presetToKeyframes', () => {
    it('returns an empty list for "none"', () => {
        expect(presetToKeyframes(makeElement({ animation: 'none' }))).toEqual([]);
    });

    it('creates an enter animation starting off-screen for slideInLeft', () => {
        const el = makeElement({ animation: 'slideInLeft', animationDuration: 1 });
        const frames = presetToKeyframes(el);
        expect(frames).toHaveLength(2);
        expect(frames[0].x).toBe(100 - 150);
        expect(frames[0].opacity).toBe(0);
        expect(frames[1].x).toBe(100);
        expect(frames[1].opacity).toBe(100);
        expect(frames[1].time).toBeCloseTo(1);
    });

    it('respects delay for fadeIn', () => {
        const el = makeElement({ animation: 'fadeIn', animationDuration: 1, animationDelay: 0.5 });
        const frames = presetToKeyframes(el);
        expect(frames[0].time).toBe(0.5);
        expect(frames[1].time).toBeCloseTo(1.5);
    });

    it('fades out to opacity 0 for fadeOut', () => {
        const frames = presetToKeyframes(makeElement({ animation: 'fadeOut', animationDuration: 1 }));
        expect(frames[0].opacity).toBe(100);
        expect(frames[1].opacity).toBe(0);
    });

    it('loops fadeInOut back to a hidden state', () => {
        const frames = presetToKeyframes(makeElement({ animation: 'fadeInOut', animationDuration: 1 }));
        expect(frames.length).toBeGreaterThan(2);
        expect(frames[frames.length - 1].opacity).toBe(100);
    });
});

describe('getElementKeyframes', () => {
    it('prefers explicit keyframes over the legacy preset', () => {
        const explicit = [
            { id: 'k1', time: 0, easing: 'power1.inOut', x: 0 },
            { id: 'k2', time: 1, easing: 'power1.inOut', x: 100 },
        ];
        const el = makeElement({
            animation: 'slideInLeft',
            anim: { keyframes: explicit },
        });
        expect(getElementKeyframes(el)).toEqual(explicit);
    });

    it('derives keyframes from the preset when no explicit keyframes exist', () => {
        const el = makeElement({ animation: 'zoomIn', animationDuration: 1 });
        const frames = getElementKeyframes(el);
        expect(frames[0].scaleX).toBe(0.1);
    });
});

describe('single animation model', () => {
    it('uses the preset animation keyframes', () => {
        const el = makeElement({ animation: 'slideInLeft', animationDuration: 1 });
        const frames = getElementKeyframes(el);
        // starts hidden off-screen, ends at resting state
        expect(frames[0].opacity).toBe(0);
        expect(frames[0].x).toBe(100 - 150);
        expect(frames.some((f) => f.time === 1 && f.x === 100)).toBe(true);
    });

    it('leaves manual keyframes unchanged', () => {
        const el = makeElement({
            animation: 'fadeIn',
            animationDuration: 1,
            anim: {
                keyframes: [
                    { id: 'k1', time: 0, easing: 'power1.inOut', opacity: 0 },
                    { id: 'k2', time: 1, easing: 'power1.inOut', opacity: 100 },
                ],
            },
        });
        const frames = getElementKeyframes(el);
        expect(frames).toHaveLength(2);
        expect(frames.map((f) => f.time)).toEqual([0, 1]);
    });

    it('returns an empty list for "none"', () => {
        expect(getElementKeyframes(makeElement({ animation: 'none' }))).toEqual([]);
    });
});

describe('animation segments', () => {
    it('produces a single segment for the preset animation', () => {
        const el = makeElement({ animation: 'fadeIn', animationDuration: 1 });
        const segs = getElementAnimationSegments(el);
        expect(segs).toHaveLength(1);
        expect(segs[0].id).toBe('main');
        expect(segs[0].start).toBe(0);
        expect(segs[0].end).toBeCloseTo(1);
    });

    it('returns no segments for unanimated elements', () => {
        expect(getElementAnimationSegments(makeElement({ animation: 'none' }))).toEqual([]);
    });
});

describe('elementEndTime', () => {
    it('returns 0 for unanimated elements', () => {
        expect(elementEndTime(makeElement({ animation: 'none' }))).toBe(0);
    });

    it('returns the max keyframe time', () => {
        const el = makeElement({
            anim: {
                keyframes: [
                    { id: 'k1', time: 0, easing: 'linear' },
                    { id: 'k2', time: 3.5, easing: 'linear' },
                ],
            },
        });
        expect(elementEndTime(el)).toBe(3.5);
    });
});

describe('suggestedDuration', () => {
    it('never returns less than 3 seconds', () => {
        expect(suggestedDuration([])).toBe(3);
        expect(suggestedDuration([makeElement({ animation: 'none' })])).toBe(3);
    });

    it('rounds the max end time up to the nearest 0.5', () => {
        const el = makeElement({
            anim: { keyframes: [{ id: 'k1', time: 4.2, easing: 'linear' }] },
        });
        expect(suggestedDuration([el])).toBe(4.5);
    });
});