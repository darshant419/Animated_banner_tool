import type { DesignElement } from '../store/designStore';

/**
 * Calculates a safe on-canvas position for a newly added element so it always
 * appears within the visible area of the current artboard, regardless of banner
 * size.
 *
 * - ISI tray: docked at the bottom of the canvas, centered horizontally.
 * - PI strip: docked near the top, centered horizontally.
 * - Everything else: centered horizontally, placed in the upper-middle vertically,
 *   clamped so the element never extends beyond the canvas edges.
 *
 * @param canvasWidth  Current artboard width
 * @param canvasHeight Current artboard height
 * @param el           Element being added (type + width/height)
 * @returns { x, y } position within canvas bounds
 */
export function getSafeElementPosition(
    canvasWidth: number,
    canvasHeight: number,
    el: Pick<DesignElement, 'type' | 'width' | 'height'>,
): { x: number; y: number } {
    const w = Number(el.width) || 300;
    const h = Number(el.height) || 200;
    const cw = Math.max(canvasWidth, 1);
    const ch = Math.max(canvasHeight, 1);

    // ISI tray: dock at the bottom of the canvas so it's always visible.
    if (el.type === 'isiScroll') {
        const x = Math.max(0, (cw - w) / 2);
        const y = Math.max(0, ch - h);
        return { x, y };
    }

    // PI strip: dock near the top of the canvas.
    if (el.type === 'piStrip') {
        const x = Math.max(0, (cw - w) / 2);
        const y = Math.max(0, ch * 0.05);
        return { x, y };
    }

    // Default: center horizontally, place in the upper-middle vertically.
    let x = Math.max(0, (cw - w) / 2);
    let y = Math.max(0, ch * 0.2);

    // Clamp vertically so the element doesn't extend past the bottom edge.
    if (y + h > ch) y = Math.max(0, ch - h);
    // Clamp horizontally so the element doesn't extend past the right edge.
    if (x + w > cw) x = Math.max(0, cw - w);

    return { x, y };
}
