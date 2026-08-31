import type { AnimationKeyframe, DesignElement } from '../store/designStore';
import type { ElementBaseState } from './keyframes';

/**
 * Full Animista.net animation catalog (https://animista.net) expressed as
 * keyframe definitions for this app's keyframe timeline model.
 *
 * Animista's CSS uses features this model does not have (blur, skew,
 * clip-path, rotateX/rotateY, transform-origin). Each preset is therefore
 * translated to the closest equivalent using x / y / opacity / rotation /
 * scaleX / scaleY / letterSpacing. The motion and feel still match closely.
 */

export interface AnimistaDef {
    id: string;
    label: string;
    category: string;
    /** Auto-loop these presets when selected (attention / background styles). */
    loop?: boolean;
    frames: (base: ElementBaseState, duration: number, delay: number, el: DesignElement) => AnimationKeyframe[];
}

let seq = 0;
const uid = () => `kf-a${++seq}`;

const kf = (time: number, partial: Partial<AnimationKeyframe> & { easing?: string }): AnimationKeyframe => ({
    id: uid(),
    time,
    easing: 'power1.inOut',
    ...partial,
});

const PX = 120;

const DIRS: Record<string, [number, number]> = {
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
    opts: { mid?: Partial_kf; midAt?: number; extraEnd?: Partial_kf } = {},
): AnimationKeyframe[] => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    const frames: AnimationKeyframe[] = [kf(start, { ...base, ...from, opacity: from.opacity ?? 0 })];
    if (opts.mid) {
        frames.push(kf(start + (opts.midAt ?? 0.6) * d, { ...base, ...opts.mid, opacity: opts.mid.opacity ?? base.opacity }));
    }
    frames.push(kf(end, { ...base, ...opts.extraEnd, opacity: base.opacity }));
    return frames;
};

/** Exit: from resting base state -> hidden/offset state. */
const exitTo = (
    base: ElementBaseState,
    d: number,
    delay: number,
    to: Partial_kf,
    opts: { mid?: Partial_kf; midAt?: number } = {},
): AnimationKeyframe[] => {
    const frames: AnimationKeyframe[] = [kf(delay, { ...base, opacity: base.opacity })];
    if (opts.mid) {
        frames.push(kf(delay + (opts.midAt ?? 0.6) * d, { ...base, ...opts.mid, opacity: opts.mid.opacity ?? base.opacity }));
    }
    frames.push(kf(delay + d, { ...base, ...to, opacity: to.opacity ?? 0 }));
    return frames;
};

/** Attention loop: states spread evenly across one cycle (repeat via Loop toggle). */
const cycle = (base: ElementBaseState, d: number, delay: number, states: Partial_kf[]): AnimationKeyframe[] => {
    const n = Math.max(1, states.length);
    return states.map((s, i) => kf(delay + (d * i) / n, { ...base, ...s, opacity: s.opacity ?? base.opacity }));
};

const l = (el: DesignElement) => el.letterSpacing || 0;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const ANIMISTA_ANIMATIONS: Record<string, AnimistaDef> = {};

const register = (id: string, label: string, category: string, frames: AnimistaDef['frames'], loop = false) => {
    ANIMISTA_ANIMATIONS[id] = { id, label, category, frames, loop };
};

// ---- FADE IN (Entrance) ----
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
    register(id, id, 'Fade In', (b, d, delay) => enterFrom(b, d, delay, { opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- SCALE IN (Entrance) ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'scale-in-center' : `scale-in-${dir}`;
    register(key, key, 'Scale In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1, scaleY: 1.1 } }),
    );
});

// ---- ROTATE IN (Entrance) ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'rotate-in-center' : `rotate-in-${dir}`;
    register(key, key, 'Rotate In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 200, scaleX: 0.3, scaleY: 0.3, opacity: 0, x: b.x + dx, y: b.y + dy }),
    );
});

