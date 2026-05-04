import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from '../src/logic/leaderboard.js';

const session = {
  players: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Carol' },
    { id: 'p4', name: 'Dan' },
  ],
  playerStats: {
    p1: { played: 3, wins: 3, losses: 0, rating: 36 },
    p2: { played: 3, wins: 1, losses: 2, rating: 24 },
    p3: { played: 3, wins: 2, losses: 1, rating: 30 },
    p4: { played: 0, wins: 0, losses: 0, rating: 0 },
  },
};

describe('buildLeaderboard', () => {
  it('defaults to rating descending', () => {
    const rows = buildLeaderboard(session);
    expect(rows.map((r) => r.id)).toEqual(['p1', 'p3', 'p2', 'p4']);
    expect(rows[0]).toMatchObject({ rank: 1, name: 'Alice', rating: 36 });
    expect(rows[3]).toMatchObject({ rank: 4, name: 'Dan' });
  });

  it('computes win percentage', () => {
    const rows = buildLeaderboard(session);
    const alice = rows.find((r) => r.id === 'p1');
    expect(alice.winPct).toBe(1);
    const bob = rows.find((r) => r.id === 'p2');
    expect(bob.winPct).toBeCloseTo(1 / 3);
    const dan = rows.find((r) => r.id === 'p4');
    expect(dan.winPct).toBe(0);
  });

  it('handles players who have not played yet', () => {
    const rows = buildLeaderboard(session);
    const dan = rows.find((r) => r.id === 'p4');
    expect(dan).toMatchObject({
      played: 0, wins: 0, losses: 0, rating: 0, winPct: 0,
    });
  });

  it('sorts by wins descending', () => {
    const rows = buildLeaderboard(session, 'wins');
    expect(rows.map((r) => r.id)).toEqual(['p1', 'p3', 'p2', 'p4']);
  });

  it('sorts by name ascending', () => {
    const rows = buildLeaderboard(session, 'name');
    expect(rows.map((r) => r.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});
