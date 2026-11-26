/**
 * The playhead time the canvases were last seeked to directly (60fps playback /
 * scrubbing bypass the store to avoid re-rendering the whole app every frame).
 * When playback stops, the store adopts this value so every panel lands on the
 * exact frame on screen instead of a stale one.
 */
let liveTime: number | null = null;

export const setLivePlayhead = (t: number): void => {
    liveTime = t;
};

export const getLivePlayhead = (): number | null => liveTime;
