/** Date helpers shared by the dashboard pages. */

export const formatDateTime = (timestamp?: number): string => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return '—';
    const diffMs = Date.now() - timestamp;
    const minutes = Math.round(diffMs / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

    return formatDateTime(timestamp);
};

export const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
