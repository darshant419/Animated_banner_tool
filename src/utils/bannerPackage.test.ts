import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { buildBannerPackage, buildPreviewHtml, zipBannerPackage, type BannerPackage, type BuildBannerPackageOptions } from './bannerPackage';
import type { DesignElement } from '../store/designStore';

const makePackage = (overrides: Partial<BannerPackage> = {}): BannerPackage => ({
    html: [
        '<html><head>',
        '<link rel="stylesheet" href="css/styles.css" />',
        '<script src="js/main.js"></script>',
        '</head><body>',
        '<img src="images/image-el-1.png" />',
        '<div style="background-image:url(\'images/bg.png\')"></div>',
        '</body></html>',
    ].join('\n'),
    css: '#banner { width: 300px; }',
    js: 'window.onload = function () {};',
    images: [
        { name: 'image-el-1.png', dataUrl: 'data:image/png;base64,AAA', kind: 'image' },
        { name: 'bg.png', remoteUrl: 'https://cdn.example.com/bg.png', kind: 'background' },
    ],
    ...overrides,
});

describe('buildPreviewHtml', () => {
    it('inlines css, js and every image reference for iframe srcDoc previews', () => {
        const preview = buildPreviewHtml(makePackage());

        expect(preview).toContain('<style>\n#banner { width: 300px; }\n</style>');
        expect(preview).toContain('<script>\nwindow.onload = function () {};\n</script>');
        expect(preview).toContain('src="data:image/png;base64,AAA"');
        expect(preview).toContain("url('https://cdn.example.com/bg.png')");
        expect(preview).not.toContain('css/styles.css');
        expect(preview).not.toContain('js/main.js');
        expect(preview).not.toContain('images/image-el-1.png');
    });

    it('leaves images without a usable URL untouched', () => {
        const preview = buildPreviewHtml(
            makePackage({ images: [{ name: 'missing.png', kind: 'image' }] }),
        );

        expect(preview).toContain('images/image-el-1.png');
    });
});

describe('zipBannerPackage remote assets', () => {
    it('keeps remote image references when an image cannot be bundled', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS blocked'));
        try {
            const blob = await zipBannerPackage({
                html: '<html><body><img src="images/remote.png"></body></html>',
                css: '',
                js: '',
                images: [{
                    name: 'remote.png',
                    remoteUrl: 'https://cdn.example.com/remote.png',
                    kind: 'image',
                }],
            });
            const archive = await JSZip.loadAsync(await blob.arrayBuffer());
            const html = await archive.file('index.html')?.async('string');

            expect(html).toContain('src="https://cdn.example.com/remote.png"');
            expect(archive.file('images/remote.png')).toBeNull();
        } finally {
            fetchSpy.mockRestore();
        }
    });
});

/** Banner with one text element; individual tests add links to it. */
const buildPackage = (elements: DesignElement[], options: Partial<BuildBannerPackageOptions> = {}) =>
    buildBannerPackage({
        canvasWidth: 300,
        canvasHeight: 250,
        canvasBackground: '#ffffff',
        totalDuration: 5,
        loop: false,
        elements,
        ...options,
    });

const bannerElement = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'el-hero',
    type: 'text',
    x: 20,
    y: 30,
    width: 160,
    height: 50,
    text: 'Hello',
    fill: '#006937',
    ...overrides,
});

