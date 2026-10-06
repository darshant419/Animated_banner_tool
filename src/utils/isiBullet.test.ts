import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildBannerPackage } from './bannerPackage';
import { buildIsiBulletCss, getIsiBulletSpacing } from './bannerExport';
import { EMR_ISI_TEXT } from '../templates/emrTemplates';
import type { DesignElement } from '../store/designStore';

describe('ISI bullet spacing', () => {
    const isi = (overrides: Partial<DesignElement> = {}): DesignElement => ({
        id: 'isi-1',
        type: 'isiScroll',
        x: 0,
        y: 162,
        width: 300,
        height: 88,
        isiText: EMR_ISI_TEXT,
        ...overrides,
    });

    describe('getIsiBulletSpacing', () => {
        it('falls back to the default spacing, with the bullets flush (indent 0)', () => {
            expect(getIsiBulletSpacing({})).toEqual({ spacing: 4, indent: 0, gap: 2, itemIndent: 2 });
        });

        it('uses the values chosen by the designer', () => {
            expect(getIsiBulletSpacing({ isiBulletSpacing: 12, isiBulletIndent: 20, isiBulletGap: 6 })).toEqual({
                spacing: 12,
                indent: 20,
                gap: 6,
                itemIndent: 6,
            });
        });

        it('clamps negative values to zero instead of breaking the layout', () => {
            expect(getIsiBulletSpacing({ isiBulletSpacing: -5, isiBulletIndent: -1, isiBulletGap: -3 })).toEqual({
                spacing: 0,
                indent: 0,
                gap: 0,
                itemIndent: 0,
            });
        });
    });

    describe('buildIsiBulletCss', () => {
        it('emits scoped declarations with a hanging indent', () => {
            expect(buildIsiBulletCss('el-isi-1', isi({ isiBulletSpacing: 10, isiBulletIndent: 24, isiBulletGap: 6 }))).toEqual([
                '#el-isi-1 .isi ul { padding-left: 24px !important; }',
                '#el-isi-1 .isi ul li { margin-bottom: 10px !important; margin-left: 0; text-indent: -6px; padding-left: 6px; }',
                '#el-isi-1 .isi ul li::before { left: -6px; }',
            ]);
        });

        it('beats the !important utility classes the ISI templates put on their bullets', () => {
            // Regression: every bullet in EMR_ISI_TEXT carries class="mb-7", and
            // `.mb-7` is declared `!important`. Without `!important` here the Gap
            // control silently did nothing. An ID selector cannot outrank an
            // !important declaration, so the override must carry one too.
            const css = buildIsiBulletCss('el-isi-1', isi({ isiBulletSpacing: 20 })).join('\n');

            expect(css).toContain('margin-bottom: 20px !important');
            expect(css).toContain('padding-left: 0px !important');
        });

        it('scopes the rules to the one tray so trays cannot affect each other', () => {
            const css = buildIsiBulletCss('el-isi-2', isi({ id: 'isi-2', isiBulletSpacing: 8 }));

            expect(css.every((rule) => rule.startsWith('#el-isi-2'))).toBe(true);
        });

        it('outranks the template utility class by ID, in the banner and the preview', () => {
            // Specificity is why both renderers scope by ID. Every template
            // bullet carries class="mb-7"; the canvas reaches it through
            // `.isi-rich-overlay .isi .mb-7` (3 classes = 30) and the export
            // through `.isi .mb-7` (2 classes = 20) — both `!important`. An ID
            // scores 100, so the override wins in each surface. A class-based
            // scope scored 22 and LOST to the canvas rule, which made the Gap
            // control do nothing in the editor while still working on export.
            const specificity = (selectors: string) =>
                (selectors.match(/#[\w-]+/g) || []).length * 100 +
                (selectors.match(/\.[\w-]+/g) || []).length * 10 +
                (selectors.match(/(^|[\s>+~])([a-zA-Z][\w-]*)/g) || []).length;

            const canvasUtility = readFileSync('src/index.css', 'utf8')
                .match(/\.isi-rich-overlay\s+\.isi\s+\.mb-7\s*\{[^}]*\}/)?.[0];
            expect(canvasUtility).toContain('!important');

            // The old, broken preview scope really did lose.
            expect(specificity('.isi-bullets-isi-1 .isi ul li')).toBeLessThan(specificity('.isi-rich-overlay .isi .mb-7'));
            // The ID scope used by the overlay wins, in both surfaces.
            expect(specificity('#isi-overlay-isi-1 .isi ul li')).toBeGreaterThan(specificity('.isi-rich-overlay .isi .mb-7'));
            expect(specificity('#el-isi-1 .isi ul li')).toBeGreaterThan(specificity('.isi .mb-7'));
        });
    });

    describe('exported banner', () => {
        const build = (elements: DesignElement[]) =>
            buildBannerPackage({
                canvasWidth: 300,
                canvasHeight: 250,
                canvasBackground: '#ffffff',
                totalDuration: 5,
                loop: false,
                elements,
            });

        it('writes the chosen spacing into the downloaded CSS', async () => {
            const pkg = await build([isi({ isiBulletSpacing: 10, isiBulletIndent: 24, isiBulletGap: 6 })]);

            expect(pkg.css).toContain('#el-isi-1 .isi ul { padding-left: 24px !important; }');
            expect(pkg.css).toContain('margin-bottom: 10px !important; margin-left: 0; text-indent: -6px; padding-left: 6px;');
            expect(pkg.css).toContain('#el-isi-1 .isi ul li::before { left: -6px; }');
        });

        it('overrides the mb-7 class that every template bullet carries', async () => {
            // The end-to-end proof that the Gap control reaches a real template
            // bullet: EMR_ISI_TEXT tags all of its <li> with class="mb-7".
            const pkg = await build([isi({ isiBulletSpacing: 20 })]);

            expect(EMR_ISI_TEXT).toContain('<li class="mb-7">');
            expect(pkg.css).toContain('.isi .mb-7 { margin-bottom: 7px !important; }');
            expect(pkg.css).toContain('margin-bottom: 20px !important');
        });

        it('falls back to the default bullet spacing when nothing is set', async () => {
            const pkg = await build([isi()]);

            expect(pkg.css).toContain('#el-isi-1 .isi ul { padding-left: 0px !important; }');
            expect(pkg.css).toContain('margin-bottom: 4px !important');
        });

        it('keeps the base bullet glyph styling intact', async () => {
            const pkg = await build([isi({ isiBulletSpacing: 10 })]);

            expect(pkg.css).toContain('.isi ul li::before { content: "\\2022"');
        });
    });
});