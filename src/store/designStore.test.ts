import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore, reflowElements, getArtboardPresets } from './designStore';
import type { DesignElement } from './designStore';
const textEl = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'el-1',
    type: 'text',
    x: 100,
    y: 80,
    width: 200,
    height: 60,
    text: 'Hello',
    fontSize: 24,
    ...overrides,
});

describe('designStore', () => {
    beforeEach(() => {
        useDesignStore.getState().reset();
    });

    describe('addElement / updateElement / removeElement', () => {
        it('adds an element and selects it', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            const state = useDesignStore.getState();
            expect(state.elements).toHaveLength(1);
            expect(state.selectedId).toBe('el-1');
        });

        it('updates an element by id', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.updateElement('el-1', { fontSize: 32 });
            const el = useDesignStore.getState().elements[0];
            expect(el.fontSize).toBe(32);
        });

        it('removes an element and clears its selection', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.removeElement('el-1');
            const state = useDesignStore.getState();
            expect(state.elements).toHaveLength(0);
            expect(state.selectedId).toBeNull();
        });

        it('duplicates an element with a new id and shifted position', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.duplicateElement('el-1');
            const state = useDesignStore.getState();
            expect(state.elements).toHaveLength(2);
            const clone = state.elements[1];
            expect(clone.id).not.toBe('el-1');
            expect(clone.x).toBe(112);
            expect(clone.name).toContain('Copy');
            expect(state.selectedId).toBe(clone.id);
        });
    });

    describe('moveElement', () => {
        it('moves an element to a specific final z-order index', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            store.addElement(textEl({ id: 'c' }));

            // Move 'a' (index 0) to the end (top of the stack).
            store.moveElement('a', 2);
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['b', 'c', 'a']);

            // Move 'c' (index 2) to the front (bottom of the stack).
            store.moveElement('c', 0);
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['c', 'b', 'a']);
        });

        it('moves within the middle of the stack', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            store.addElement(textEl({ id: 'c' }));
            store.addElement(textEl({ id: 'd' }));

            store.moveElement('b', 3); // b (index 1) → end
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['a', 'c', 'd', 'b']);

            store.moveElement('d', 1); // d (index 3) → index 1
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['a', 'd', 'c', 'b']);
        });

        it('no-ops when already at the target index and clamps out-of-range targets', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            store.addElement(textEl({ id: 'c' }));

            store.moveElement('b', 1); // already there
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['a', 'b', 'c']);

            store.moveElement('b', 99); // clamp to last index
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['a', 'c', 'b']);

            store.moveElement('c', -5); // clamp to first index
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['c', 'a', 'b']);
        });

        it('keeps the active artboard in sync with the new order', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            store.moveElement('a', 1);

            const state = useDesignStore.getState();
            const board = state.artboards.find((b) => b.id === state.activeArtboardId)!;
            expect(board.elements.map((el) => el.id)).toEqual(['b', 'a']);
        });

        it('records a single undoable history entry', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            store.addElement(textEl({ id: 'c' }));
            const pastBefore = useDesignStore.getState().past.length;

            store.moveElement('a', 2);
            const state = useDesignStore.getState();
            expect(state.past.length).toBe(pastBefore + 1);
            expect(state.elements.map((el) => el.id)).toEqual(['b', 'c', 'a']);

            state.undo();
            expect(useDesignStore.getState().elements.map((el) => el.id)).toEqual(['a', 'b', 'c']);
        });
    });

    describe('undo / redo', () => {
        it('restores the previous snapshot on undo and re-applies on redo', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'a' }));
            store.addElement(textEl({ id: 'b' }));
            expect(useDesignStore.getState().elements).toHaveLength(2);

            useDesignStore.getState().undo();
            expect(useDesignStore.getState().elements).toHaveLength(1);
            expect(useDesignStore.getState().elements[0].id).toBe('a');

            useDesignStore.getState().redo();
            expect(useDesignStore.getState().elements).toHaveLength(2);
        });

        it('does nothing when there is no history', () => {
            useDesignStore.getState().undo();
            useDesignStore.getState().redo();
            expect(useDesignStore.getState().elements).toHaveLength(0);
        });
    });

    describe('keyframes', () => {
        it('adds a keyframe sorted by time and selects it', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.addKeyframe('el-1', { id: 'kf-2', time: 2, easing: 'power1.inOut' });
            store.addKeyframe('el-1', { id: 'kf-1', time: 1, easing: 'power1.inOut' });

            const state = useDesignStore.getState();
            const frames = state.elements[0].anim!.keyframes;
            expect(frames.map((k) => k.time)).toEqual([1, 2]);
            expect(state.selectedKeyframe).toEqual({ elementId: 'el-1', keyframeId: 'kf-1' });
        });

        it('updates a keyframe time and keeps the rest intact', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.addKeyframe('el-1', { id: 'kf-1', time: 1, easing: 'power1.inOut', x: 50 });
            store.updateKeyframe('el-1', 'kf-1', { time: 3, x: 90 });

            const frames = useDesignStore.getState().elements[0].anim!.keyframes;
            expect(frames[0]).toMatchObject({ time: 3, x: 90 });
        });

        it('removes a keyframe and clears its selection', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl());
            store.addKeyframe('el-1', { id: 'kf-1', time: 1, easing: 'power1.inOut' });
            store.removeKeyframe('el-1', 'kf-1');

            const state = useDesignStore.getState();
            expect(state.elements[0].anim!.keyframes).toHaveLength(0);
            expect(state.selectedKeyframe).toBeNull();
        });

        it('clamps playhead time to the total duration', () => {
            useDesignStore.getState().setTotalDuration(5);
            useDesignStore.getState().setPlayheadTime(10);
            expect(useDesignStore.getState().playheadTime).toBe(5);
            useDesignStore.getState().setPlayheadTime(-2);
            expect(useDesignStore.getState().playheadTime).toBe(0);
        });
    });

    describe('artboards / smart resize', () => {
        it('adds a unique artboard and makes it active', () => {
            const store = useDesignStore.getState();
            store.addArtboard(728, 90, 'Leaderboard');
            const state = useDesignStore.getState();
            expect(state.artboards).toHaveLength(2);
            expect(state.activeArtboardId).toBe(state.artboards[1].id);
        });

        it('does not duplicate an existing artboard size', () => {
            const store = useDesignStore.getState();
            store.addArtboard(300, 250);
            expect(useDesignStore.getState().artboards).toHaveLength(1);
        });

        it('reflows elements when switching artboards (smart resize)', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ x: 150, y: 125 }));
            store.addArtboard(300, 600, 'Half Page');

            const state = useDesignStore.getState();
            expect(state.canvasWidth).toBe(300);
            expect(state.canvasHeight).toBe(600);
            const el = state.elements[0];
            expect(el.y).toBeCloseTo((125 / 250) * 600);
        });

        it('keeps the last artboard when removing (min 1)', () => {
            const store = useDesignStore.getState();
            store.addArtboard(728, 90);
            store.removeArtboard('art-1');
            const state = useDesignStore.getState();
            expect(state.artboards).toHaveLength(1);
            expect(state.artboards[0].width).toBe(728);
        });

        it('adds multiple campaign sizes at once and makes the first active', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ x: 150, y: 125 }));
            store.addCampaignSizes([
                { width: 728, height: 90, label: 'Leaderboard' },
                { width: 300, height: 600, label: 'Half Page' },
            ]);
            const state = useDesignStore.getState();
            expect(state.artboards).toHaveLength(3);
            expect(state.canvasWidth).toBe(728);
            expect(state.canvasHeight).toBe(90);
            const el = state.elements[0];
            expect(el.x).toBeCloseTo((150 / 300) * 728);
            expect(el.y).toBeCloseTo((125 / 250) * 90);
        });

        it('skips campaign sizes that already exist', () => {
            const store = useDesignStore.getState();
            store.addCampaignSizes([
                { width: 300, height: 250 },
                { width: 728, height: 90 },
            ]);
            const state = useDesignStore.getState();
            expect(state.artboards).toHaveLength(2);
            expect(state.canvasWidth).toBe(728);
        });

        it('keeps edits per-artboard: resizing on one size does not affect the others', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'el-1', x: 100, y: 100, width: 200, height: 100 }));
            store.addArtboard(728, 90, 'Leaderboard');

            // The cloned element on the new board has its own id
            const leaderboardElId = useDesignStore.getState().elements[0].id;
            expect(leaderboardElId).not.toBe('el-1');

            // Resize the element ONLY on the 728x90 board
            store.updateElement(leaderboardElId, { width: 400, height: 80 });
            const leaderboard = useDesignStore.getState().elements[0];
            expect(leaderboard.width).toBe(400);
            expect(leaderboard.height).toBe(80);

            // Switch back to the original 300x250 board: its element is untouched
            const original = useDesignStore.getState().artboards.find((a) => a.width === 300 && a.height === 250)!;
            store.setActiveArtboard(original.id);
            const state = useDesignStore.getState();
            expect(state.elements[0].width).toBe(200);
            expect(state.elements[0].height).toBe(100);

            // And the leaderboard edit is preserved too
            store.setActiveArtboard(useDesignStore.getState().artboards.find((a) => a.width === 728)!.id);
            expect(useDesignStore.getState().elements[0].width).toBe(400);
        });

        it('switching back and forth restores each board own elements without reflow', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'el-1', x: 150, y: 125 }));
            const orig = store.activeArtboardId;

            store.addArtboard(300, 600, 'Half Page');

            // The cloned design on the new board gets its own unique element ids,
            // so edits in the multi-size view stay scoped to one size.
            let el = useDesignStore.getState().elements[0];
            expect(el.id).not.toBe('el-1');
            store.updateElement(el.id, { x: 10, y: 20 });

            // Switch back to 300x250
            store.setActiveArtboard(orig);
            el = useDesignStore.getState().elements[0];
            expect(el.id).toBe('el-1');
            expect(el.x).toBeCloseTo((150 / 300) * 300);
            expect(el.y).toBeCloseTo((125 / 250) * 250);

            // Switch to Half Page again — keeps its own custom x/y
            const half = useDesignStore.getState().artboards.find((a) => a.height === 600)!;
            store.setActiveArtboard(half.id);
            el = useDesignStore.getState().elements[0];
            expect(el.x).toBe(10);
            expect(el.y).toBe(20);
        });

        it('gives cloned elements unique ids across all artboards', () => {
            const store = useDesignStore.getState();
            store.addElement(textEl({ id: 'el-1' }));
            store.addCampaignSizes([
                { width: 728, height: 90 },
                { width: 160, height: 600 },
            ]);
            const state = useDesignStore.getState();
            const allIds = state.artboards.flatMap((a) => a.elements.map((e) => e.id));
            expect(allIds.length).toBe(3);
            expect(new Set(allIds).size).toBe(3);
        });
    });

    describe('reflowElements', () => {
        it('scales position and size proportionally', () => {
            const result = reflowElements(
                [textEl({ x: 100, y: 100, width: 200, height: 100, fontSize: 20 })],
                300,
                250,
                600,
                500,
            );
            expect(result[0].x).toBe(200);
            expect(result[0].y).toBe(200);
            expect(result[0].width).toBe(400);
            expect(result[0].fontSize).toBe(40);
        });

        it('returns elements unchanged when old size is missing', () => {
            const els = [textEl()];
            expect(reflowElements(els, 0, 0, 600, 500)).toBe(els);
        });
    });

    describe('loadTemplate / presets', () => {
        it('loads a template and resets to a single matching artboard', () => {
            const store = useDesignStore.getState();
            store.loadTemplate([textEl(), textEl({ id: 'el-2', x: 10 })], 728, 90, 8);
            const state = useDesignStore.getState();
            expect(state.elements).toHaveLength(2);
            expect(state.canvasWidth).toBe(728);
            expect(state.totalDuration).toBe(8);
            expect(state.artboards).toHaveLength(1);
            expect(state.artboards[0].width).toBe(728);
        });

        it('exposes IAB standard artboard presets', () => {
            const presets = getArtboardPresets();
            expect(presets.some((p) => p.width === 300 && p.height === 250)).toBe(true);
            expect(presets.some((p) => p.width === 728 && p.height === 90)).toBe(true);
            expect(presets.some((p) => p.width === 970 && p.height === 250)).toBe(true);
        });

        it('loads a saved banner template as a new unsaved project', () => {
            const store = useDesignStore.getState();
            store.loadProjectState({
                id: 'proj_old',
                name: 'Old banner',
                canvasWidth: 300,
                canvasHeight: 250,
                totalDuration: 10,
                loop: true,
                canvasBackground: '#ffffff',
                elements: [textEl()],
            });
            expect(useDesignStore.getState().projectId).toBe('proj_old');

            useDesignStore.getState().loadTemplateState({
                name: 'Starter template',
                canvasWidth: 728,
                canvasHeight: 90,
                totalDuration: 12,
                loop: false,
                canvasBackground: '#000000',
                elements: [textEl({ id: 'el-template', x: 5 })],
                artboards: [],
            });

            const state = useDesignStore.getState();
            expect(state.projectId).toBeNull();
            expect(state.projectName).toBe('Starter template');
            expect(state.canvasWidth).toBe(728);
            expect(state.canvasHeight).toBe(90);
            expect(state.totalDuration).toBe(12);
            expect(state.loop).toBe(false);
            expect(state.elements).toHaveLength(1);
            expect(state.elements[0].id).toBe('el-template');
            expect(state.artboards).toHaveLength(1);
            expect(state.artboards[0].width).toBe(728);
            expect(state.lastSavedAt).toBeNull();
        });

        it('keeps every saved artboard when the template has multiple sizes', () => {
            const store = useDesignStore.getState();
            store.loadTemplateState({
                name: 'Campaign template',
                canvasWidth: 300,
                canvasHeight: 250,
                totalDuration: 10,
                loop: true,
                canvasBackground: '#ffffff',
                elements: [textEl()],
                artboards: [
                    { id: 'art-a', label: '300x250', width: 300, height: 250, elements: [textEl()] },
                    { id: 'art-b', label: '728x90', width: 728, height: 90, elements: [] },
                ],
            });

            const state = useDesignStore.getState();
            expect(state.artboards.map((a) => a.id)).toEqual(['art-a', 'art-b']);
            expect(state.activeArtboardId).toBe('art-a');
        });
    });
});