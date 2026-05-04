// Bootstraps the app into a root element. Loads master player list
// + active session from storage, picks the active screen, and renders.
// Returns a ctx handle so tests can introspect.

import { read, write, KEYS } from '../logic/storage.js';
import { isSameDay } from '../logic/session.js';
import { renderNewSession } from './screens/new-session.js';
import { renderSession } from './screens/session.js';
import { renderResumePrompt } from './screens/resume-prompt.js';
import { renderHistory } from './screens/history.js';

const MIN_PLAYERS = 4;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function defaultSessionName(now) {
  const d = new Date(now);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${h}:${m} ${ampm}`;
}

export function mount(root, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage;
  const nowFn = opts.now ?? Date.now;
  const idGen = opts.idGen;
  const rng = opts.rng ?? Math.random;

  const master = read(storage, KEYS.players) ?? [];
  const activeSession = read(storage, KEYS.activeSession) ?? null;
  const sessions = read(storage, KEYS.sessions) ?? [];

  let initialScreen = 'new-session';
  let resumed = false;
  if (activeSession) {
    if (isSameDay(activeSession.createdAt, nowFn())) {
      initialScreen = 'session';
      resumed = true;
    } else {
      initialScreen = 'resume-prompt';
    }
  }

  const ctx = {
    state: {
      screen: initialScreen,
      resumed,
      master,
      activeSession,
      sessions,
      draft: {
        name: defaultSessionName(nowFn()),
        courts: 3,
        roster: [],
        input: '',
        hint: { kind: 'idle' },
      },
    },
    storage,
    now: nowFn,
    idGen,
    rng,
    minPlayers: opts.minPlayers ?? MIN_PLAYERS,
    persist() {
      write(this.storage, KEYS.players, this.state.master);
      write(this.storage, KEYS.activeSession, this.state.activeSession);
      write(this.storage, KEYS.sessions, this.state.sessions);
    },
    transition(screen) {
      this.state.screen = screen;
      this.persist();
      renderCurrent(root, this);
    },
  };

  renderCurrent(root, ctx);
  return ctx;
}

function renderCurrent(root, ctx) {
  if (ctx.state.screen === 'session') {
    renderSession(root, ctx);
  } else if (ctx.state.screen === 'resume-prompt') {
    renderResumePrompt(root, ctx);
  } else if (ctx.state.screen === 'history') {
    renderHistory(root, ctx);
  } else {
    renderNewSession(root, ctx);
  }
}