// ---- FLIP IN (Entrance) ----
const FLIP_DIRS: Record<string, [number, number]> = {
    tl: [-60, -60], tr: [60, -60], bl: [-60, 60], br: [60, 60],
};
['top', 'bottom'].forEach((pos) => {
    const dy = pos === 'top' ? -40 : 40;
    register(`flip-in-hor-${pos}`, `flip-in-hor-${pos}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleY: 0.2, opacity: 0, y: b.y + dy }, { mid: { scaleY: 1.1 } }));
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-in-hor-${dir}`, `flip-in-hor-${dir}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleY: 0.2, opacity: 0 }, { mid: { scaleY: 1.1 } }));
});
['top', 'bottom', 'right', 'left'].forEach((pos) => {
    const offsets: Record<string, [number, number]> = { top: [0, -40], bottom: [0, 40], right: [40, 0], left: [-40, 0] };
    const [dx, dy] = offsets[pos];
    register(`flip-in-ver-${pos}`, `flip-in-ver-${pos}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1 } }));
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-in-ver-${dir}`, `flip-in-ver-${dir}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.2, opacity: 0 }, { mid: { scaleX: 1.1 } }));
});
Object.entries(FLIP_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`flip-in-diag-1-${dir}`, `flip-in-diag-1-${dir}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 0.2, scaleY: 0.2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1, scaleY: 1.1 } }));
    register(`flip-in-diag-2-${dir}`, `flip-in-diag-2-${dir}`, 'Flip In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation + 90, scaleX: 0.2, scaleY: 0.2, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- SWIRL IN (Entrance) ----
const SWIRL_POS: Record<string, [number, number]> = {
    top: [0, -80], bottom: [0, 80], left: [-80, 0], right: [80, 0],
    tl: [-80, -80], tr: [80, -80], bl: [-80, 80], br: [80, 80],
};
register('swirl-in-fwd', 'swirl-in-fwd', 'Swirl In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 0, scaleY: 0, opacity: 0 }));
register('swirl-in-bck', 'swirl-in-bck', 'Swirl In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 2, scaleY: 2, opacity: 0 }));
Object.entries(SWIRL_POS).forEach(([pos, [dx, dy]]) => {
    register(`swirl-in-${pos}-fwd`, `swirl-in-${pos}-fwd`, 'Swirl In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
    register(`swirl-in-${pos}-bck`, `swirl-in-${pos}-bck`, 'Swirl In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 540, scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- DROP IN (Entrance) ----
register('drop-in', 'drop-in', 'Drop In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 2, scaleY: 2, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 } }));

// ---- SLIDE IN (Entrance) ----
const SLIDE_DIRS: Record<string, [number, number]> = {
    top: [0, -PX], bottom: [0, PX], left: [-PX, 0], right: [PX, 0],
    tl: [-PX, -PX], tr: [PX, -PX], bl: [-PX, PX], br: [PX, PX],
};
Object.entries(SLIDE_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`slide-in-${dir}`, `slide-in-${dir}`, 'Slide In', (b, d, delay) =>
        enterFrom(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0 }));
    register(`slide-in-blurred-${dir}`, `slide-in-blurred-${dir}`, 'Slide In (Blurred)', (b, d, delay) =>
        enterFrom(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0 }, { mid: { scaleX: 0.95, scaleY: 0.95 } }));
});
register('slide-in-blurred-forward', 'slide-in-blurred-forward', 'Slide In (Blurred)', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, opacity: 0 }));
register('slide-in-blurred-backward', 'slide-in-blurred-backward', 'Slide In (Blurred)', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, opacity: 0 }));

// ---- SLIT IN (Entrance) ----
register('slit-in-vertical', 'slit-in-vertical', 'Slit In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleX: 0.5, scaleY: 0.5, opacity: 0 }, { mid: { rotation: b.rotation + 20 } }));
register('slit-in-horizontal', 'slit-in-horizontal', 'Slit In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleY: 0.5, opacity: 0 }, { mid: { rotation: b.rotation + 20 } }));
register('slit-in-diagonal-1', 'slit-in-diagonal-1', 'Slit In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleX: 0.5, scaleY: 0.5, opacity: 0, x: b.x - 40, y: b.y - 40 }, { mid: { rotation: b.rotation + 20 } }));
register('slit-in-diagonal-2', 'slit-in-diagonal-2', 'Slit In', (b, d, delay) =>
    enterFrom(b, d, delay, { rotation: b.rotation - 90, scaleX: 0.5, scaleY: 0.5, opacity: 0, x: b.x + 40, y: b.y + 40 }, { mid: { rotation: b.rotation + 20 } }));

// ---- SWING IN (Entrance) ----
const SWING_POS: Record<string, [number, number]> = {
    top: [0, -100], bottom: [0, 100], left: [-100, 0], right: [100, 0],
};
Object.entries(SWING_POS).forEach(([pos, [dx, dy]]) => {
    register(`swing-in-${pos}-fwd`, `swing-in-${pos}-fwd`, 'Swing In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 70, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { rotation: b.rotation + 12 } }));
    register(`swing-in-${pos}-bck`, `swing-in-${pos}-bck`, 'Swing In', (b, d, delay) =>
        enterFrom(b, d, delay, { rotation: b.rotation - 70, scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { rotation: b.rotation + 12 } }));
});

// ---- ROLL IN (Entrance) ----
register('roll-in-left', 'roll-in-left', 'Roll In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }));
register('roll-in-right', 'roll-in-right', 'Roll In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }));
register('roll-in-blurred-left', 'roll-in-blurred-left', 'Roll In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 } }));
register('roll-in-blurred-right', 'roll-in-blurred-right', 'Roll In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 } }));

// ---- JELLO (Entrance + Basic) ----
register('jello-in', 'jello-in', 'Jello In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0.8, scaleY: 1.2, opacity: 0 }, {
        mid: { scaleX: 1.2, scaleY: 0.8, rotation: b.rotation - 6 },
        midAt: 0.5,
    }));
register('jello-horizontal', 'jello-horizontal', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.2, scaleY: 0.8, rotation: b.rotation - 3 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 0.9, scaleY: 1.1, rotation: b.rotation + 3 },
        { scaleX: 1, scaleY: 1 },
    ]), true);
register('jello-vertical', 'jello-vertical', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 0.8, scaleY: 1.2, rotation: b.rotation - 3 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.1, scaleY: 0.9, rotation: b.rotation + 3 },
        { scaleX: 1, scaleY: 1 },
    ]), true);

// ---- BOUNCE IN (Entrance) ----
register('bounce-in-top', 'bounce-in-top', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { y: b.y - 150, opacity: 0 }, { mid: { y: b.y + 20, opacity: b.opacity }, midAt: 0.6 }));
register('bounce-in-bottom', 'bounce-in-bottom', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { y: b.y + 150, opacity: 0 }, { mid: { y: b.y - 20, opacity: b.opacity }, midAt: 0.6 }));
register('bounce-in-left', 'bounce-in-left', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x - 150, opacity: 0 }, { mid: { x: b.x + 20, opacity: b.opacity }, midAt: 0.6 }));
register('bounce-in-right', 'bounce-in-right', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { x: b.x + 150, opacity: 0 }, { mid: { x: b.x - 20, opacity: b.opacity }, midAt: 0.6 }));
register('bounce-in-fwd', 'bounce-in-fwd', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0 }, { mid: { scaleX: 1.15, scaleY: 1.15 }, midAt: 0.6 }));
register('bounce-in-bck', 'bounce-in-bck', 'Bounce In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0 }, { mid: { scaleX: 0.85, scaleY: 0.85 }, midAt: 0.6 }));

// ---- PUFF IN (Entrance) ----
const PUFF_POS: Record<string, [number, number]> = {
    center: [0, 0], top: [0, -60], bottom: [0, 60], left: [-60, 0], right: [60, 0],
};
Object.entries(PUFF_POS).forEach(([pos, [dx, dy]]) => {
    const key = pos === 'center' ? 'puff-in-center' : `puff-in-${pos}`;
    register(key, key, 'Puff In', (b, d, delay) =>
        enterFrom(b, d, delay, { scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 0.9, scaleY: 0.9 }, midAt: 0.5 }));
});
register('puff-in-hor', 'puff-in-hor', 'Puff In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 2, opacity: 0 }, { mid: { scaleX: 0.9 }, midAt: 0.5 }));
register('puff-in-ver', 'puff-in-ver', 'Puff In', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleY: 2, opacity: 0 }, { mid: { scaleY: 0.9 }, midAt: 0.5 }));

// ---- TRACKING IN (Text) ----
register('tracking-in-contract', 'tracking-in-contract', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s + 8, opacity: 0 }), kf(delay + d * 0.6, { ...b, letterSpacing: s - 2, opacity: b.opacity }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('tracking-in-contract-bck', 'tracking-in-contract-bck', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s + 8, opacity: 0, scaleX: 1.1, scaleY: 1.1 }), kf(delay + d * 0.6, { ...b, letterSpacing: s - 2, opacity: b.opacity * 0.7 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('tracking-in-expand', 'tracking-in-expand', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 4, opacity: b.opacity }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('tracking-in-expand-fwd', 'tracking-in-expand-fwd', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0, scaleX: 0.9, scaleY: 0.9 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 5, opacity: b.opacity * 0.8 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('tracking-in-expand-fwd-top', 'tracking-in-expand-fwd-top', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0, y: b.y - 30 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 5, opacity: b.opacity * 0.8 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('tracking-in-expand-fwd-bottom', 'tracking-in-expand-fwd-bottom', 'Tracking In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0, y: b.y + 30 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 5, opacity: b.opacity * 0.8 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});

// ---- FOCUS IN (Text) ----
register('focus-in-contract', 'focus-in-contract', 'Focus In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s + 8, opacity: 0 }), kf(delay + d * 0.6, { ...b, letterSpacing: s - 2, opacity: b.opacity * 0.7 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('focus-in-contract-bck', 'focus-in-contract-bck', 'Focus In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s + 8, opacity: 0, scaleX: 1.1, scaleY: 1.1 }), kf(delay + d * 0.6, { ...b, letterSpacing: s - 2, opacity: b.opacity * 0.7 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('focus-in-expand', 'focus-in-expand', 'Focus In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 4, opacity: b.opacity * 0.7 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});
register('focus-in-expand-fwd', 'focus-in-expand-fwd', 'Focus In', (b, d, delay, el) => {
    const s = l(el);
    return [kf(delay > 0 ? delay : 0, { ...b, letterSpacing: s - 8, opacity: 0, scaleX: 0.9, scaleY: 0.9 }), kf(delay + d * 0.6, { ...b, letterSpacing: s + 4, opacity: b.opacity * 0.7 }), kf(delay + d, { ...b, letterSpacing: s, opacity: b.opacity })];
});

// ---- TEXT EFFECTS ----
register('text-focus-in', 'text-focus-in', 'Text Effects', (b, d, delay, el) => {
    const s = l(el);
    return enterFrom(b, d, delay, { letterSpacing: s - 8, opacity: 0 }, { mid: { letterSpacing: s + 4 }, midAt: 0.5, extraEnd: { letterSpacing: s } });
});
register('text-pop-up-top', 'text-pop-up-top', 'Text Effects', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0.3, scaleY: 0.3, opacity: 0, y: b.y - 20 }, { mid: { scaleX: 1.2, scaleY: 1.2, y: b.y + 6 }, midAt: 0.5 }));
register('text-pop-up-bl', 'text-pop-up-bl', 'Text Effects', (b, d, delay) =>
    enterFrom(b, d, delay, { scaleX: 0.3, scaleY: 0.3, opacity: 0, x: b.x - 20, y: b.y + 20 }, { mid: { scaleX: 1.2, scaleY: 1.2, x: b.x + 6, y: b.y - 6 }, midAt: 0.5 }));
register('text-flicker-in-glow', 'text-flicker-in-glow', 'Text Effects', (b, d, delay) => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    return [
        kf(start, { ...b, opacity: 0 }),
        kf(start + d * 0.05, { ...b, opacity: 0.9, scaleX: 1.05, scaleY: 1.05 }),
        kf(start + d * 0.08, { ...b, opacity: 0 }),
        kf(start + d * 0.12, { ...b, opacity: 0.9, scaleX: 1.05, scaleY: 1.05 }),
        kf(start + d * 0.15, { ...b, opacity: 0 }),
        kf(start + d * 0.5, { ...b, opacity: 0.8 }),
        kf(end, { ...b, opacity: b.opacity }),
    ];
});
register('text-blur-out', 'text-blur-out', 'Text Effects', (b, d, delay) =>
    exitTo(b, d, delay, { opacity: 0, scaleX: 0.9, scaleY: 0.9 }));
register('text-shadow-pop-top', 'text-shadow-pop-top', 'Text Effects', (b, d, delay) =>
    cycle(b, d, delay, [{ y: b.y }, { y: b.y - 4, scaleX: 1.04, scaleY: 1.04 }, { y: b.y }]), true);

// ---- FLICKER / GLITCH / BLUR (Entrance) ----
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
        frames.push(kf(Math.min(t, end), { ...b, opacity: on ? 0.9 : 0 }));
        on = !on;
        i++;
    }
    frames.push(kf(start + d * 0.5, { ...b, opacity: 0.8 }));
    frames.push(kf(end, { ...b, opacity: b.opacity }));
    return frames;
};
register('flicker-in-1', 'flicker-in-1', 'Flicker / Glitch / Blur', flicker(true));
register('flicker-in-2', 'flicker-in-2', 'Flicker / Glitch / Blur', flicker(false));
register('blur-in', 'blur-in', 'Flicker / Glitch / Blur', (b, d, delay) =>
    enterFrom(b, d, delay, { opacity: 0, scaleX: 0.9, scaleY: 0.9 }));
const glitch = (sep: number) => (b: ElementBaseState, d: number, delay: number) => {
    const start = delay > 0 ? delay : 0;
    const end = delay + d;
    return [
        kf(start, { ...b, opacity: 0 }),
        kf(start + d * 0.1, { ...b, opacity: 0.9, x: b.x - sep, y: b.y + sep / 2, rotation: b.rotation - 3 }),
        kf(start + d * 0.15, { ...b, opacity: 0, x: b.x + sep }),
        kf(start + d * 0.2, { ...b, opacity: 0.9, x: b.x, rotation: b.rotation + 2 }),
        kf(start + d * 0.28, { ...b, opacity: 0 }),
        kf(end, { ...b, opacity: b.opacity }),
    ];
};
register('glitch-in-1', 'glitch-in-1', 'Flicker / Glitch / Blur', glitch(10));
register('glitch-in-2', 'glitch-in-2', 'Flicker / Glitch / Blur', glitch(20));

// ---- ATTENTION (Loop) ----
register('vibrate-1', 'vibrate-1', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [{ x: b.x }, { x: b.x - 3 }, { x: b.x + 3 }, { x: b.x - 3 }, { x: b.x }]), true);
register('vibrate-2', 'vibrate-2', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [{ x: b.x }, { x: b.x - 6 }, { x: b.x + 6 }, { x: b.x - 6 }, { x: b.x + 6 }, { x: b.x - 6 }, { x: b.x }]), true);
register('vibrate-3', 'vibrate-3', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [{ x: b.x }, { x: b.x - 10 }, { x: b.x + 10 }, { x: b.x - 10 }, { x: b.x + 10 }, { x: b.x - 10 }, { x: b.x }]), true);
register('heartbeat', 'heartbeat', 'Attention (Loop)', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.2, scaleY: 1.2 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.2, scaleY: 1.2 },
        { scaleX: 1, scaleY: 1 },
    ]), true);
register('heart-beat', 'heart-beat', 'Background', (b, d, delay) =>
    cycle(b, d, delay, [
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.05, scaleY: 1.05 },
        { scaleX: 1, scaleY: 1 },
        { scaleX: 1.05, scaleY: 1.05 },
        { scaleX: 1, scaleY: 1 },
    ]), true);

// ---- KEN BURNS (Background) ----
const KEN_POS: Record<string, [number, number]> = {
    top: [0, -30], bottom: [0, 30], left: [-30, 0], right: [30, 0],
    'top-left': [-30, -30], 'top-right': [30, -30], 'bottom-left': [-30, 30], 'bottom-right': [30, 30],
};
Object.entries(KEN_POS).forEach(([pos, [dx, dy]]) => {
    register(`kenburns-${pos}`, `kenburns-${pos}`, 'Ken Burns (Background)', (b, d, delay) =>
        cycle(b, d, delay, [
            { scaleX: 1.2, scaleY: 1.2, x: b.x - dx, y: b.y - dy },
            { scaleX: 1, scaleY: 1, x: b.x, y: b.y },
        ]), true);
});

// ---- FADE OUT (Exit) ----
Object.entries(FADE_DIRS).forEach(([id, [dx, dy]]) => {
    const key = id === 'fade-in' ? 'fade-out' : id.replace('fade-in', 'fade-out');
    register(key, key, 'Fade Out', (b, d, delay) => exitTo(b, d, delay, { opacity: 0, x: b.x + dx, y: b.y + dy }));
});
register('fade-out-blurred', 'fade-out-blurred', 'Fade Out (Blurred)', (b, d, delay) =>
    exitTo(b, d, delay, { opacity: 0, scaleX: 0.9, scaleY: 0.9 }));
['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br'].forEach((dir) => {
    const [dx, dy] = SLIDE_DIRS[dir];
    register(`fade-out-blurred-${dir}`, `fade-out-blurred-${dir}`, 'Fade Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { opacity: 0, scaleX: 0.9, scaleY: 0.9, x: b.x + dx / 2, y: b.y + dy / 2 }));
});

// ---- SCALE OUT (Exit) ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'scale-out-center' : `scale-out-${dir}`;
    register(key, key, 'Scale Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { scaleX: 1.1, scaleY: 1.1 }, midAt: 0.5 }));
});
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'scale-out-blurred-center' : `scale-out-blurred-${dir}`;
    register(key, key, 'Scale Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0.3, scaleY: 0.3, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- ROTATE OUT (Exit) ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'rotate-out-center' : `rotate-out-${dir}`;
    register(key, key, 'Rotate Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 200, scaleX: 0.3, scaleY: 0.3, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- FLIP OUT (Exit) ----
['top', 'bottom'].forEach((pos) => {
    const dy = pos === 'top' ? -40 : 40;
    register(`flip-out-hor-${pos}`, `flip-out-hor-${pos}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleY: 0, opacity: 0, y: b.y + dy }));
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-out-hor-${dir}`, `flip-out-hor-${dir}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleY: 0, opacity: 0 }));
});
['top', 'bottom', 'right', 'left'].forEach((pos) => {
    const offsets: Record<string, [number, number]> = { top: [0, -40], bottom: [0, 40], right: [40, 0], left: [-40, 0] };
    const [dx, dy] = offsets[pos];
    register(`flip-out-ver-${pos}`, `flip-out-ver-${pos}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
});
['fwd', 'bck'].forEach((dir) => {
    register(`flip-out-ver-${dir}`, `flip-out-ver-${dir}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, opacity: 0 }));
});
Object.entries(FLIP_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`flip-out-diag-1-${dir}`, `flip-out-diag-1-${dir}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
    register(`flip-out-diag-2-${dir}`, `flip-out-diag-2-${dir}`, 'Flip Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 90, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- SWIRL OUT (Exit) ----
register('swirl-out-fwd', 'swirl-out-fwd', 'Swirl Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 0, scaleY: 0, opacity: 0 }));
register('swirl-out-bck', 'swirl-out-bck', 'Swirl Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 2, scaleY: 2, opacity: 0 }));
Object.entries(SWIRL_POS).forEach(([pos, [dx, dy]]) => {
    register(`swirl-out-${pos}-fwd`, `swirl-out-${pos}-fwd`, 'Swirl Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
    register(`swirl-out-${pos}-bck`, `swirl-out-${pos}-bck`, 'Swirl Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---- SLIT OUT (Exit) ----
register('slit-out-vertical', 'slit-out-vertical', 'Slit Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 90, scaleX: 0.5, scaleY: 0.5, opacity: 0 }, { mid: { rotation: b.rotation - 20 }, midAt: 0.5 }));
register('slit-out-horizontal', 'slit-out-horizontal', 'Slit Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 90, scaleY: 0.5, opacity: 0 }, { mid: { rotation: b.rotation - 20 }, midAt: 0.5 }));
register('slit-out-diagonal-1', 'slit-out-diagonal-1', 'Slit Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 90, scaleX: 0.5, scaleY: 0.5, opacity: 0, x: b.x - 40, y: b.y - 40 }, { mid: { rotation: b.rotation - 20 }, midAt: 0.5 }));
register('slit-out-diagonal-2', 'slit-out-diagonal-2', 'Slit Out', (b, d, delay) =>
    exitTo(b, d, delay, { rotation: b.rotation + 90, scaleX: 0.5, scaleY: 0.5, opacity: 0, x: b.x + 40, y: b.y + 40 }, { mid: { rotation: b.rotation - 20 }, midAt: 0.5 }));

// ---- SWING OUT (Exit) ----
Object.entries(SWING_POS).forEach(([pos, [dx, dy]]) => {
    register(`swing-out-${pos}-fwd`, `swing-out-${pos}-fwd`, 'Swing Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 70, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { rotation: b.rotation - 10 }, midAt: 0.5 }));
    register(`swing-out-${pos}-bck`, `swing-out-${pos}-bck`, 'Swing Out', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 70, scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }, { mid: { rotation: b.rotation - 10 }, midAt: 0.5 }));
});

// ---- ROLL OUT (Exit) ----
register('roll-out-left', 'roll-out-left', 'Roll Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }));
register('roll-out-right', 'roll-out-right', 'Roll Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }));
register('roll-out-blurred-left', 'roll-out-blurred-left', 'Roll Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x - PX, rotation: b.rotation - 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 }, midAt: 0.5 }));
register('roll-out-blurred-right', 'roll-out-blurred-right', 'Roll Out', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x + PX, rotation: b.rotation + 360, opacity: 0 }, { mid: { scaleX: 0.9, scaleY: 0.9 }, midAt: 0.5 }));

// ---- JELLO OUT / BOUNCE OUT / PUFF OUT / SHRINK / FOLD / VANISH (Exit) ----
register('jello-out', 'jello-out', 'Jello Out', (b, d, delay) =>
    exitTo(b, d, delay, { scaleX: 0.8, scaleY: 1.2, opacity: 0 }, { mid: { scaleX: 1.2, scaleY: 0.8, rotation: b.rotation + 6 }, midAt: 0.5 }));
['top', 'bottom', 'left', 'right'].forEach((pos) => {
    const offset: Record<string, [number, number]> = { top: [0, -20], bottom: [0, 20], left: [-20, 0], right: [20, 0] };
    const [dx, dy] = offset[pos];
    const far: Record<string, [number, number]> = { top: [0, -150], bottom: [0, 150], left: [-150, 0], right: [150, 0] };
    const [fx, fy] = far[pos];
    register(`bounce-out-${pos}`, `bounce-out-${pos}`, 'Bounce Out', (b, d, delay) =>
        exitTo(b, d, delay, { x: b.x + fx, y: b.y + fy, opacity: 0 }, { mid: { x: b.x + dx, y: b.y + dy }, midAt: 0.5 }));
});
const PUFF_OUT: Record<string, [number, number]> = {
    center: [0, 0], top: [0, -60], bottom: [0, 60], left: [-60, 0], right: [60, 0],
};
Object.entries(PUFF_OUT).forEach(([pos, [dx, dy]]) => {
    const key = pos === 'center' ? 'puff-out-center' : `puff-out-${pos}`;
    register(key, key, 'Puff Out', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 2, scaleY: 2, opacity: 0, x: b.x + dx, y: b.y + dy }));
});
register('puff-out-hor', 'puff-out-hor', 'Puff Out', (b, d, delay) => exitTo(b, d, delay, { scaleX: 2, opacity: 0 }));
register('puff-out-ver', 'puff-out-ver', 'Puff Out', (b, d, delay) => exitTo(b, d, delay, { scaleY: 2, opacity: 0 }));
register('shrink-out-vertical', 'shrink-out-vertical', 'Shrink / Fold / Vanish', (b, d, delay) => exitTo(b, d, delay, { scaleY: 0, opacity: 0 }));
register('shrink-out-horizontal', 'shrink-out-horizontal', 'Shrink / Fold / Vanish', (b, d, delay) => exitTo(b, d, delay, { scaleX: 0, opacity: 0 }));
['top', 'bottom'].forEach((pos) => {
    const dy = pos === 'top' ? -1 : 1;
    register(`fold-out-${pos}`, `fold-out-${pos}`, 'Shrink / Fold / Vanish', (b, d, delay) =>
        exitTo(b, d, delay, { scaleY: 0.1, opacity: 0, y: b.y + dy * 40 }));
});
['left', 'right'].forEach((pos) => {
    const dx = pos === 'left' ? -1 : 1;
    register(`fold-out-${pos}`, `fold-out-${pos}`, 'Shrink / Fold / Vanish', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0.1, opacity: 0, x: b.x + dx * 40 }));
});
register('fold-out-hor', 'fold-out-hor', 'Shrink / Fold / Vanish', (b, d, delay) => exitTo(b, d, delay, { scaleX: 0.1, opacity: 0 }));
register('fold-out-ver', 'fold-out-ver', 'Shrink / Fold / Vanish', (b, d, delay) => exitTo(b, d, delay, { scaleY: 0.1, opacity: 0 }));
register('vanish-out', 'vanish-out', 'Shrink / Fold / Vanish', (b, d, delay) => exitTo(b, d, delay, { scaleX: 2, scaleY: 2, opacity: 0 }));
register('drop-out', 'drop-out', 'Shrink / Fold / Vanish', (b, d, delay) =>
    exitTo(b, d, delay, { y: b.y + 150, scaleX: 0.2, scaleY: 0.2, opacity: 0 }));

// ---- SLIDE OUT (Exit) ----
Object.entries(SLIDE_DIRS).forEach(([dir, [dx, dy]]) => {
    register(`slide-out-${dir}`, `slide-out-${dir}`, 'Slide Out', (b, d, delay) =>
        exitTo(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0 }));
    register(`slide-out-blurred-${dir}`, `slide-out-blurred-${dir}`, 'Slide Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { x: b.x + dx, y: b.y + dy, opacity: 0, scaleX: 0.9, scaleY: 0.9 }));
});
register('slide-out-blurred-forward', 'slide-out-blurred-forward', 'Slide Out (Blurred)', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x - PX, opacity: 0, scaleX: 0.9, scaleY: 0.9 }));
register('slide-out-blurred-backward', 'slide-out-blurred-backward', 'Slide Out (Blurred)', (b, d, delay) =>
    exitTo(b, d, delay, { x: b.x + PX, opacity: 0, scaleX: 0.9, scaleY: 0.9 }));

// ---- ROTATE / FLIP / SWIRL OUT (Blurred) ----
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'rotate-out-blurred-center' : `rotate-out-blurred-${dir}`;
    register(key, key, 'Rotate Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 200, scaleX: 0.3, scaleY: 0.3, opacity: 0, x: b.x + dx, y: b.y + dy }));
});
Object.entries(DIRS).forEach(([dir, [dx, dy]]) => {
    const key = dir === 'center' ? 'flip-out-blurred-center' : `flip-out-blurred-${dir}`;
    register(key, key, 'Flip Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { scaleX: 0.2, scaleY: 0.2, opacity: 0, x: b.x + dx, y: b.y + dy }));
});
Object.entries(SWIRL_POS).forEach(([pos, [dx, dy]]) => {
    register(`swirl-out-blurred-${pos}-fwd`, `swirl-out-blurred-${pos}-fwd`, 'Swirl Out (Blurred)', (b, d, delay) =>
        exitTo(b, d, delay, { rotation: b.rotation + 540, scaleX: 0, scaleY: 0, opacity: 0, x: b.x + dx, y: b.y + dy }));
});

// ---------------------------------------------------------------------------
// Legacy presets kept for backward compatibility (not part of Animista).
// ---------------------------------------------------------------------------
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

export const animistaKeyframes = (animation: string, el: DesignElement, duration: number, delay: number): AnimationKeyframe[] => {
    const def = ANIMISTA_ANIMATIONS[animation];
    if (!def) return [];
    const base = getElementBaseStateRef(el);
    return def.frames(base, duration, delay, el);
};

/** Used to avoid a circular import: mirrors getElementBaseState from keyframes. */
export const getElementBaseStateRef = (el: DesignElement): ElementBaseState => ({
    x: el.x,
    y: el.y,
    opacity: el.opacity !== undefined ? el.opacity : 100,
    rotation: el.rotation || 0,
    scaleX: el.scaleX || 1,
    scaleY: el.scaleY || 1,
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

const LOOP_CATEGORIES = ['Attention (Loop)', 'Background', 'Ken Burns (Background)'];
const isEntranceCategory = (c: string) => /In/.test(c) || ['Text Effects', 'Flicker / Glitch / Blur'].includes(c);
const isExitCategory = (c: string) => /Out/.test(c) || c === 'Shrink / Fold / Vanish';

/** Option groups suitable for an element's entrance animation dropdown. */
export const getEntranceAnimationGroups = () => {
    const groups = getAnimationOptionGroups();
    return groups.filter((g) => isEntranceCategory(g.label) || LOOP_CATEGORIES.includes(g.label));
};

/** Option groups suitable for an element's exit animation dropdown. */
export const getExitAnimationGroups = () => {
    const groups = getAnimationOptionGroups();
    return groups.filter((g) => isExitCategory(g.label) || LOOP_CATEGORIES.includes(g.label));
};