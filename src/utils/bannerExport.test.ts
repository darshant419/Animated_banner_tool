/*
 * The generated bundle is deliberately handed to V8's parser in these tests: a
 * single syntax error in `js/main.js` (which is exactly what made every exported
 * banner static) must fail them.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    buildAnimationStartEvent,
    buildElementAnimationCss,
    buildIsiScrollEvent,
    buildMainJs,
    buildVideoAutoplayEvent,
    gsapEaseToCss,
    jsStringLiteral,
} from './bannerExport';
import { getElementBaseState, getElementKeyframes } from './keyframes';
import type { ElementBaseState } from './keyframes';
import type { AnimationKeyframe, DesignElement } from '../store/designStore';

/** Compiles a snippet the same way the browser parses `js/main.js`. */
const compile = (code: string) => new Function(code);

/** Wraps timeline entries in an array literal so the snippet can be syntax-checked. */
const checkTimeline = (events: string[]) =>
    compile('return [' + events.join('\n') + '];')() as { time: number; action: () => void }[];

const base = (overrides: Partial<ElementBaseState> = {}): ElementBaseState => ({
    x: 100,
    y: 80,
    opacity: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    blur: 0,
    ...overrides,
});

const frame = (overrides: Partial<AnimationKeyframe> = {}): AnimationKeyframe => ({
    id: 'kf-1',
    time: 0,
    easing: 'linear',
    ...overrides,
});

