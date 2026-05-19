/**
 * Formats a date value into "02-Mar-2026" format.
 * Accepts Date objects, ISO strings, or any parseable date string.
 * Returns 'N/A' for null/undefined, returns original string if unparseable.
 */
export const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).replace(/ /g, '-');
};
