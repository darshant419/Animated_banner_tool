/*
 * The generated bundle is deliberately handed to V8's parser in these tests: a
 * single syntax error in `js/main.js` (which is exactly what made every exported
 * banner static) must fail them.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    buildAnimationStartEvent,
    buildBannerClickTagDeclaration,
    buildBannerClickTagEvent,
    buildClickHotspot,
    buildClickTagDeclarations,
    buildClickTagPlan,
    buildElementAnimationCss,
    buildIsiScrollEvent,
    buildLinkAttributes,
    buildMainJs,
    buildVideoAutoplayEvent,
    collectLinkSources,
    escapeHtmlAttribute,
    gsapEaseToCss,
    isSafeLinkUrl,
    jsStringLiteral,
    linkKey,
    normalizeLinkUrl,
    resolveBannerClickTagUrl,
} from './bannerExport';
import { getElementBaseState, getElementKeyframes } from './keyframes';
import type { ElementBaseState } from './keyframes';
import type { AnimationKeyframe, DesignElement } from '../store/designStore';
import type { BannerClickTag, LinkSource } from './bannerExport';

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
        // Percentages are absolute master-timeline positions (1s -> 20%,
        // 1.8s -> 36%) and the animation attaches with the document, so the
        // entrance lands on the same wall-clock second as in the editor.
        expect(hidden!.startDelayMs).toBe(0);
        expect(hidden!.durationMs).toBe(5000);
        expect(hidden!.initialHidden).toBe(true);
        // A synthesized 0% step holds the hidden state until the entrance
        // starts instead of interpolating from the resting state.
        expect(hidden!.css[1]).toBe('  0.00% { opacity: 0; transform: translate(0px, 0px); }');
        expect(hidden!.css[2]).toBe('  20.00% { opacity: 0; transform: translate(0px, 0px); }');
        expect(hidden!.css[3]).toBe('  36.00% { opacity: 1; transform: translate(0px, 0px); }');

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
        // One cycle is the scroll pass plus the bottom hold (30s + 3s default).
        expect(event).toContain('const cycle = 33;');
        expect(event).toContain('const phase = elapsed % cycle;');
        expect(() => checkTimeline([event])).not.toThrow();
    });

    it('defaults the scroll duration to a minute and clamps a negative delay', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: -500,
        });

        expect(event).toContain('{ time: 0, action: () => {');
        expect(event).toContain('const cycle = 63;');
    });

    it('holds at the bottom for the configured seconds before resetting', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: 0,
            scrollDuration: 20,
            holdDuration: 5,
        });

        expect(event).toContain('const cycle = 25;');
        // The scroll phase owns only the first 20s; afterwards progress pins to 1.
        expect(event).toContain('phase < 20 ? phase / 20 : 1');
        expect(() => checkTimeline([event])).not.toThrow();
    });

    it('treats a missing hold duration as the 3 second default', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: 0,
            scrollDuration: 10,
            holdDuration: undefined,
        });

        expect(event).toContain('const cycle = 13;');
    });

    it('exposes hover-to-pause wiring in the exported script', () => {
        const event = buildIsiScrollEvent({
            contentId: 'isi-content-1',
            indicatorId: 'isi-indicator-1',
            startDelayMs: 0,
        });

        expect(event).toContain('content.closest(".isi-main")');
        expect(event).toContain('tray.addEventListener("mouseenter", function () { paused = true; });');
        expect(event).toContain('tray.addEventListener("mouseleave", function () { paused = false; });');
        expect(event).toContain('if (paused) { requestAnimationFrame(animate); return; }');
        expect(() => checkTimeline([event])).not.toThrow();
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
            [{ name: 'clickTag1', url: 'https://example.com/' }],
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
        const mainJs = buildMainJs([], [{ name: 'clickTag1', url: 'https://example.com/?q="broken' }]);

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var clickTag1 = "https://example.com/?q=\\"broken";');
    });

    it('only documents the empty timeline when there is nothing to animate', () => {
        const mainJs = buildMainJs([], [{ name: 'clickTag1', url: 'https://example.com/' }]);

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
                [{ name: 'clickTag1', url: 'https://example.com/' }],
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

        // The entrance starts at 1s of a 5s master timeline: 20% -> 36%,
        // held from a synthesized 0% step so nothing moves before then and the
        // whole timeline (including an end-of-banner fade) stays in sync.
        expect(animation.startDelayMs).toBe(0);
        expect(animation.durationMs).toBe(5000);
        expect(animation.initialHidden).toBe(true);
        expect(animation.css).toContain(
            '  0.00% { opacity: 0; transform: translate(0px, 0px);' +
            ' animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1); }',
        );
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
            [{ name: 'clickTag1', url: 'https://example.com/' }],
        );

        expect(() => compile(mainJs)).not.toThrow();
        expect(mainJs).toContain('var clickTag1 = "https://example.com/";');
        expect(mainJs).toContain('el.style.animation = "5000ms linear anim-el-hero";');
        expect(mainJs).not.toContain('style.animation:');
    });
});

/** Minimal element factory for the click-tag suites. */
const linked = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'el-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 100,
    height: 40,
    ...overrides,
});