describe('buildBannerPackage click tags', () => {
    it('declares the click tags in the HTML head and in main.js', async () => {
        const pkg = await buildPackage([bannerElement({ linkUrl: 'https://orserdu.com/efficacy/' })]);

        expect(pkg.html).toContain('    var clickTag1 = "https://orserdu.com/efficacy/";');
        expect(pkg.html).toContain('    var clickTag2 = "#";');
        expect(pkg.html).toContain('    var clickTag3 = "#";');
        expect(pkg.js).toContain('var clickTag1 = "https://orserdu.com/efficacy/";');
    });

    it('covers the element box with a transparent hotspot anchor', async () => {
        const pkg = await buildPackage([
            bannerElement({
                linkUrl: 'https://pi.com/doc.pdf',
                linkClickTag: 'clickTag3',
                linkTarget: '_self',
            }),
        ]);

        expect(pkg.html).toContain('<a id="link-el-hero" class="clicktag-area"');
        expect(pkg.html).toContain('window.open(window.clickTag3, \'_self\')');
        expect(pkg.html).toContain('left: -60px; top: 5px; width: 160px; height: 50px; z-index: 0;');
        expect(pkg.css).toContain('.clicktag-area { position: absolute;');
    });

    it('emits no hotspot and no click tag when the element has no link', async () => {
        const pkg = await buildPackage([bannerElement()]);

        expect(pkg.html).not.toContain('clicktag-area');
        expect(pkg.html).toContain('    var clickTag1 = "#";');
    });

    it('never exports a hotspot for a script URL', async () => {
        const pkg = await buildPackage([bannerElement({ linkUrl: 'javascript:alert(1)' })]);

        expect(pkg.html).not.toContain('clicktag-area');
        expect(pkg.html).not.toContain('javascript:alert(1)');
    });

    it('keeps the ISI tray un-clickable but links its logo and section links', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'isi-1',
                type: 'isiScroll',
                linkUrl: 'https://ignore-me.com/',
                isiText: '<p>See <a href="https://www.fda.gov/medwatch">medwatch</a></p>',
                isiLogoSrc: '/emr_assets/logo.png',
                isiLogoLink: 'https://logo.com/',
            }),
        ]);

        expect(pkg.html).not.toContain('link-isi-1');
        // No patient_link band is rendered inside the tray any more.
        expect(pkg.html).not.toContain('patient_link');
        expect(pkg.html).toContain('var clickTag1 = "https://logo.com/";');
        expect(pkg.html).toContain('var clickTag2 = "https://www.fda.gov/medwatch";');
        expect(pkg.html).toContain("window.open(window.clickTag2, '_blank')");
        expect(pkg.html).toContain('src="images/isi-logo-isi-1.png"');
        expect(pkg.images).toContainEqual(expect.objectContaining({
            name: 'isi-logo-isi-1.png',
            remoteUrl: '/emr_assets/logo.png',
        }));
    });

    it('exports the standalone PI strip as its own layer with its own z-index', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'pi-1',
                type: 'piStrip',
                x: 0,
                y: 140,
                width: 300,
                height: 20,
                text: 'Prescribing Information',
                linkUrl: 'https://pi.com/doc.pdf',
                piPaddingLeft: 12,
            }),
            bannerElement({ id: 'isi-1', type: 'isiScroll', x: 0, y: 160, width: 300, height: 88, isiText: '<p>Safety</p>' }),
        ]);

        // Its own div, positioned and stacked like any other element.
        expect(pkg.html).toContain('<div id="el-pi-1" class="pi-strip">');
        expect(pkg.css).toContain('#el-pi-1 { position: absolute; left: -150px; top: 130px; width: 300px; height: 20px; z-index: 0; }');
        expect(pkg.css).toContain('#el-isi-1 { position: absolute; left: 0px; top: 160px;');
        // Its own padding, independent of the ISI tray padding.
        expect(pkg.css).toContain('padding: 4px 4px 4px 12px;');
        expect(pkg.html).toContain('window.open(window.clickTag1');
    });

    it('bundles data-URL ISI logos for self-contained previews and downloads', async () => {
        const logo = 'data:image/png;base64,TE9HTw==';
        const pkg = await buildPackage([
            bannerElement({
                id: 'isi-logo-test',
                type: 'isiScroll',
                x: 0,
                y: 162,
                width: 300,
                height: 88,
                isiText: '<p>Safety</p>',
                isiLogoSrc: logo,
            }),
        ]);
        const preview = buildPreviewHtml(pkg);
        const archive = await JSZip.loadAsync(await (await zipBannerPackage(pkg)).arrayBuffer());

        expect(pkg.images).toContainEqual(expect.objectContaining({
            name: 'isi-logo-isi-logo-test.png',
            dataUrl: logo,
        }));
        expect(preview).toContain('src="' + logo + '"');
        expect(await archive.file('images/isi-logo-isi-logo-test.png')?.async('string')).toBe('LOGO');
    });

    it('stretches exported canvas backgrounds to match the editor artboard', async () => {
        const pkg = await buildPackage([], { canvasBackgroundImage: 'data:image/png;base64,AAA' });

        expect(pkg.html).toContain('background-size:100% 100%');
    });
});

