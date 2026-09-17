import type { AnimationKeyframe } from '../store/designStore';
import type { ElementBaseState } from './keyframes';

/**
 * Pure string builders for the exported HTML banner package
 * (index.html + css/styles.css + js/main.js).
 *
 * Keeping the CSS keyframe rules and the JavaScript timeline snippets out of the
 * React component makes them unit-testable -- which matters because the emitted
 * `js/main.js` must always be *syntactically valid JavaScript*: a single bad
 * character there makes the whole file fail to parse, so `window.onload` never
 * runs and NOTHING in the banner animates.
 */

/**
 * CSS timing functions approximating the GSAP eases used by the editor.
 * GSAP's power/sine/expo curves map well onto cubic-bezier; elastic and bounce
 * cannot be expressed exactly in CSS, so they fall back to the closest
 * overshoot / decelerating curve to keep the feel of the preset.
 */
const CSS_EASE_MAP: Record<string, string> = {
    none: 'linear',
    linear: 'linear',
    // power1 = quad
    'power1.in': 'cubic-bezier(0.11, 0, 0.5, 0)',
    'power1.out': 'cubic-bezier(0.5, 1, 0.89, 1)',
    'power1.inOut': 'cubic-bezier(0.45, 0, 0.55, 1)',
    // power2 = cubic
    'power2.in': 'cubic-bezier(0.32, 0, 0.67, 0)',
    'power2.out': 'cubic-bezier(0.33, 1, 0.68, 1)',
    'power2.inOut': 'cubic-bezier(0.65, 0, 0.35, 1)',
    // power3 = quart
    'power3.in': 'cubic-bezier(0.5, 0, 0.75, 0)',
    'power3.out': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'power3.inOut': 'cubic-bezier(0.76, 0, 0.24, 1)',
    // power4 = quint
    'power4.in': 'cubic-bezier(0.64, 0, 0.78, 0)',
    'power4.out': 'cubic-bezier(0.22, 1, 0.36, 1)',
    'power4.inOut': 'cubic-bezier(0.83, 0, 0.17, 1)',
    // sine
    'sine.in': 'cubic-bezier(0.12, 0, 0.39, 0)',
    'sine.out': 'cubic-bezier(0.61, 1, 0.88, 1)',
    'sine.inOut': 'cubic-bezier(0.37, 0, 0.63, 1)',
    // expo
    'expo.in': 'cubic-bezier(0.7, 0, 0.84, 0)',
    'expo.out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'expo.inOut': 'cubic-bezier(0.87, 0, 0.13, 1)',
    // back (overshoot)
    'back.in': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    'back.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'back.inOut': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    // elastic / bounce have no exact CSS equivalent -> closest feel
    'elastic.in': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    'elastic.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'elastic.inOut': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    'bounce.in': 'cubic-bezier(0.11, 0, 0.5, 0)',
    'bounce.out': 'cubic-bezier(0.5, 1, 0.89, 1)',
    'bounce.inOut': 'cubic-bezier(0.45, 0, 0.55, 1)',
    // step-style helper eases used by the animation catalog
    'steppedEase.out': 'steps(6, end)',
    'rough.out': 'linear',
};

/**
 * Looks an ease id up in `CSS_EASE_MAP`, tolerating a capitalized first letter
 * ("Power2.out") and never falling back to inherited Object.prototype members
 * (a plain `CSS_EASE_MAP['constructor']` would return a function).
 */
const lookupCssEase = (key: string): string | undefined => {
    const candidates = [key, key.charAt(0).toLowerCase() + key.slice(1)];
    for (const candidate of candidates) {
        if (Object.prototype.hasOwnProperty.call(CSS_EASE_MAP, candidate)) {
            return CSS_EASE_MAP[candidate];
        }
    }
    return undefined;
};

/** Maps a GSAP ease id (e.g. "power2.out") to a CSS timing function. */
export const gsapEaseToCss = (ease?: string): string => {
    if (!ease) return 'linear';
    const key = ease.trim();
    const direct = lookupCssEase(key);
    if (direct) return direct;
    // Tolerate "Power2.easeOut" style ids as well.
    const normalized = key
        .replace(/\.easeOut$/i, '.out')
        .replace(/\.easeInOut$/i, '.inOut')
        .replace(/\.easeIn$/i, '.in');
    return lookupCssEase(normalized) || 'linear';
};

