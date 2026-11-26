import { describe, it, expect } from 'vitest';
import { buildTrackModel, TYPE_COLORS } from './trackModel';
import type { DesignElement } from '../../store/designStore';

const base = { id: 'e1', x: 0, y: 0, width: 100, height: 40 } as const;

describe('buildTrackModel', () => {
    it('spans the pill from entrance start to banner end and colours by type', () => {
        const el = { ...base, type: 'text', text: 'Hi', enterAnimation: 'fadeIn', enterDelay: 2 } as unknown as DesignElement;
        const m = buildTrackModel(el, 10);
        expect(m.color).toBe(TYPE_COLORS.text);
        expect(m.enter).toBeDefined();
        expect(m.lifeStart).toBeCloseTo(m.enter!.start);
        expect(m.lifeEnd).toBe(10);
    });

    it('ends the pill at the exit block when there is one', () => {
        const el = { ...base, type: 'rect', enterAnimation: 'fadeIn', exitAnimation: 'fadeOut' } as unknown as DesignElement;
        const m = buildTrackModel(el, 10);
        expect(m.exit).toBeDefined();
        expect(m.lifeEnd).toBeCloseTo(m.exit!.end);
    });

    it('stretches a loop preset over its play count', () => {
        const loopEl = { ...base, type: 'image', animation: 'pulse', animationLoop: true, animationLoopCount: 2 } as unknown as DesignElement;
        const m = buildTrackModel(loopEl, 20);
        const loopSeg = m.middles.find((s) => s.kind === 'loop');
        expect(loopSeg?.plays).toBe(2);
        const forever = buildTrackModel({ ...loopEl, animationLoopCount: undefined } as DesignElement, 20);
        expect(forever.middles.find((s) => s.kind === 'loop')?.end).toBe(20);
    });

    it('adds the text-effect span', () => {
        const el = { ...base, type: 'text', text: 'Hello', textAnimation: 'ml2', textAnimationDelay: 1 } as unknown as DesignElement;
        const m = buildTrackModel(el, 10);
        expect(m.text?.start).toBe(1);
        expect(m.text!.end).toBeGreaterThan(1);
    });
});
