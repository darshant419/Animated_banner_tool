import gsap from 'gsap';
import Konva from 'konva';
import type { DesignElement, AnimationKeyframe } from '../../store/designStore';
import { getElementBaseState, getElementKeyframes, presetToKeyframes } from '../../utils/keyframes';

// Registry of per-board master-timeline seek callbacks so the Timeline can drive
// every visible artboard's canvas at 60fps without forcing a global store update
// on every animation frame (which made playback feel jerky).
const masterSeekers = new Map<string, (time: number) => void>();
export const registerMasterSeeker = (id: string, seek: (time: number) => void) => {
    masterSeekers.set(id, seek);
};
export const unregisterMasterSeeker = (id: string) => {
    masterSeekers.delete(id);
};
export const seekAllMasters = (time: number) => {
    masterSeekers.forEach((seek) => seek(time));
};


export interface BuiltElementTimeline {
    timeline: gsap.core.Timeline;
    endTime: number;
    loop: boolean;
}

/**
 * Builds a GSAP timeline for a single Konva node driven by keyframes.
 */
export const buildElementTimeline = (
    node: Konva.Node,
    el: DesignElement,
    totalDuration?: number,
    customFrames?: AnimationKeyframe[],
): BuiltElementTimeline => {
    const base = getElementBaseState(el);
    // Empty array + undefined both mean "no keyframes": settle the node at its
    // resting base state instead of playing stale/phantom tweens.
    const frames = customFrames && customFrames.length > 0 ? customFrames : getElementKeyframes(el, totalDuration);

    const blurProxy = { val: base.blur || 0 };

    const timeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        smoothChildTiming: true,
        onUpdate: () => {
            node.getLayer()?.batchDraw();
        },
    });

    const baseStateVars = {
        x: base.x,
        y: base.y,
        opacity: (base.opacity ?? 100) / 100,
        rotation: base.rotation || 0,
        scaleX: base.scaleX || 1,
        scaleY: base.scaleY || 1,
    };

    // If the animation starts from a hidden/offset state (e.g. an entrance with a
    // delay), hold that pre-animation state from t=0 so the element stays hidden
    // until its entrance actually begins. Otherwise the element would show its
    // resting state first and then replay the entrance at the delay time.
    const first = frames[0];
    const restingOpacity = (base.opacity ?? 100) / 100;
    const firstOpacity = first && first.opacity !== undefined ? first.opacity / 100 : restingOpacity;
    const startsHidden = firstOpacity < 0.02;
    const preHidden = first && startsHidden && first.time > 0.05;
    const initial = first
        ? {
            x: first.x ?? base.x,
            y: first.y ?? base.y,
            opacity: startsHidden ? 0 : (first.opacity ?? base.opacity ?? 100) / 100,
            rotation: first.rotation ?? base.rotation ?? 0,
            scaleX: first.scaleX ?? base.scaleX ?? 1,
            scaleY: first.scaleY ?? base.scaleY ?? 1,
        }
        : baseStateVars;

    // Full pre-hidden span for delayed entrances: when the entrance starts at
    // delay > 0 with a hidden/offset state, hold that state from t=0
    // (fill backwards) so the element never flashes its resting state
    // first and then replays the entrance -- that flash+replay was the
    // reported "animation happens twice" bug.
    if (preHidden) {
        timeline.set(node, { ...initial, immediateRender: true }, 0);
        timeline.to(node, { ...initial, duration: first.time, ease: 'none' }, 0);
    } else {
        timeline.set(node, initial, 0);
    }

    let cursor = 0;
    for (let i = 0; i < frames.length; i++) {
        const kf = frames[i];
        // When the pre-hidden hold tween already covers 0 -> first.time holding
        // the exact same state, skip the redundant (identical) first tween.
        if (i === 0 && preHidden) {
            cursor = kf.time;
            continue;
        }
        const dur = Math.max(0.01, kf.time - cursor);
        const ease = kf.easing || 'power1.inOut';

        // NOTE: no `overwrite` here on purpose. The master timeline is driven by
        // seek(), so every tween renders on scrub/loop; `overwrite: true` would
        // permanently kill sibling tweens of the node the first time they init,
        // leaving nothing to animate on the next loop/scrub. The timeline
        // default `overwrite: 'auto'` already resolves any real overlap.
        const vars: Record<string, unknown> = {
            duration: dur,
            ease,
            immediateRender: false,
        };
        if (kf.x !== undefined) vars.x = kf.x;
        if (kf.y !== undefined) vars.y = kf.y;
        if (kf.opacity !== undefined) vars.opacity = kf.opacity / 100;
        if (kf.rotation !== undefined) vars.rotation = kf.rotation;
        if (kf.scaleX !== undefined) vars.scaleX = kf.scaleX;
        if (kf.scaleY !== undefined) vars.scaleY = kf.scaleY;
        if (kf.letterSpacing !== undefined && 'letterSpacing' in (node as any)) {
            vars.letterSpacing = kf.letterSpacing;
        }

        if (kf.blur !== undefined) {
            timeline.to(blurProxy, {
                val: kf.blur,
                duration: dur,
                ease,
                onUpdate: () => {
                    const anyNode = node as any;
                    if (blurProxy.val > 0) {
                        if (typeof anyNode.shadowBlur === 'function') {
                            anyNode.shadowBlur(blurProxy.val);
                            anyNode.shadowColor(anyNode.fill?.() || '#000000');
                            anyNode.shadowOffset({ x: 0, y: 0 });
                        }
                    } else {
                        if (typeof anyNode.shadowBlur === 'function') {
                            anyNode.shadowBlur(0);
                        }
                    }
                    node.getLayer()?.batchDraw();
                },
            }, cursor);
        }

        timeline.to(node, vars, cursor);
        cursor = kf.time;
    }

    const endTime = Math.max(...frames.map((f) => f.time), 0);
    const loop = el.anim?.loop === true || el.animationLoop === true;
    return { timeline, endTime, loop };
};

