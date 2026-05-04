// Duplicate detection for new-session player input.
//
// Three layers:
//   1. findExactMatch — does this normalised name already exist?
//   2. findSimilar    — Levenshtein-close names, for "did you mean?"
//   3. classifyAdd    — combines roster + master to produce the
//                       UX-facing classification.
//
// Hidden players are *included* in name lookups. The UI hides them
// from the suggestion chip grid, but if the organiser explicitly
// types their name we still want to match — otherwise typing a hidden
// player's name would silently create a duplicate in master.

import { normaliseName } from './players.js';

// Length-aware similarity threshold. A flat distance of 2 flags too
// many false positives among short names ("jon" vs "bob" differ by
// only 2 substitutions but are clearly different people). Scaling the
// threshold with the shorter name's length keeps short matches strict
// and tolerates more typos on longer names.
function similarityThreshold(a, b) {
  const minLen = Math.min(a.length, b.length);
  if (minLen <= 4) return 1;
  if (minLen <= 8) return 2;
  return 3;
}

export function findExactMatch(name, players) {
  const target = normaliseName(name);
  if (!target) return null;
  for (const p of players) {
    if (normaliseName(p.name) === target) return p;
  }
  return null;
}

export function findSimilar(name, players) {
  const target = normaliseName(name);
  if (!target) return [];
  const out = [];
  for (const p of players) {
    const candidate = normaliseName(p.name);
    if (!candidate || candidate === target) continue;
    if (editDistance(target, candidate) <= similarityThreshold(target, candidate)) {
      out.push(p);
    }
  }
  return out;
}

export function classifyAdd(input, master, roster) {
  if (!normaliseName(input)) {
    return { kind: 'invalid', reason: 'empty' };
  }
  const inRoster = findExactMatch(input, roster);
  if (inRoster) {
    return { kind: 'blocked', reason: 'already_in_roster', player: inRoster };
  }
  const inMaster = findExactMatch(input, master);
  if (inMaster) {
    return { kind: 'returning', player: inMaster };
  }
  const candidates = findSimilar(input, master);
  if (candidates.length > 0) {
    return { kind: 'similar', candidates };
  }
  return { kind: 'new' };
}

// Standard Levenshtein, two-row DP. Names are short so this is cheap.
function editDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}
