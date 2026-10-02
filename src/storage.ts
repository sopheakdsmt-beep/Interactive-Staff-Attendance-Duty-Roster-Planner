import type { Bucket } from './types';
import type { Lang } from './i18n';

export type Persisted = {
  teamId: string;
  month: string;
  lang: Lang;
  hintDismissed: boolean;
  buckets: Record<string, Bucket>;
};

const KEY = 'vien-roster-v1';

export function bucketKey(teamId: string, month: string): string {
  return `${teamId}@${month}`;
}

export function loadState(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed || typeof parsed.month !== 'string' || typeof parsed.teamId !== 'string' || !parsed.buckets) {
      return null;
    }
    if (parsed.lang !== 'en' && parsed.lang !== 'km') parsed.lang = 'en';
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // A full private-mode quota should not block editing in memory.
  }
}
