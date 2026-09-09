import type { AnimationKeyframe, DesignElement } from '../store/designStore';
import type { ElementBaseState } from './keyframes';

/**
 * Modern Animation Studio Catalog inspired by TheBrief AI AdStudio & Animista.
 * Expressed as keyframe definitions for this app's keyframe timeline model.
 */

export type AnimationType = 'in' | 'loop' | 'out';

export interface AnimistaDef {
    id: string;
    label: string;
    category: string;
    type?: AnimationType;
    description?: string;
    supportedDirections?: string[];
    defaultEasing?: string;
    /** Auto-loop these presets when selected (attention / background styles). */
    loop?: boolean;
    frames: (base: ElementBaseState, duration: number, delay: number, el: DesignElement, customEasing?: string) => AnimationKeyframe[];
}

let seq = 0;
const uid = () => `kf-a${++seq}`;

const kf = (time: number, partial: Partial<AnimationKeyframe> & { easing?: string }): AnimationKeyframe => ({
    id: uid(),
    time,
    easing: 'power1.inOut',
    ...partial,
});

const PX = 140;

export const DIRS: Record<string, [number, number]> = {
    center: [0, 0],
    top: [0, -70],
    bottom: [0, 70],
    left: [-70, 0],
    right: [70, 0],
    tl: [-70, -70],
    tr: [70, -70],
    bl: [-70, 70],
    br: [70, 70],
};

type Partial_kf = Partial<AnimationKeyframe>;

/** Entrance: from a hidden/offset state -> resting base state. */
const enterFrom = (
    base: ElementBaseState,
    d: number,
    delay: number,
    from: Partial_kf,
    opts: { mid?: Partial_kf; midAt?: number; extraEnd?: Partial_kf; easing?: string } = {},
): AnimationKeyframe[] => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    const defaultEase = opts.easing || 'power2.out';
    const frames: AnimationKeyframe[] = [
        kf(start, { ...base, ...from, opacity: from.opacity ?? 0, easing: defaultEase }),
    ];
    if (opts.mid) {
        frames.push(
            kf(start + (opts.midAt ?? 0.6) * d, {
                ...base,
                ...opts.mid,
                opacity: opts.mid.opacity ?? base.opacity,
                easing: defaultEase,
            }),
        );
    }
    frames.push(kf(end, { ...base, ...opts.extraEnd, opacity: base.opacity, easing: defaultEase }));
    return frames;
};

/** Exit: from resting base state -> hidden/offset state. */
const exitTo = (
    base: ElementBaseState,
    d: number,
    delay: number,
    to: Partial_kf,
    opts: { mid?: Partial_kf; midAt?: number; easing?: string } = {},
): AnimationKeyframe[] => {
    const defaultEase = opts.easing || 'power2.in';
    const frames: AnimationKeyframe[] = [kf(delay, { ...base, opacity: base.opacity, easing: defaultEase })];
    if (opts.mid) {
        frames.push(
            kf(delay + (opts.midAt ?? 0.6) * d, {
                ...base,
                ...opts.mid,
                opacity: opts.mid.opacity ?? base.opacity,
                easing: defaultEase,
            }),
        );
    }
    frames.push(kf(delay + d, { ...base, ...to, opacity: to.opacity ?? 0, easing: defaultEase }));
    return frames;
};

/** Attention loop: states spread evenly across one cycle (repeat via Loop toggle). */
const cycle = (base: ElementBaseState, d: number, delay: number, states: Partial_kf[], ease = 'power1.inOut'): AnimationKeyframe[] => {
    const n = Math.max(1, states.length);
    return states.map((s, i) => kf(delay + (d * i) / n, { ...base, ...s, opacity: s.opacity ?? base.opacity, easing: ease }));
};

const l = (el: DesignElement) => el.letterSpacing || 0;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const ANIMISTA_ANIMATIONS: Record<string, AnimistaDef> = {};

interface RegisterOptions {
    type?: AnimationType;
    description?: string;
    supportedDirections?: string[];
    defaultEasing?: string;
    loop?: boolean;
}

