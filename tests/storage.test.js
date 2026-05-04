import { describe, it, expect } from 'vitest';
import { read, write, SCHEMA_VERSION, KEYS } from '../src/logic/storage.js';

function memoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    _raw: () => Object.fromEntries(store),
  };
}

describe('storage.read', () => {
  it('returns null for an absent key', () => {
    const s = memoryStorage();
    expect(read(s, KEYS.players)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const s = memoryStorage({ [KEYS.players]: 'not-json' });
    expect(read(s, KEYS.players)).toBeNull();
  });

  it('returns null when schemaVersion is missing or mismatched', () => {
    const s = memoryStorage({
      [KEYS.players]: JSON.stringify({ data: [{ id: 'p1' }] }),
    });
    expect(read(s, KEYS.players)).toBeNull();

    const s2 = memoryStorage({
      [KEYS.players]: JSON.stringify({ schemaVersion: 999, data: [] }),
    });
    expect(read(s2, KEYS.players)).toBeNull();
  });
});

describe('storage round-trip', () => {
  it('write + read returns the original value', () => {
    const s = memoryStorage();
    const value = [{ id: 'p1', name: 'Alice' }];
    write(s, KEYS.players, value);
    expect(read(s, KEYS.players)).toEqual(value);
  });

  it('write stamps SCHEMA_VERSION on the payload', () => {
    const s = memoryStorage();
    write(s, KEYS.players, []);
    const raw = JSON.parse(s.getItem(KEYS.players));
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION);
    expect(raw.data).toEqual([]);
  });
});
