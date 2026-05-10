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
