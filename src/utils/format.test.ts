import { describe, it, expect } from 'vitest';
import { formatDateTime, formatFileSize, formatRelativeTime } from './format';

describe('format helpers', () => {
    it('returns an em dash placeholder for missing values', () => {
        expect(formatDateTime()).toBe('—');
        expect(formatRelativeTime()).toBe('—');
        expect(formatFileSize()).toBe('—');
        expect(formatFileSize(0)).toBe('—');
        expect(formatFileSize(-12)).toBe('—');
    });

    it('formats bytes, kilobytes and megabytes', () => {
        expect(formatFileSize(512)).toBe('512 B');
        expect(formatFileSize(2048)).toBe('2.0 KB');
        expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
    });

    it('describes recent timestamps relatively and old ones absolutely', () => {
        const now = Date.now();
        expect(formatRelativeTime(now)).toBe('just now');
        expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5 min ago');
        expect(formatRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2 hours ago');
        expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('3 days ago');
        expect(formatRelativeTime(now - 45 * 24 * 60 * 60 * 1000)).toBe(formatDateTime(now - 45 * 24 * 60 * 60 * 1000));
    });
});
