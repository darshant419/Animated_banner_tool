import gsap from 'gsap';
import Konva from 'konva';
import type { DesignElement, AnimationKeyframe } from '../../store/designStore';
import { getElementBaseState, getElementKeyframes, presetToKeyframes } from '../../utils/keyframes';

export const setInitialAnimationState = (node: Konva.Node, animation: string, el: DesignElement) => {
    switch (animation) {
        // Slide Animations
        case 'slideInTop':
            node.y(el.y - 150);
            node.opacity(0);
            break;
        case 'slideInBottom':
            node.y(el.y + 150);
            node.opacity(0);
            break;
        case 'slideInLeft':
            node.x(el.x - 150);
            node.opacity(0);
            break;
        case 'slideInRight':
            node.x(el.x + 150);
            node.opacity(0);
            break;
        case 'slideInTopLeft':
            node.x(el.x - 100);
            node.y(el.y - 100);
            node.opacity(0);
            break;
        case 'slideInTopRight':
            node.x(el.x + 100);
            node.y(el.y - 100);
            node.opacity(0);
            break;
        case 'slideInBottomLeft':
            node.x(el.x - 100);
            node.y(el.y + 100);
            node.opacity(0);
            break;
        case 'slideInBottomRight':
            node.x(el.x + 100);
            node.y(el.y + 100);
            node.opacity(0);
            break;

        // Fade Animations
        case 'fadeIn':
            node.opacity(0);
            break;
        case 'fadeOut':
            node.opacity(1);
            break;
        case 'fadeInOut':
            node.opacity(0);
            break;

        // Transformation Animations
        case 'zoomIn':
        case 'pulse':
            node.scaleX(0);
            node.scaleY(0);
            node.opacity(0);
            break;
        case 'zoomOut':
            node.scaleX(2);
            node.scaleY(2);
            node.opacity(0);
            break;
        case 'spin':
        case 'rotate360':
            node.rotation(-360);
            node.opacity(0);
            break;
        case 'flip':
            node.scaleX(0);
            node.opacity(0);
            break;
        case 'shake':
            break;
        case 'skew':
            node.skewX(-20);
            node.opacity(0);
            break;

        // Floating Animations
        case 'float':
        case 'bounce':
        case 'swing':
        case 'continuousSlideX':
        case 'continuousSlideY':
            break;
    }
};

