import JSZip from 'jszip';
import type { DesignElement } from '../store/designStore';
import { getElementBaseState, getElementKeyframes } from './keyframes';
import {
    buildAnimationStartEvent,
    buildElementAnimationCss,
    buildIsiScrollEvent,
    buildMainJs,
    buildVideoAutoplayEvent,
    jsStringLiteral,
} from './bannerExport';

/**
 * Builds the exported HTML5 banner package (index.html + css/styles.css +
 * js/main.js + images/*) from plain design data.
 *
 * The logic lives here — instead of inside `DesignCanvas` — so it can be
 * reused by the per-banner page (live preview iframe), the ZIP download and
 * the editor export button, and so it stays unit-testable.
 */

export interface BannerPackageImage {
    /** File name written under `images/`, e.g. "bg.png" or "image-el-1.png". */
    name: string;
    /** Base64 data URL when the source is inline / was downloaded for preview. */
    dataUrl?: string;
    /** Original remote URL when the file was not inlined. */
    remoteUrl?: string;
    kind: 'background' | 'image' | 'video';
}

export interface BannerPackage {
    html: string;
    css: string;
    js: string;
    images: BannerPackageImage[];
}

export interface BuildBannerPackageOptions {
    canvasWidth: number;
    canvasHeight: number;
    canvasBackground: string;
    canvasBackgroundImage?: string;
    totalDuration: number;
    loop: boolean;
    elements: DesignElement[];
    /**
     * When true, remote images are downloaded and converted to data URLs so the
     * package can be previewed from an iframe `srcDoc` (no relative paths).
     */
    inlineRemoteImages?: boolean;
}

const BASE_CSS_LINES: string[] = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    'body { margin: 0; padding: 0; background: #f0f0f0; font-family: Arial, Helvetica, sans-serif; }',
    '.isi-main { position: absolute; overflow: hidden; }',
    '.isi-main * { pointer-events: all; }',
    '.patient_link p { font-size: 10px; padding: 3px 5px 5px 11px; background-color: #E8FFF9; font-family: Arial, Helvetica, sans-serif; font-weight: bold; margin: 5px 0 10px 0; }',
    '.patient_link a { color: #000000; text-decoration: underline; text-underline-offset: 1px; font-weight: bold; }',
    '.isi_wrapper { background-color: #fff; display: block; overflow: hidden; padding-right: 10px; position: relative; }',
    '.isi { padding-left: 10px; padding-bottom: 10px; padding-right: 4px; }',
    '.isi h2 { font-weight: 700; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 14px; color: #006937; margin: 0; }',
    '.isi p { font-size: 12px; font-family: Arial, Helvetica, sans-serif; line-height: 14px; margin: 0 0 6px 0; color: #000; }',
    '.isi ul { font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 14px; padding-left: 11px; color: #000; margin-top: 0; margin-bottom: 4px; }',
    '.isi ul li { list-style: none; text-indent: -2px; margin-left: -3px; margin-bottom: 4px; }',
    '.isi ul li::before { content: "\\2022"; display: inline-block; font-weight: 700; font-size: 12px; line-height: 13px; left: -4px; color: #61AE99; vertical-align: top; }',
    '.isi a { color: #000000; text-decoration: underline; }',
    '.isi .isi-logo { position: relative; width: 187px; height: auto; bottom: 0; left: 0; }',
    '.isi .mb-0 { margin-bottom: 0; }',
    '.isi .mb-2 { margin-bottom: 2px !important; }',
    '.isi .mb-7 { margin-bottom: 7px !important; }',
    '.isi .mb-10 { margin-bottom: 10px !important; }',
    '.isi .mb-10-title { margin-bottom: 4px !important; }',
    '.isi .mt-5 { margin-top: 5px; }',
    '.iScrollVerticalScrollbar { background-color: #006937; border-radius: 5px; border-top: 1px solid #006937; border-bottom: 1px solid #006937; top: 0px !important; right: 3px !important; height: 66% !important; width: 8px !important; position: absolute; z-index: 9999; overflow: visible !important; margin-top: 5px; padding: 0px; }',
    '.iScrollIndicator { border-radius: 5px; width: 6px !important; height: 13px !important; margin-top: 0px !important; right: 1px !important; position: absolute; background: #f2f2f2; cursor: pointer; display: block !important; }',
];

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

/** Downloads a remote file for inlined previews; returns undefined on failure. */
const tryInlineRemote = async (url: string): Promise<string | undefined> => {
    try {
        const blob = await (await fetch(url)).blob();
        return await blobToDataUrl(blob);
    } catch {
        return undefined;
    }
};

