// Queue rotation, court assignment, team formation. Pure — no DOM,
// no localStorage. State in, new state out.
//
// Court state: either `null` (idle) or `{ teamA, teamB }` where each
// team is a 2-tuple of player ids. The queue is an ordered list of
// player ids; the front is "next up". Player records live on the
// session (`session.players`) so renderers can look up names without
// hitting the master list.

export function assignTeams(four, rng = Math.random) {
  // 4 players → 3 possible team splits, determined by who partners
  // with `four[0]`. Pick partner via rng, the rest form team B.
  const partnerIdx = 1 + Math.floor(rng() * 3);
  const others = [1, 2, 3].filter((i) => i !== partnerIdx);
  return {
    teamA: [four[0].id, four[partnerIdx].id],
    teamB: [four[others[0]].id, four[others[1]].id],
  };
}

export function startSession(draft, opts = {}) {
  const { now = Date.now, idGen, rng = Math.random } = opts;
  const t = now();
  const base = {
    id: idGen ? idGen() : `s_${t.toString(36)}`,
    name: draft.name,
    courtCount: draft.courts,
    date: t,
    players: [...draft.roster],
    queue: draft.roster.map((p) => p.id),
    courts: Array.from({ length: draft.courts }, () => null),
    games: [],
    createdAt: t,
    updatedAt: t,
  };
  return fillCourts(base, { rng });
}

export function fillCourts(session, opts = {}) {
  const { rng = Math.random } = opts;
  const playerById = new Map(session.players.map((p) => [p.id, p]));
  let queue = [...session.queue];
  const courts = session.courts.map((court) => {
    if (court !== null) return court;
    if (queue.length < 4) return null;
    const four = queue.slice(0, 4).map((id) => playerById.get(id));
    queue = queue.slice(4);
    return assignTeams(four, rng);
  });
  return { ...session, courts, queue };
}

export function freeCourt(session, courtIndex) {
  const court = session.courts[courtIndex];
  if (!court) return session;
  const playersOnCourt = [...court.teamA, ...court.teamB];
  return {
    ...session,
    courts: session.courts.map((c, i) => (i === courtIndex ? null : c)),
    queue: [...session.queue, ...playersOnCourt],
  };
}

export function substitutePlayer(session, courtIndex, playerIdToRemove, playerIdToAdd) {
  const court = session.courts[courtIndex];
  if (!court) return null;

  const onTeamA = court.teamA.includes(playerIdToRemove);
  const onTeamB = court.teamB.includes(playerIdToRemove);
  if (!onTeamA && !onTeamB) return null;

  const inQueue = session.queue.includes(playerIdToAdd);
  if (!inQueue) return null;

  const newTeamA = onTeamA
    ? court.teamA.map((id) => (id === playerIdToRemove ? playerIdToAdd : id))
    : court.teamA;
  const newTeamB = onTeamB
    ? court.teamB.map((id) => (id === playerIdToRemove ? playerIdToAdd : id))
    : court.teamB;
  const newCourt = { teamA: newTeamA, teamB: newTeamB };
  const newQueue = session.queue.map((id) => (id === playerIdToAdd ? playerIdToRemove : id));

  return {
    ...session,
    courts: session.courts.map((c, i) => (i === courtIndex ? newCourt : c)),
    queue: newQueue,
  };
}

export function buildPairingHistory(games) {
  const hist = new Map();
  const addPairing = (a, b) => {
    if (!hist.has(a)) hist.set(a, new Map());
    if (!hist.has(b)) hist.set(b, new Map());
    hist.get(a).set(b, (hist.get(a).get(b) ?? 0) + 1);
    hist.get(b).set(a, (hist.get(b).get(a) ?? 0) + 1);
  };
  for (const game of games) {
    addPairing(game.teamA[0], game.teamA[1]);
    addPairing(game.teamB[0], game.teamB[1]);
  }
  return hist;
}

function pairingCount(hist, a, b) {
  return hist.get(a)?.get(b) ?? 0;
}

function minSplitScore(hist, four) {
  const ids = four.map((p) => p.id);
  const splits = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];
  let minScore = Infinity;
  for (const [a, b] of splits) {
    const score = pairingCount(hist, ids[a[0]], ids[a[1]]) +
                  pairingCount(hist, ids[b[0]], ids[b[1]]);
    minScore = Math.min(minScore, score);
  }
  return minScore;
}

function bestTeamSplit(hist, four, rng) {
  const ids = four.map((p) => p.id);
  const splits = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];
  let bestSplit = null;
  let bestScore = Infinity;
  for (const [a, b] of splits) {
    const score = pairingCount(hist, ids[a[0]], ids[a[1]]) +
                  pairingCount(hist, ids[b[0]], ids[b[1]]);
    if (score < bestScore || (score === bestScore && rng() < 0.5)) {
      bestScore = score;
      bestSplit = [a, b];
    }
  }
  const [a, b] = bestSplit;
  return {
    teamA: [ids[a[0]], ids[a[1]]],
    teamB: [ids[b[0]], ids[b[1]]],
  };
}

function shuffleWith(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fillCourtsSmartly(session, opts = {}) {
  const { rng = Math.random } = opts;
  const hist = buildPairingHistory(session.games ?? []);
  const playerById = new Map(session.players.map((p) => [p.id, p]));

  const idleCount = session.courts.filter((c) => c === null).length;
  if (idleCount === 0) return session;

  const needed = idleCount * 4;
  const pool = session.queue
    .slice(0, needed)
    .map((id) => playerById.get(id))
    .filter(Boolean);
  const remainder = session.queue.slice(needed);

  if (pool.length < 4) return session;

  const courtsToFill = Math.floor(pool.length / 4);
  const leftover = pool.slice(courtsToFill * 4);
  const playing = pool.slice(0, courtsToFill * 4);

  let bestPerm = playing;
  let bestScore = Infinity;

  const ATTEMPTS = 50;
  for (let i = 0; i < ATTEMPTS; i++) {
    const perm = shuffleWith(playing, rng);
    let score = 0;
    for (let j = 0; j < courtsToFill; j++) {
      const group = perm.slice(j * 4, (j + 1) * 4);
      score += minSplitScore(hist, group);
    }
    if (score < bestScore) {
      bestScore = score;
      bestPerm = perm;
    }
  }

  const newAssignments = [];
  for (let j = 0; j < courtsToFill; j++) {
    const group = bestPerm.slice(j * 4, (j + 1) * 4);
    newAssignments.push(bestTeamSplit(hist, group, rng));
  }

  let assignIdx = 0;
  const courts = session.courts.map((c) => {
    if (c !== null) return c;
    if (assignIdx < newAssignments.length) return newAssignments[assignIdx++];
    return null;
  });

  const newQueue = [...leftover.map((p) => p.id), ...remainder];

  return { ...session, courts, queue: newQueue };
}
