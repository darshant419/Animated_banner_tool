import type { DesignElement } from '../store/designStore';

/**
 * Upgrades older banners where the "Prescribing Information" strip lived inside
 * the ISI tray: each such tray is split into a standalone `piStrip` element
 * (placed directly above the tray, spanning its full width) plus an ISI that
 * keeps only the scrolling text.
 *
 * Lives apart from `bannerExport` on purpose — the store calls it on every
 * project/template load, and pulling the exporter in there would create an
 * import cycle.
 *
 * The new strip is inserted immediately before its tray so it keeps sitting
 * underneath in the layer order, and the tray is enlarged back to the space the
 * band used to take from it.
 */
export const migrateIsiHeaderToPiStrip = (elements: DesignElement[]): DesignElement[] => {
    if (!elements.some((el) => el.type === 'isiScroll' && el.isiHeaderText)) return elements;

    const out: DesignElement[] = [];

    elements.forEach((el) => {
        if (el.type !== 'isiScroll' || !el.isiHeaderText) {
            out.push(el);
            return;
        }

        const stripHeight = el.isiHeaderHeight || 20;
        const marginTop = el.isiHeaderMarginTop || 0;
        const marginBottom = el.isiHeaderMarginBottom || 0;
        const headerSpace = stripHeight + marginTop + marginBottom;

        const strip: DesignElement = {
            id: `${el.id}-pi-strip`,
            type: 'piStrip',
            name: 'PI Strip',
            x: el.x,
            // Sit directly above the tray's content.
            y: Math.max(0, el.y - headerSpace),
            width: el.width,
            height: stripHeight,
            text: el.isiHeaderText,
            fill: el.isiHeaderColor || '#000000',
            fontSize: 10,
            fontWeight: 'bold',
            linkUrl: el.isiHeaderLink,
            linkClickTag: el.isiHeaderClickTag,
            piBackground: el.isiHeaderBackground,
            piPadding: el.isiHeaderPadding,
            piPaddingTop: el.isiHeaderPaddingTop,
            piPaddingRight: el.isiHeaderPaddingRight,
            piPaddingBottom: el.isiHeaderPaddingBottom,
            piPaddingLeft: el.isiHeaderPaddingLeft,
        };
        out.push(strip);

        // The tray keeps only its scrolling text and reclaims the band's height.
        const tray: DesignElement = { ...el, height: (el.height || 0) + headerSpace };
        delete tray.isiHeaderText;
        delete tray.isiHeaderLink;
        delete tray.isiHeaderColor;
        delete tray.isiHeaderBackground;
        delete tray.isiHeaderHeight;
        delete tray.isiHeaderPadding;
        delete tray.isiHeaderPaddingTop;
        delete tray.isiHeaderPaddingRight;
        delete tray.isiHeaderPaddingBottom;
        delete tray.isiHeaderPaddingLeft;
        delete tray.isiHeaderMarginTop;
        delete tray.isiHeaderMarginBottom;
        delete tray.isiHeaderClickTag;
        out.push(tray);
    });

    return out;
};