import { describe, it, expect } from 'vitest';
import {
  assignTeams,
  startSession,
  fillCourts,
  freeCourt,
  substitutePlayer,
  buildPairingHistory,
  fillCourtsSmartly,
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

describe('substitutePlayer', () => {
  it('swaps a player on court with one from the queue', () => {
    const session = {
      courts: [
        { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
        null,
      ],
      queue: ['id_5', 'id_6'],
      players: ROSTER,
    };
    const next = substitutePlayer(session, 0, 'id_1', 'id_5');
    expect(next.courts[0]).toEqual({
      teamA: ['id_5', 'id_2'],
      teamB: ['id_3', 'id_4'],
    });
    expect(next.queue).toEqual(['id_1', 'id_6']);
  });

  it('swaps a player from teamB', () => {
    const session = {
      courts: [{ teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] }],
      queue: ['id_5'],
      players: ROSTER,
    };
    const next = substitutePlayer(session, 0, 'id_4', 'id_5');
    expect(next.courts[0]).toEqual({
      teamA: ['id_1', 'id_2'],
      teamB: ['id_3', 'id_5'],
    });
    expect(next.queue).toEqual(['id_4']);
  });

  it('returns null if player is not on the court', () => {
    const session = {
      courts: [{ teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] }],
      queue: ['id_5'],
      players: ROSTER,
    };
    const next = substitutePlayer(session, 0, 'id_9', 'id_5');
    expect(next).toBeNull();
  });

  it('returns null if replacement is not available', () => {
    const session = {
      courts: [
        { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
        null,
      ],
      queue: ['id_5'],
      players: ROSTER,
    };
    const next = substitutePlayer(session, 0, 'id_1', 'id_3');
    expect(next).toBeNull();
  });
});

describe('buildPairingHistory', () => {
  it('returns empty map for empty games', () => {
    const hist = buildPairingHistory([]);
    expect(hist.size).toBe(0);
  });

  it('counts partnerships from a single game', () => {
    const games = [
      {
        teamA: ['id_1', 'id_2'],
        teamB: ['id_3', 'id_4'],
      },
    ];
    const hist = buildPairingHistory(games);
    expect(hist.get('id_1')?.get('id_2')).toBe(1);
    expect(hist.get('id_2')?.get('id_1')).toBe(1);
    expect(hist.get('id_3')?.get('id_4')).toBe(1);
    expect(hist.get('id_4')?.get('id_3')).toBe(1);
    expect(hist.get('id_1')?.get('id_3')).toBeUndefined();
  });

  it('accumulates partnership counts across games', () => {
    const games = [
      { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
      { teamA: ['id_1', 'id_2'], teamB: ['id_5', 'id_6'] },
    ];
    const hist = buildPairingHistory(games);
    expect(hist.get('id_1')?.get('id_2')).toBe(2);
  });
});

describe('fillCourtsSmartly', () => {
  it('fills idle courts from the queue', () => {
    const session = {
      courts: [null, null],
      queue: ['id_1', 'id_2', 'id_3', 'id_4', 'id_5', 'id_6', 'id_7', 'id_8'],
      players: ROSTER,
      games: [],
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    expect(next.courts[0]).not.toBeNull();
    expect(next.courts[1]).not.toBeNull();
    expect(next.queue).toEqual([]);
  });

  it('does not touch courts that are already assigned', () => {
    const occupied = { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] };
    const session = {
      courts: [occupied, null],
      queue: ['id_5', 'id_6', 'id_7', 'id_8'],
      players: ROSTER,
      games: [],
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    expect(next.courts[0]).toBe(occupied);
    expect(next.courts[1]).not.toBeNull();
  });

  it('returns unchanged session when no idle courts', () => {
    const session = {
      courts: [
        { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
        { teamA: ['id_5', 'id_6'], teamB: ['id_7', 'id_8'] },
      ],
      queue: ['id_9'],
      players: ROSTER,
      games: [],
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    expect(next).toBe(session);
  });

  it('returns unchanged session when fewer than 4 queue players', () => {
    const session = {
      courts: [null],
      queue: ['id_1', 'id_2', 'id_3'],
      players: ROSTER,
      games: [],
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    expect(next).toBe(session);
  });

  it('avoids repeated partnerships when possible', () => {
    const games = [
      { teamA: ['id_1', 'id_2'], teamB: ['id_3', 'id_4'] },
    ];
    const session = {
      courts: [null],
      queue: ['id_1', 'id_2', 'id_3', 'id_4'],
      players: ROSTER.slice(0, 4),
      games,
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    const court = next.courts[0];
    expect(court).not.toBeNull();
    // Verify that 1 and 2 are not partnered, and 3 and 4 are not partnered
    const team1Ids = court.teamA.concat(court.teamB);
    const isSame12 = (court.teamA.includes('id_1') && court.teamA.includes('id_2')) ||
                     (court.teamB.includes('id_1') && court.teamB.includes('id_2'));
    const isSame34 = (court.teamA.includes('id_3') && court.teamA.includes('id_4')) ||
                     (court.teamB.includes('id_3') && court.teamB.includes('id_4'));
    expect(isSame12).toBe(false);
    expect(isSame34).toBe(false);
  });

  it('fills multiple courts and distributes players across groups', () => {
    const session = {
      courts: [null, null],
      queue: ['id_1', 'id_2', 'id_3', 'id_4', 'id_5', 'id_6', 'id_7', 'id_8'],
      players: ROSTER.slice(0, 8),
      games: [],
    };
    const next = fillCourtsSmartly(session, { rng: () => 0 });
    const court0 = next.courts[0];
    const court1 = next.courts[1];
    expect(court0).not.toBeNull();
    expect(court1).not.toBeNull();
    const players0 = new Set([...court0.teamA, ...court0.teamB]);
    const players1 = new Set([...court1.teamA, ...court1.teamB]);
    // Verify no player is on both courts
    for (const p of players0) {
      expect(players1.has(p)).toBe(false);
    }
    expect(next.queue).toEqual([]);
  });
});
