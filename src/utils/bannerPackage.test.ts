import { describe, it, expect } from 'vitest';
import { buildBannerPackage, buildPreviewHtml, type BannerPackage, type BuildBannerPackageOptions } from './bannerPackage';
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
        expect(pkg.html).toContain('left: 20px; top: 30px; width: 160px; height: 50px; z-index: 0;');
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

    it('keeps the ISI tray un-clickable but links its strip and logo', async () => {
        const pkg = await buildPackage([
            bannerElement({
                id: 'isi-1',
                type: 'isiScroll',
                linkUrl: 'https://ignore-me.com/',
                isiText: '<p>Safety</p>',
                isiHeaderText: 'Prescribing Information',
                isiHeaderLink: 'https://pi.com/doc.pdf',
                isiHeaderClickTag: 'clickTag3',
                isiLogoSrc: '/emr_assets/logo.png',
                isiLogoLink: 'https://logo.com/',
            }),
        ]);

        expect(pkg.html).not.toContain('link-isi-1');
        // Header strip kept its explicit variable, the logo took the first free one.
        expect(pkg.html).toContain('window.open(window.clickTag3, \'_blank\')');
        expect(pkg.html).toContain('window.open(window.clickTag1, \'_blank\')');
        expect(pkg.html).toContain('var clickTag1 = "https://logo.com/";');
        expect(pkg.html).toContain('var clickTag3 = "https://pi.com/doc.pdf";');
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

    it('keeps the "#" placeholder and no default destination when the switch is off', async () => {
        const pkg = await buildPackage([bannerElement()], {
            useAsClickTag: false,
            clickTagUrl: 'https://www.example.com/landing',
        });

        expect(pkg.html).toContain('    var clickTag = "#";');
        expect(pkg.js).toContain('var defaultUrl = "";');
    });

    it('always declares clickTag, even for a banner without any configuration', async () => {
        const pkg = await buildPackage([]);

        expect(pkg.html).toContain('    var clickTag = "#";');
        expect(pkg.html).toContain('    var clickTag1 = "#";');
    });

    it('never exports an unsafe click tag URL', async () => {
        const pkg = await buildPackage([bannerElement()], {
            useAsClickTag: true,
            clickTagUrl: 'javascript:alert(1)',
        });

        expect(pkg.html).toContain('    var clickTag = "#";');
        expect(pkg.html).not.toContain('javascript:alert(1)');
        expect(pkg.js).not.toContain('javascript:alert(1)');
    });
});

