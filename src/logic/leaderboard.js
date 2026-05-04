// Leaderboard projection. Pure — given a session, returns sorted
// rows. Live recompute on each game record happens in the UI by
// calling buildLeaderboard again; cheap enough for any realistic
// roster size.

const EMPTY_STATS = { played: 0, wins: 0, losses: 0, rating: 0 };

const COMPARATORS = {
  rating: (a, b) => b.rating - a.rating || a.name.localeCompare(b.name),
  wins: (a, b) => b.wins - a.wins || b.rating - a.rating,
  losses: (a, b) => b.losses - a.losses || a.name.localeCompare(b.name),
  played: (a, b) => b.played - a.played || a.name.localeCompare(b.name),
  winPct: (a, b) => b.winPct - a.winPct || b.rating - a.rating,
  name: (a, b) => a.name.localeCompare(b.name),
};

export function buildLeaderboard(session, sortBy = 'rating') {
  const cmp = COMPARATORS[sortBy] ?? COMPARATORS.rating;
  const stats = session.playerStats ?? {};
  const rows = session.players.map((p) => {
    const s = stats[p.id] ?? EMPTY_STATS;
    return {
      id: p.id,
      name: p.name,
      played: s.played,
      wins: s.wins,
      losses: s.losses,
      rating: s.rating,
      winPct: s.played > 0 ? s.wins / s.played : 0,
    };
  });
  rows.sort(cmp);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