describe('normalizeLinkUrl / isSafeLinkUrl', () => {
    it('adds https:// to a bare domain', () => {
        expect(normalizeLinkUrl('www.example.com/cta')).toBe('https://www.example.com/cta');
        expect(normalizeLinkUrl(' example.com ')).toBe('https://example.com');
        expect(normalizeLinkUrl('example.com?a=1#b')).toBe('https://example.com?a=1#b');
    });

    it('leaves real URLs and relative destinations untouched', () => {
        expect(normalizeLinkUrl('https://a.com/x')).toBe('https://a.com/x');
        expect(normalizeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
        expect(normalizeLinkUrl('/legal/pi')).toBe('/legal/pi');
        expect(normalizeLinkUrl('#anchor')).toBe('#anchor');
        expect(normalizeLinkUrl('')).toBe('');
    });

    it('accepts http(s), mailto, tel and relative links only', () => {
        expect(isSafeLinkUrl('https://a.com')).toBe(true);
        expect(isSafeLinkUrl('http://a.com')).toBe(true);
        expect(isSafeLinkUrl('mailto:a@b.com')).toBe(true);
        expect(isSafeLinkUrl('tel:+123')).toBe(true);
        expect(isSafeLinkUrl('/path')).toBe(true);
    });

    it('rejects script-carrying and empty destinations', () => {
        expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeLinkUrl('JaVaScRiPt:alert(1)')).toBe(false);
        expect(isSafeLinkUrl('data:text/html,<script>1</script>')).toBe(false);
        expect(isSafeLinkUrl('vbscript:msgbox')).toBe(false);
        expect(isSafeLinkUrl('example.com')).toBe(false);
        expect(isSafeLinkUrl('')).toBe(false);
        expect(isSafeLinkUrl(undefined)).toBe(false);
    });
});

describe('escapeHtmlAttribute', () => {
    it('neutralises everything that could break out of an attribute', () => {
        expect(escapeHtmlAttribute('a"b')).toBe('a&quot;b');
        expect(escapeHtmlAttribute("a'b")).toBe('a&#39;b');
        expect(escapeHtmlAttribute('a&b')).toBe('a&amp;b');
        expect(escapeHtmlAttribute('<img>')).toBe('&lt;img&gt;');
        expect(escapeHtmlAttribute('https://a.com/?a=1&b=2')).toBe('https://a.com/?a=1&amp;b=2');
    });
});