/**
 * Builds a master timeline for every element in a design.
 */
export const buildMasterTimeline = (
    nodes: Map<string, Konva.Node>,
    elements: DesignElement[],
    totalDuration: number,
    loop: boolean,
): gsap.core.Timeline => {
    const master = gsap.timeline({
        // The master timeline is driven exclusively by the shared playhead
        // (DesignCanvas seeks it on every playhead change). It must NOT
        // self-play, otherwise the canvas animates on its own while paused
        // and fights the scrubbing/playback loop.
        paused: true,
        repeat: loop ? -1 : 0,
        repeatDelay: 0,
        onUpdate: () => {
            nodes.forEach((node) => {
                node.getLayer()?.batchDraw();
            });
        },
    });

    elements.forEach((el) => {
        const node = nodes.get(el.id);
        if (!node) return;
        const built = buildElementTimeline(node, el, totalDuration);
        if (built.loop && built.endTime > 0) {
            built.timeline.repeat(-1);
            built.timeline.repeatDelay(0);
            master.add(built.timeline, 0);
        } else {
            master.add(built.timeline, 0);
        }
    });

    master.totalDuration(Math.max(totalDuration, 0.1));
    return master;
};

// Global active preview tracker so we can cancel isolated previews anytime
let activePreviewTimeline: gsap.core.Timeline | null = null;
let activePreviewNode: Konva.Node | null = null;
let activePreviewBaseState: { x: number; y: number; opacity: number; rotation: number; scaleX: number; scaleY: number; shadowBlur: number } | null = null;

/**
 * Executes an instant real-time live preview of an animation directly on the canvas element.
 */
export const previewElementOnCanvas = (
    node: Konva.Node,
    el: DesignElement,
    preset: string,
    duration: number = 0.8,
    delay: number = 0,
    easing?: string,
    loop: boolean = false,
    onComplete?: () => void,
): gsap.core.Timeline => {
    stopActivePreview();

    const base = getElementBaseState(el);
    const anyNode = node as any;
    activePreviewNode = node;
    activePreviewBaseState = {
        x: node.x(),
        y: node.y(),
        opacity: node.opacity(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        shadowBlur: typeof anyNode.shadowBlur === 'function' ? anyNode.shadowBlur() : 0,
    };

    const frames = presetToKeyframes(el, preset, delay, duration, easing);
    if (frames.length === 0) {
        return gsap.timeline();
    }

    const { timeline } = buildElementTimeline(node, el, duration + delay, frames);
    if (loop) {
        timeline.repeat(-1);
        timeline.repeatDelay(0.3);
    } else {
        timeline.eventCallback('onComplete', () => {
            if (onComplete) onComplete();
            // Restore resting state smoothly
            gsap.to(node, {
                x: base.x,
                y: base.y,
                opacity: (base.opacity ?? 100) / 100,
                rotation: base.rotation || 0,
                scaleX: base.scaleX || 1,
                scaleY: base.scaleY || 1,
                duration: 0.3,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
                onComplete: () => {
                    if (typeof anyNode.shadowBlur === 'function') {
                        anyNode.shadowBlur(base.blur || 0);
                    }
                    node.getLayer()?.batchDraw();
                },
            });
        });
    }

    activePreviewTimeline = timeline;
    timeline.play(0);
    return timeline;
};

/**
 * Stops any active element animation preview and restores node properties.
 */
export const stopActivePreview = () => {
    if (activePreviewTimeline) {
        activePreviewTimeline.kill();
        activePreviewTimeline = null;
    }
    if (activePreviewNode && activePreviewBaseState) {
        const anyNode = activePreviewNode as any;
        activePreviewNode.x(activePreviewBaseState.x);
        activePreviewNode.y(activePreviewBaseState.y);
        activePreviewNode.opacity(activePreviewBaseState.opacity);
        activePreviewNode.rotation(activePreviewBaseState.rotation);
        activePreviewNode.scaleX(activePreviewBaseState.scaleX);
        activePreviewNode.scaleY(activePreviewBaseState.scaleY);
        if (typeof anyNode.shadowBlur === 'function') {
            anyNode.shadowBlur(activePreviewBaseState.shadowBlur);
        }
        activePreviewNode.getLayer()?.batchDraw();
        activePreviewNode = null;
        activePreviewBaseState = null;
    }
};