describe('buildBannerPackage ISI section links', () => {
    const isiElement = (overrides: Partial<DesignElement> = {}): DesignElement => ({
        id: 'isi-1',
        type: 'isiScroll',
        x: 0,
        y: 162,
        width: 300,
        height: 88,
        isiText:
            '<p>Report at <a href="https://www.fda.gov/medwatch" target="_blank">www.fda.gov/medwatch</a></p>' +
            '<p><a href="https://rxmenarinistemline.com/ORSERDU_PI.pdf" target="_blank">Prescribing Information</a></p>',
        ...overrides,
    });

    it('wires every ISI rich-text anchor to a click tag variable', async () => {
        const pkg = await buildPackage([isiElement()]);

        // Section links go through clickTag1 / clickTag2 instead of raw hrefs.
        expect(pkg.html).toContain("window.open(window.clickTag1, '_blank')");
        expect(pkg.html).toContain("window.open(window.clickTag2, '_blank')");
        expect(pkg.html).toContain('var clickTag1 = "https://www.fda.gov/medwatch";');
        expect(pkg.html).toContain('var clickTag2 = "https://rxmenarinistemline.com/ORSERDU_PI.pdf";');
        // The hard-coded destinations are gone from the clickable markup.
        expect(pkg.html).not.toContain('<a href="https://www.fda.gov/medwatch"');
    });

    it('keeps the anchor text and inline styling of the ISI link', async () => {
        const pkg = await buildPackage([
            isiElement({
                isiText: '<p><a href="https://www.fda.gov/medwatch" style="color:#000000;word-break: break-all;">www.fda.gov/medwatch</a></p>',
            }),
        ]);

        expect(pkg.html).toContain('www.fda.gov/medwatch</a>');
        expect(pkg.html).toContain('style="color:#000000;word-break: break-all;"');
    });

    it('shares one click tag between the PI strip and the ISI link to the same document', async () => {
        const pkg = await buildPackage([
            isiElement({
                isiText: '<p><a href="https://pi.com/doc.pdf">Prescribing Information</a></p>',
                isiHeaderText: 'Prescribing Information',
                isiHeaderLink: 'https://pi.com/doc.pdf',
            }),
        ]);

        // Only two distinct destinations -> two variables, both reused.
        expect(pkg.html).toContain('var clickTag1 = "https://pi.com/doc.pdf";');
        expect(pkg.html).not.toContain('var clickTag2 = "https://pi.com/doc.pdf"');
    });

    it('never emits a script URL from an ISI anchor', async () => {
        const pkg = await buildPackage([
            isiElement({ isiText: '<p><a href="javascript:alert(1)">bad</a></p>' }),
        ]);

        expect(pkg.html).not.toContain('window.open(window.clickTag1');
        expect(pkg.html).toContain('    var clickTag1 = "#";');
    });

describe('buildBannerPackage ISI scrolling', () => {
    const isiElement = (overrides: Partial<DesignElement> = {}): DesignElement => ({
        id: 'isi-1',
        type: 'isiScroll',
        x: 0,
        y: 162,
        width: 300,
        height: 88,
        isiText: '<p>Report adverse events.</p>',
        ...overrides,
    });

    it('exports a tray the user can scroll with the mouse wheel and the scrollbar indicator', async () => {
        const pkg = await buildPackage([isiElement()]);

        // Manual scroll controls reach the downloaded banner, matching the preview.
        expect(pkg.js).toContain('tray.addEventListener("wheel", function (e) {');
        expect(pkg.js).toContain('applyScroll(scrollY + e.deltaY * 0.5);');
        expect(pkg.js).toContain('track.addEventListener("pointerdown", function (e) {');
        expect(pkg.js).toContain('const dragScrollTo = (clientY) => {');
    });

    it('still wires manual scrolling when "Auto ISI Scroll" is turned off', async () => {
        const pkg = await buildPackage([isiElement({ isiAutoStart: false })]);

        // Auto-scroll clock is gone, but the tray stays wheel / scrollbar scrollable.
        expect(pkg.js).toContain('tray.addEventListener("wheel", function (e) {');
        expect(pkg.js).toContain('track.addEventListener("pointerdown", function (e) {');
        expect(pkg.js).not.toContain('requestAnimationFrame(animate)');
    });
});

});