describe('collectLinkSources', () => {
    it('collects one box link per visible element and skips hidden layers', () => {
        const sources = collectLinkSources([
            linked({ id: 'el-1', linkUrl: 'https://a.com/' }),
            linked({ id: 'el-2', linkUrl: 'https://b.com/', visible: false }),
            linked({ id: 'el-3' }),
        ]);

        expect(sources).toEqual([
            { elementId: 'el-1', slot: 'box', url: 'https://a.com/', target: '_blank', clickTag: undefined },
        ]);
    });

    it('honours same-window targets and normalises the URL', () => {
        const sources = collectLinkSources([
            linked({ id: 'el-1', linkUrl: 'example.com/cta', linkTarget: '_self' }),
        ]);

        expect(sources[0]).toMatchObject({ url: 'https://example.com/cta', target: '_self' });
    });

    it('drops unsafe destinations entirely', () => {
        expect(collectLinkSources([linked({ linkUrl: 'javascript:alert(1)' })])).toEqual([]);
    });

    it('never gives the ISI tray a box hotspot, but keeps its strip and logo links', () => {
        const sources = collectLinkSources([
            linked({
                id: 'isi-1',
                type: 'isiScroll',
                linkUrl: 'https://ignore-me.com/',
                isiHeaderText: 'Prescribing Information',
                isiHeaderLink: 'https://pi.com/doc.pdf',
                isiLogoSrc: '/emr_assets/logo.png',
                isiLogoLink: 'https://logo.com/',
            }),
        ]);

        expect(sources.map((s) => s.slot)).toEqual(['isiHeader', 'isiLogo']);
        expect(sources[0]).toMatchObject({ elementId: 'isi-1', slot: 'isiHeader', url: 'https://pi.com/doc.pdf' });
    });

    it('only reports ISI sub-links that are actually rendered', () => {
        // A link without header text / logo source would never be emitted.
        expect(collectLinkSources([
            linked({ id: 'isi-1', type: 'isiScroll', isiHeaderLink: 'https://pi.com/', isiLogoLink: 'https://logo.com/' }),
        ])).toEqual([]);
    });
});

describe('buildClickTagPlan', () => {
    const source = (overrides: Partial<LinkSource> = {}): LinkSource => ({
        elementId: 'el-1',
        slot: 'box',
        url: 'https://a.com/',
        target: '_blank',
        ...overrides,
    });

    it('assigns clickTag1, clickTag2 and clickTag3 in element order', () => {
        const plan = buildClickTagPlan([
            source({ elementId: 'el-1', url: 'https://a.com/' }),
            source({ elementId: 'el-2', url: 'https://b.com/' }),
            source({ elementId: 'el-3', url: 'https://c.com/' }),
        ]);

        expect(plan.declarations).toEqual([
            { name: 'clickTag1', url: 'https://a.com/' },
            { name: 'clickTag2', url: 'https://b.com/' },
            { name: 'clickTag3', url: 'https://c.com/' },
        ]);
        expect(plan.byElementSlot[linkKey('el-2', 'box')]).toEqual({
            name: 'clickTag2',
            url: 'https://b.com/',
            target: '_blank',
        });
    });

    it('keeps an explicitly requested variable', () => {
        const plan = buildClickTagPlan([
            source({ elementId: 'el-1', url: 'https://a.com/', clickTag: 'clickTag3' }),
        ]);

        expect(plan.declarations).toEqual([{ name: 'clickTag3', url: 'https://a.com/' }]);
        expect(plan.byElementSlot[linkKey('el-1', 'box')].name).toBe('clickTag3');
    });

    it('gives two spots with the same destination the same variable', () => {
        const plan = buildClickTagPlan([
            source({ elementId: 'el-1', url: 'https://a.com/', clickTag: 'clickTag1' }),
            source({ elementId: 'el-2', url: 'https://a.com/', clickTag: 'clickTag1' }),
        ]);

        expect(plan.declarations).toEqual([{ name: 'clickTag1', url: 'https://a.com/' }]);
        expect(plan.byElementSlot[linkKey('el-2', 'box')].name).toBe('clickTag1');
    });

    it('re-assigns a variable instead of letting a second destination overwrite it', () => {
        const plan = buildClickTagPlan([
            source({ elementId: 'el-1', url: 'https://a.com/', clickTag: 'clickTag1' }),
            source({ elementId: 'el-2', url: 'https://b.com/', clickTag: 'clickTag1' }),
        ]);

        expect(plan.declarations).toEqual([
            { name: 'clickTag1', url: 'https://a.com/' },
            { name: 'clickTag2', url: 'https://b.com/' },
        ]);
    });

    it('exports a plain href for "none" and once every variable is taken', () => {
        const plan = buildClickTagPlan([
            source({ elementId: 'el-1', url: 'https://a.com/', clickTag: 'none' }),
            source({ elementId: 'el-2', url: 'https://b.com/' }),
            source({ elementId: 'el-3', url: 'https://c.com/' }),
            source({ elementId: 'el-4', url: 'https://d.com/' }),
            source({ elementId: 'el-5', url: 'https://e.com/' }),
        ]);

        expect(plan.byElementSlot[linkKey('el-1', 'box')].name).toBeUndefined();
        expect(plan.byElementSlot[linkKey('el-5', 'box')]).toEqual({ url: 'https://e.com/', target: '_blank' });
        expect(plan.declarations).toHaveLength(3);
    });
});

