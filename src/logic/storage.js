// Thin adapter over a Storage-like object (window.localStorage in the
// app, in-memory Map in tests). Pure logic stays free of localStorage
// access — it receives the storage object as an argument.
//
// Every payload is wrapped as { schemaVersion, data } so we can migrate
// older formats in future without a painful retrofit. read() returns
// null whenever the value is absent, malformed, or stamped with a
// schemaVersion we don't understand — callers treat null as "no value
// yet".

export const SCHEMA_VERSION = 1;

export const KEYS = Object.freeze({
  players: 'pickledesk_players',
  sessions: 'pickledesk_sessions',
  activeSession: 'pickledesk_active_session',
});

export function read(storage, key) {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
  return parsed.data ?? null;
}

export function write(storage, key, data) {
  const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, data });
  storage.setItem(key, payload);
}
