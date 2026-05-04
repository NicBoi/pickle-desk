import { describe, it, expect } from 'vitest';
import {
  assignTeams,
  startSession,
  fillCourts,
  freeCourt,
} from '../src/logic/queue.js';
import { createPlayer } from '../src/logic/players.js';

function p(name, idx) {
  return createPlayer(name, { now: () => idx, idGen: () => `id_${idx}` });
}

const ROSTER = [
  p('A', 1), p('B', 2), p('C', 3), p('D', 4),
  p('E', 5), p('F', 6), p('G', 7), p('H', 8),
  p('I', 9),
];

describe('assignTeams', () => {
  it('partners player 0 with player 1 when rng returns 0', () => {
    const r = assignTeams(ROSTER.slice(0, 4), () => 0);
    expect(r).toEqual({
      teamA: ['id_1', 'id_2'],
      teamB: ['id_3', 'id_4'],
    });
  });

  it('partners player 0 with player 3 when rng returns 0.99', () => {
    const r = assignTeams(ROSTER.slice(0, 4), () => 0.99);
    expect(r).toEqual({
      teamA: ['id_1', 'id_4'],
      teamB: ['id_2', 'id_3'],
    });
  });
});

describe('startSession', () => {
  it('builds a session from a draft and auto-fills courts', () => {
    const draft = { name: 'Test', courts: 2, roster: ROSTER };
    const session = startSession(draft, {
      now: () => 100,
      idGen: () => 's1',
      rng: () => 0,
    });
    expect(session.id).toBe('s1');
    expect(session.name).toBe('Test');
    expect(session.courtCount).toBe(2);
    expect(session.players).toEqual(ROSTER);
    expect(session.courts.length).toBe(2);
    expect(session.courts[0]).not.toBeNull();
    expect(session.courts[1]).not.toBeNull();
    expect(session.queue).toEqual(['id_9']);
    expect(session.games).toEqual([]);
    expect(session.createdAt).toBe(100);
  });

  it('leaves extra courts idle when there aren\'t enough players', () => {
    const draft = { name: 'Tiny', courts: 3, roster: ROSTER.slice(0, 4) };
    const session = startSession(draft, {
      now: () => 1,
      idGen: () => 's',
      rng: () => 0,
    });
    expect(session.courts[0]).not.toBeNull();
    expect(session.courts[1]).toBeNull();
    expect(session.courts[2]).toBeNull();
    expect(session.queue).toEqual([]);
  });
});

describe('fillCourts', () => {
  it('fills idle courts from the front of the queue', () => {
    const session = {
      courts: [null, null],
      queue: ['id_1', 'id_2', 'id_3', 'id_4', 'id_5'],
      players: ROSTER,
    };
    const next = fillCourts(session, { rng: () => 0 });
    expect(next.courts[0]).not.toBeNull();
    expect(next.courts[1]).toBeNull();
    expect(next.queue).toEqual(['id_5']);
  });

  it('does not touch courts that are already assigned', () => {
    const occupied = { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] };
    const session = {
      courts: [occupied, null],
      queue: ['id_5', 'id_6', 'id_7', 'id_8'],
      players: ROSTER,
    };
    const next = fillCourts(session, { rng: () => 0 });
    expect(next.courts[0]).toBe(occupied);
    expect(next.courts[1]).not.toBeNull();
    expect(next.queue).toEqual([]);
  });
});

describe('freeCourt', () => {
  it('returns the four players on that court to the back of the queue', () => {
    const session = {
      courts: [
        { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
        null,
      ],
      queue: ['id_5', 'id_6'],
      players: ROSTER,
    };
    const next = freeCourt(session, 0);
    expect(next.courts[0]).toBeNull();
    expect(next.queue).toEqual([
      'id_5', 'id_6', 'id_1', 'id_2', 'id_3', 'id_4',
    ]);
  });

  it('is a no-op for an already-idle court', () => {
    const session = {
      courts: [null],
      queue: ['id_1'],
      players: ROSTER,
    };
    expect(freeCourt(session, 0)).toBe(session);
  });
});
