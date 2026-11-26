import { describe, it, expect } from 'vitest';
import {
    TEXT_ANIMATIONS,
    buildTextAnimationExport,
    getTextAnimation,
    getTextAnimationLength,
    splitPlainText,
    splitTextHtml,
} from './textAnimations';
import { buildMainJs, buildTextAnimationEvents, buildWordAnimationEvent } from './bannerExport';

describe('textAnimations', () => {
    it('ships the 16 Moving Letters effects with unique ids', () => {
        expect(TEXT_ANIMATIONS).toHaveLength(16);
        expect(new Set(TEXT_ANIMATIONS.map((e) => e.id)).size).toBe(16);
    });

    it('splits plain text into escaped letter units, keeping spaces', () => {
        const r = splitPlainText('A<b', 'letters');
        expect(r.count).toBe(3);
        expect(r.html).toContain('&lt;');
        const words = splitPlainText('Hello  big world', 'words');
        expect(words.count).toBe(3);
        expect(words.html).toContain('</span>  <span');
    });

    it('keeps rich-text tags and treats entities as one letter', () => {
        const r = splitTextHtml('<b>Hi</b> &amp; you', 'letters');
        expect(r.html.startsWith('<b>')).toBe(true);
        expect(r.html).toContain('</b>');
        expect(r.count).toBe(6); // H i & y o u
    });

    it('exports keyframes for every variant and a per-unit delay', () => {
        const fx = getTextAnimation('ml5')!;
        const out = buildTextAnimationExport({ id: 'el-1', effect: fx, contentHtml: 'Signal &amp; Noise' });
        expect(out.css.join('\n')).toContain('@keyframes ta-ml5-left');
        expect(out.css.join('\n')).toContain('@keyframes ta-ml5-mid');
        expect(out.html).toContain('animation-name: ta-ml5-mid');
        expect(out.html).toContain('ta-d');
    });

    it('scales timing with speed', () => {
        const fx = getTextAnimation('ml2')!;
        expect(getTextAnimationLength(fx, 5, 2)).toBeLessThan(getTextAnimationLength(fx, 5, 1));
    });

    it('produces timeline JS that parses', () => {
        const js = buildMainJs([
            ...buildTextAnimationEvents({ id: 'el-1', startDelayMs: 500 }),
            buildWordAnimationEvent({ id: 'el-2', startDelayMs: 0 }),
        ]);
        expect(() => new Function(js)).not.toThrow();
    });
});
