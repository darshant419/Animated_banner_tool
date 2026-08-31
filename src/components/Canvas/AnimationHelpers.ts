import gsap from 'gsap';
import Konva from 'konva';
import type { DesignElement } from '../../store/designStore';
import { getElementBaseState, getElementKeyframes } from '../../utils/keyframes';

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
            // No initial state needed
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
        // Slide Animations
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

        // Fade Animations
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

        // Transformation Animations
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

        // Floating Animations
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
 * Builds a GSAP timeline for a single Konva node driven by the element's
 * keyframes. The node rests at its base state at t=0, then tweens through
 * each keyframe at its absolute time.
 */
export const buildElementTimeline = (node: Konva.Node, el: DesignElement, totalDuration?: number): BuiltElementTimeline => {
    const base = getElementBaseState(el);
    const frames = getElementKeyframes(el, totalDuration);

    const timeline = gsap.timeline();
    timeline.set(node, {
        x: base.x,
        y: base.y,
        opacity: base.opacity / 100,
        rotation: base.rotation,
        scaleX: base.scaleX,
        scaleY: base.scaleY,
    }, 0);

    let cursor = 0;
    for (const kf of frames) {
        const vars: Record<string, unknown> = {
            duration: Math.max(0.01, kf.time - cursor),
            ease: kf.easing || 'power1.inOut',
        };
        if (kf.x !== undefined) vars.x = kf.x;
        if (kf.y !== undefined) vars.y = kf.y;
        if (kf.opacity !== undefined) vars.opacity = kf.opacity / 100;
        if (kf.rotation !== undefined) vars.rotation = kf.rotation;
        if (kf.scaleX !== undefined) vars.scaleX = kf.scaleX;
        if (kf.scaleY !== undefined) vars.scaleY = kf.scaleY;
        if (kf.letterSpacing !== undefined) vars.letterSpacing = kf.letterSpacing;
        timeline.to(node, vars, cursor);
        cursor = kf.time;
    }

    const endTime = Math.max(...frames.map((f) => f.time), 0);
    const loop = el.anim?.loop === true || el.animationLoop === true;
    return { timeline, endTime, loop };
};

/**
 * Builds a master timeline for every element in a design.
 * Loopable element timelines are nested as repeating children so the global
 * playhead can seek through a single cycle while playback loops indefinitely.
 */
export const buildMasterTimeline = (
    nodes: Map<string, Konva.Node>,
    elements: DesignElement[],
    totalDuration: number,
    loop: boolean,
): gsap.core.Timeline => {
    const master = gsap.timeline({ repeat: loop ? -1 : 0, repeatDelay: 0 });

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

export const applyHoverEffect = (node: Konva.Node, el: DesignElement) => {
    if (!el.hoverAnimation || el.hoverAnimation === 'none') return;

    switch (el.hoverAnimation) {
        case 'colorChange':
            if (el.hoverColor) {
                gsap.to(node, {
                    fill: el.hoverColor,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
            break;
        case 'glow':
            gsap.to(node, {
                shadowColor: el.hoverColor || '#3b82f6',
                shadowBlur: 20,
                shadowOpacity: 0.8,
                duration: 0.3,
                ease: 'power2.out'
            });
            break;
        case 'shadowPop':
            gsap.to(node, {
                shadowColor: 'rgba(0,0,0,0.3)',
                shadowBlur: 10,
                shadowOffset: { x: 5, y: 5 },
                shadowOpacity: 0.5,
                x: el.x - 2,
                y: el.y - 2,
                duration: 0.2,
                ease: 'power2.out'
            });
            break;
        case 'letterSpacing':
            if (el.type === 'text') {
                gsap.to(node, {
                    letterSpacing: 5,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
            break;
        case 'scale':
            gsap.to(node, {
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 0.2,
                ease: 'power2.out'
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
                ease: 'power2.out'
            });
            break;
        case 'glow':
            gsap.to(node, {
                shadowBlur: 0,
                shadowOpacity: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
            break;
        case 'shadowPop':
            gsap.to(node, {
                shadowBlur: 0,
                shadowOffset: { x: 0, y: 0 },
                shadowOpacity: 0,
                x: el.x,
                y: el.y,
                duration: 0.2,
                ease: 'power2.out'
            });
            break;
        case 'letterSpacing':
            if (el.type === 'text') {
                gsap.to(node, {
                    letterSpacing: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
            break;
        case 'scale':
            gsap.to(node, {
                scaleX: 1,
                scaleY: 1,
                duration: 0.2,
                ease: 'power2.out'
            });
            break;
    }
};
