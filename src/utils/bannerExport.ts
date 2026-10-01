import type { AnimationKeyframe } from '../store/designStore';
import { CLICK_TAG_NAMES } from '../store/designStore';
import type { ClickTagName, DesignElement, LinkClickTag, LinkTarget } from '../store/designStore';
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
    /** Delay (ms) before the animation is attached. Always 0: keyframe percentages are absolute master-timeline times, so attaching with the document keeps delayed elements in sync. */
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
    // Emitted in time order. Percentages are ABSOLUTE positions on the master
    // timeline (0% = the banner's first frame) and the animation is attached
    // with the document, so a keyframe at t seconds renders at t seconds in the
    // exported banner -- exactly what the editor preview scrubs to.
    const ordered = [...frames].sort((a, b) => a.time - b.time);
    const lastTime = Math.max(...ordered.map((f) => f.time));
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

    const stepCss = (k: AnimationKeyframe): string => {
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

        return parts.join(' ');
    };

    const first = ordered[0];
    const firstPct = ((first.time / span) * 100).toFixed(2);
    if (firstPct !== '0.00') {
        // The element starts after the banner begins: hold its first keyframe
        // from 0% so it neither flashes its resting state nor drifts towards
        // the first keyframe before its start time (the editor holds that
        // state from t=0 as well).
        css.push('  0.00% { ' + stepCss(first) + ' }');
    }
    ordered.forEach((k) => {
        css.push('  ' + ((k.time / span) * 100).toFixed(2) + '% { ' + stepCss(k) + ' }');
    });
    css.push('}');

    // An animation that begins from a hidden state also gets `opacity: 0` in
    // CSS, so the element neither flashes its resting state before the first
    // paint nor replays its entrance (the old "animation plays twice" bug).
    const firstOpacity = first.opacity !== undefined ? first.opacity : base.opacity;

    return {
        animationName,
        css,
        // Keyframe percentages carry the timeline position, so the animation is
        // attached as soon as the document loads; a delayed entrance simply
        // holds its first keyframe until its start time instead of playing the
        // whole timeline `startDelay` seconds late (which pushed the end-of-
        // banner fade past the end of the banner).
        startDelayMs: 0,
        durationMs: Math.max(1, Math.round(span * 1000)),
        initialHidden: firstOpacity / 100 < 0.02,
    };
};

/** Safely embeds a value as a JavaScript string literal (never breaks parsing). */
export const jsStringLiteral = (value: string): string => JSON.stringify(String(value ?? ''));

/** Escapes a value so it can sit inside a double-quoted HTML attribute. */
export const escapeHtmlAttribute = (value: string): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

/**
 * Adds the `https://` scheme when the designer typed a bare domain
 * ("www.example.com/cta" is what people actually paste). Anything else is
 * returned untouched so validation can reject it.
 */
