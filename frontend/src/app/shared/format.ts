/** Pomocnicze formatowanie danych plików. */

/** Zamienia rozmiar w bajtach na czytelny zapis (np. 1,4 MB). */
export function formatBytes(size: number | null): string {
  if (size === null || size < 0) {
    return '—';
  }
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1).replace('.', ',')} ${units[unitIndex]}`;
}

/** Formatuje datę ISO do zapisu lokalnego (dd.mm.rrrr gg:mm). */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
