import { describe, it, expect } from 'vitest';
import {
  addPlayerToSession,
  removeSessionPlayer,
  archiveSession,
  isSameDay,
} from '../src/logic/session.js';
import { createPlayer } from '../src/logic/players.js';

function p(name, idx) {
  return createPlayer(name, { now: () => idx, idGen: () => `id_${idx}` });
}

const A = p('A', 1);
const B = p('B', 2);
const C = p('C', 3);
const D = p('D', 4);
const E = p('E', 5);

function baseSession(courts, queue) {
  return {
    id: 's1',
    players: [A, B, C, D, E],
    courts,
    queue,
    games: [],
    playerStats: {},
  };
}

describe('addPlayerToSession', () => {
  it('appends to players and the back of the queue', () => {
    const F = p('F', 6);
    const next = addPlayerToSession(baseSession([null], ['id_5']), F);
    expect(next.players.find((x) => x.id === 'id_6')).toEqual(F);
    expect(next.queue).toEqual(['id_5', 'id_6']);
  });

  it('is a no-op if the player is already in the session', () => {
    const session = baseSession([null], ['id_5']);
    const next = addPlayerToSession(session, A);
    expect(next).toBe(session);
  });
});

describe('removeSessionPlayer', () => {
  it('removes a waiting player from the queue', () => {
    const session = baseSession([null], ['id_5']);
    const next = removeSessionPlayer(session, 'id_5');
    expect(next.queue).toEqual([]);
    expect(next.players.some((p) => p.id === 'id_5')).toBe(false);
  });

  it('frees the court and queues the other three when removing a playing player', () => {
    const court = { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] };
    const session = baseSession([court], ['id_5']);
    const next = removeSessionPlayer(session, 'id_2');
    expect(next.courts[0]).toBeNull();
    expect(next.queue).toEqual(['id_5', 'id_1', 'id_3', 'id_4']);
    expect(next.players.some((p) => p.id === 'id_2')).toBe(false);
  });

  it('preserves accumulated playerStats for the removed player', () => {
    const session = {
      ...baseSession([null], ['id_5']),
      playerStats: { id_5: { played: 2, wins: 1, losses: 1, rating: 21 } },
    };
    const next = removeSessionPlayer(session, 'id_5');
    expect(next.playerStats.id_5).toEqual({
      played: 2, wins: 1, losses: 1, rating: 21,
    });
  });

  it('is a no-op if the player is not in the session', () => {
    const session = baseSession([null], ['id_5']);
    const next = removeSessionPlayer(session, 'unknown');
    expect(next).toBe(session);
  });
});

describe('isSameDay', () => {
  it('returns true for two timestamps on the same calendar day', () => {
    const morning = new Date('2026-05-04T08:00:00').getTime();
    const evening = new Date('2026-05-04T22:30:00').getTime();
    expect(isSameDay(morning, evening)).toBe(true);
  });
  it('returns false across midnight', () => {
    const a = new Date('2026-05-04T23:59:00').getTime();
    const b = new Date('2026-05-05T00:01:00').getTime();
    expect(isSameDay(a, b)).toBe(false);
  });
  it('returns false for null inputs', () => {
    expect(isSameDay(null, Date.now())).toBe(false);
  });
});

describe('archiveSession', () => {
  it('moves the active session to sessions and clears active', () => {
    const state = {
      master: [A, B],
      activeSession: { id: 's1', players: [A], updatedAt: 1, createdAt: 1 },
      sessions: [],
    };
    const next = archiveSession(state, { now: () => 1000 });
    expect(next.activeSession).toBeNull();
    expect(next.sessions.length).toBe(1);
    expect(next.sessions[0].id).toBe('s1');
    expect(next.sessions[0].archivedAt).toBe(1000);
  });

  it('bumps lastSeen on master players who participated', () => {
    const state = {
      master: [{ ...A, lastSeen: 0 }, { ...B, lastSeen: 0 }],
      activeSession: { id: 's1', players: [A], updatedAt: 1 },
      sessions: [],
    };
    const next = archiveSession(state, { now: () => 1000 });
    expect(next.master.find((p) => p.id === A.id).lastSeen).toBe(1000);
    expect(next.master.find((p) => p.id === B.id).lastSeen).toBe(0);
  });

  it('is a no-op when there is no active session', () => {
    const state = { master: [], activeSession: null, sessions: [] };
    expect(archiveSession(state)).toBe(state);
  });
});