describe('buildClickTagDeclarations', () => {
    it('always declares all three variables, using "#" for the free ones', () => {
        expect(buildClickTagDeclarations([{ name: 'clickTag2', url: 'https://b.com/' }])).toEqual([
            'var clickTag1 = "#";',
            'var clickTag2 = "https://b.com/";',
            'var clickTag3 = "#";',
        ]);
    });
});

describe('banner click tag (design-wide clickTag)', () => {
    const banner = (overrides: Partial<BannerClickTag> = {}): BannerClickTag => ({
        enabled: true,
        url: 'https://www.example.com/landing',
        target: '_blank',
        ...overrides,
    });

    describe('resolveBannerClickTagUrl', () => {
        it('returns the configured URL only when the switch is on and it is safe', () => {
            expect(resolveBannerClickTagUrl(banner())).toBe('https://www.example.com/landing');
            expect(resolveBannerClickTagUrl(banner({ enabled: false }))).toBe('');
            expect(resolveBannerClickTagUrl(banner({ url: 'javascript:alert(1)' }))).toBe('');
            expect(resolveBannerClickTagUrl(undefined)).toBe('');
        });
    });

    describe('buildBannerClickTagDeclaration', () => {
        it('declares the standard clickTag with the configured URL', () => {
            expect(buildBannerClickTagDeclaration(banner())).toBe('var clickTag = "https://www.example.com/landing";');
        });

        it('normalises a bare domain typed by the designer', () => {
            expect(buildBannerClickTagDeclaration(banner({ url: 'example.com/landing' }))).toBe(
                'var clickTag = "https://example.com/landing";',
            );
        });

        it('keeps the "#" placeholder when the switch is off or nothing was configured', () => {
            expect(buildBannerClickTagDeclaration(banner({ enabled: false }))).toBe('var clickTag = "#";');
            expect(buildBannerClickTagDeclaration(undefined)).toBe('var clickTag = "#";');
        });

        it('never exports a script URL', () => {
            expect(buildBannerClickTagDeclaration(banner({ url: 'javascript:alert(1)' }))).toBe('var clickTag = "#";');
        });
    });

    describe('buildBannerClickTagEvent', () => {
        /** Wires the event against fake document/window objects, like a browser would. */
        const wire = (clickTag?: BannerClickTag, search = '', winOverrides: Record<string, unknown> = {}) => {
            const listeners: Array<(event: unknown) => void> = [];
            const bannerEl = {
                style: {} as Record<string, string>,
                addEventListener: (type: string, fn: (event: unknown) => void) => {
                    if (type === 'click') listeners.push(fn);
                },
            };
            const dom = { getElementById: (id: string) => (id === 'banner' ? bannerEl : null) };
            const opened: Array<{ url: string; target: string }> = [];
            const win = {
                location: { search },
                open: (url: string, target: string) => { opened.push({ url, target }); },
                ...winOverrides,
            };
            const factory = new Function('document', 'window', 'return [' + buildBannerClickTagEvent(clickTag) + '];');
            const timeline = factory(dom, win) as Array<{ time: number; action: () => void }>;
            expect(timeline).toHaveLength(1);
            expect(typeof timeline[0].action).toBe('function');
            timeline[0].action();
            return {
                bannerEl,
                opened,
                win: win as Record<string, unknown>,
                click: (target: unknown) => listeners.forEach((fn) => fn({ target })),
            };
        };

        const plainTarget = { closest: () => null };
        const hotspotTarget = { closest: (selector: string) => (selector === 'a' ? {} : null) };

        it('compiles as a timeline entry', () => {
            expect(() => checkTimeline([buildBannerClickTagEvent(banner())])).not.toThrow();
        });

        it('makes the whole banner clickable and opens the declared URL in the configured target', () => {
            const wired = wire(banner({ target: '_self' }));

            expect(wired.bannerEl.style.cursor).toBe('pointer');
            wired.click(plainTarget);
            expect(wired.opened).toEqual([{ url: 'https://www.example.com/landing', target: '_self' }]);
        });

        it('lets element hotspots keep their own destination', () => {
            const wired = wire(banner());

            wired.click(hotspotTarget);
            expect(wired.opened).toEqual([]);
        });

        it('prefers a ?clickTag= query parameter over the declared URL', () => {
            const wired = wire(banner(), '?clickTag=https%3A%2F%2Fadserver.com%2Fclick');

            wired.click(plainTarget);
            expect(wired.opened).toEqual([{ url: 'https://adserver.com/click', target: '_blank' }]);
        });

        it('honours a window.clickTag override even when the switch is off', () => {
            const wired = wire(banner({ enabled: false, url: '' }), '', { clickTag: 'https://override.com/' });

            expect(wired.bannerEl.style.cursor).toBe('pointer');
            wired.click(plainTarget);
            expect(wired.opened).toEqual([{ url: 'https://override.com/', target: '_blank' }]);
        });

        it('stays non-clickable without any destination', () => {
            const wired = wire(banner({ enabled: false, url: '' }));

            expect(wired.bannerEl.style.cursor).toBeUndefined();
            wired.click(plainTarget);
            expect(wired.opened).toEqual([]);
        });

        it('rejects an unsafe query parameter', () => {
            const wired = wire(banner({ enabled: false, url: '' }), '?clickTag=javascript:alert(1)');

            wired.click(plainTarget);
            expect(wired.opened).toEqual([]);
        });

        it('exposes window.getClickTagValue for ad-tag integrations', () => {
            const wired = wire(banner(), '?clickTAG=https://alt.com/&x=1');
            const get = wired.win.getClickTagValue as (name?: string) => string;

            expect(get('clickTAG')).toBe('https://alt.com/');
            expect(get()).toBe('');
        });
    });
});