export interface ElementAnimationCssOptions {
    /** DOM id of the element in the exported document, e.g. "el-abc". */
    id: string;
    /** Keyframes in absolute timeline seconds (from getElementKeyframes). */
    frames: AnimationKeyframe[];
    /** Resting base state of the element. */
    base: ElementBaseState;
    /** Element x/y so keyframe positions can be emitted as relative offsets. */
    elX: number;
    elY: number;
    /** Master timeline length; keyframe times become percentages of it. */
    totalDuration: number;
}

export interface ElementAnimationCss {
    /** `@keyframes` name to apply from JS. */
    animationName: string;
    /** CSS lines for the `@keyframes` block. */
    css: string[];
    /** Delay (ms) before the animation has to be attached = first keyframe time. */
    startDelayMs: number;
    /** Length (ms) of one full play-through (the master timeline). */
    durationMs: number;
    /** True when the element must stay hidden in CSS until its animation starts. */
    initialHidden: boolean;
}

/**
 * Builds the `@keyframes` rule + timing metadata for one element's animation.
 * Returns null when the element has no keyframes (nothing to animate).
 */
export const buildElementAnimationCss = ({
    id,
    frames,
    base,
    elX,
    elY,
    totalDuration,
}: ElementAnimationCssOptions): ElementAnimationCss | null => {
    if (frames.length === 0) return null;

    const animationName = 'anim-' + id;
    const lastTime = Math.max(...frames.map((f) => f.time));
    // Guard against a zero/negative master duration producing "Infinity%" keys.
    const span = totalDuration > 0 ? totalDuration : Math.max(lastTime, 0.001);

    const css: string[] = ['@keyframes ' + animationName + ' {'];

    // Preset keyframes carry the element's whole base state, so a fade-in would
    // otherwise emit "rotate(0deg) scaleX(1) scaleY(1)" and "filter: blur(0px)"
    // in every step. A property that is its identity value in EVERY keyframe adds
    // nothing -- and would then override whatever the page sets -- so it is
    // dropped. Dropping it everywhere (never just in some steps) keeps the CSS
    // interpolation of the remaining steps exact.
    const valueAt = (pick: (f: AnimationKeyframe) => number | undefined, fallback: number) =>
        frames.map((f) => {
            const value = pick(f);
            return value !== undefined ? value : fallback;
        });
    const isAlways = (values: number[], identity: number) => values.every((v) => v === identity);

    const skipRotation = isAlways(valueAt((f) => f.rotation, base.rotation), 0);
    const skipScaleX = isAlways(valueAt((f) => f.scaleX, base.scaleX), 1);
    const skipScaleY = isAlways(valueAt((f) => f.scaleY, base.scaleY), 1);
    const skipBlur = isAlways(valueAt((f) => f.blur, base.blur), 0);

    frames.forEach((k) => {
        const pct = ((k.time / span) * 100).toFixed(2);
        const parts: string[] = [];
        const opacity = k.opacity !== undefined ? k.opacity : base.opacity;
        parts.push('opacity: ' + opacity / 100 + ';');

        const x = k.x !== undefined ? k.x - elX : 0;
        const y = k.y !== undefined ? k.y - elY : 0;
        let transformStr = 'translate(' + x + 'px, ' + y + 'px)';
        if (k.rotation !== undefined && !skipRotation) transformStr += ' rotate(' + k.rotation + 'deg)';
        if (k.scaleX !== undefined && !skipScaleX) transformStr += ' scaleX(' + k.scaleX + ')';
        if (k.scaleY !== undefined && !skipScaleY) transformStr += ' scaleY(' + k.scaleY + ')';
        parts.push('transform: ' + transformStr + ';');

        if (k.letterSpacing !== undefined) parts.push('letter-spacing: ' + k.letterSpacing + 'px;');
        if (k.blur !== undefined && !skipBlur) parts.push('filter: blur(' + k.blur + 'px);');

        // Per-keyframe easing: the `animation` shorthand sets `linear`, and this
        // overrides the interpolation of the segment starting at this frame, so
        // the exported banner keeps the GSAP timing seen in the editor preview.
        const ease = gsapEaseToCss(k.easing);
        if (ease !== 'linear') parts.push('animation-timing-function: ' + ease + ';');

        css.push('  ' + pct + '% { ' + parts.join(' ') + ' }');
    });
    css.push('}');

    // An animation that begins from a hidden/offset state stays hidden in CSS
    // until the animation is attached, so the element neither flashes its
    // resting state first nor replays its entrance (the old "animation plays
    // twice" bug).
    const first = frames[0];
    const firstOpacity = first.opacity !== undefined ? first.opacity : base.opacity;

    return {
        animationName,
        css,
        startDelayMs: Math.max(0, Math.round((first.time || 0) * 1000)),
        durationMs: Math.max(1, Math.round(span * 1000)),
        initialHidden: firstOpacity / 100 < 0.02,
    };
};

