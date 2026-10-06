const UNITS = ['B', 'KB', 'MB'] as const;

/** Human-readable file size, e.g. "1.2 MB" (FR-002). */
export const formatSize = (bytes: number, locale: string): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${UNITS[unit] ?? 'B'}`;
};
