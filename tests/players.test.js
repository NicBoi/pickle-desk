import { describe, it, expect } from 'vitest';
import { normaliseName, createPlayer, addToMaster } from '../src/logic/players.js';

describe('normaliseName', () => {
  it('lowercases and trims', () => {
    expect(normaliseName('  Alice  ')).toBe('alice');
    expect(normaliseName('JAMIE')).toBe('jamie');
  });

  it('collapses internal whitespace', () => {
    expect(normaliseName('Jamie   B')).toBe('jamie b');
    expect(normaliseName('  Pat\tT.  ')).toBe('pat t.');
  });

  it('returns empty string for null / non-strings', () => {
    expect(normaliseName(null)).toBe('');
    expect(normaliseName(undefined)).toBe('');
    expect(normaliseName(42)).toBe('');
  });
});

describe('createPlayer', () => {
  it('produces a player with a stable shape', () => {
    const p = createPlayer('Alice', { now: () => 1000, idGen: () => 'p1' });
    expect(p).toEqual({
      id: 'p1',
      name: 'Alice',
      hidden: false,
      createdAt: 1000,
      lastSeen: 1000,
    });
  });

  it('preserves the original casing of the display name', () => {
    const p = createPlayer('  Jamie  B  ', { now: () => 0, idGen: () => 'x' });
    expect(p.name).toBe('Jamie  B');
  });

  it('generates an id if no idGen is provided', () => {
    const a = createPlayer('A');
    const b = createPlayer('B');
    expect(a.id).toEqual(expect.any(String));
    expect(a.id).not.toBe(b.id);
  });
});

describe('addToMaster', () => {
  it('appends a new player', () => {
    const list = [];
    const p = createPlayer('Alice', { now: () => 1, idGen: () => 'p1' });
    const next = addToMaster(list, p);
    expect(next).toEqual([p]);
    expect(next).not.toBe(list);
  });

  it('does not mutate the input list', () => {
    const original = [createPlayer('A', { now: () => 1, idGen: () => 'a' })];
    const snapshot = [...original];
    addToMaster(original, createPlayer('B', { now: () => 2, idGen: () => 'b' }));
    expect(original).toEqual(snapshot);
  });
});