export async function buildBannerPackage({
    canvasWidth,
    canvasHeight,
    canvasBackground,
    canvasBackgroundImage,
    totalDuration,
    elements,
    inlineRemoteImages = false,
}: BuildBannerPackageOptions): Promise<BannerPackage> {
    const cssLines: string[] = [
        ...BASE_CSS_LINES,
        '#banner { position: relative; width: ' + canvasWidth + 'px; height: ' + canvasHeight + 'px; background: ' + canvasBackground + '; overflow: hidden; border: 1px solid #000000; }',
    ];

    const htmlBodyParts: string[] = [];
    const timelineEvents: string[] = [];
    const images: BannerPackageImage[] = [];

    const htmlParts: string[] = [
        '<!DOCTYPE html>',
        '<html class="no-js" lang="en">',
        '',
        '<head>',
        '  <meta charset="utf-8" />',
        '  <meta http-equiv="X-UA-Compatible" content="IE=edge" />',
        '  <meta name="format-detection" content="telephone=no" />',
        '  <title>' + canvasWidth + 'x' + canvasHeight + '</title>',
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
        '  <link rel="stylesheet" href="css/styles.css" />',
        '  <meta name="ad.size" content="width=' + canvasWidth + ',height=' + canvasHeight + '" />',
        '  <script type="text/javascript">',
        '    var clickTag1 = ' + jsStringLiteral(canvasBackground) + ';',
        '    var clickTag2 = "#";',
        '    var clickTag3 = "#";',
        '  </script>',
        '  <script src="js/main.js"></script>',
        '</head>',
        '',
        '<body>',
        '  <div id="banner">',
    ];

    if (canvasBackgroundImage) {
        const bgImgName = 'bg.png';
        htmlBodyParts.push('    <div style="position:absolute; inset:0; background-image:url(\'images/' + bgImgName + '\'); background-size:cover; z-index: 0;"></div>');

        if (canvasBackgroundImage.startsWith('data:')) {
            images.push({ name: bgImgName, dataUrl: canvasBackgroundImage, kind: 'background' });
        } else if (inlineRemoteImages) {
            const dataUrl = await tryInlineRemote(canvasBackgroundImage);
            images.push({ name: bgImgName, dataUrl, remoteUrl: canvasBackgroundImage, kind: 'background' });
        } else {
            images.push({ name: bgImgName, remoteUrl: canvasBackgroundImage, kind: 'background' });
        }
    }

    for (let index = 0; index < elements.length; index += 1) {
        const el = elements[index];
        const id = 'el-' + el.id;
        const base = getElementBaseState(el);
        const z = index;

        // Hidden layers are skipped so the exported banner matches the canvas.
        if (el.visible === false) continue;

        if (el.type === 'isiScroll') {
            const fontCol = el.fill || '#000000';
            const bgCol = el.isiBackgroundColor || '#ffffff';
            const scrollCol = el.isiScrollbarColor || '#006937';
            const indicatorCol = el.isiScrollbarTrackColor || '#f2f2f2';
            const headerBg = el.isiHeaderBackground || '#E8FFF9';
            const headerCol = el.isiHeaderColor || '#000000';
            const headerHeight = el.isiHeaderText ? (el.isiHeaderHeight || 20) : 0;
            const bodyHeight = Math.max(0, (el.height || 200) - headerHeight);
            const logoWidth = el.isiLogoWidth || 187;

            cssLines.push(
                '#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; background: ' + bgCol + '; color: ' + fontCol + '; font-size: ' + (el.fontSize || 12) + 'px; font-family: ' + (el.isiFontFamily || 'Arial, Helvetica, sans-serif') + '; font-weight: ' + (el.isiFontWeight || 'normal') + '; font-style: ' + (el.isiFontStyle || 'normal') + '; line-height: ' + (el.isiLineHeight || 1.4) + '; letter-spacing: ' + (el.isiLetterSpacing || 0) + 'px; border: ' + (el.isiBorderWidth || 0) + 'px solid ' + (el.isiBorderColor || 'transparent') + '; }',
                '#' + id + ' .patient_link p { background-color: ' + headerBg + '; }',
                '#' + id + ' .patient_link a { color: ' + headerCol + '; }',
                '#' + id + ' .isi_wrapper { height: ' + bodyHeight + 'px; }',
                '#' + id + ' .iScrollVerticalScrollbar { background-color: ' + scrollCol + '; border-top: 1px solid ' + scrollCol + '; border-bottom: 1px solid ' + scrollCol + '; right: ' + (el.isiScrollbarMarginRight ?? 3) + 'px !important; width: ' + (el.isiScrollbarWidth ?? 8) + 'px !important; height: ' + (el.isiScrollbarHeight ?? 66) + '% !important; margin-top: ' + (el.isiScrollbarMarginTop ?? 5) + 'px !important; padding: ' + (el.isiScrollbarPadding ?? 0) + 'px !important; }',
                '#' + id + ' .iScrollIndicator { background: ' + indicatorCol + '; }',
                '#' + id + ' .isi .isi-logo { width: ' + logoWidth + 'px; }',
            );

            let inner = '';
            if (el.isiLogoSrc && (el.isiLogoPosition || 'bottom') === 'top') {
                inner += '<img src="' + el.isiLogoSrc + '" style="width: ' + logoWidth + 'px; height: auto; display:block; margin-bottom:10px;">';
            }
            inner += '<div>' + (el.isiText || '') + '</div>';
            if (el.isiLogoSrc && (el.isiLogoPosition || 'bottom') !== 'top') {
                inner += '<img class="mb-10 isi-logo" src="' + el.isiLogoSrc + '" style="width: ' + logoWidth + 'px; height: auto;">';
            }

            const headerMarkup = el.isiHeaderText
                ? '        <div class="patient_link">\n          <p style="font-size:10px;padding: 3px 5px 5px 11px;background-color: ' + headerBg + ';font-family: Arial, Helvetica, sans-serif;font-weight: bold;margin: 5px 0 10px 0;">\n            <a href="' + (el.isiHeaderLink || '#') + '" target="_blank" style="color:' + headerCol + ';text-decoration:underline;text-underline-offset: 1px;font-weight:bold;">' + (el.isiHeaderText) + '</a>\n          </p>\n        </div>'
                : '';
            const isiElemId = 'isi-content-' + el.id;
            const isiIndicatorId = 'isi-indicator-' + el.id;

            // The ISI tray scrolls ONLY if "Auto ISI Scroll" is enabled
            // (isiAutoStart). It runs on its OWN clock (setTimeout + rAF loop),
            // completely independent of the banner's master animation timeline.
            // When disabled, the ISI stays static — just content + placed logo.
            if (el.isiAutoStart !== false) {
                timelineEvents.push(
                    buildIsiScrollEvent({
                        contentId: isiElemId,
                        indicatorId: isiIndicatorId,
                        startDelayMs: (el.isiStartDelay || 0) * 1000,
                        scrollDuration: el.isiScrollDuration,
                    }),
                );
            }

            htmlBodyParts.push(
                '          <div id="' + id + '" class="isi-main">',
                headerMarkup,
                '          <div class="isi_wrapper">',
                '            <div class="isi" id="' + isiElemId + '">' + inner + '</div>',
                '            <div class="iScrollVerticalScrollbar" style="overflow: hidden;"><div class="iScrollIndicator" id="' + isiIndicatorId + '"></div></div>',
                '          </div>',
                '          </div>',
            );
            continue;
        }

        if (el.type === 'rect') {
            htmlBodyParts.push('          <div id="' + id + '" class="element"></div>');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; background: ' + (el.fill) + '; border-radius: ' + (el.cornerRadius || 0) + 'px; ' + (el.stroke ? 'border: ' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';' : '') + ' }');
        } else if (el.type === 'circle') {
            htmlBodyParts.push('          <div id="' + id + '" class="element"></div>');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 100) + 'px; height: ' + (el.width || 100) + 'px; z-index: ' + z + '; background: ' + (el.fill) + '; border-radius: 50%; ' + (el.stroke ? 'border: ' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';' : '') + ' }');
        } else if (el.type === 'text') {
            htmlBodyParts.push('          <div id="' + id + '" class="element">' + (el.text || '') + '</div>');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 60) + 'px; z-index: ' + z + '; color: ' + (el.fill) + '; font-size: ' + (el.fontSize || 12) + 'px; font-family: ' + (el.fontFamily || 'Arial, sans-serif') + '; font-weight: ' + (el.fontWeight || 'normal') + '; font-style: ' + (el.fontStyle || 'normal') + '; text-decoration: ' + (el.textDecoration || 'none') + '; text-align: ' + (el.textAlign || 'left') + '; white-space: pre-wrap; line-height: ' + (el.lineHeight || 1.2) + '; letter-spacing: ' + (el.letterSpacing || 0) + 'px; overflow: hidden; }');
        } else if (el.type === 'image' && el.src) {
            const imgName = 'image-' + el.id + '.png';
            images.push({ name: imgName, dataUrl: el.src.startsWith('data:') ? el.src : undefined, remoteUrl: el.src.startsWith('data:') ? undefined : el.src, kind: 'image' });
            htmlBodyParts.push('          <img id="' + id + '" class="element" src="images/' + imgName + '" style="width: ' + (el.width || 200) + 'px; height: ' + (el.height || 150) + 'px;">');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 200) + 'px; height: ' + (el.height || 150) + 'px; z-index: ' + z + '; }');
        } else if (el.type === 'video' && el.src) {
            const videoName = 'video-' + el.id + '.mp4';
            images.push({ name: videoName, dataUrl: el.src.startsWith('data:') ? el.src : undefined, remoteUrl: el.src.startsWith('data:') ? undefined : el.src, kind: 'video' });
            htmlBodyParts.push('          <video id="' + id + '" class="element" src="images/' + videoName + '" style="width: ' + (el.width || 320) + 'px; height: ' + (el.height || 180) + 'px;" muted playsinline></video>');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 320) + 'px; height: ' + (el.height || 180) + 'px; z-index: ' + z + '; }');
            // Auto-play video on load
            timelineEvents.push(buildVideoAutoplayEvent(id));
        } else if (el.type === 'shape' && el.path) {
            htmlBodyParts.push(
                '          <div id="' + id + '" class="element">',
                '            <svg width="100%" height="100%" viewBox="0 0 24 24" preserveAspectRatio="none"><path d="' + el.path + '" fill="' + (el.fill || '#000000') + '" /></svg>',
                '          </div>',
            );
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 50) + 'px; height: ' + (el.height || 50) + 'px; z-index: ' + z + '; }');
        } else if (el.type === 'html' && el.htmlContent) {
            htmlBodyParts.push('          <div id="' + id + '" class="element">' + el.htmlContent + '</div>');
            cssLines.push('#' + id + ' { position: absolute; left: ' + el.x + 'px; top: ' + el.y + 'px; width: ' + (el.width || 300) + 'px; height: ' + (el.height || 200) + 'px; z-index: ' + z + '; overflow: hidden; }');
        } else {
            continue;
        }

        // Convert keyframes to a CSS @keyframes rule + a timeline event that
        // attaches the animation at the element's start time.
        const kfs = getElementKeyframes(el, totalDuration);
        const loopAnim = el.anim?.loop === true || el.animationLoop === true;
        const animationCss = buildElementAnimationCss({
            id,
            frames: kfs,
            base,
            elX: el.x,
            elY: el.y,
            totalDuration,
        });

        if (animationCss) {
            cssLines.push(...animationCss.css);

            // An element whose animation starts from a hidden state stays hidden
            // until the animation is attached, so it cannot flash its resting
            // state before its entrance runs.
            if (animationCss.initialHidden) {
                cssLines.push('#' + id + ' { opacity: 0; }');
            }

            timelineEvents.push(
                buildAnimationStartEvent({
                    id,
                    startDelayMs: animationCss.startDelayMs,
                    durationMs: animationCss.durationMs,
                    loop: loopAnim,
                    animationName: animationCss.animationName,
                }),
            );
        }
    }

    if (inlineRemoteImages) {
        // Materialize remote files as data URLs so the preview iframe is self-contained.
        for (let i = 0; i < images.length; i += 1) {
            const image = images[i];
            if (!image.dataUrl && image.remoteUrl) {
                image.dataUrl = await tryInlineRemote(image.remoteUrl);
            }
        }
    }

    return {
        html: [
            ...htmlParts,
            ...htmlBodyParts,
            '  </div>',
            '',
            '</body>',
            '',
            '</html>',
        ].join('\n'),
        css: cssLines.join('\n'),
        js: buildMainJs(timelineEvents, canvasBackground),
        images,
    };
}