/** Safely embeds a value as a JavaScript string literal (never breaks parsing). */
export const jsStringLiteral = (value: string): string => JSON.stringify(String(value ?? ''));

/** JS timeline entry that attaches CSS animations to one element at its start time. */
export const buildAnimationStartEvent = (opts: {
    id: string;
    startDelayMs: number;
    durationMs: number;
    loop: boolean;
    animationName: string;
}): string =>
    '      { time: ' + opts.startDelayMs + ', action: () => {\n' +
    '        var el = document.getElementById(' + jsStringLiteral(opts.id) + ');\n' +
    '        if (el) {\n' +
    '          el.style.animation = ' + jsStringLiteral(
        opts.durationMs + 'ms linear' + (opts.loop ? ' infinite' : '') + ' ' + opts.animationName,
    ) + ';\n' +
    '          el.style.animationFillMode = "forwards";\n' +
    '        }\n' +
    '      } },';

/** JS timeline entry that starts a background/inline video as soon as the banner loads. */
export const buildVideoAutoplayEvent = (id: string): string =>
    '      { time: 0, action: () => {\n' +
    '        var v = document.getElementById(' + jsStringLiteral(id) + ');\n' +
    '        if (v) v.play().catch(() => {});\n' +
    '      } },';

/**
 * JS timeline entry driving the ISI tray's own scroll clock. It is intentionally
 * independent of the banner timeline: it waits `startDelayMs`, then scrolls the
 * content top -> bottom over `scrollDuration` seconds and repeats forever.
 */
export const buildIsiScrollEvent = (opts: {
    contentId: string;
    indicatorId: string;
    startDelayMs: number;
    /** Seconds for one full top -> bottom pass (defaults to 60). */
    scrollDuration?: number;
}): string => {
    const scrollDuration = Math.max(1, opts.scrollDuration || 60);
    return (
        '      { time: ' + Math.max(0, Math.round(opts.startDelayMs)) + ', action: () => {\n' +
        '        const content = document.getElementById(' + jsStringLiteral(opts.contentId) + ');\n' +
        '        const indicator = document.getElementById(' + jsStringLiteral(opts.indicatorId) + ');\n' +
        '        if (content && content.parentElement) {\n' +
        '          const parent = content.parentElement;\n' +
        '          const maxScroll = content.scrollHeight - parent.clientHeight;\n' +
        '          if (maxScroll > 0) {\n' +
        '            const track = parent.querySelector(".iScrollVerticalScrollbar");\n' +
        '            let start = null;\n' +
        '            const animate = (timestamp) => {\n' +
        '              if (!start) start = timestamp;\n' +
        '              const elapsed = (timestamp - start) / 1000;\n' +
        '              // ISI own clock: scroll top->bottom over the configured duration, then reset to the top and repeat.\n' +
        '              const progress = Math.min((elapsed % ' + scrollDuration + ') / ' + scrollDuration + ', 1);\n' +
        '              content.style.transform = "translateY(" + (-maxScroll * progress) + "px)";\n' +
        '              if (indicator && track) {\n' +
        '                const indicatorY = progress * (track.clientHeight - (indicator.clientHeight || 13));\n' +
        '                indicator.style.transform = "translateY(" + indicatorY + "px)";\n' +
        '              }\n' +
        '              requestAnimationFrame(animate);\n' +
        '            };\n' +
        '            requestAnimationFrame(animate);\n' +
        '          }\n' +
        '        }\n' +
        '      } },'
    );
};

/**
 * Assembles the exported `js/main.js`: clickTags + the animation timeline.
 * Every entry runs through `setTimeout` once the window has finished loading.
 */
export const buildMainJs = (events: string[], clickTag: string): string => {
    const lines: string[] = [];
    lines.push('// Banner animation timeline');
    lines.push('var clickTag1 = ' + jsStringLiteral(clickTag) + ';');
    lines.push('var clickTag2 = "#";');
    lines.push('var clickTag3 = "#";');
    lines.push('');
    lines.push('var animationTimeline = [');
    lines.push(...events);
    lines.push('];');
    lines.push('');
    lines.push('window.onload = function() {');
    lines.push('  animationTimeline.forEach(function(event) {');
    lines.push('    setTimeout(event.action, event.time);');
    lines.push('  });');
    lines.push('};');
    return lines.join('\n');
};

