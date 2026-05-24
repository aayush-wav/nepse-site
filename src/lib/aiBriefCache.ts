/** Persisted AI Market Flow Brief entries (localStorage). */

export interface AIBriefCacheEntry {
  text: string;
  /** Calendar date the underlying floorsheet/session represents (YYYY-MM-DD). */
  sessionDate: string;
  /** When the brief text was generated. */
  generatedAt: string;
  isFresh: boolean;
}

const PREFIX = 'sbie-ai-brief-v2-';

export function dateString(d = new Date()): string {
  return d.toISOString().split('T')[0];
}

export function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateString(d);
}

export function briefCacheKey(sessionDate: string): string {
  return `${PREFIX}${sessionDate}`;
}

export function readBriefCache(sessionDate: string): AIBriefCacheEntry | null {
  try {
    const raw = localStorage.getItem(briefCacheKey(sessionDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIBriefCacheEntry;
    if (!parsed?.text) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBriefCache(entry: AIBriefCacheEntry): void {
  localStorage.setItem(briefCacheKey(entry.sessionDate), JSON.stringify(entry));
}

/** Read legacy plain-string cache (`sbie-ai-brief-YYYY-MM-DD-Label`). */
export function readLegacyBriefCache(date: string): AIBriefCacheEntry | null {
  for (const label of ['Today', 'Yesterday']) {
    const raw = localStorage.getItem(`sbie-ai-brief-${date}-${label}`);
    if (raw && raw.trim().length > 50) {
      return {
        text: raw,
        sessionDate: date,
        generatedAt: new Date().toISOString(),
        isFresh: label === 'Today',
      };
    }
  }
  return null;
}

/** Most recent cached brief before `today` (for stale fallback). */
export function findLatestStaleBrief(beforeDate: string): AIBriefCacheEntry | null {
  let best: AIBriefCacheEntry | null = null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const sessionDate = key.slice(PREFIX.length);
    if (sessionDate >= beforeDate) continue;

    const entry = readBriefCache(sessionDate);
    if (!entry) continue;
    if (!best || entry.sessionDate > best.sessionDate) best = entry;
  }

  return best;
}

/** Best available cached brief (today → yesterday → any older). */
export function resolveBestCachedBrief(today: string): AIBriefCacheEntry | null {
  const yesterday = yesterdayDateString();
  return (
    readBriefCache(today) ??
    readLegacyBriefCache(today) ??
    readBriefCache(yesterday) ??
    readLegacyBriefCache(yesterday) ??
    findLatestStaleBrief(today)
  );
}

export function formatSessionDateLabel(sessionDate: string): string {
  try {
    const d = new Date(`${sessionDate}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return sessionDate;
  }
}

export function entryToDisplay(
  entry: AIBriefCacheEntry,
  today: string
): { text: string; freshness: 'today' | 'stale'; sessionDate: string; generatedAt: string } {
  const isTodaySession = entry.sessionDate === today && entry.isFresh;
  return {
    text: entry.text,
    freshness: isTodaySession ? 'today' : 'stale',
    sessionDate: entry.sessionDate,
    generatedAt: entry.generatedAt,
  };
}