describe('gsapEaseToCss', () => {
    it('maps known GSAP eases onto CSS timing functions', () => {
        expect(gsapEaseToCss('power2.out')).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
        expect(gsapEaseToCss('power1.inOut')).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
        expect(gsapEaseToCss('expo.in')).toBe('cubic-bezier(0.7, 0, 0.84, 0)');
        expect(gsapEaseToCss('back.out')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
        expect(gsapEaseToCss('linear')).toBe('linear');
        expect(gsapEaseToCss('none')).toBe('linear');
        expect(gsapEaseToCss('steppedEase.out')).toBe('steps(6, end)');
    });

    it('falls back to linear for missing or unknown eases', () => {
        expect(gsapEaseToCss()).toBe('linear');
        expect(gsapEaseToCss('')).toBe('linear');
        expect(gsapEaseToCss('  ')).toBe('linear');
        expect(gsapEaseToCss('not-a-real-easing')).toBe('linear');
    });

    it('never returns an inherited Object.prototype member', () => {
        // A plain map lookup would hand back a function here and emit garbage CSS.
        expect(gsapEaseToCss('constructor')).toBe('linear');
        expect(gsapEaseToCss('toString')).toBe('linear');
        expect(gsapEaseToCss('__proto__')).toBe('linear');
    });

    it('tolerates capitalized and .easeOut style ids', () => {
        expect(gsapEaseToCss('Power2.out')).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
        expect(gsapEaseToCss('Power2.easeOut')).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
        expect(gsapEaseToCss(' Expo.easeInOut ')).toBe('cubic-bezier(0.87, 0, 0.13, 1)');
    });
});

describe('buildElementAnimationCss', () => {
    it('returns null when the element has no keyframes', () => {
        expect(buildElementAnimationCss({
            id: 'el-1',
            frames: [],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 5,
        })).toBeNull();
    });

    it('turns keyframes into a @keyframes block measured against the master duration', () => {
        const result = buildElementAnimationCss({
            id: 'el-1',
            frames: [
                frame({ time: 0, x: 100, y: 80, opacity: 0 }),
                frame({ time: 2, x: 160, y: 110, opacity: 100 }),
            ],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 4,
        });

        expect(result).not.toBeNull();
        expect(result!.animationName).toBe('anim-el-1');
        expect(result!.startDelayMs).toBe(0);
        expect(result!.durationMs).toBe(4000);
        expect(result!.initialHidden).toBe(true);
        expect(result!.css[0]).toBe('@keyframes anim-el-1 {');
        expect(result!.css[1]).toBe('  0.00% { opacity: 0; transform: translate(0px, 0px); }');
        expect(result!.css[2]).toBe('  50.00% { opacity: 1; transform: translate(60px, 30px); }');
        expect(result!.css[result!.css.length - 1]).toBe('}');
    });

    it('falls back to the element base opacity for frames without one', () => {
        const result = buildElementAnimationCss({
            id: 'el-2',
            frames: [frame({ time: 0 }), frame({ time: 1 })],
            base: base({ opacity: 40 }),
            elX: 100,
            elY: 80,
            totalDuration: 1,
        });

        expect(result!.css[1]).toBe('  0.00% { opacity: 0.4; transform: translate(0px, 0px); }');
        expect(result!.css[2]).toBe('  100.00% { opacity: 0.4; transform: translate(0px, 0px); }');
    });

    it('emits rotation, scale, letter-spacing and blur', () => {
        const result = buildElementAnimationCss({
            id: 'el-3',
            frames: [frame({ time: 0, rotation: 45, scaleX: 0.5, scaleY: 0.5, letterSpacing: 2, blur: 4 })],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 1,
        });

        expect(result!.css[1]).toBe(
            '  0.00% { opacity: 1; transform: translate(0px, 0px) rotate(45deg) scaleX(0.5) scaleY(0.5);' +
            ' letter-spacing: 2px; filter: blur(4px); }',
        );
    });

    it('keeps the per-keyframe easing by overriding animation-timing-function', () => {
        const result = buildElementAnimationCss({
            id: 'el-4',
            frames: [
                frame({ time: 0, easing: 'power2.out' }),
                frame({ time: 1, easing: 'linear' }),
            ],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 1,
        });

        expect(result!.css[1]).toContain('animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);');
        // linear is the shorthand default, so it is not repeated.
        expect(result!.css[2]).not.toContain('animation-timing-function');
    });

    it('flags elements whose animation starts from a hidden state', () => {
        const hidden = buildElementAnimationCss({
            id: 'el-5',
            frames: [frame({ time: 1, opacity: 0 }), frame({ time: 1.8, opacity: 100 })],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 5,
        });
        expect(hidden!.startDelayMs).toBe(1000);
        expect(hidden!.durationMs).toBe(5000);
        expect(hidden!.initialHidden).toBe(true);

        const visible = buildElementAnimationCss({
            id: 'el-6',
            frames: [frame({ time: 0, opacity: 100 }), frame({ time: 1, opacity: 0 })],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 5,
        });
        expect(visible!.initialHidden).toBe(false);
    });

    it('survives a zero/negative master duration without emitting NaN percentages', () => {
        const result = buildElementAnimationCss({
            id: 'el-7',
            frames: [frame({ time: 0 }), frame({ time: 2 })],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 0,
        });

        expect(result!.durationMs).toBe(2000);
        expect(result!.css[2]).toBe('  100.00% { opacity: 1; transform: translate(0px, 0px); }');
        expect(result!.css.join('\n')).not.toContain('NaN');
    });

    it('drops rotation/scale/blur that are identity in every keyframe', () => {
        const result = buildElementAnimationCss({
            id: 'el-8',
            frames: [
                frame({ time: 0, rotation: 0, scaleX: 1, scaleY: 1, blur: 0 }),
                frame({ time: 1, rotation: 0, scaleX: 1, scaleY: 1, blur: 0 }),
            ],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 1,
        });

        expect(result!.css[1]).toBe('  0.00% { opacity: 1; transform: translate(0px, 0px); }');
        expect(result!.css[2]).toBe('  100.00% { opacity: 1; transform: translate(0px, 0px); }');
    });

    it('keeps a transform part as soon as one keyframe changes it', () => {
        const result = buildElementAnimationCss({
            id: 'el-9',
            frames: [frame({ time: 0, rotation: 0 }), frame({ time: 1, rotation: 30 })],
            base: base(),
            elX: 100,
            elY: 80,
            totalDuration: 1,
        });

        expect(result!.css[1]).toContain('rotate(0deg)');
        expect(result!.css[2]).toContain('rotate(30deg)');
    });
});

describe('buildAnimationStartEvent', () => {
    const startEvent = (overrides: Partial<Parameters<typeof buildAnimationStartEvent>[0]> = {}) =>
        buildAnimationStartEvent({
            id: 'el-1',
            startDelayMs: 500,
            durationMs: 3000,
            loop: false,
            animationName: 'anim-el-1',
            ...overrides,
        });

    it('assigns the animation with "=" (regression: a ":" here made main.js unparseable)', () => {
        const event = startEvent();

        expect(event).toContain('el.style.animation = "3000ms linear anim-el-1";');
        // The old exporter emitted an object-literal colon, which is a SyntaxError.
        expect(event).not.toContain('style.animation:');
        expect(() => checkTimeline([event])).not.toThrow();
    });

    it('schedules the element for its own start time and keeps the final frame', () => {
        const event = startEvent();

        expect(event).toContain('{ time: 500, action: () => {');
        expect(event).toContain('var el = document.getElementById("el-1");');
        expect(event).toContain('el.style.animationFillMode = "forwards";');
        // fill-mode must be set after the shorthand, which resets it to none.
        expect(event.indexOf('style.animation =')).toBeLessThan(event.indexOf('animationFillMode'));
    });

    it('repeats forever for looped animations', () => {
        expect(startEvent({ loop: true })).toContain('= "3000ms linear infinite anim-el-1";');
    });

    it('stays parseable when the id contains quotes', () => {
        const event = startEvent({ id: 'el-"quoted"' });
        expect(() => checkTimeline([event])).not.toThrow();
    });
});

describe('jsStringLiteral', () => {
    it('wraps values in double quotes and escapes what would break out', () => {
        expect(jsStringLiteral('a"b')).toBe('"a\\"b"');
        expect(jsStringLiteral("a'b")).toBe('"a\'b"');
        expect(jsStringLiteral('a\nb')).toBe('"a\\nb"');
        expect(jsStringLiteral('a\\b')).toBe('"a\\\\b"');
    });

    it('round-trips any value through JSON.parse', () => {
        for (const value of ['', 'plain', 'quote " and backslash \\', 'line\nbreak', '</script>']) {
            expect(JSON.parse(jsStringLiteral(value))).toBe(value);
        }
    });

    it('does not emit the string "undefined" for a missing value', () => {
        expect(jsStringLiteral(undefined as unknown as string)).toBe('""');
    });
});

describe('video and ISI timeline entries', () => {
    it('plays videos on load and tolerates a rejected play() promise', () => {
        const event = buildVideoAutoplayEvent('vid-1');

        expect(event).toContain('{ time: 0, action: () => {');
        expect(event).toContain('var v = document.getElementById("vid-1");');
        expect(event).toContain('v.play().catch(() => {})');
        expect(() => checkTimeline([event])).not.toThrow();
    });

    it('keeps the ISI scroll on its own repeating clock', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: 2000,
            scrollDuration: 30,
        });

        expect(event).toContain('{ time: 2000, action: () => {');
        expect(event).toContain('const content = document.getElementById("isi-content-1");');
        expect(event).toContain('const indicator = document.getElementById("isi-indicator-1");');
        expect(event).toContain('elapsed % 30');
        expect(() => checkTimeline([event])).not.toThrow();
    });

    it('defaults the scroll duration to a minute and clamps a negative delay', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: -500,
        });

        expect(event).toContain('{ time: 0, action: () => {');
        expect(event).toContain('elapsed % 60');
    });
});

