/**
 * Text animation catalog — letter / word effects modelled on Tobias Ahlin's
 * "Moving Letters" collection (https://tobiasahlin.com/moving-letters/).
 *
 * One data definition drives every surface, so they can never disagree:
 *  - the canvas preview (Web Animations API, seekable with the playhead),
 *  - the Animation Studio cards (live looping previews), and
 *  - the exported banner (plain CSS @keyframes + per-unit animation-delay,
 *    started by the banner's JS timeline — no animation library needed).
 *
 * Text is split into "units" (letters or words). Every unit is wrapped in
 * `<span class="ta-u">` and animates from the effect's first keyframe to its
 * last, offset by the effect's stagger function. Optional decorations (the
 * lines / underline / cursor of the originals) are extra absolutely-positioned
 * `<span class="ta-d">` elements animated the same way.
 */

export type TextAnimationUnit = 'letters' | 'words';

/** Keyframe = CSS property map, e.g. { opacity: '0', transform: 'scale(0.3)' }. */
export type TextKeyframe = Record<string, string>;

export interface TextAnimationDecoration {
    /** CSS for the decoration span (position, size…); colour is currentColor. */
    style: string;
    frames: TextKeyframe[];
    duration: number; // ms
    delay: number; // ms
    easing: EasingId;
}

export interface TextAnimationEffect {
    id: string;
    label: string;
    description: string;
    unit: TextAnimationUnit;
    /** Keyframe sets. `variant(i, n)` picks one per unit; default is 'main'. */
    frames: Record<string, TextKeyframe[]>;
    variant?: (i: number, n: number) => string;
    duration: number; // ms per unit
    /** Delay (ms) for unit i of n, relative to the effect start. */
    stagger: (i: number, n: number) => number;
    easing: EasingId;
    transformOrigin?: string;
    /** Extra CSS for each unit (e.g. perspective). */
    unitStyle?: string;
    /** Wrap every word in an overflow:hidden mask (reveal-from-behind effects). */
    mask?: boolean;
    decorations?: TextAnimationDecoration[];
}

type EasingId =
    | 'easeOutExpo'
    | 'easeInOutExpo'
    | 'easeInOutQuad'
    | 'easeOutCirc'
    | 'easeOutElastic';

/* ── Easing ────────────────────────────────────────────────────────────── */

const CUBIC: Record<Exclude<EasingId, 'easeOutElastic'>, string> = {
    easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
    easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
};

/** anime.js `easeOutElastic(1, .5)` (its default easing), sampled into CSS linear(). */
const buildElasticLinear = (): string => {
    const period = 0.5;
    const s = period / 4; // asin(1 / amplitude) * period / 2π with amplitude 1
    const elasticIn = (t: number) =>
        t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1 - s) * (2 * Math.PI)) / period);
    const points: string[] = [];
    const steps = 48;
    for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const v = 1 - elasticIn(1 - t);
        points.push(String(Math.round(v * 10000) / 10000));
    }
    return 'linear(' + points.join(', ') + ')';
};
const ELASTIC_LINEAR = buildElasticLinear();
/** Overshoot cubic used where linear() is not supported (older browsers). */
const ELASTIC_FALLBACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

let linearSupported: boolean | null = null;
const supportsLinearEasing = (): boolean => {
    if (linearSupported !== null) return linearSupported;
    try {
        linearSupported = typeof CSS !== 'undefined' && CSS.supports('animation-timing-function', 'linear(0, 1)');
    } catch {
        linearSupported = false;
    }
    return linearSupported;
};

/** Easing string for the Web Animations API in the current browser. */
export const easingForWaapi = (id: EasingId): string =>
    id === 'easeOutElastic' ? (supportsLinearEasing() ? ELASTIC_LINEAR : ELASTIC_FALLBACK) : CUBIC[id];

/**
 * CSS declarations for an easing. Elastic emits a cubic fallback first and the
 * linear() curve second: browsers without linear() drop the second declaration
 * and keep the first, instead of discarding the whole animation.
 */
const easingCss = (id: EasingId): string =>
    id === 'easeOutElastic'
        ? 'animation-timing-function: ' + ELASTIC_FALLBACK + '; animation-timing-function: ' + ELASTIC_LINEAR + ';'
        : 'animation-timing-function: ' + CUBIC[id] + ';';

/* ── Catalog ───────────────────────────────────────────────────────────── */

const fadeIn = (from: string, to = 'none'): TextKeyframe[] => [
    { opacity: '0', transform: from },
    { opacity: '1', transform: to },
];

const LINE_STYLE = 'position:absolute;left:0;width:100%;height:2px;background:currentColor;opacity:0.5;transform-origin:50% 50%;';

