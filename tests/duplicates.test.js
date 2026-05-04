import { describe, it, expect } from 'vitest';
import {
  findExactMatch,
  findSimilar,
  classifyAdd,
} from '../src/logic/duplicates.js';
import { createPlayer } from '../src/logic/players.js';

function p(name, idx) {
  return createPlayer(name, { now: () => idx, idGen: () => `id_${idx}` });
}

const ALICE = p('Alice', 1);
const BOB = p('Bob', 2);
const JAMIE_B = p('Jamie B', 3);
const JOHN = p('John', 4);

describe('findExactMatch', () => {
  it('matches by normalised name (case-insensitive, whitespace-collapsed)', () => {
    const list = [ALICE, BOB];
    expect(findExactMatch('alice', list)).toBe(ALICE);
    expect(findExactMatch('  ALICE ', list)).toBe(ALICE);
    expect(findExactMatch('Bob', list)).toBe(BOB);
  });

  it('returns null when no match', () => {
    expect(findExactMatch('Carol', [ALICE, BOB])).toBeNull();
    expect(findExactMatch('', [ALICE])).toBeNull();
  });

  it('still matches hidden players (UI decides whether to surface)', () => {
    const hidden = { ...ALICE, hidden: true };
    expect(findExactMatch('Alice', [hidden])).toBe(hidden);
  });
});

describe('findSimilar', () => {
  it('flags near-misses within edit distance 2', () => {
    const list = [JOHN];
    const result = findSimilar('Jon', list);
    expect(result).toEqual([JOHN]);
  });

  it('excludes exact matches from the similar list', () => {
    const list = [JOHN];
    expect(findSimilar('John', list)).toEqual([]);
  });

  it('returns an empty list when nothing is close', () => {
    expect(findSimilar('Priya', [ALICE, BOB])).toEqual([]);
  });

  it('still flags hidden players (UI decides whether to surface)', () => {
    const hidden = { ...JOHN, hidden: true };
    expect(findSimilar('Jon', [hidden])).toEqual([hidden]);
  });
});

describe('classifyAdd', () => {
  const master = [ALICE, BOB, JAMIE_B];

  it('rejects empty input', () => {
    expect(classifyAdd('', master, []).kind).toBe('invalid');
    expect(classifyAdd('   ', master, []).kind).toBe('invalid');
  });

  it('blocks adding someone already in today\'s roster', () => {
    const result = classifyAdd('alice', master, [ALICE]);
    expect(result.kind).toBe('blocked');
    expect(result.reason).toBe('already_in_roster');
    expect(result.player).toBe(ALICE);
  });

  it('treats an exact master match as a returning player', () => {
    const result = classifyAdd('Bob', master, []);
    expect(result.kind).toBe('returning');
    expect(result.player).toBe(BOB);
  });

  it('flags similar names with candidates', () => {
    const masterWithJohn = [...master, JOHN];
    const result = classifyAdd('Jon', masterWithJohn, []);
    expect(result.kind).toBe('similar');
    expect(result.candidates).toEqual([JOHN]);
  });

  it('treats a totally new name as new', () => {
    const result = classifyAdd('Priyanka', master, []);
    expect(result.kind).toBe('new');
  });
});
