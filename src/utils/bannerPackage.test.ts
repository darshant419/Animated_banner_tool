import { describe, it, expect } from 'vitest';
import { buildPreviewHtml, type BannerPackage } from './bannerPackage';

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