export const TEXT_ANIMATIONS: TextAnimationEffect[] = [
    {
        id: 'ml1',
        label: 'Bold Lines',
        description: 'Letters grow in between two expanding lines',
        unit: 'letters',
        frames: { main: fadeIn('scale(0.3)', 'scale(1)') },
        duration: 600,
        stagger: (i) => 70 * (i + 1),
        easing: 'easeOutExpo',
        decorations: [
            { style: LINE_STYLE + 'top:0;', frames: [{ transform: 'scaleX(0)', opacity: '0.5' }, { transform: 'scaleX(1)', opacity: '1' }], duration: 700, delay: 0, easing: 'easeInOutExpo' },
            { style: LINE_STYLE + 'bottom:0;', frames: [{ transform: 'scaleX(0)', opacity: '0.5' }, { transform: 'scaleX(1)', opacity: '1' }], duration: 700, delay: 80, easing: 'easeInOutExpo' },
        ],
    },
    {
        id: 'ml2',
        label: 'Zoom Down',
        description: 'Huge letters shrink into place one by one',
        unit: 'letters',
        frames: { main: fadeIn('scale(4)', 'scale(1)') },
        duration: 950,
        stagger: (i) => 70 * i,
        easing: 'easeOutExpo',
    },
    {
        id: 'ml3',
        label: 'Slow Fade',
        description: 'Soft letter-by-letter fade in',
        unit: 'letters',
        frames: { main: [{ opacity: '0' }, { opacity: '1' }] },
        duration: 2250,
        stagger: (i) => 150 * (i + 1),
        easing: 'easeInOutQuad',
    },
    {
        id: 'ml4',
        label: 'Ready Set Go',
        description: 'Words punch in one after another',
        unit: 'words',
        frames: { main: fadeIn('scale(0.2)', 'scale(1)') },
        duration: 800,
        stagger: (i) => 800 * i,
        easing: 'easeOutExpo',
    },
    {
        id: 'ml5',
        label: 'Signal & Noise',
        description: 'Two halves slide toward the centre, middle stretches open',
        unit: 'words',
        frames: {
            left: fadeIn('translateX(0.5em)', 'translateX(0)'),
            mid: fadeIn('scaleY(0.5)', 'scaleY(1)'),
            right: fadeIn('translateX(-0.5em)', 'translateX(0)'),
        },
        variant: (i, n) => {
            if (n % 2 === 1 && i === (n - 1) / 2) return 'mid';
            return i < n / 2 ? 'left' : 'right';
        },
        duration: 1200,
        stagger: () => 300,
        easing: 'easeOutExpo',
        decorations: [
            { style: LINE_STYLE + 'top:0;', frames: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], duration: 600, delay: 0, easing: 'easeOutExpo' },
            { style: LINE_STYLE + 'bottom:0;', frames: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], duration: 600, delay: 0, easing: 'easeOutExpo' },
        ],
    },
    {
        id: 'ml6',
        label: 'Rise Up',
        description: 'Letters rise from behind a mask',
        unit: 'letters',
        frames: { main: [{ transform: 'translateY(1.1em)' }, { transform: 'translateY(0)' }] },
        duration: 750,
        stagger: (i) => 50 * i,
        easing: 'easeOutExpo',
        mask: true,
    },
    {
        id: 'ml7',
        label: 'Flip Rise',
        description: 'Letters swing up into place from behind a mask',
        unit: 'letters',
        frames: { main: [{ transform: 'translateY(1.1em) translateX(0.55em) rotate(180deg)' }, { transform: 'translateY(0) translateX(0) rotate(0deg)' }] },
        duration: 750,
        stagger: (i) => 50 * i,
        easing: 'easeOutExpo',
        transformOrigin: '0 100%',
        mask: true,
    },
    {
        id: 'ml8',
        label: 'Hi Pop',
        description: 'Letters spin and pop in with a springy bounce',
        unit: 'letters',
        frames: { main: [{ opacity: '0', transform: 'scale(0) rotate(-45deg)' }, { opacity: '1', transform: 'scale(1) rotate(0deg)' }] },
        duration: 1200,
        stagger: (i) => 300 + 100 * i,
        easing: 'easeOutElastic',
    },
    {
        id: 'ml9',
        label: 'Elastic Pop',
        description: 'Letters spring up from nothing',
        unit: 'letters',
        frames: { main: [{ transform: 'scale(0)' }, { transform: 'scale(1)' }] },
        duration: 1500,
        stagger: (i) => 45 * (i + 1),
        easing: 'easeOutElastic',
    },
    {
        id: 'ml10',
        label: 'Domino',
        description: 'Letters flip open like falling dominoes',
        unit: 'letters',
        frames: { main: [{ transform: 'perspective(400px) rotateY(-90deg)' }, { transform: 'perspective(400px) rotateY(0deg)' }] },
        duration: 1300,
        stagger: (i) => 45 * i,
        easing: 'easeOutElastic',
        transformOrigin: '0 0',
    },
    {
        id: 'ml11',
        label: 'Typewriter Cursor',
        description: 'A cursor sweeps across and reveals the letters',
        unit: 'letters',
        frames: { main: [{ opacity: '0' }, { opacity: '1' }] },
        duration: 600,
        stagger: (i, n) => 100 + Math.round((600 / Math.max(1, n)) * i),
        easing: 'easeOutExpo',
        decorations: [
            {
                style: 'position:absolute;top:0;width:3px;height:100%;background:currentColor;opacity:0.6;',
                frames: [{ left: '0%', opacity: '0' }, { left: '0%', opacity: '0.6', offset: '0.1' }, { left: '100%', opacity: '0.6', offset: '0.9' }, { left: '100%', opacity: '0' }],
                duration: 900,
                delay: 0,
                easing: 'easeInOutQuad',
            },
        ],
    },
    {
        id: 'ml12',
        label: 'Slide In',
        description: 'Letters glide in from the right',
        unit: 'letters',
        frames: { main: fadeIn('translateX(40px)', 'translateX(0)') },
        duration: 1200,
        stagger: (i) => 500 + 30 * i,
        easing: 'easeOutExpo',
    },
    {
        id: 'ml13',
        label: 'Rising Strong',
        description: 'Letters rise from below',
        unit: 'letters',
        frames: { main: fadeIn('translateY(100px)', 'translateY(0)') },
        duration: 1400,
        stagger: (i) => 300 + 30 * i,
        easing: 'easeOutExpo',
    },
    {
        id: 'ml14',
        label: 'Underline Reveal',
        description: 'An underline draws, then letters slide in above it',
        unit: 'letters',
        frames: { main: fadeIn('translateX(40px) scaleX(0.3)', 'translateX(0) scaleX(1)') },
        duration: 800,
        stagger: (i) => 300 + 25 * i,
        easing: 'easeOutExpo',
        decorations: [
            { style: LINE_STYLE + 'bottom:0;transform-origin:0 50%;', frames: [{ transform: 'scaleX(0)', opacity: '0.5' }, { transform: 'scaleX(1)', opacity: '1' }], duration: 900, delay: 0, easing: 'easeInOutExpo' },
        ],
    },
    {
        id: 'ml15',
        label: 'Out Now',
        description: 'Giant words slam down into place',
        unit: 'words',
        frames: { main: fadeIn('scale(14)', 'scale(1)') },
        duration: 800,
        stagger: (i) => 800 * i,
        easing: 'easeOutCirc',
    },
    {
        id: 'ml16',
        label: 'Drop In',
        description: 'Letters drop down from behind a mask',
        unit: 'letters',
        frames: { main: [{ transform: 'translateY(-1.1em)' }, { transform: 'translateY(0)' }] },
        duration: 1400,
        stagger: (i) => 30 * i,
        easing: 'easeOutExpo',
        mask: true,
    },
];

