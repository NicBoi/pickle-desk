import { describe, it, expect } from 'vitest';
import { ratingDelta, validateScore, recordGame } from '../src/logic/rating.js';
import { createPlayer } from '../src/logic/players.js';

function p(name, idx) {
  return createPlayer(name, { now: () => idx, idGen: () => `id_${idx}` });
}

describe('ratingDelta', () => {
  it('+13.5 for an 11-4 win (margin +7)', () => {
    expect(ratingDelta(11, 4)).toBe(13.5);
  });
  it('+11 for an 11-9 win (margin +2)', () => {
    expect(ratingDelta(11, 9)).toBe(11);
  });
  it('+9 for a 9-11 loss (margin -2)', () => {
    expect(ratingDelta(9, 11)).toBe(9);
  });
  it('+6.5 for a 4-11 loss (margin -7)', () => {
    expect(ratingDelta(4, 11)).toBe(6.5);
  });
});

describe('validateScore', () => {
  it('accepts non-negative integers with a winner', () => {
    expect(validateScore(11, 4)).toBe(true);
    expect(validateScore(0, 11)).toBe(true);
  });
  it('rejects ties', () => {
    expect(validateScore(11, 11)).toBe(false);
  });
  it('rejects negatives', () => {
    expect(validateScore(-1, 4)).toBe(false);
  });
  it('rejects non-integers', () => {
    expect(validateScore(11.5, 4)).toBe(false);
  });
  it('rejects non-numbers', () => {
    expect(validateScore('11', 4)).toBe(false);
  });
});

describe('recordGame', () => {
  const players = [p('A', 1), p('B', 2), p('C', 3), p('D', 4), p('E', 5)];
  const baseSession = {
    id: 's1',
    players,
    courts: [{ teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] }],
    queue: ['id_5'],
    games: [],
    playerStats: {},
  };

  it('appends a game record', () => {
    const next = recordGame(baseSession, 0, 11, 7, {
      now: () => 1000,
      idGen: () => 'g1',
    });
    expect(next.games.length).toBe(1);
    expect(next.games[0]).toEqual({
      id: 'g1',
      sessionId: 's1',
      court: 0,
      teamA: ['id_1', 'id_2'],
      teamB: ['id_3', 'id_4'],
      scoreA: 11,
      scoreB: 7,
      timestamp: 1000,
    });
  });

  it('frees the court and queues losers ahead of winners', () => {
    const next = recordGame(baseSession, 0, 11, 7, {
      now: () => 1000,
      idGen: () => 'g1',
    });
    expect(next.courts[0]).toBeNull();
    // Existing queue [id_5], then losers (team B), then winners (team A)
    expect(next.queue).toEqual(['id_5', 'id_3', 'id_4', 'id_1', 'id_2']);
  });

  it('updates playerStats with deltas, played, wins, losses', () => {
    const next = recordGame(baseSession, 0, 11, 7, {
      now: () => 1000,
      idGen: () => 'g1',
    });
    // Team A won 11-7: +12 each. Team B lost 7-11: +8 each.
    expect(next.playerStats.id_1).toEqual({
      played: 1, wins: 1, losses: 0, rating: 12,
    });
    expect(next.playerStats.id_3).toEqual({
      played: 1, wins: 0, losses: 1, rating: 8,
    });
  });

  it('throws on invalid scores', () => {
    expect(() =>
      recordGame(baseSession, 0, 11, 11, { now: () => 1, idGen: () => 'g' }),
    ).toThrow();
    expect(() =>
      recordGame(baseSession, 0, -1, 11, { now: () => 1, idGen: () => 'g' }),
    ).toThrow();
  });

  it('throws when the court is idle', () => {
    const idle = { ...baseSession, courts: [null] };
    expect(() =>
      recordGame(idle, 0, 11, 7, { now: () => 1, idGen: () => 'g' }),
    ).toThrow();
  });
});