export const normalizeLinkUrl = (raw?: string): string => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    // Junk that must never be turned into a link.
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return trimmed;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    // A relative / fragment destination is fine as-is.
    if (/^([/#]|\.{1,2}\/)/.test(trimmed)) return trimmed;
    // "example.com", "example.com/path?q=1" -> https://…
    if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return 'https://' + trimmed;
    return trimmed;
};

/**
 * Only http(s), mailto, tel and same-origin relative destinations are exported.
 * Anything else (`javascript:`, `data:`, …) is dropped so a design can never
 * ship a clickable XSS payload inside the exported banner or its preview.
 */
export const isSafeLinkUrl = (url?: string): boolean => {
    const trimmed = (url || '').trim();
    if (!trimmed) return false;
    if (/^(https?|mailto|tel):/i.test(trimmed)) return true;
    return /^([/#]|\.{1,2}\/)/.test(trimmed);
};

/** Where a link lives inside an element: the element box, or an ISI sub-link. */
export type LinkSlot = 'box' | 'isiHeader' | 'isiLogo';

/** One clickable location found on the banner. */
export interface LinkSource {
    elementId: string;
    slot: LinkSlot;
    url: string;
    target: LinkTarget;
    clickTag?: LinkClickTag;
}

/** What the exporter finally does with one link. */
export interface ElementLinkAssignment {
    /** Click-tag variable driving the click; absent = plain `href`. */
    name?: ClickTagName;
    url: string;
    target: LinkTarget;
}

/** One `var clickTagN = "…";` declaration of the exported banner. */
export interface ClickTagDeclaration {
    name: ClickTagName;
    url: string;
}

/** Result of resolving every link on the banner against the click-tag variables. */
export interface ClickTagPlan {
    /** Variables to declare (only the ones actually used). */
    declarations: ClickTagDeclaration[];
    /** Resolved link per `elementId:slot`. */
    byElementSlot: Record<string, ElementLinkAssignment>;
}

/** Map key for `ClickTagPlan.byElementSlot`. */
export const linkKey = (elementId: string, slot: LinkSlot): string => elementId + ':' + slot;

/**
 * Collects every clickable location on the banner, in DOM (z-order) order:
 * for each element its box, then the ISI header strip and the ISI logo.
 *
 * The ISI tray itself never gets a box hotspot — it would swallow the tray's
 * own scrolling and hover-to-pause behaviour — so its links are the strip, the
 * logo and any `<a>` inside the ISI rich text.
 */
export const collectLinkSources = (elements: DesignElement[]): LinkSource[] => {
    const sources: LinkSource[] = [];

    for (const el of elements) {
        if (el.visible === false) continue;

        if (el.type === 'isiScroll') {
            const headerUrl = normalizeLinkUrl(el.isiHeaderLink);
            if (el.isiHeaderText && isSafeLinkUrl(headerUrl)) {
                sources.push({
                    elementId: el.id,
                    slot: 'isiHeader',
                    url: headerUrl,
                    target: '_blank',
                    clickTag: el.isiHeaderClickTag,
                });
            }
            const logoUrl = normalizeLinkUrl(el.isiLogoLink);
            if (el.isiLogoSrc && isSafeLinkUrl(logoUrl)) {
                sources.push({
                    elementId: el.id,
                    slot: 'isiLogo',
                    url: logoUrl,
                    target: '_blank',
                    clickTag: el.isiLogoClickTag,
                });
            }
            continue;
        }

        const url = normalizeLinkUrl(el.linkUrl);
        if (!isSafeLinkUrl(url)) continue;

        sources.push({
            elementId: el.id,
            slot: 'box',
            url,
            target: el.linkTarget === '_self' ? '_self' : '_blank',
            clickTag: el.linkClickTag,
        });
    }

    return sources;
};

/**
 * Resolves every link against the three click-tag variables:
 *
 * - an explicit `clickTagN` keeps that variable while it is free; if the same
 *   URL already owns it the link reuses it, otherwise the link is re-assigned
 *   so two different destinations can never overwrite each other,
 * - `auto` / undefined takes the next free variable (clickTag1 -> 2 -> 3),
 * - `none` exports a plain `href`,
 * - once all three variables are taken the remaining links fall back to a plain
 *   `href` as well, so a link is never silently dropped.
 */
export const buildClickTagPlan = (sources: LinkSource[]): ClickTagPlan => {
    const declarations: ClickTagDeclaration[] = [];
    const byElementSlot: Record<string, ElementLinkAssignment> = {};

    for (const source of sources) {
        const key = linkKey(source.elementId, source.slot);
        const requested = source.clickTag;

        if (requested === 'none') {
            byElementSlot[key] = { url: source.url, target: source.target };
            continue;
        }

        if (requested && requested !== 'auto') {
            const owner = declarations.find((d) => d.name === requested);
            if (!owner || owner.url === source.url) {
                if (!owner) declarations.push({ name: requested, url: source.url });
                byElementSlot[key] = { name: requested, url: source.url, target: source.target };
                continue;
            }
            // Requested variable belongs to another destination -> next free one.
        }

        const free = CLICK_TAG_NAMES.find((name) => !declarations.some((d) => d.name === name));
        if (!free) {
            byElementSlot[key] = { url: source.url, target: source.target };
            continue;
        }

        declarations.push({ name: free, url: source.url });
        byElementSlot[key] = { name: free, url: source.url, target: source.target };
    }

    return { declarations, byElementSlot };
};

/** Plan straight from the element list (shared by the exporter and the UI). */
export const buildClickTagPlanForElements = (elements: DesignElement[]): ClickTagPlan =>
    buildClickTagPlan(collectLinkSources(elements));

/**
 * Emits the three `var clickTagN = …;` lines the exported banner declares.
 * Unused variables keep the conventional `"#"` placeholder, so ad platforms
 * always find the same set of globals.
 */
export const buildClickTagDeclarations = (declarations: ClickTagDeclaration[]): string[] =>
    CLICK_TAG_NAMES.map((name) => {
        const used = declarations.find((d) => d.name === name);
        return 'var ' + name + ' = ' + jsStringLiteral(used ? used.url : '#') + ';';
    });

/**
 * Banner-level click tag — the design-wide "Use as click tag" switch, its
 * click-through URL and where a click opens. This is the standard `clickTag`
 * global ad platforms look for and overwrite at serve time (same behaviour as
 * The Brief's HTML5 export); element links keep their own `clickTag1..3`.
 */
export interface BannerClickTag {
    /** When true the URL is declared as `clickTag` and the whole banner opens it. */
    enabled: boolean;
    url?: string;
    target: LinkTarget;
}

/**
 * The URL the exported banner declares as its click tag: the configured
 * destination when the switch is on and it passes the safety check, otherwise
 * empty (the declaration then keeps the conventional `"#"` placeholder).
 */
export const resolveBannerClickTagUrl = (banner?: BannerClickTag): string => {
    if (!banner?.enabled) return '';
    const url = normalizeLinkUrl(banner.url);
    return isSafeLinkUrl(url) ? url : '';
};

/**
 * `var clickTag = "…";` — emitted once in the `<head>` of the exported HTML.
 * Ad platforms rewrite this declaration or set `window.clickTag` themselves,
 * so the variable always exists, even when the design never configured one.
 */
export const buildBannerClickTagDeclaration = (banner?: BannerClickTag): string =>
    'var clickTag = ' + jsStringLiteral(resolveBannerClickTagUrl(banner) || '#') + ';';

/**
 * JS timeline entry that makes the whole banner the click area of the
 * banner-level click tag, mirroring The Brief's runtime:
 *
 * - the destination is resolved AT CLICK TIME from, in order: a `?clickTag=`
 *   query parameter (what ad tags append), `window.clickTag` (what ad
 *   platforms overwrite) and finally the URL declared in the HTML head — so a
 *   served ad can retarget the creative without editing any exported file;
 * - clicks on element hotspots / ISI links (any anchor) keep their own
 *   destination and never open the banner click tag;
 * - with no resolvable destination the banner stays non-clickable.
 */
export const buildBannerClickTagEvent = (banner?: BannerClickTag): string =>
    '      { time: 0, action: () => {\n' +
    '        var el = document.getElementById("banner");\n' +
    '        if (!el) return;\n' +
    '        var defaultUrl = ' + jsStringLiteral(resolveBannerClickTagUrl(banner)) + ';\n' +
    '        var target = ' + jsStringLiteral(banner?.target === '_self' ? '_self' : '_blank') + ';\n' +
    '        var readParam = function (name) {\n' +
    '          var query = window.location && window.location.search ? window.location.search.substring(1) : "";\n' +
    '          var parts = query.split(name + "=");\n' +
    '          if (!parts[1]) return "";\n' +
    '          var value = parts[1].replace(/&.+$/, "");\n' +
    '          try { value = decodeURIComponent(value); } catch (err) { return ""; }\n' +
    '          return /^(https?:\\/\\/|mailto:|\\/)/i.test(value) ? value : "";\n' +
    '        };\n' +
    '        var resolve = function () {\n' +
    '          var param = readParam("clickTag") || readParam("clickTAG");\n' +
    '          if (param) return param;\n' +
    '          if (typeof window.clickTag === "string" && window.clickTag && window.clickTag !== "#") return window.clickTag;\n' +
    '          return defaultUrl;\n' +
    '        };\n' +
    '        if (resolve()) el.style.cursor = "pointer";\n' +
    '        window.getClickTagValue = function (name) { return readParam(name || "clickTag"); };\n' +
    '        el.addEventListener("click", function (event) {\n' +
    '          var node = event.target;\n' +
    '          if (node && typeof node.closest === "function" && node.closest("a")) return;\n' +
    '          var url = resolve();\n' +
    '          if (!url) return;\n' +
    '          window.open(url, target);\n' +
    '        });\n' +
    '      } },';

/**
 * `href` / `onclick` / `target` attributes for one exported link. Click-tagged
 * links go through `window.open(window.clickTagN, …)` exactly like the
 * hand-written reference banners, which is what ad platforms look for.
 */
export const buildLinkAttributes = (link: ElementLinkAssignment): string => {
    const target = link.target === '_self' ? '_self' : '_blank';
    if (link.name) {
        return (
            'href="#" onclick="window.open(window.' +
            link.name +
            ", '" +
            target +
            "'); return false;\" target=\"" +
            target +
            '"'
        );
    }
    return 'href="' + escapeHtmlAttribute(link.url) + '" target="' + target + '"';
};

/**
 * Transparent anchor placed over a linked element, so the element's box (its
 * exact position and size on the banner) becomes the clickable area. Sharing
 * the element's z-index keeps it directly above that element, and below any
 * layer stacked on top of it.
 */
export const buildClickHotspot = (opts: {
    /** DOM id, e.g. "link-el-hero". */
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
    link: ElementLinkAssignment;
}): string =>
    '          <a id="' +
    opts.id +
    '" class="clicktag-area" ' +
    buildLinkAttributes(opts.link) +
    ' style="left: ' +
    opts.x +
    'px; top: ' +
    opts.y +
    'px; width: ' +
    opts.width +
    'px; height: ' +
    opts.height +
    'px; z-index: ' +
    opts.z +
    ';"></a>';

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
 * content top -> bottom over `scrollDuration` seconds, holds at the bottom for
 * `holdDuration` seconds, then snaps back to the top and repeats forever.
 *
 * Hovering the tray pauses the clock (and leaving resumes it from the same
 * spot), matching the in-app preview.
 */
export const buildIsiScrollEvent = (opts: {
    contentId: string;
    indicatorId: string;
    startDelayMs: number;
    /** Seconds for one full top -> bottom pass (defaults to 60). */
    scrollDuration?: number;
    /** Seconds to hold at the bottom before resetting (defaults to 3). */
    holdDuration?: number;
}): string => {
    const scrollDuration = Math.max(1, opts.scrollDuration || 60);
    const holdDuration = Math.max(0, opts.holdDuration ?? 3);
    return (
        '      { time: ' + Math.max(0, Math.round(opts.startDelayMs)) + ', action: () => {\n' +
        '        const content = document.getElementById(' + jsStringLiteral(opts.contentId) + ');\n' +
        '        const indicator = document.getElementById(' + jsStringLiteral(opts.indicatorId) + ');\n' +
        '        if (content && content.parentElement) {\n' +
        '          const parent = content.parentElement;\n' +
        '          const maxScroll = content.scrollHeight - parent.clientHeight;\n' +
        '          if (maxScroll > 0) {\n' +
        '            const track = parent.querySelector(".iScrollVerticalScrollbar");\n' +
        '            var elapsed = 0;\n' +
        '            var last = null;\n' +
        '            var paused = false;\n' +
        '            // Hover freezes the tray; leaving resumes from the same spot.\n' +
        '            const tray = content.closest(".isi-main") || parent;\n' +
        '            tray.addEventListener("mouseenter", function () { paused = true; });\n' +
        '            tray.addEventListener("mouseleave", function () { paused = false; });\n' +
        '            const animate = (timestamp) => {\n' +
        '              if (last === null) last = timestamp;\n' +
        '              const dt = (timestamp - last) / 1000;\n' +
        '              last = timestamp;\n' +
        '              if (paused) { requestAnimationFrame(animate); return; }\n' +
        '              elapsed += dt;\n' +
        '              // ISI own clock: scroll top->bottom, hold at the bottom, then reset.\n' +
        '              const cycle = ' + (scrollDuration + holdDuration) + ';\n' +
        '              const phase = elapsed % cycle;\n' +
        '              const progress = phase < ' + scrollDuration + ' ? phase / ' + scrollDuration + ' : 1;\n' +
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
export const buildMainJs = (events: string[], clickTags: ClickTagDeclaration[] = []): string => {
    const lines: string[] = [];
    lines.push('// Banner animation timeline');
    lines.push(...buildClickTagDeclarations(clickTags));
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

