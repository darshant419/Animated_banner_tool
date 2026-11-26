import { describe, it, expect } from 'vitest';
import { getLoopPlays, getElementKeyframes } from './keyframes';
import { buildAnimationStartEvent } from './bannerExport';
import type { DesignElement } from '../store/designStore';

describe('loop count', () => {
    it('normalises counts (0 / unset / invalid = forever)', () => {
        expect(getLoopPlays(undefined)).toBe(0);
        expect(getLoopPlays(0)).toBe(0);
        expect(getLoopPlays(-3)).toBe(0);
        expect(getLoopPlays(NaN)).toBe(0);
        expect(getLoopPlays(3)).toBe(3);
        expect(getLoopPlays(2.4)).toBe(2);
    });

    it('exports a finite iteration count, or infinite when unset', () => {
        const base = { id: 'a', startDelayMs: 0, durationMs: 1000, loop: true, animationName: 'anim-a' };
        expect(buildAnimationStartEvent({ ...base, loopCount: 3 })).toContain('1000ms linear 3 anim-a');
        expect(buildAnimationStartEvent(base)).toContain('1000ms linear infinite anim-a');
        expect(buildAnimationStartEvent({ ...base, loop: false, loopCount: 3 })).toContain('1000ms linear anim-a');
    });

    it('limits a looped timed block to its play count', () => {
        const el = {
            id: 'e', type: 'rect', x: 0, y: 0, width: 10, height: 10,
            animations: [{ id: 'b', preset: 'pulse', start: 0, duration: 1, loop: true, loopCount: 2 }],
        } as unknown as DesignElement;
        const unlimited = { ...el, animations: [{ ...el.animations![0], loopCount: undefined }] } as DesignElement;
        const limited = getElementKeyframes(el, 10);
        const all = getElementKeyframes(unlimited, 10);
        expect(limited.length).toBeGreaterThan(0);
        expect(Math.max(...limited.map((f) => f.time))).toBeLessThanOrEqual(2);
        expect(all.length).toBeGreaterThan(limited.length);
    });
});
