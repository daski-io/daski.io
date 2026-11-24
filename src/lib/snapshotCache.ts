// A per-process cache for the server's reads from a private service. A page
// renders the last good copy at once; once that copy is `freshMs` old, one
// background refresh per key replaces it. A reader that cannot use a copy past
// some age passes `maxAgeMs` and waits for the new copy instead, so the first
// request after a quiet spell sees current data rather than nothing.
//
// Only successful reads are stored, so unknown keys never grow the cache.
import type { Snapshot } from './api.ts';

export interface SnapshotCacheOptions {
  /** A copy this old starts a background refresh and is still served meanwhile. */
  freshMs: number;
  /** A failed refresh for which this returns true drops the copy instead of keeping it. */
  dropOn?: (error: unknown) => boolean;
  /** Reports a failed background refresh that keeps the copy. */
  onBackgroundError?: (key: string, error: unknown) => void;
  /** The clock; tests pass their own. */
  now?: () => number;
}

export type SnapshotReader = <T>(
  key: string,
  load: () => Promise<T>,
  maxAgeMs?: number,
) => Promise<Snapshot<T>>;

export function createSnapshotCache({
  freshMs,
  dropOn = () => false,
  onBackgroundError = () => {},
  now = Date.now,
}: SnapshotCacheOptions): SnapshotReader {
  const cache = new Map<string, Snapshot<unknown>>();
  const refreshing = new Map<string, Promise<Snapshot<unknown>>>();

  function refresh<T>(key: string, load: () => Promise<T>): Promise<Snapshot<T>> {
    const pending = refreshing.get(key) as Promise<Snapshot<T>> | undefined;
    if (pending) return pending;
    const next = load()
      .then(
        (value) => {
          const snapshot = { value, fetchedAt: now() };
          cache.set(key, snapshot);
          return snapshot;
        },
        (error: unknown) => {
          if (dropOn(error)) cache.delete(key);
          throw error;
        },
      )
      .finally(() => refreshing.delete(key));
    refreshing.set(key, next);
    return next;
  }

  return async function read<T>(key: string, load: () => Promise<T>, maxAgeMs = Infinity): Promise<Snapshot<T>> {
    const entry = cache.get(key) as Snapshot<T> | undefined;
    const age = entry ? now() - entry.fetchedAt : Infinity;
    // No copy yet, or one too old for this reader: wait for a new one.
    if (!entry || age >= maxAgeMs) return refresh(key, load);
    if (age >= freshMs) {
      refresh(key, load).catch((error: unknown) => {
        if (!dropOn(error)) onBackgroundError(key, error);
      });
    }
    return entry;
  };
}