const register = (
    id: string,
    label: string,
    category: string,
    frames: AnimistaDef['frames'],
    options: RegisterOptions | boolean = false,
) => {
    const opts: RegisterOptions = typeof options === 'boolean' ? { loop: options } : options;
    const type: AnimationType =
        opts.type ||
        (category.includes('Loop') || category.includes('Background') || opts.loop
            ? 'loop'
            : category.includes('Out') || category.includes('Shrink')
            ? 'out'
            : 'in');

    ANIMISTA_ANIMATIONS[id] = {
        id,
        label,
        category,
        type,
        description: opts.description,
        supportedDirections: opts.supportedDirections,
        defaultEasing: opts.defaultEasing || (type === 'in' ? 'power2.out' : type === 'out' ? 'power2.in' : 'power1.inOut'),
        loop: opts.loop ?? false,
        frames: (b, d, delay, el, customEasing) => {
            const result = frames(b, d, delay, el);
            if (customEasing) {
                return result.map((f) => ({ ...f, easing: customEasing }));
            }
            return result;
        },
    };
};

// ===========================================================================
// 1. ENTRANCE (IN) ANIMATIONS
// ===========================================================================

// ---- FADE IN ----
const FADE_DIRS: Record<string, [number, number]> = {
    'fade-in': [0, 0],
    'fade-in-up': [0, PX],
    'fade-in-down': [0, -PX],
    'fade-in-left': [-PX, 0],
    'fade-in-right': [PX, 0],
    'fade-in-top-right': [-PX, PX],
    'fade-in-top-left': [PX, PX],
    'fade-in-bottom-right': [-PX, -PX],
    'fade-in-bottom-left': [PX, -PX],
};
Object.entries(FADE_DIRS).forEach(([id, [dx, dy]]) => {
    const label = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    register(id, label, 'Fade', (b, d, delay) => enterFrom(b, d, delay, { opacity: 0, x: b.x + dx, y: b.y + dy }), {
        type: 'in',
        description: 'Smooth opacity reveal with subtle directional translation',
    });
});

// ---- SLIDE IN (Smooth, Spring & Blurred) ----
const SLIDE_DIRS: Record<string, [number, number]> = {
    top: [0, -PX],
    bottom: [0, PX],
    left: [-PX, 0],
    right: [PX, 0],
    tl: [-PX, -PX],
    tr: [PX, -PX],
    bl: [-PX, PX],
    br: [PX, PX],
};
Object.entries(SLIDE_DIRS).forEach(([dir, [dx, dy]]) => {
    const label = `Slide In ${dir.toUpperCase()}`;
    register(`slide-in-${dir}`, label, 'Slide', (b, d, delay) =>
        enterFrom(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0 }, { easing: 'power3.out' }), {
        type: 'in',
        description: `Direct slide entrance from the ${dir}`,
    });
    register(`slide-in-blurred-${dir}`, `Slide In Blurred ${dir.toUpperCase()}`, 'Slide', (b, d, delay) =>
        enterFrom(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0, blur: 8 }, { mid: { scaleX: 0.95, scaleY: 0.95, blur: 2 } }), {
        type: 'in',
        description: `Cinematic motion blur slide from the ${dir}`,
    });
});
register('slide-in-blurred-forward', 'Slide In Forward', 'Slide', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, opacity: 0, scaleX: 0.7, scaleY: 0.7 }), { type: 'in' });
register('slide-in-blurred-backward', 'Slide In Backward', 'Slide', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, opacity: 0, scaleX: 1.3, scaleY: 1.3 }), { type: 'in' });

// ---- SCALE IN & POP ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'scale-in-center' : `scale-in-${dir}`;
    const label = dir === 'center' ? 'Pop In (Center)' : `Scale In ${dir.toUpperCase()}`;
    register(key, label, 'Scale & Zoom', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, {
            mid: { scaleX: 1.12, scaleY: 1.12 },
            midAt: 0.6,
            easing: 'back.out',
        }), {
        type: 'in',
        description: 'Scales up with dynamic overshoot pop',
    });
});
register('drop-in', 'Drop In (Gravity)', 'Scale & Zoom', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 2.2, scaleY: 2.2, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 }, easing: 'bounce.out' }), {
    type: 'in',
    description: 'Dramatic drop from foreground into place',
});