describe('buildLinkAttributes', () => {
    it('routes click-tagged links through window.open(window.clickTagN, ...)', () => {
        const attrs = buildLinkAttributes({ name: 'clickTag1', url: 'https://a.com/', target: '_blank' });

        // Same shape as the hand-written reference banner.
        expect(attrs).toBe(
            'href="#" onclick="window.open(window.clickTag1, \'_blank\'); return false;" target="_blank"',
        );
    });

    it('emits a real href for links without a click tag', () => {
        const attrs = buildLinkAttributes({ url: 'https://a.com/?a=1&b=2', target: '_self' });

        expect(attrs).toBe('href="https://a.com/?a=1&amp;b=2" target="_self"');
    });

    it('cannot be broken out of by a crafted URL', () => {
        const attrs = buildLinkAttributes({ url: 'https://a.com/"><script>alert(1)</script>', target: '_blank' });

        expect(attrs).not.toContain('<script>');
        expect(attrs).toContain('&quot;&gt;&lt;script&gt;');
    });
});

describe('buildClickHotspot', () => {
    it('covers the element box exactly and shares its z-index', () => {
        const html = buildClickHotspot({
            id: 'link-el-hero',
            x: 20,
            y: 30,
            width: 120,
            height: 40,
            z: 4,
            link: { name: 'clickTag1', url: 'https://a.com/', target: '_blank' },
        });

        expect(html).toContain('<a id="link-el-hero" class="clicktag-area"');
        expect(html).toContain('left: 20px; top: 30px; width: 120px; height: 40px; z-index: 4;');
        expect(html).toContain('window.open(window.clickTag1');
        expect(html.endsWith('></a>')).toBe(true);
    });
});
