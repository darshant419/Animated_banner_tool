import { describe, it, expect } from 'vitest';
import { useDesignStore } from '../store/designStore';
import { setLivePlayhead } from './livePlayhead';

describe('live playhead', () => {
    it('stopping playback adopts the frame on screen', () => {
        const store = useDesignStore.getState();
        store.setTotalDuration(10);
        store.setPlayheadTime(1);
        store.setIsPlaying(true);
        setLivePlayhead(4.25); // timeline advanced the canvases without store writes
        useDesignStore.getState().setIsPlaying(false);
        expect(useDesignStore.getState().playheadTime).toBe(4.25);
    });

    it('does not touch the playhead when already stopped', () => {
        useDesignStore.getState().setPlayheadTime(2);
        setLivePlayhead(7);
        useDesignStore.getState().setIsPlaying(false);
        expect(useDesignStore.getState().playheadTime).toBe(2);
    });
});