// ---- 3D FLIP IN ----
const FLIP_DIRS: Record<string, [number, number]> = {
    tl: [-60, -60], tr: [60, -60], bl: [-60, 60], br: [60, 60],
};
['top', 'bottom'].forEach((pos) => {
    const dy = pos === 'top' ? -40 : 40;
    register(`flip-in-hor-${pos}`, `3D Flip In Horizontal (${pos})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleY: 0.05, opacity: 0, y: b.y + dy }, { mid: { scaleY: 1.1 } }), { type: 'in' });
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-in-hor-${dir}`, `3D Flip Horizontal (${dir})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleY: 0.05, opacity: 0 }, { mid: { scaleY: 1.1 } }), { type: 'in' });
});
['top', 'bottom', 'right', 'left'].forEach((pos) => {
    const offsets: Record<string, [number, number]> = { top: [0, -40], bottom: [0, 40], right: [40, 0], left: [-40, 0] };
    const [dx, dy] = offsets[pos];
    register(`flip-in-ver-${pos}`, `3D Flip In Vertical (${pos})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.05, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1 } }), { type: 'in' });
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-in-ver-${dir}`, `3D Flip Vertical (${dir})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.05, opacity: 0 }, { mid: { scaleX: 1.1 } }), { type: 'in' });
});
Object.entries(FLIP_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`flip-in-diag-1-${dir}`, `3D Flip Diagonal 1 (${dir})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.1, scaleY: 0.1, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1, scaleY: 1.1 } }), { type: 'in' });
    register(`flip-in-diag-2-${dir}`, `3D Flip Diagonal 2 (${dir})`, 'Flip & 3D', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation + 90, scaleX: 0.1, scaleY: 0.1, opacity: 0, x: b.x + dx, y: b.y + dy }), { type: 'in' });
});

// ---- ROTATE & ROLL IN ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'rotate-in-center' : `rotate-in-${dir}`;
    register(key, `Rotate In ${dir.toUpperCase()}`, 'Rotate & Roll', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 180, scaleX: 0.2, scaleY: 0.2, opacity: 0, x: b.x + dx, y: b.y + dy }, { easing: 'power2.out' }), { type: 'in' });
});
register('roll-in-left', 'Roll In (Left)', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }), { type: 'in' });
register('roll-in-right', 'Roll In (Right)', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }), { type: 'in' });
register('roll-in-blurred-left', 'Roll In Blurred (Left)', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 } }), { type: 'in' });
register('roll-in-blurred-right', 'Roll In Blurred (Right)', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 } }), { type: 'in' });

// ---- SWIRL IN ----
const SWIRL_POS: Record<string, [number, number]> = {
    top: [0, -80], bottom: [0, 80], left: [-80, 0], right: [80, 0],
    tl: [-80, -80], tr: [80, -80], bl: [-80, 80], br: [80, 80],
};
register('swirl-in-fwd', 'Swirl In Forward', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 0, scaleY: 0, opacity: 0 }), { type: 'in' });
register('swirl-in-bck', 'Swirl In Backward', 'Rotate & Roll', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 2.5, scaleY: 2.5, opacity: 0 }), { type: 'in' });
Object.entries(SWIRL_POS).forEach(([pos, [dx, dy]]) => {
    register(`swirl-in-${pos}-fwd`, `Swirl In ${pos.toUpperCase()} (Fwd)`, 'Rotate & Roll', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }), { type: 'in' });
    register(`swirl-in-${pos}-bck`, `Swirl In ${pos.toUpperCase()} (Bck)`, 'Rotate & Roll', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }), { type: 'in' });
});

// ---- BOUNCE & JELLO IN ----
register('bounce-in-top', 'Bounce In Top', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { y: b.y - 180, opacity: 0 }, { mid: { y: b.y + 25, opacity: b.opacity }, midAt: 0.6, easing: 'bounce.out' }), { type: 'in' });
register('bounce-in-bottom', 'Bounce In Bottom', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { y: b.y + 180, opacity: 0 }, { mid: { y: b.y - 25, opacity: b.opacity }, midAt: 0.6, easing: 'bounce.out' }), { type: 'in' });
register('bounce-in-left', 'Bounce In Left', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - 180, opacity: 0 }, { mid: { x: b.x + 25, opacity: b.opacity }, midAt: 0.6, easing: 'bounce.out' }), { type: 'in' });
register('bounce-in-right', 'Bounce In Right', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + 180, opacity: 0 }, { mid: { x: b.x - 25, opacity: b.opacity }, midAt: 0.6, easing: 'bounce.out' }), { type: 'in' });
register('bounce-in-fwd', 'Bounce In Forward', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0 }, { mid: { scaleX: 1.25, scaleY: 1.25 }, midAt: 0.6 }), { type: 'in' });
register('bounce-in-bck', 'Bounce In Backward', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 1.8, scaleY: 1.8, opacity: 0 }, { mid: { scaleX: 0.8, scaleY: 0.8 }, midAt: 0.6 }), { type: 'in' });
register('jello-in', 'Jello Pop In', 'Bounce & Elastic', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0.7, scaleY: 1.3, opacity: 0 }, {
        mid: { scaleX: 1.2, scaleY: 0.8, rotation: b.rotation - 6 },
        midAt: 0.5,
    }), { type: 'in' });

// ---- PUFF & SLIT IN ----
const PUFF_POS: Record<string, [number, number]> = {
    center: [0, 0], top: [0, -60], bottom: [0, 60], left: [-60, 0], right: [60, 0],
};
Object.entries(PUFF_POS).forEach(([pos, [dx, dy]]) => {
    const key = pos === 'center' ? 'puff-in-center' : `puff-in-${pos}`;
    register(key, `Puff In (${pos})`, 'Puff & Slit', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 2.2, scaleY: 2.2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 0.9, scaleY: 0.9 }, midAt: 0.5 }), { type: 'in' });
});
register('slit-in-vertical', 'Slit In Vertical', 'Puff & Slit', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleX: 0.3, scaleY: 0.3, opacity: 0 }, { mid: { rotation: b.rotation + 15 } }), { type: 'in' });
register('slit-in-horizontal', 'Slit In Horizontal', 'Puff & Slit', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleY: 0.3, opacity: 0 }, { mid: { rotation: b.rotation + 15 } }), { type: 'in' });

// ---- SWING IN ----
const SWING_POS: Record<string, [number, number]> = {
    top: [0, -100], bottom: [0, 100], left: [-100, 0], right: [100, 0],
};
Object.entries(SWING_POS).forEach(([pos, [dx, dy]]) => {
    register(`swing-in-${pos}-fwd`, `Swing In ${pos.toUpperCase()}`, 'Puff & Slit', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 70, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { rotation: b.rotation + 12 } }), { type: 'in' });
});

// ---- TYPOGRAPHY & TEXT IN ----
register('tracking-in-contract', 'Letter Tracking Contract', 'Text & Typography', (b, d, delay, el) => {
    const s = l(el);
    return [
        kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s + 12, opacity: 0 }),
        kf(delay + d * 0.6, { ...b, letterSpacing: s - 2, opacity: b.opacity }),
        kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity }),
    ];
}, { type: 'in', description: 'Letters fly in from expanded spacing' });
register('tracking-in-expand', 'Letter Tracking Expand', 'Text & Typography', (b, d, delay, el) => {
    const s = l(el);
    return [
        kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 10, opacity: 0 }),
        kf(delay + d * 0.6, { ...b, letterSpacing: s + 4, opacity: b.opacity }),
        kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity }),
    ];
}, { type: 'in', description: 'Letters expand outwards with smooth deceleration' });
register('text-focus-in', 'Text Focus In', 'Text & Typography', (b, d, delay, el) => {
    const s = l(el);
    return enterFrom(b, d, delay, { letterSpacing: s - 8, opacity: 0, blur: 10 }, {
        mid: { letterSpacing: s + 3, blur: 2 },
        midAt: 0.5,
        extraEnd: { letterSpacing: s, blur: 0 },
    });
}, { type: 'in' });
register('text-pop-up-top', 'Text Pop Up Top', 'Text & Typography', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0.3, scaleY: 0.3, opacity: 0, y: b.y - 20 }, { mid: { scaleX: 1.2, scaleY: 1.2, y: b.y + 6 }, midAt: 0.5 }), { type: 'in' });
register('text-flicker-in-glow', 'Text Neon Glow Flicker', 'Text & Typography', (b, d, delay) => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    return [
        kf(start, { ...b, opacity: 0 }),
        kf(start + d * 0.08, { ...b, opacity: 0.9, scaleX: 1.05, scaleY: 1.05 }),
        kf(start + d * 0.14, { ...b, opacity: 0.1 }),
        kf(start + d * 0.22, { ...b, opacity: 0.95, scaleX: 1.03, scaleY: 1.03 }),
        kf(start + d * 0.32, { ...b, opacity: 0.4 }),
        kf(start + d * 0.6, { ...b, opacity: 0.85 }),
        kf(end, { ...b, opacity: b.opacity, scaleX: 1, scaleY: 1 }),
    ];
}, { type: 'in' });

// ---- GLITCH & FLICKER IN ----
const flicker = (fast: boolean) => (b: ElementBaseState, d: number, delay: number) => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    const u = fast ? 0.03 : 0.06;
    const frames: AnimationKeyframe[] = [kf(start, { ...b, opacity: 0 })];
    let t = start;
    let on = true;
    let i = 0;
    while (t < start + d * 0.5) {
        t = start + d * (u * (i + 1));
        frames.push(kf(Math.min(t, end), { ...b, opacity: on ? 0.95 : 0.1 }));
        on = !on;
        i++;
    }
    frames.push(kf(start + d * 0.5, { ...b, opacity: 0.8 }));
    frames.push(kf(end, { ...b, opacity: b.opacity }));
    return frames;
};
register('flicker-in-1', 'Strobe Flicker In', 'Glitch & Blur', flicker(true), { type: 'in' });
register('flicker-in-2', 'Smooth Flicker In', 'Glitch & Blur', flicker(false), { type: 'in' });
register('blur-in', 'Camera Blur Focus In', 'Glitch & Blur', (b, d, delay) =>
    enterFrom(b, d, delay, { opacity: 0, scaleX: 0.88, scaleY: 0.88, blur: 15 }), { type: 'in' });
const glitch = (sep: number) => (b: ElementBaseState, d: number, delay: number) => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    return [
        kf(start, { ...b, opacity: 0 }),
        kf(start + d * 0.1, { ...b, opacity: 0.9, x: b.x - sep, y: b.y + sep / 2, rotation: b.rotation - 3 }),
        kf(start + d * 0.18, { ...b, opacity: 0.1, x: b.x + sep }),
        kf(start + d * 0.28, { ...b, opacity: 0.9, x: b.x, rotation: b.rotation + 2 }),
        kf(start + d * 0.38, { ...b, opacity: 0.3 }),
        kf(end, { ...b, opacity: b.opacity, x: b.x, y: b.y, rotation: b.rotation }),
    ];
};
register('glitch-in-1', 'Digital Glitch In 1', 'Glitch & Blur', glitch(10), { type: 'in' });
register('glitch-in-2', 'Digital Glitch In 2 (Hard)', 'Glitch & Blur', glitch(22), { type: 'in' });

// ===========================================================================
// 2. LOOP & EMPHASIS ANIMATIONS
// ===========================================================================

register('heartbeat', 'Heartbeat Pulse', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.18, scaleY: 1.18 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.14, scaleY: 1.14 },
        { scaleX: 1, scaleY: 1 },
    ]), { loop: true, type: 'loop', description: 'Dual thump pulse ideal for CTA buttons and badges' });

register('pulse', 'Soft Breathe Pulse', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.08, scaleY: 1.08 },
        { scaleX: 1, scaleY: 1 },
    ]), { loop: true, type: 'loop', description: 'Subtle continuous breathing effect' });

register('float', 'Floating / Bobbing', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { y: b.y },
        { y: b.y - 14 },
        { y: b.y },
    ], 'sine.inOut'), { loop: true, type: 'loop', description: 'Weightless floating motion' });

register('vibrate-1', 'Micro Vibration', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [{ x: b.x }, { x: b.x - 3 }, { x: b.x + 3 }, { x: b.x - 3 }, { x: b.x }]), { loop: true, type: 'loop' });
register('vibrate-2', 'High Vibration Alert', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [{ x: b.x }, { x: b.x - 6 }, { x: b.x + 6 }, { x: b.x - 6 }, { x: b.x + 6 }, { x: b.x - 6 }, { x: b.x }]), { loop: true, type: 'loop' });

register('jello-horizontal', 'Jello Wobble (Horiz)', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.2, scaleY: 0.8, rotation: b.rotation - 3 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 0.9, scaleY: 1.1, rotation: b.rotation + 3 },
        { scaleX: 1, scaleY: 1 },
    ]), { loop: true, type: 'loop' });

register('jello-vertical', 'Jello Wobble (Vert)', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 0.8, scaleY: 1.2, rotation: b.rotation - 3 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.1, scaleY: 0.9, rotation: b.rotation + 3 },
        { scaleX: 1, scaleY: 1 },
    ]), { loop: true, type: 'loop' });

register('swing', 'Pendulum Swing', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { rotation: b.rotation },
        { rotation: b.rotation + 12 },
        { rotation: b.rotation },
        { rotation: b.rotation - 12 },
        { rotation: b.rotation },
    ], 'sine.inOut'), { loop: true, type: 'loop' });

register('spin', 'Continuous 360° Spin', 'Emphasis & Loop', (b, d, delay) =>
    cycle(b, d, delay, [
        { rotation: b.rotation },
        { rotation: b.rotation + 360 },
    ], 'none'), { loop: true, type: 'loop' });

// ---- KEN BURNS & BACKGROUND LOOPS ----
const KEN_POS: Record<string, [number, number]> = {
    top: [0, -30], bottom: [0, 30], left: [-30, 0], right: [30, 0],
    'top-left': [-30, -30], 'top-right': [30, -30], 'bottom-left': [-30, 30], 'bottom-right': [30, 30],
};
Object.entries(KEN_POS).forEach(([pos, [dx, dy]]) => {
    register(`kenburns-${pos}`, `Ken Burns Pan (${pos.replace('-', ' ')})`, 'Ken Burns (Background)', (b, d, delay) =>
        cycle(b, d, delay, [
            { scaleX: 1.2, scaleY: 1.2, x: b.x - dx, y: b.y - dy },
            { scaleX: 1, scaleY: 1, x: b.x, y: b.y },
        ], 'sine.inOut'), { loop: true, type: 'loop', description: 'Cinematic slow camera drift' });
});

// ===========================================================================
// 3. EXIT (OUT) ANIMATIONS
// ===========================================================================

// ---- FADE OUT ----
Object.entries(FADE_DIRS).forEach(([id, [dx, dy]]) => {
    const key = id === 'fade-in' ? 'fade-out' : id.replace('fade-in', 'fade-out');
    const label = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    register(key, label, 'Exit & Fade Out', (b, d, delay) => exitTo(b, d, delay, { opacity: 0, x: b.x + dx, y: b.y + dy }), {
        type: 'out',
        description: 'Smooth fade transition out of view',
    });
});
register('fade-out-blurred', 'Fade Out Blurred', 'Exit & Fade Out', (b, d, delay) =>
    exitTo(b, d, delay, { opacity: 0, scaleX: 0.9, scaleY: 0.9, blur: 10 }), { type: 'out' });

// ---- SLIDE OUT ----
Object.entries(SLIDE_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`slide-out-${dir}`, `Slide Out ${dir.toUpperCase()}`, 'Exit & Slide Out', (b, d, delay) =>
        exitTo(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0 }), { type: 'out' });
    register(`slide-out-blurred-${dir}`, `Slide Out Blurred ${dir.toUpperCase()}`, 'Exit & Slide Out', (b, d, delay) =>
        exitTo(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0, scaleX: 0.9, scaleY: 0.9, blur: 8 }), { type: 'out' });
});

// ---- SCALE OUT & PUFF ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'scale-out-center' : `scale-out-${dir}`;
    register(key, `Scale Out ${dir.toUpperCase()}`, 'Exit & Scale Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1, scaleY: 1.1 }, midAt: 0.5 }), { type: 'out' });
});
register('puff-out-center', 'Puff & Dissolve Out', 'Exit & Scale Out', (b, d, delay) =>
    exitTo(b, d, delay, { scaleX: 2.2, scaleY: 2.2, opacity: 0 }), { type: 'out' });
register('shrink-out-vertical', 'Shrink Out (Vertical)', 'Exit & Scale Out', (b, d, delay) =>
    exitTo(b, d, delay, { scaleY: 0, opacity: 0 }), { type: 'out' });
register('shrink-out-horizontal', 'Shrink Out (Horizontal)', 'Exit & Scale Out', (b, d, delay) =>
    exitTo(b, d, delay, { scaleX: 0, opacity: 0 }), { type: 'out' });
register('drop-out', 'Drop Fall Out', 'Exit & Scale Out', (b, d, delay) =>
    exitTo(b, d, delay, { y: b.y + 200, scaleX: 0.2, scaleY: 0.2, opacity: 0 }), { type: 'out' });

// ---- 3D FLIP OUT ----
['top', 'bottom'].forEach((pos) => {
    const dy = pos === 'top' ? -40 : 40;
    register(`flip-out-hor-${pos}`, `3D Flip Out Horiz (${pos})`, 'Exit & 3D Flip', (b, d, delay) =>
        exitTo(b, d, delay, { scaleY: 0, opacity: 0, y: b.y + dy }), { type: 'out' });
});
['top', 'bottom', 'right', 'left'].forEach((pos) => {
    const offsets: Record<string, [number, number]> = { top: [0, -40], bottom: [0, 40], right: [40, 0], left: [-40, 0] };
    const [dx, dy] = offsets[pos];
    register(`flip-out-ver-${pos}`, `3D Flip Out Vert (${pos})`, 'Exit & 3D Flip', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, opacity: 0, x: b.x + dx, y: b.y + dy }), { type: 'out' });
});

// ---- ROTATE & ROLL OUT ----
register('roll-out-left', 'Roll Out (Left)', 'Exit & Rotate Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }), { type: 'out' });
register('roll-out-right', 'Roll Out (Right)', 'Exit & Rotate Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }), { type: 'out' });
register('swirl-out-fwd', 'Swirl Out Forward', 'Exit & Rotate Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 0, scaleY: 0, opacity: 0 }), { type: 'out' });
register('swirl-out-bck', 'Swirl Out Backward', 'Exit & Rotate Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 2.2, scaleY: 2.2, opacity: 0 }), { type: 'out' });

// ===========================================================================
// Legacy presets kept for backward compatibility
// ===========================================================================
const LEGACY: Record<string, string> = {
    fadeIn: 'Fade In', fadeOut: 'Fade Out', fadeInOut: 'Fade In/Out (Loop)',
    slideInTop: 'Slide In Top', slideInBottom: 'Slide In Bottom', slideInLeft: 'Slide In Left',
    slideInRight: 'Slide In Right', slideInTopLeft: 'Slide In Top-Left', slideInTopRight: 'Slide In Top-Right',
    slideInBottomLeft: 'Slide In Bottom-Left', slideInBottomRight: 'Slide In Bottom-Right',
    zoomIn: 'Zoom In', zoomOut: 'Zoom Out', pulse: 'Pulse (Loop)', spin: 'Spin', rotate360: 'Rotate 360°',
    flip: 'Flip', shake: 'Shake', skew: 'Skew', float: 'Float (Loop)', bounce: 'Bounce (Loop)',
    swing: 'Swing (Loop)', continuousSlideX: 'Slide Horizontal (Loop)', continuousSlideY: 'Slide Vertical (Loop)',
};

export const LEGACY_ANIMATIONS = Object.entries(LEGACY).map(([id, label]) => ({ value: id, label }));

/** Human-readable label for any animation id (Animista catalog or legacy). */
export const animationLabel = (id: string): string => {
    if (!id || id === 'none') return 'None';
    const def = ANIMISTA_ANIMATIONS[id];
    if (def) return def.label;
    return LEGACY[id] || id;
};

export const ANIMISTA_CATEGORIES: string[] = (() => {
    const cats = Object.values(ANIMISTA_ANIMATIONS).map((a) => a.category);
    return [...new Set(cats)];
})();

export const getAnimistaDef = (id: string): AnimistaDef | undefined => ANIMISTA_ANIMATIONS[id];

export const animistaKeyframes = (
    animation: string,
    el: DesignElement,
    duration: number,
    delay: number,
    customEasing?: string,
): AnimationKeyframe[] => {
    const def = ANIMISTA_ANIMATIONS[animation];
    if (!def) return [];
    const base = getElementBaseStateRef(el);
    return def.frames(base, duration, delay, el, customEasing);
};

/** Used to avoid a circular import: mirrors getElementBaseState from keyframes. */
export const getElementBaseStateRef = (el: DesignElement): ElementBaseState => ({
    x: el.x,
    y: el.y,
    opacity: el.opacity !== undefined ? el.opacity : 100,
    rotation: el.rotation || 0,
    scaleX: el.scaleX || 1,
    scaleY: el.scaleY || 1,
    blur: el.shadowBlur || 0,
});

export const isAnimistaLoop = (animation: string): boolean => ANIMISTA_ANIMATIONS[animation]?.loop === true;

export const getAnimationOptionGroups = () => {
    const groups: Array<{ label: string; options: Array<{ value: string; label: string; loop?: boolean }> }> = [];
    const byCat = new Map<string, Array<{ value: string; label: string; loop?: boolean }>>();
    Object.values(ANIMISTA_ANIMATIONS).forEach((a) => {
        if (!byCat.has(a.category)) byCat.set(a.category, []);
        byCat.get(a.category)!.push({ value: a.id, label: a.label, loop: a.loop });
    });
    ANIMISTA_CATEGORIES.forEach((cat) => {
        groups.push({ label: cat, options: byCat.get(cat) || [] });
    });
    groups.push({ label: 'Legacy', options: LEGACY_ANIMATIONS });
    return groups;
};

export const getEntranceAnimationGroups = () => {
    return getAnimationOptionGroups().filter(
        (g) =>
            !g.label.includes('Exit') &&
            !g.label.includes('Out') &&
            !g.label.includes('Background') &&
            g.label !== 'Legacy',
    );
};

export const getExitAnimationGroups = () => {
    return getAnimationOptionGroups().filter((g) => g.label.includes('Exit') || g.label.includes('Out'));
};

export const getLoopAnimationGroups = () => {
    return getAnimationOptionGroups().filter((g) => g.label.includes('Emphasis') || g.label.includes('Loop') || g.label.includes('Background'));
};

/**
 * Filter presets by high-level type ('in' | 'loop' | 'out' | 'hover')
 */
export const getPresetsByType = (type: AnimationType): AnimistaDef[] => {
    return Object.values(ANIMISTA_ANIMATIONS).filter((def) => def.type === type);
};