export const applyAnimation = (
    node: Konva.Node,
    animation: string,
    el: DesignElement,
    duration: number,
    delay: number
) => {
    const timeline = gsap.timeline({
        delay,
        repeat: el.animationLoop ? -1 : 0,
        yoyo: el.animationLoop ? true : false
    });

    switch (animation) {
        case 'slideInTop':
        case 'slideInBottom':
            timeline.to(node, {
                y: el.y,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'slideInLeft':
        case 'slideInRight':
            timeline.to(node, {
                x: el.x,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'slideInTopLeft':
        case 'slideInTopRight':
        case 'slideInBottomLeft':
        case 'slideInBottomRight':
            timeline.to(node, {
                x: el.x,
                y: el.y,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'fadeIn':
            timeline.to(node, {
                opacity: 1,
                duration,
                ease: 'power2.inOut'
            });
            break;

        case 'fadeOut':
            timeline.to(node, {
                opacity: 0,
                duration,
                ease: 'power2.inOut'
            });
            break;

        case 'fadeInOut':
            gsap.to(node, {
                opacity: 1,
                duration: duration / 2,
                delay,
                yoyo: true,
                repeat: -1,
                ease: 'power2.inOut'
            });
            break;

        case 'zoomIn':
            timeline.to(node, {
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                duration,
                ease: 'back.out(1.7)'
            });
            break;

        case 'zoomOut':
            timeline.to(node, {
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'pulse':
            gsap.to(node, {
                scaleX: 1.1,
                scaleY: 1.1,
                duration: duration / 2,
                delay,
                yoyo: true,
                repeat: -1,
                ease: 'power2.inOut'
            });
            gsap.set(node, { scaleX: 1, scaleY: 1, opacity: 1 });
            break;

        case 'spin':
        case 'rotate360':
            timeline.to(node, {
                rotation: el.rotation || 0,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'flip':
            timeline.to(node, {
                scaleX: 1,
                opacity: 1,
                duration,
                ease: 'back.out(1.7)'
            });
            break;

        case 'shake': {
            const shakeAmount = 10;
            timeline
                .to(node, { x: el.x - shakeAmount, duration: 0.1 })
                .to(node, { x: el.x + shakeAmount, duration: 0.1 })
                .to(node, { x: el.x - shakeAmount, duration: 0.1 })
                .to(node, { x: el.x + shakeAmount, duration: 0.1 })
                .to(node, { x: el.x, duration: 0.1 });
            break;
        }

        case 'skew':
            timeline.to(node, {
                skewX: 0,
                opacity: 1,
                duration,
                ease: 'power2.out'
            });
            break;

        case 'float':
            gsap.to(node, {
                y: `+=${15}`,
                duration: duration || 2,
                delay,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut'
            });
            break;

        case 'bounce':
            gsap.to(node, {
                y: `-=${20}`,
                duration: duration || 0.5,
                delay,
                yoyo: true,
                repeat: -1,
                ease: 'bounce.out'
            });
            break;

        case 'swing':
            gsap.to(node, {
                rotation: `+=${10}`,
                duration: duration || 1,
                delay,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
                transformOrigin: 'center center'
            });
            break;

        case 'continuousSlideX':
            gsap.to(node, {
                x: `+=${100}`,
                duration: duration || 2,
                repeat: -1,
                ease: 'none',
                delay
            });
            break;

        case 'continuousSlideY':
            gsap.to(node, {
                y: `+=${100}`,
                duration: duration || 2,
                repeat: -1,
                ease: 'none',
                delay
            });
            break;
    }
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
    const frames = customFrames || getElementKeyframes(el, totalDuration);

    const blurProxy = { val: base.blur || 0 };

    const timeline = gsap.timeline({
        onUpdate: () => {
            node.getLayer()?.batchDraw();
        },
    });

    timeline.set(node, {
        x: base.x,
        y: base.y,
        opacity: (base.opacity ?? 100) / 100,
        rotation: base.rotation || 0,
        scaleX: base.scaleX || 1,
        scaleY: base.scaleY || 1,
    }, 0);

    let cursor = 0;
    for (const kf of frames) {
        const dur = Math.max(0.01, kf.time - cursor);
        const ease = kf.easing || 'power1.inOut';

        const vars: Record<string, unknown> = {
            duration: dur,
            ease,
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

export const applyHoverEffect = (node: Konva.Node, el: DesignElement) => {
    if (!el.hoverAnimation || el.hoverAnimation === 'none') return;

    switch (el.hoverAnimation) {
        case 'colorChange':
            if (el.hoverColor) {
                gsap.to(node, {
                    fill: el.hoverColor,
                    duration: 0.3,
                    ease: 'power2.out',
                    onUpdate: () => {
                        node.getLayer()?.batchDraw();
                    },
                });
            }
            break;
        case 'glow':
            gsap.to(node, {
                shadowColor: el.hoverColor || '#ef4444',
                shadowBlur: 20,
                shadowOpacity: 0.8,
                duration: 0.3,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
        case 'shadowPop':
            gsap.to(node, {
                shadowColor: 'rgba(0,0,0,0.4)',
                shadowBlur: 14,
                shadowOffset: { x: 5, y: 5 },
                shadowOpacity: 0.6,
                x: el.x - 2,
                y: el.y - 2,
                duration: 0.2,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
        case 'letterSpacing':
            if (el.type === 'text') {
                gsap.to(node, {
                    letterSpacing: (el.letterSpacing || 0) + 6,
                    duration: 0.3,
                    ease: 'power2.out',
                    onUpdate: () => {
                        node.getLayer()?.batchDraw();
                    },
                });
            }
            break;
        case 'scale':
            gsap.to(node, {
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 0.2,
                ease: 'back.out(1.5)',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
    }
};

export const resetHoverEffect = (node: Konva.Node, el: DesignElement) => {
    if (!el.hoverAnimation || el.hoverAnimation === 'none') return;

    switch (el.hoverAnimation) {
        case 'colorChange':
            gsap.to(node, {
                fill: el.fill || '#000000',
                duration: 0.3,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
        case 'glow':
            gsap.to(node, {
                shadowBlur: el.shadowBlur || 0,
                shadowOpacity: el.shadowOpacity || 0,
                duration: 0.3,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
        case 'shadowPop':
            gsap.to(node, {
                shadowBlur: el.shadowBlur || 0,
                shadowOffset: { x: el.shadowOffsetX || 0, y: el.shadowOffsetY || 0 },
                shadowOpacity: el.shadowOpacity || 0,
                x: el.x,
                y: el.y,
                duration: 0.2,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
        case 'letterSpacing':
            if (el.type === 'text') {
                gsap.to(node, {
                    letterSpacing: el.letterSpacing || 0,
                    duration: 0.3,
                    ease: 'power2.out',
                    onUpdate: () => {
                        node.getLayer()?.batchDraw();
                    },
                });
            }
            break;
        case 'scale':
            gsap.to(node, {
                scaleX: el.scaleX || 1,
                scaleY: el.scaleY || 1,
                duration: 0.2,
                ease: 'power2.out',
                onUpdate: () => {
                    node.getLayer()?.batchDraw();
                },
            });
            break;
    }
};
