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

describe('entrance / exit composition', () => {
    it('composes entrance + main + exit keyframes in order', () => {
        const el = makeElement({
            animation: 'fadeIn',
            animationDuration: 1,
            enterAnimation: 'slideInLeft',
            exitAnimation: 'fadeOut',
            exitDelay: 0.5,
        });
        const frames = getElementKeyframes(el);
        // entrance first: hidden off-screen
        expect(frames[0].opacity).toBe(0);
        expect(frames[0].x).toBe(100 - 150);
        // main animation is shifted to start after the entrance ends (t=1)
        expect(frames.some((f) => f.time === 2 && f.opacity === 100)).toBe(true);
        // exit is shifted to after main end (t=2) + exit delay (0.5)
        const exit = frames.filter((f) => f.time >= 2.5);
        expect(exit.length).toBeGreaterThan(0);
        expect(exit[exit.length - 1].opacity).toBe(0);
    });

    it('offsets manual keyframes when an entrance is present', () => {
        const el = makeElement({
            enterAnimation: 'fadeIn',
            enterDelay: 0,
            animationDuration: 1,
            anim: {
                keyframes: [
                    { id: 'k1', time: 0, easing: 'power1.inOut', opacity: 0 },
                    { id: 'k2', time: 1, easing: 'power1.inOut', opacity: 100 },
                ],
            },
        });
        const frames = getElementKeyframes(el);
        expect(frames.some((f) => f.time === 2 && f.opacity === 100)).toBe(true);
    });

    it('leaves frames unchanged when no entrance or exit is set', () => {
        const el = makeElement({ animation: 'fadeIn', animationDuration: 1 });
        const withIds = getElementKeyframes(el);
        const without = presetToKeyframes(el);
        expect(withIds.length).toBe(without.length);
        withIds.forEach((frame, i) => {
            expect(frame.time).toBe(without[i].time);
            expect(frame.opacity).toBe(without[i].opacity);
            expect(frame.easing).toBe(without[i].easing);
        });
    });
});

describe('timed animation blocks (multiple animations per element)', () => {
    it('plays each block inside its own timeframe (fade in at 0s, fade out at 5s)', () => {
        const el = makeElement({
            animation: 'none',
            animations: [
                { id: 'b1', preset: 'fadeIn', start: 0, duration: 1 },
                { id: 'b2', preset: 'fadeOut', start: 5, duration: 1 },
            ],
        });
        const frames = getElementKeyframes(el);
        const times = frames.map((f) => f.time);

        // fadeIn block: hidden at 0, visible at 1
        expect(frames[0].time).toBe(0);
        expect(frames[0].opacity).toBe(0);
        expect(frames.some((f) => f.time === 1 && f.opacity === 100)).toBe(true);

        // fadeOut block: visible at 5, hidden at 6
        expect(frames.some((f) => f.time === 5 && f.opacity === 100)).toBe(true);
        expect(frames.some((f) => f.time === 6 && f.opacity === 0)).toBe(true);

        // all frames are sorted by time
        expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    it('ignores blocks whose preset is "none"', () => {
        const el = makeElement({
            animations: [
                { id: 'b1', preset: 'none', start: 0, duration: 1 },
                { id: 'b2', preset: 'slideInLeft', start: 2, duration: 1 },
            ],
        });
        const frames = getElementKeyframes(el);
        expect(frames.some((f) => f.time === 2 && f.opacity === 0)).toBe(true);
    });

    it('accounts for block duration in elementEndTime', () => {
        const el = makeElement({
            animations: [{ id: 'b1', preset: 'fadeOut', start: 5, duration: 2 }],
        });
        expect(elementEndTime(el)).toBeCloseTo(7);
    });

    it('produces timeline segments for entrance, main, blocks and exit', () => {
        const el = makeElement({
            animation: 'fadeIn',
            animationDuration: 1,
            enterAnimation: 'slideInLeft',
            enterDelay: 0,
            exitAnimation: 'fadeOut',
            exitDelay: 0.5,
            animations: [{ id: 'b1', preset: 'zoomIn', start: 3, duration: 1.5 }],
        });
        const segs = getElementAnimationSegments(el);
        expect(segs.map((s) => s.label)).toEqual(
            expect.arrayContaining(['Entrance', 'Main', 'Zoom In', 'Exit']),
        );
        const block = segs.find((s) => s.id === 'b1')!;
        expect(block.start).toBe(3);
        expect(block.end).toBeCloseTo(4.5);
    });

    it('applies the block easing to every generated frame', () => {
        const el = makeElement({
            animations: [{ id: 'b1', preset: 'fadeIn', start: 1, duration: 1, ease: 'bounce.out' }],
        });
        const frames = getElementKeyframes(el);
        expect(frames.length).toBeGreaterThan(0);
        frames.forEach((f) => expect(f.easing).toBe('bounce.out'));
    });

    it('repeats a looped block until the total duration', () => {
        const el = makeElement({
            animations: [{ id: 'b1', preset: 'fadeIn', start: 0, duration: 1, loop: true }],
        });
        const frames = getElementKeyframes(el, 5);
        const times = frames.map((f) => f.time);
        expect(Math.max(...times)).toBeLessThanOrEqual(5);
        // pattern (fade in over 1s) should repeat several times within 5s
        const opacityPeaks = frames.filter((f) => f.opacity === 100).length;
        expect(opacityPeaks).toBeGreaterThanOrEqual(4);
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