/**
 * thumbnailService.ts
 *
 * Requests the active Konva stage to export itself as a PNG data URL.
 * The DesignCanvas component listens for 'request-thumbnail' and responds
 * via 'thumbnail-ready' with the data URL.
 *
 * Falls back to null if the canvas doesn't respond within 3 seconds.
 * When Firebase Storage is ready, upload the data URL blob instead of storing it inline.
 */

export function captureCanvasThumbnail(): Promise<string | null> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            window.removeEventListener('thumbnail-ready', handler as EventListener);
            resolve(null);
        }, 3000);

        const handler = (e: CustomEvent<{ dataUrl: string }>) => {
            clearTimeout(timeout);
            resolve(e.detail.dataUrl);
        };

        window.addEventListener('thumbnail-ready', handler as EventListener, { once: true });
        window.dispatchEvent(new Event('request-thumbnail'));
    });
}
