import { describe, it, expect } from 'vitest';
import { collectBannerImageUrls } from './bannerImages';
import type { DesignElement } from '../store/designStore';

const imageEl = (overrides: Partial<DesignElement> = {}): DesignElement => ({
    id: 'el-image',
    type: 'image',
    x: 10,
    y: 20,
    width: 200,
    height: 150,
    src: 'https://cdn.example.com/hero.png',
    ...overrides,
});

describe('collectBannerImageUrls', () => {
    it('collects image, video and logo URLs without duplicates', () => {
        const urls = collectBannerImageUrls(
            [
                imageEl(),
                imageEl({ id: 'el-video', type: 'video', src: 'https://cdn.example.com/clip.mp4' }),
                imageEl({ id: 'el-dup', src: 'https://cdn.example.com/hero.png' }),
                {
                    id: 'el-isi',
                    type: 'isiScroll',
                    x: 0,
                    y: 0,
                    width: 300,
                    height: 88,
                    isiLogoSrc: 'https://cdn.example.com/logo.png',
                },
            ],
            'https://cdn.example.com/background.png',
        );

        expect(urls).toEqual([
            'https://cdn.example.com/background.png',
            'https://cdn.example.com/hero.png',
            'https://cdn.example.com/clip.mp4',
            'https://cdn.example.com/logo.png',
        ]);
    });

    it('ignores hidden layers, empty values and oversized data URLs', () => {
        const oversized = `data:image/png;base64,${'a'.repeat(3000)}`;
        const urls = collectBannerImageUrls(
            [
                imageEl({ id: 'el-hidden', visible: false, src: 'https://cdn.example.com/hidden.png' }),
                imageEl({ id: 'el-empty', src: '   ' }),
                imageEl({ id: 'el-inline', src: oversized }),
            ],
            undefined,
        );

        expect(urls).toEqual([]);
    });
});
