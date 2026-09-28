/**
 * Removes undefined properties before passing nested design data to Firestore.
 *
 * Firestore rejects undefined field values. Sanitization happens before Firebase
 * sentinels such as serverTimestamp() are added, so those values are not cloned
 * or modified. Arrays are kept in order; undefined array entries are omitted
 * because Firestore cannot represent them either.
 */
export function removeUndefinedValues<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== undefined)
            .map((item) => removeUndefinedValues(item)) as T;
    }

    if (typeof value === 'object' && value !== null) {
        const prototype = Object.getPrototypeOf(value);
        if (prototype === Object.prototype || prototype === null) {
            const sanitized: Record<string, unknown> = {};
            for (const [key, nestedValue] of Object.entries(value)) {
                if (nestedValue !== undefined) sanitized[key] = removeUndefinedValues(nestedValue);
            }
            return sanitized as T;
        }
    }

    return value;
}
