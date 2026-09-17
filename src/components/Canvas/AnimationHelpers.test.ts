import { describe, it, expect } from 'vitest';
import { buildElementTimeline } from './AnimationHelpers';
import type { DesignElement } from '../../store/designStore';

/** Minimal Konva-node stand-in: method getters/setters exactly like Konva's,
 *  which is what GSAP detects (function props) to tween Konva nodes. */
const makeNode = () => {
    const state = { x: 0, y: 0, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 };
    const node: any = {
        getLayer: () => null,
        x: (v?: number) => (v === undefined ? state.x : (state.x = v)),
        y: (v?: number) => (v === undefined ? state.y : (state.y = v)),
        opacity: (v?: number) => (v === undefined ? state.opacity : (state.opacity = v)),
        rotation: (v?: number) => (v === undefined ? state.rotation : (state.rotation = v)),
        scaleX: (v?: number) => (v === undefined ? state.scaleX : (state.scaleX = v)),
        scaleY: (v?: number) => (v === undefined ? state.scaleY : (state.scaleY = v)),
        letterSpacing: (_v?: number) => undefined,
    };
    return { node, state };
};

const delayedFadeEl = (): DesignElement => ({
    id: 'el-test',
    type: 'rect',
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    enterAnimation: 'fadeIn',
    enterDelay: 1,
    animationDuration: 0.8,
});

describe('buildElementTimeline', () => {
    it('holds the hidden pre-state until the delayed entrance begins, then animates in', () => {
        const { node, state } = makeNode();
        const { timeline } = buildElementTimeline(node, delayedFadeEl(), 5);

        timeline.seek(0.5, false);
        expect(state.opacity).toBe(0); // still hidden during the delay

        timeline.seek(1.4, false); // mid-entrance (1s -> 1.8s)
        expect(state.opacity).toBeGreaterThan(0);
        expect(state.opacity).toBeLessThan(1);

        timeline.seek(2.5, false); // after the entrance
        expect(state.opacity).toBeCloseTo(1, 2);
    });

    it('keeps tweens alive after seeking past the end and back (loop/scrub)', () => {
        const { node, state } = makeNode();
        const { timeline } = buildElementTimeline(node, delayedFadeEl(), 5);

        timeline.seek(4, false); // run past the entrance
        timeline.seek(0.5, false); // scrub back into the delay window
        expect(state.opacity).toBe(0); // reset tween must still exist

        timeline.seek(1.4, false);
        expect(state.opacity).toBeGreaterThan(0);
        expect(state.opacity).toBeLessThan(1);
    });

    it('repeats correctly when the timeline loops (repeat -1)', () => {
        const { node, state } = makeNode();
        const built = buildElementTimeline(node, delayedFadeEl(), 5);
        built.timeline.repeat(-1);

        // Simulate master seeking across a loop boundary: after one full cycle
        // (the child timeline's raw length), t=0.5 of the next pass again.
        built.timeline.totalTime(built.endTime + 0.5, false);
        expect(state.opacity).toBe(0); // hidden again on the new pass

        built.timeline.totalTime(built.endTime + 1.4, false);
        expect(state.opacity).toBeGreaterThan(0);
        expect(state.opacity).toBeLessThan(1);
    });
});