export const getTextAnimation = (id?: string | null): TextAnimationEffect | undefined =>
    id ? TEXT_ANIMATIONS.find((e) => e.id === id) : undefined;

const clampSpeed = (speed?: number): number => Math.min(4, Math.max(0.25, speed || 1));

/* ── Splitting ─────────────────────────────────────────────────────────── */

export interface SplitTextResult {
    html: string;
    count: number;
}

const escapeText = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Visible characters of a text run; an HTML entity (`&amp;`) counts as one. */
const tokenizeChars = (text: string): string[] => text.match(/&[#a-zA-Z0-9]+;|[\s\S]/gu) || [];

/**
 * Wraps every letter / word of an HTML (or escaped plain-text) string in
 * `<span class="ta-u" data-ta="i">`, leaving tags and whitespace untouched so
 * rich formatting (bold, colour, links…) survives. Letters are grouped in a
 * nowrap word wrapper so words never break mid-word.
 */
export const splitTextHtml = (html: string, unit: TextAnimationUnit, mask = false): SplitTextResult => {
    let count = 0;
    const maskOpen = mask ? '<span class="ta-m">' : '';
    const maskClose = mask ? '</span>' : '';
    const unitSpan = (content: string) => '<span class="ta-u" data-ta="' + count++ + '">' + content + '</span>';

    const out = html
        .split(/(<[^>]*>)/)
        .map((token) => {
            if (!token || token.startsWith('<')) return token;
            // Text run: keep whitespace runs as-is, animate the rest.
            return token
                .split(/(\s+)/)
                .map((word) => {
                    if (!word || /^\s+$/.test(word)) return word;
                    if (unit === 'words') return maskOpen + unitSpan(word) + maskClose;
                    const letters = tokenizeChars(word).map(unitSpan).join('');
                    return '<span class="ta-w">' + maskOpen + letters + maskClose + '</span>';
                })
                .join('');
        })
        .join('');
    return { html: out, count };
};

/** Splits plain text (escaping it first). */
export const splitPlainText = (text: string, unit: TextAnimationUnit, mask = false): SplitTextResult =>
    splitTextHtml(escapeText(text), unit, mask);

/* ── Timing ────────────────────────────────────────────────────────────── */

export interface UnitTiming {
    delay: number; // ms from effect start
    duration: number; // ms
    variant: string;
}

export const getUnitTiming = (effect: TextAnimationEffect, i: number, n: number, speed?: number): UnitTiming => {
    const k = 1 / clampSpeed(speed);
    return {
        delay: Math.round(effect.stagger(i, n) * k),
        duration: Math.round(effect.duration * k),
        variant: effect.variant ? effect.variant(i, n) : 'main',
    };
};

/** Total runtime of the effect (ms) for n units — when the last unit settles. */
export const getTextAnimationLength = (effect: TextAnimationEffect, n: number, speed?: number): number => {
    const k = 1 / clampSpeed(speed);
    let end = 0;
    for (let i = 0; i < n; i++) end = Math.max(end, getUnitTiming(effect, i, n, speed).delay + Math.round(effect.duration * k));
    (effect.decorations || []).forEach((d) => {
        end = Math.max(end, Math.round((d.delay + d.duration) * k));
    });
    return end;
};

/* ── Shared CSS ────────────────────────────────────────────────────────── */

/** Base CSS for split text — used by both the canvas preview and the export. */
export const TEXT_ANIMATION_BASE_CSS_LINES: string[] = [
    '.ta-u { display: inline-block; white-space: pre; will-change: transform, opacity; }',
    '.ta-w { display: inline-block; white-space: nowrap; }',
    '.ta-m { display: inline-block; overflow: hidden; vertical-align: top; padding: 0.1em 0.05em 0.15em; margin: -0.1em -0.05em -0.15em; }',
    '.ta-d { display: block; pointer-events: none; }',
];
export const TEXT_ANIMATION_BASE_CSS = TEXT_ANIMATION_BASE_CSS_LINES.join(' ');

/** Injects the split-text base CSS into the editor document once (canvas + Studio previews). */
export const ensureTextAnimationCss = (): void => {
    if (typeof document === 'undefined' || document.querySelector('style[data-text-animations]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-text-animations', '');
    style.textContent = TEXT_ANIMATION_BASE_CSS;
    document.head.appendChild(style);
};

const framesToCss = (frames: TextKeyframe[]): string =>
    frames
        .map((f, idx) => {
            const pct = f.offset !== undefined ? Math.round(Number(f.offset) * 100) : Math.round((idx / Math.max(1, frames.length - 1)) * 100);
            const decls = Object.entries(f)
                .filter(([prop]) => prop !== 'offset')
                .map(([prop, val]) => prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + ': ' + val + ';')
                .join(' ');
            return pct + '% { ' + decls + ' }';
        })
        .join(' ');

const toWaapiFrames = (frames: TextKeyframe[]): Keyframe[] =>
    frames.map((f) => {
        const kf: Keyframe = {};
        Object.entries(f).forEach(([prop, val]) => {
            kf[prop] = prop === 'offset' ? Number(val) : val;
        });
        return kf;
    });

/* ── Export (CSS + HTML) ───────────────────────────────────────────────── */

export interface TextAnimationExport {
    /** Inner HTML of the element (split units + decorations). */
    html: string;
    /** CSS rules scoped to the element id. */
    css: string[];
}

/**
 * Builds the exported markup + CSS for one text element. Units sit paused on
 * their first keyframe (fill-mode both) until the element gets the `ta-run`
 * class from the banner timeline, which starts every staggered animation.
 */
export const buildTextAnimationExport = (opts: {
    id: string;
    effect: TextAnimationEffect;
    contentHtml: string;
    speed?: number;
}): TextAnimationExport => {
    const { id, effect, speed } = opts;
    const k = 1 / clampSpeed(speed);
    const split = splitTextHtml(opts.contentHtml, effect.unit, effect.mask);
    const n = split.count;

    const html = split.html.replace(/<span class="ta-u" data-ta="(\d+)">/g, (_m, idxStr: string) => {
        const t = getUnitTiming(effect, Number(idxStr), n, speed);
        return '<span class="ta-u" style="animation-name: ta-' + effect.id + '-' + t.variant + '; animation-delay: ' + t.delay + 'ms;">';
    });

    const decorationsHtml = (effect.decorations || [])
        .map((d, di) => '<span class="ta-d ta-d' + di + '" style="' + d.style + '"></span>')
        .join('');

    const sel = '#' + id;
    const css: string[] = [
        sel + ' { position: absolute; }',
        sel + ' .ta-u { animation-duration: ' + Math.round(effect.duration * k) + 'ms; animation-fill-mode: both; animation-play-state: paused; ' +
            easingCss(effect.easing) + (effect.transformOrigin ? ' transform-origin: ' + effect.transformOrigin + ';' : '') + (effect.unitStyle ? ' ' + effect.unitStyle : '') + ' }',
        sel + '.ta-run .ta-u, ' + sel + '.ta-run .ta-d { animation-play-state: running; }',
    ];
    Object.entries(effect.frames).forEach(([variant, frames]) => {
        css.push('@keyframes ta-' + effect.id + '-' + variant + ' { ' + framesToCss(frames) + ' }');
    });
    (effect.decorations || []).forEach((d, di) => {
        const name = 'ta-' + effect.id + '-d' + di;
        css.push('@keyframes ' + name + ' { ' + framesToCss(d.frames) + ' }');
        css.push(
            sel + ' .ta-d' + di + ' { animation: ' + name + ' ' + Math.round(d.duration * k) + 'ms ' + Math.round(d.delay * k) + 'ms both paused; ' + easingCss(d.easing) + ' }',
        );
    });

    return { html: decorationsHtml + html, css };
};

/* ── Live preview (Web Animations API) ─────────────────────────────────── */

/**
 * Attaches paused WAAPI animations to an element whose innerHTML was produced
 * by `renderTextAnimationHtml`. Returns a seek function (ms from effect start)
 * and a cleanup.
 */
export const attachTextAnimation = (
    container: HTMLElement,
    effect: TextAnimationEffect,
    speed?: number,
): { seek: (ms: number) => void; play: () => void; length: number; destroy: () => void } => {
    const k = 1 / clampSpeed(speed);
    const units = Array.from(container.querySelectorAll<HTMLElement>('.ta-u'));
    const n = units.length;
    const anims: Animation[] = [];
    const supportsWaapi = typeof (container as any).animate === 'function';

    if (supportsWaapi) {
        units.forEach((u, i) => {
            const t = getUnitTiming(effect, i, n, speed);
            if (effect.transformOrigin) u.style.transformOrigin = effect.transformOrigin;
            const a = u.animate(toWaapiFrames(effect.frames[t.variant] || effect.frames.main), {
                duration: t.duration,
                delay: t.delay,
                easing: easingForWaapi(effect.easing),
                fill: 'both',
            });
            a.pause();
            anims.push(a);
        });
        const decos = Array.from(container.querySelectorAll<HTMLElement>('.ta-d'));
        decos.forEach((d, di) => {
            const deco = effect.decorations?.[di];
            if (!deco) return;
            const a = d.animate(toWaapiFrames(deco.frames), {
                duration: Math.round(deco.duration * k),
                delay: Math.round(deco.delay * k),
                easing: easingForWaapi(deco.easing),
                fill: 'both',
            });
            a.pause();
            anims.push(a);
        });
    }

    const length = getTextAnimationLength(effect, n, speed);
    return {
        length,
        seek: (ms: number) => {
            const time = Math.max(0, ms);
            anims.forEach((a) => {
                if (a.playState !== 'paused') a.pause();
                a.currentTime = time;
            });
        },
        play: () => {
            anims.forEach((a) => {
                a.currentTime = 0;
                a.play();
            });
        },
        destroy: () => anims.forEach((a) => a.cancel()),
    };
};

/** innerHTML for a live preview container (decorations + split units). */
export const renderTextAnimationHtml = (effect: TextAnimationEffect, contentHtml: string): string => {
    const split = splitTextHtml(contentHtml, effect.unit, effect.mask);
    const decorations = (effect.decorations || [])
        .map((d) => '<span class="ta-d" style="' + d.style + '"></span>')
        .join('');
    return decorations + split.html;
};

/** Plain text → safe HTML (for elements without rich text). */
export const plainTextToHtml = (text: string): string => escapeText(text);
