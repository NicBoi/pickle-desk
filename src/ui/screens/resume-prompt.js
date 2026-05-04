// Cross-day resume prompt. Shown on app open when an unfinished
// session is sitting in storage but it was started on a different
// calendar day. Two choices: resume it, or archive it and start fresh.

import { archiveSession } from '../../logic/session.js';
import { el, clear } from '../dom.js';

export function renderResumePrompt(root, ctx) {
  clear(root);
  const screen = el('section', { 'data-screen': 'resume-prompt' });
  const session = ctx.state.activeSession;
  const date = new Date(session.createdAt).toLocaleDateString();

  screen.appendChild(el('h1', {}, 'Unfinished session'));
  screen.appendChild(
    el(
      'p',
      {},
      `You have an unfinished session "${session.name}" from ${date}. Resume it or archive and start a new one?`,
    ),
  );

  const resume = el(
    'button',
    { 'data-action': 'resume-session', type: 'button' },
    'Resume',
  );
  resume.addEventListener('click', () => {
    ctx.state.resumed = true;
    ctx.transition('session');
  });

  const archive = el(
    'button',
    { 'data-action': 'archive-session', type: 'button' },
    'Archive and start new',
  );
  archive.addEventListener('click', () => {
    Object.assign(ctx.state, archiveSession(ctx.state, { now: ctx.now }));
    ctx.transition('new-session');
  });

  screen.appendChild(resume);
  screen.appendChild(archive);
  root.appendChild(screen);
}