describe('buildMainJs', () => {
    it('emits a script that parses, defines the clickTags and runs the timeline on load', () => {
        const mainJs = buildMainJs(
            [
                buildAnimationStartEvent({
                    id: 'el-1',
                    startDelayMs: 0,
                    durationMs: 2000,
                    loop: false,
                    animationName: 'anim-el-1',
                }),
                buildVideoAutoplayEvent('vid-1'),
            ],
            'https://example.com/',
        );

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var clickTag1 = "https://example.com/";');
        expect(mainJs).toContain('var clickTag2 = "#";');
        expect(mainJs).toContain('var clickTag3 = "#";');
        expect(mainJs).toContain('var animationTimeline = [');
        expect(mainJs).toContain('window.onload = function() {');
        expect(mainJs).toContain('setTimeout(event.action, event.time);');
    });

    it('escapes clickTag values instead of breaking the file', () => {
        const mainJs = buildMainJs([], 'https://example.com/?q="broken');

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var clickTag1 = "https://example.com/?q=\\"broken";');
    });

    it('only documents the empty timeline when there is nothing to animate', () => {
        const mainJs = buildMainJs([], 'https://example.com/');

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var animationTimeline = [\n];');
    });

    it('runs every queued action once the window has loaded (simulated)', () => {
        vi.useFakeTimers();
        try {
            const element = { style: {} as Record<string, string> };
            const dom = { getElementById: (domId: string) => (domId === 'el-hero' ? element : null) };
            const fakeWindow = {} as { onload?: () => void };

            const mainJs = buildMainJs(
                [
                    buildAnimationStartEvent({
                        id: 'el-hero',
                        startDelayMs: 1000,
                        durationMs: 5000,
                        loop: false,
                        animationName: 'anim-el-hero',
                    }),
                ],
                'https://example.com/',
            );

            new Function('document', 'window', mainJs)(dom, fakeWindow);

            expect(fakeWindow.onload).toBeTypeOf('function');
            fakeWindow.onload!();

            // Nothing happens before the element's own start time.
            vi.advanceTimersByTime(999);
            expect(element.style.animation).toBeUndefined();

            vi.advanceTimersByTime(1);
            expect(element.style.animation).toBe('5000ms linear anim-el-hero');
            expect(element.style.animationFillMode).toBe('forwards');
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('export pipeline (element -> @keyframes CSS -> js/main.js)', () => {
    it('turns a delayed fade-in into a running CSS animation in the exported package', () => {
        const el: DesignElement = {
            id: 'el-hero',
            type: 'text',
            x: 40,
            y: 30,
            width: 200,
            height: 60,
            enterAnimation: 'fadeIn',
            enterDelay: 1,
            animationDuration: 0.8,
        };

        const frames = getElementKeyframes(el, 5);
        const animation = buildElementAnimationCss({
            id: el.id,
            frames,
            base: getElementBaseState(el),
            elX: el.x,
            elY: el.y,
            totalDuration: 5,
        });

        if (!animation) throw new Error('expected the element to produce animation CSS');

        // The entrance starts at 1s of a 5s master timeline: 20% -> 36%.
        expect(animation.startDelayMs).toBe(1000);
        expect(animation.durationMs).toBe(5000);
        expect(animation.initialHidden).toBe(true);
        expect(animation.css).toContain(
            '  20.00% { opacity: 0; transform: translate(0px, 0px);' +
            ' animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }',
        );
        expect(animation.css).toContain(
            '  36.00% { opacity: 1; transform: translate(0px, 0px);' +
            ' animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }',
        );

        const mainJs = buildMainJs(
            [
                buildAnimationStartEvent({
                    id: el.id,
                    startDelayMs: animation.startDelayMs,
                    durationMs: animation.durationMs,
                    loop: false,
                    animationName: animation.animationName,
                }),
            ],
            'https://example.com/',
        );

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var clickTag1 = "https://example.com/";');
        expect(mainJs).toContain('el.style.animation = "5000ms linear anim-el-hero";');
        expect(mainJs).not.toContain('style.animation:');
    });
});