/**
 * Inlines CSS, JS and image data URLs into the exported HTML so it can be shown
 * in an iframe `srcDoc` (used by the per-banner preview page).
 */
export const buildPreviewHtml = (pkg: BannerPackage): string => {
    let html = pkg.html
        .replace('<link rel="stylesheet" href="css/styles.css" />', `<style>\n${pkg.css}\n</style>`)
        .replace('<script src="js/main.js"></script>', `<script>\n${pkg.js}\n</script>`);

    for (const image of pkg.images) {
        const replacement = image.dataUrl || image.remoteUrl;
        if (!replacement) continue;
        html = html.split(`images/${image.name}`).join(replacement);
    }

    return html;
};

/** Packages the banner as a downloadable ZIP (index.html + css + js + images). */
export async function zipBannerPackage(pkg: BannerPackage): Promise<Blob> {
    const zip = new JSZip();
    const imgFolder = zip.folder('images');
    const cssFolder = zip.folder('css');
    const jsFolder = zip.folder('js');

    for (const image of pkg.images) {
        if (image.dataUrl) {
            const base64 = image.dataUrl.split(',')[1];
            if (base64) imgFolder?.file(image.name, base64, { base64: true });
        } else if (image.remoteUrl) {
            try {
                const blob = await (await fetch(image.remoteUrl)).blob();
                imgFolder?.file(image.name, blob);
            } catch {
                /* keep the package usable even when an asset cannot be fetched */
            }
        }
    }

    cssFolder?.file('styles.css', pkg.css);
    jsFolder?.file('main.js', pkg.js);
    zip.file('index.html', pkg.html);

    return zip.generateAsync({ type: 'blob' });
}
