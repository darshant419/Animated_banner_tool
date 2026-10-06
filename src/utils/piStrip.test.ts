import { describe, it, expect } from 'vitest';
import { buildBannerPackage } from './bannerPackage';
import { getPiStripStyle, migrateIsiHeaderToPiStrip } from './bannerExport';
import type { DesignElement } from '../store/designStore';

describe('standalone PI strip element', () => {
    const strip = (overrides: Partial<DesignElement> = {}): DesignElement => ({
        id: 'pi-1',
        type: 'piStrip',
        x: 0,
        y: 140,
        width: 300,
        height: 20,
        text: 'Prescribing Information',
        ...overrides,
    });

    const build = (elements: DesignElement[]) =>
        buildBannerPackage({
            canvasWidth: 300,
            canvasHeight: 250,
            canvasBackground: '#ffffff',
            totalDuration: 5,
            loop: false,
            elements,
        });

    describe('getPiStripStyle', () => {
        it('defaults to a 4px pad on the reference background', () => {
            expect(getPiStripStyle({})).toEqual({
                paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4,
                background: '#E8FFF9', borderRadius: 0, align: 'left',
            });
        });

        it('applies per-side padding over the shorthand', () => {
            const s = getPiStripStyle({ piPadding: 4, piPaddingLeft: 12, piPaddingTop: 2 });

            expect(s.paddingLeft).toBe(12);
            expect(s.paddingTop).toBe(2);
            expect(s.paddingRight).toBe(4);
        });

        it('never reads the ISI tray padding', () => {
            // The strip is its own layer: isiPadding must not reach it.
            expect(getPiStripStyle({ isiPadding: 40 } as never).paddingLeft).toBe(4);
        });

        it('clamps negatives and falls back to left alignment', () => {
            const s = getPiStripStyle({ piPadding: -4, piBorderRadius: -2, piAlign: 'middle' as never });

            expect(s.paddingTop).toBe(0);
            expect(s.borderRadius).toBe(0);
            expect(s.align).toBe('left');
        });
    });

    describe('exported banner', () => {
        it('renders the strip as its own positioned layer', async () => {
            const pkg = await build([strip({ piPaddingLeft: 12 })]);

            expect(pkg.html).toContain('<div id="el-pi-1" class="pi-strip">Prescribing Information</div>');
            expect(pkg.css).toContain('#el-pi-1 { position: absolute; left: 0px; top: 140px; width: 300px; height: 20px; z-index: 0; }');
            expect(pkg.css).toContain('padding: 4px 4px 4px 12px;');
        });

        it('gives the strip its own z-index from the layer order', async () => {
            const pkg = await build([
                strip({ id: 'pi-1', y: 140 }),
                strip({ id: 'pi-2', y: 160 }),
            ]);

            expect(pkg.css).toContain('#el-pi-1 { position: absolute; left: 0px; top: 140px; width: 300px; height: 20px; z-index: 0; }');
            expect(pkg.css).toContain('#el-pi-2 { position: absolute; left: 0px; top: 160px; width: 300px; height: 20px; z-index: 1; }');
        });

        it('wraps the label in its click-tag anchor when it has a link', async () => {
            const pkg = await build([strip({ linkUrl: 'https://pi.com/doc.pdf' })]);

            expect(pkg.html).toContain("window.open(window.clickTag1, '_blank')");
            expect(pkg.html).toContain('var clickTag1 = "https://pi.com/doc.pdf";');
        });

        it('leaves the ISI tray as scrolling text only', async () => {
            const pkg = await build([
                strip({ id: 'pi-1' }),
                { id: 'isi-1', type: 'isiScroll', x: 0, y: 160, width: 300, height: 88, isiText: '<p>Safety</p>' },
            ]);

            expect(pkg.html).not.toContain('patient_link');
            // The tray gets its whole height; nothing is reserved for a band.
            expect(pkg.css).toContain('#el-isi-1 .isi_wrapper { height: 88px; }');
        });
    });

    describe('migrateIsiHeaderToPiStrip', () => {
        const oldIsi = (overrides: Partial<DesignElement> = {}): DesignElement => ({
            id: 'isi-1',
            type: 'isiScroll',
            x: 0,
            y: 162,
            width: 300,
            height: 68,
            isiText: '<p>Safety</p>',
            isiHeaderText: 'Prescribing Information',
            isiHeaderLink: 'https://pi.com/doc.pdf',
            isiHeaderHeight: 20,
            isiHeaderBackground: '#E8FFF9',
            isiHeaderClickTag: 'clickTag3',
            ...overrides,
        });

        it('splits an old tray into a strip plus a text-only tray', () => {
            const out = migrateIsiHeaderToPiStrip([oldIsi()]);

            expect(out).toHaveLength(2);
            const [pi, isi] = out;

            expect(pi).toMatchObject({
                type: 'piStrip',
                text: 'Prescribing Information',
                linkUrl: 'https://pi.com/doc.pdf',
                linkClickTag: 'clickTag3',
                piBackground: '#E8FFF9',
                width: 300,
                height: 20,
            });
            // Sits directly above the tray, spanning its width.
            expect(pi.x).toBe(0);
            expect(pi.y).toBe(142);

            // The tray keeps only the scrolling text and reclaims the band.
            expect(isi.isiHeaderText).toBeUndefined();
            expect(isi.height).toBe(88);
        });

        it('keeps the strip just below its tray in layer order', () => {
            const out = migrateIsiHeaderToPiStrip([oldIsi()]);

            expect(out[0].type).toBe('piStrip');
            expect(out[1].type).toBe('isiScroll');
        });

        it('accounts for the header margins when placing and sizing', () => {
            const out = migrateIsiHeaderToPiStrip([oldIsi({ isiHeaderHeight: 20, isiHeaderMarginTop: 4, isiHeaderMarginBottom: 6 })]);

            expect(out[0].y).toBe(162 - 20 - 4 - 6);
            expect(out[1].height).toBe(68 + 20 + 4 + 6);
        });

        it('leaves banners without a legacy header untouched', () => {
            const elements = [strip(), { id: 'isi-1', type: 'isiScroll', isiText: '<p>Safety</p>' } as DesignElement];

            expect(migrateIsiHeaderToPiStrip(elements)).toBe(elements);
        });
    });
});