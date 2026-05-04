// Master player list operations. Pure — no DOM, no localStorage.
//
// Names are kept in two forms:
//   - display name: what the user typed, with outer whitespace trimmed
//   - normalised name: lowercased + internal whitespace collapsed,
//     used only for equality checks (see duplicates.js in Phase 2)
//
// Player identity is by `id`, never by name. Names can change.

export function normaliseName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function defaultIdGen() {
  return `p_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function createPlayer(name, opts = {}) {
  const { now = Date.now, idGen = defaultIdGen } = opts;
  const t = now();
  return {
    id: idGen(),
    name: typeof name === 'string' ? name.trim() : '',
    hidden: false,
    createdAt: t,
    lastSeen: t,
  };
}

export function addToMaster(list, player) {
  return [...list, player];
}