describe('buildBannerPackage end behaviour (stay / disappear)', () => {
    it('positions exported image layers from their transform origin like the editor canvas', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'hero-image',
                type: 'image',
                x: 150,
                y: 125,
                width: 300,
                height: 296,
                src: 'data:image/png;base64,AAA',
            }),
        ]);

        expect(pkg.css).toContain(
            '#el-hero-image { position: absolute; left: 0px; top: -23px; width: 300px; height: 296px;',
        );
    });

    it('exports the element base opacity, transform, and transform origin', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'image-1',
                type: 'image',
                src: 'data:image/png;base64,AAA',
                opacity: 60,
                rotation: 30,
                scaleX: 0.8,
                scaleY: 1.2,
                transformOrigin: '0% 0%',
            }),
        ]);

        expect(pkg.css).toContain(
            '#el-image-1 { opacity: 0.6; transform: rotate(30deg) scaleX(0.8) scaleY(1.2); transform-origin: 0% 0%; }',
        );
    });

    it('animates an ISI tray instead of exporting it static', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'isi-1',
                type: 'isiScroll',
                isiText: '<p>Safety</p>',
                animation: 'fadeIn',
                animationDuration: 1,
            }),
        ]);

        // Regression: the ISI branch used to `continue` before the animation
        // pipeline, so its entrance never reached the exported banner.
        expect(pkg.css).toContain('@keyframes anim-el-isi-1');
        expect(pkg.js).toContain('anim-el-isi-1');
    });

    it('exports the end-fade of a "Disappear" layer as a keyframe ending at opacity 0', async () => {
        const pkg = await buildPackage([bannerElement({ id: 'hide-1', animation: 'fadeIn', animationDuration: 1, endBehavior: 'hide' })]);

        expect(pkg.css).toContain('@keyframes anim-el-hide-1');
        expect(pkg.css).toMatch(/100\.00% \{ opacity: 0;/);
    });

    it('keeps a "Stay on banner" layer visible with no end-fade keyframe', async () => {
        const pkg = await buildPackage([bannerElement({ id: 'stay-1', animation: 'fadeIn', animationDuration: 1, endBehavior: 'stay' })]);

        const keyframes = pkg.css.slice(pkg.css.indexOf('@keyframes anim-el-stay-1'));
        expect(keyframes).toContain('@keyframes anim-el-stay-1');
        // It fades in and then holds; it never reaches opacity 0.
        expect(keyframes).not.toMatch(/100\.00% \{ opacity: 0;/);
        // Regression: the terminal step pins the visible state at 100% so the
        // layer does not fade back out over the banner tail in the download.
        expect(keyframes).toMatch(/100\.00% \{ opacity: 1;/);
    });

    it('restarts the exported timeline on every cycle for a looping banner', async () => {
        const pkg = await buildPackage(
            [bannerElement({ id: 'stay-1', animation: 'fadeIn', animationDuration: 1, endBehavior: 'stay' })],
            { loop: true },
        );

        expect(pkg.js).toContain('window.setInterval(runAnimationTimeline, 5000);');
    });
});
describe('buildBannerPackage banner click tag', () => {
    it('declares the standard clickTag in the head and wires the whole banner when enabled', async () => {
        const pkg = await buildPackage([bannerElement()], {
            useAsClickTag: true,
            clickTagUrl: 'https://www.example.com/landing',
            clickTagTarget: '_self',
        });

        expect(pkg.html).toContain('    var clickTag = "https://www.example.com/landing";');
        expect(pkg.js).toContain('var defaultUrl = "https://www.example.com/landing";');
        expect(pkg.js).toContain('var target = "_self";');
        expect(pkg.js).toContain('window.getClickTagValue');
        expect(pkg.js).toContain('node.closest("a")');
    });

    it('omits the clickTag declaration (no "#" placeholder) and no default destination when the switch is off', async () => {
        const pkg = await buildPackage([bannerElement()], {
            useAsClickTag: false,
            clickTagUrl: 'https://www.example.com/landing',
        });

        expect(pkg.html).not.toContain('var clickTag = "#";');
        expect(pkg.js).toContain('var defaultUrl = "";');
    });

    it('omits the banner clickTag declaration when nothing was configured', async () => {
        const pkg = await buildPackage([]);

        // The banner-level clickTag is left out entirely; the element link
        // variables (clickTag1..3) are still always declared.
        expect(pkg.html).not.toContain('var clickTag = "#";');
        expect(pkg.html).toContain('    var clickTag1 = "#";');
    });

    it('never exports an unsafe click tag URL', async () => {
        const pkg = await buildPackage([bannerElement()], {
            useAsClickTag: true,
            clickTagUrl: 'javascript:alert(1)',
        });

        expect(pkg.html).not.toContain('var clickTag = "#";');
        expect(pkg.html).not.toContain('javascript:alert(1)');
        expect(pkg.js).not.toContain('javascript:alert(1)');
    });
});
