import { Injectable } from '@angular/core';

/**
 * Generic localStorage persistence helper.
 * All keys are prefixed with 'c2-webui.' to avoid collisions.
 */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly PREFIX = 'c2-webui.';

  /** Serialises `value` and writes it under `key`. Silently ignores quota errors. */
  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or private-browsing restriction — safe to ignore.
    }
  }

  /**
   * Reads and deserialises the value stored under `key`.
   * Returns an empty array if the key is absent or the stored JSON is corrupted.
   */
  load<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  /** Removes the entry for `key`. */
  remove(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }
}
