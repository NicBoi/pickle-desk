// Rating math + game recording. Pure — no DOM, no localStorage.
//
// Rating formula: every player on the court earns points just for
// playing. Winners earn more; close losses are protected; blowout
// losses earn the least.
//
//   margin = your_team_score - opponent_team_score
//   delta  = 10 + (margin × 0.5)
//
// Examples: 11-4 win → +13.5, 11-9 win → +11, 9-11 loss → +9, 4-11
// loss → +6.5. The formula is symmetric around 10 so a tie would be
// +10 each — but ties are rejected by validateScore because pickleball
// doesn't have them.

export function ratingDelta(yourScore, opponentScore) {
  const margin = yourScore - opponentScore;
  return 10 + margin * 0.5;
}

export function validateScore(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0) return false;
  if (a === b) return false;
  return true;
}

export function recordGame(session, courtIndex, scoreA, scoreB, opts = {}) {
  const court = session.courts[courtIndex];
  if (!court) {
    throw new Error(`court ${courtIndex} is idle, nothing to record`);
  }
  if (!validateScore(scoreA, scoreB)) {
    throw new Error(`invalid score ${scoreA}-${scoreB}`);
  }
  const { now = Date.now, idGen } = opts;
  const t = now();
  const aWon = scoreA > scoreB;
  const winners = aWon ? court.teamA : court.teamB;
  const losers = aWon ? court.teamB : court.teamA;

  const game = {
    id: idGen ? idGen() : `g_${t.toString(36)}`,
    sessionId: session.id,
    court: courtIndex,
    teamA: court.teamA,
    teamB: court.teamB,
    scoreA,
    scoreB,
    timestamp: t,
  };

  const stats = { ...(session.playerStats ?? {}) };
  const bump = (id, won, delta) => {
    const prev = stats[id] ?? { played: 0, wins: 0, losses: 0, rating: 0 };
    stats[id] = {
      played: prev.played + 1,
      wins: prev.wins + (won ? 1 : 0),
      losses: prev.losses + (won ? 0 : 1),
      rating: prev.rating + delta,
    };
  };
  for (const id of court.teamA) bump(id, aWon, ratingDelta(scoreA, scoreB));
  for (const id of court.teamB) bump(id, !aWon, ratingDelta(scoreB, scoreA));

  return {
    ...session,
    courts: session.courts.map((c, i) => (i === courtIndex ? null : c)),
    queue: [...session.queue, ...losers, ...winners],
    games: [...(session.games ?? []), game],
    playerStats: stats,
    updatedAt: t,
  };
}
