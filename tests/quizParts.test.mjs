// The quiz area's shared parts (Phase 1.46 S3.2; SOT-8; design.md §3.7–§3.9, §5, §6): StatusDot, ClassNames,
// ConfirmDialog, JoinStrip, JoinCard, ShareJoin and PresentJoin, with stand-ins for MUI, the QR code and the browser.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// MUI as plain elements, whose props the tests read; windows and menus show their content only while open.
const shown = ({ open, children }) => (open ? children : null);
const mui = { Dialog: shown, Menu: shown, Popover: shown };
for (const name of [
  'Alert',
  'Box',
  'Button',
  'ButtonBase',
  'DialogActions',
  'DialogContent',
  'DialogContentText',
  'DialogTitle',
  'ListItemIcon',
  'ListItemText',
  'MenuItem',
  'Paper',
  'Tooltip',
  'Typography',
])
  mui[name] = name;
const packages = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@mui/material': mui,
  '@mui/material/styles': { ThemeProvider: ({ children }) => children },
  'qrcode.react': { QRCodeSVG: 'QRCodeSVG', QRCodeCanvas: 'QRCodeCanvas' },
};

// The browser: this app at its own address, a clipboard that records, downloads that record, and window and document
// events that the tests fire themselves.
const ORIGIN = 'https://app.mysmartteach.com';
const record = { texts: [], images: [], downloads: [], shared: [], focused: [] };
const hub = () => {
  const listeners = {};
  return {
    addEventListener: (type, fn) => (listeners[type] ||= new Set()).add(fn),
    removeEventListener: (type, fn) => listeners[type]?.delete(fn),
    fire: (type, event = {}) => [...(listeners[type] || [])].forEach((fn) => fn({ preventDefault() {}, ...event })),
    count: (type) => listeners[type]?.size ?? 0,
  };
};
globalThis.window = Object.assign(hub(), { location: { origin: ORIGIN } });
const attributes = { 'data-theme-mode': 'light' };
globalThis.document = Object.assign(hub(), {
  documentElement: { getAttribute: (name) => attributes[name] ?? null, setAttribute: (n, v) => (attributes[n] = v) },
  activeElement: { focus: () => record.focused.push('opener') },
  fullscreenElement: null,
  exitFullscreen: async () => {},
  createElement: () => ({
    click() {
      record.downloads.push(this.download);
    },
  }),
});
Object.defineProperty(globalThis.navigator, 'clipboard', {
  configurable: true,
  value: { writeText: async (text) => record.texts.push(text), write: async (items) => record.images.push(...items) },
});
globalThis.ClipboardItem = class {
  constructor(data) {
    this.data = data;
  }
};

const bundle = await build({
  stdin: {
    contents: ['StatusDot', 'ClassNames', 'ConfirmDialog', 'JoinStrip', 'JoinCard', 'ShareJoin', 'PresentJoin']
      .map((part) => `export { default as ${part} } from './src/areas/quizzes/shared/${part}';`)
      .join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  logLevel: 'error',
  external: Object.keys(packages),
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /^@mui\/icons-material\/|(^|\/)theme\/theme$/ }, (args) => ({
          path: args.path,
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({
          contents: args.path.endsWith('theme/theme')
            ? 'export const getTheme = (mode) => ({ mode });'
            : `export default ${JSON.stringify(args.path.split('/').pop())};`,
        }));
      },
    },
  ],
});
const loaded = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)((id) => packages[id], loaded, loaded.exports);
const { StatusDot, ClassNames, ConfirmDialog, JoinStrip, JoinCard, ShareJoin, PresentJoin } = loaded.exports;

// The node for a ref: Present's frame, which can take focus and ask for full screen, and Share's QR canvas.
const nodeMock = (element) =>
  element.type === 'QRCodeCanvas'
    ? { toBlob: (done) => done(new Blob(['png'], { type: 'image/png' })) }
    : {
        focus: () => record.focused.push('present'),
        requestFullscreen: async () => record.focused.push('full screen'),
      };
async function render(element) {
  let view;
  await act(async () => {
    view = create(element, { createNodeMock: nodeMock });
  });
  return view;
}
// A node's text: a string, a rendered tree (an array when a part renders several roots) or a test instance.
const textOf = (node) => {
  if (typeof node === 'string') return node;
  if (node == null) return '';
  return (Array.isArray(node) ? node : node.children || []).map(textOf).join('');
};
const all = (view, type) => (view.root ?? view).findAll((node) => node.type === type);
const press = (node) => act(async () => node.props.onClick({ currentTarget: 'anchor' }));

test('StatusDot: the dot, the word and the tooltip; only Live now pulses; nothing for an unknown state', async () => {
  const live = await render(React.createElement(StatusDot, { state: 'live' }));
  assert.equal(all(live, 'Tooltip')[0].props.title, 'Running now');
  const dot = live.root.find((node) => node.props.className === 'mst-dot');
  assert.equal(dot.props['data-pulse'], 'true');
  assert.equal(dot.props.sx.width, 8);
  assert.equal(textOf(live.toJSON()), 'Live now');
  const draft = await render(React.createElement(StatusDot, { state: 'draft', tip: false }));
  assert.equal(all(draft, 'Tooltip').length, 0);
  assert.equal(draft.root.find((node) => node.props.className === 'mst-dot').props['data-pulse'], undefined);
  const homework = await render(
    React.createElement(StatusDot, { state: 'homework', deadline: new Date(2030, 10, 21) })
  );
  assert.equal(textOf(homework.toJSON()), 'Homework open · due Thu 21 Nov 2030');
  assert.equal((await render(React.createElement(StatusDot, { state: 'gone' }))).toJSON(), null);
});

test('ClassNames: "8B, 9C +1" with every name in its tooltip, or "No class yet"', async () => {
  const classes = ['8B', '9C', '10A'].map((name, i) => ({ id: `c${i}`, name }));
  const cut = await render(React.createElement(ClassNames, { classes }));
  assert.equal(all(cut, 'Tooltip')[0].props.title, '8B, 9C, 10A');
  assert.equal(textOf(cut.toJSON()), '8B, 9C +1');
  const none = await render(React.createElement(ClassNames, { classes: [] }));
  assert.equal(textOf(none.toJSON()), 'No class yet');
  assert.equal(none.toJSON().props.sx.color, 'var(--mst-ink-3)');
});

test('ConfirmDialog: the verb on the button, accent unless deleting, busy, its own error, and one more choice', async () => {
  const done = [];
  const finish = await render(
    React.createElement(
      ConfirmDialog,
      {
        open: true,
        title: 'Finish the quiz?',
        confirmLabel: 'Finish',
        cancelLabel: 'Keep going',
        onConfirm: () => done.push('finish'),
        onCancel: () => done.push('keep'),
      },
      '25 of 28 answered the last question. Results are saved.'
    )
  );
  const buttons = all(finish, 'Button');
  assert.deepEqual(
    buttons.map((b) => textOf(b)),
    ['Keep going', 'Finish']
  );
  assert.equal(buttons[1].props.color, 'primary');
  await press(buttons[1]);
  await press(buttons[0]);
  assert.deepEqual(done, ['finish', 'keep']);
  assert.match(textOf(finish.toJSON()), /Finish the quiz\?.*25 of 28 answered/);
  const remove = await render(
    React.createElement(ConfirmDialog, {
      open: true,
      title: 'Delete 3 quizzes?',
      confirmLabel: 'Delete 3 quizzes',
      tone: 'bad',
      busy: true,
      busyLabel: 'Deleting…',
      error: 'Year 9 Cells is running, so nothing was deleted.',
      extraAction: { label: 'Archive instead', onClick() {} },
    })
  );
  const choices = all(remove, 'Button');
  assert.deepEqual(
    choices.map((b) => textOf(b)),
    ['Cancel', 'Archive instead', 'Deleting…']
  );
  assert.ok(choices.every((b) => b.props.disabled));
  assert.equal(choices[2].props.color, 'error');
  assert.equal(textOf(all(remove, 'Alert')[0]), 'Year 9 Cells is running, so nothing was deleted.');
  assert.equal((await render(React.createElement(ConfirmDialog, { open: false, title: 'x' }))).toJSON(), null);
});

test('JoinStrip: the line during questions, "Join code", the code that copies on a click, and the page buttons', async () => {
  record.texts.length = 0;
  const strip = await render(React.createElement(JoinStrip, { code: 'ncfl38', actions: 'Present' }));
  assert.equal(textOf(strip.toJSON()), 'Join codeNCFL38Present', 'the code has its label (Phase 1.47 R3)');
  assert.equal(all(strip, 'QRCodeSVG').length, 0);
  const code = all(strip, 'ButtonBase').find((b) => b.props['aria-label'] === 'Copy the code NCFL38');
  await press(code);
  assert.deepEqual(record.texts, ['NCFL38']);
  assert.equal(textOf(code), 'Copied ✓');
  assert.equal(textOf(strip.root.find((node) => node.props.role === 'status')), 'Copied ✓');
});

test('JoinCard (Phase 1.47 R3): the address, the code with a visible Copy, the QR, and a click opens the board', async () => {
  record.texts.length = 0;
  const opened = [];
  const event = { stopPropagation() {}, currentTarget: 'anchor' };
  const card = await render(
    React.createElement(JoinCard, { code: 'ncfl38', onBoard: () => opened.push('board'), status: 'Reconnecting…' })
  );
  assert.match(
    textOf(card.toJSON()),
    /^Pupils join atReconnecting…app\.mysmartteach\.com\/joinNCFL38Show on the board$/,
    'the label (with the status beside it), the address, the code, and the bottom line'
  );
  const [qr] = all(card, 'QRCodeSVG');
  assert.equal(qr.props.value, `${ORIGIN}/join/NCFL38`);
  assert.equal(qr.props.size, 112);
  // Copy is a visible button with its tooltip; "Copied ✓" takes its place, and copying never opens the board.
  const copy = all(card, 'ButtonBase').find((b) => b.props['aria-label'] === 'Copy code NCFL38');
  assert.equal(all(card, 'Tooltip')[0].props.title, 'Copy code');
  await act(async () => copy.props.onClick(event));
  assert.deepEqual(record.texts, ['NCFL38']);
  assert.equal(textOf(copy), 'Copied ✓');
  assert.equal(textOf(card.root.find((node) => node.props.role === 'status')), 'Copied ✓');
  assert.deepEqual(opened, []);
  // A click anywhere on the card, or on "Show on the board" (a real button, for the keyboard), opens the board.
  const frame = card.root.find((node) => node.props['data-mst'] === 'join-card');
  assert.equal(frame.props.sx.cursor, 'pointer');
  await act(async () => frame.props.onClick(event));
  await act(async () =>
    all(card, 'ButtonBase')
      .find((b) => textOf(b) === 'Show on the board')
      .props.onClick(event)
  );
  assert.deepEqual(opened, ['board', 'board']);
  // Homework: its due line instead, the card itself does nothing, and the QR code opens bigger.
  const homework = await render(React.createElement(JoinCard, { code: 'hw4k2p', due: new Date(2030, 10, 20, 17, 0) }));
  assert.equal(
    textOf(homework.toJSON()),
    "Pupils join atapp.mysmartteach.com/joinHW4K2PDue Wed 20 Nov 2030, 17:00 · Pupils can't open it after this"
  );
  const plain = homework.root.find((node) => node.props['data-mst'] === 'join-card');
  assert.equal(plain.props.onClick, undefined);
  assert.equal(plain.props.sx.cursor, undefined);
  await press(all(homework, 'ButtonBase').find((b) => b.props['aria-label'] === 'Show the QR code bigger'));
  assert.deepEqual(
    all(homework, 'QRCodeSVG').map((q) => q.props.size),
    [112, 240]
  );
});

test('ShareJoin: copy invite and link ("Copied ✓" in place), copy the QR image, download it, and the share sheet', async () => {
  record.texts.length = 0;
  const share = await render(React.createElement(ShareJoin, { code: 'NCFL38', title: 'Year 9 Cells' }));
  assert.equal(textOf(all(share, 'Button')[0]), 'Share');
  await press(all(share, 'Button')[0]);
  const item = (key) => all(share, 'MenuItem').find((node) => node.props['data-share'] === key);
  assert.deepEqual(
    all(share, 'MenuItem').map((node) => node.props['data-share']),
    ['invite', 'link', 'qr', 'download']
  );
  await press(item('invite'));
  assert.equal(
    record.texts.at(-1),
    'Join my quiz "Year 9 Cells": go to app.mysmartteach.com/join and type NCFL38, or open https://app.mysmartteach.com/join/NCFL38'
  );
  assert.equal(all(item('invite'), 'ListItemText')[0].props.primary, 'Copied ✓');
  assert.equal(all(item('link'), 'ListItemText')[0].props.primary, 'Copy link');
  assert.equal(textOf(share.root.find((node) => node.props.role === 'status')), 'Copied ✓'); // for screen readers
  await press(item('link'));
  assert.equal(record.texts.at(-1), `${ORIGIN}/join/NCFL38`);
  await press(item('qr'));
  const blob = await record.images.at(-1).data['image/png'];
  assert.equal(blob.type, 'image/png');
  assert.equal(all(share, 'QRCodeCanvas')[0].props.value, `${ORIGIN}/join/NCFL38`);
  await press(item('download'));
  assert.deepEqual(record.downloads, ['join-NCFL38.png']);
  // Where the device has a share sheet, More… opens it with the invite and the link.
  navigator.share = async (data) => record.shared.push(data);
  const sheet = await render(
    React.createElement(ShareJoin, { code: 'NCFL38', title: 'Year 9 Cells', due: new Date(2030, 10, 20, 17, 0) })
  );
  await press(all(sheet, 'Button')[0]);
  await press(all(sheet, 'MenuItem').find((node) => node.props['data-share'] === 'more'));
  assert.equal(record.shared[0].url, `${ORIGIN}/join/NCFL38`);
  assert.match(record.shared[0].text, /\nDue Wed 20 Nov 2030, 17:00\.$/);
  delete navigator.share;
});

test('PresentJoin: dark and full screen, Esc and leaving full screen close it, Space presses the main button', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const props = { code: 'ncfl38', onClose: () => calls.push('close'), onMain: () => calls.push('main') };
  const present = await render(React.createElement(PresentJoin, { ...props, open: true }));
  assert.equal(attributes['data-theme-mode'], 'dark');
  assert.deepEqual(record.focused.splice(0), ['present', 'full screen']);
  assert.match(textOf(present.toJSON()), /Join at app\.mysmartteach\.com\/joinType the codeNCFL38/);
  assert.equal(all(present, 'QRCodeSVG')[0].props.size, 360);
  assert.equal(all(present, 'QRCodeSVG')[0].props.value, `${ORIGIN}/join/NCFL38`);
  // The control bar hides after 3 s, and a move of the mouse brings it back.
  const bar = () => present.root.find((node) => node.props['data-mst'] === 'present-bar');
  await act(async () => t.mock.timers.tick(3000));
  assert.equal(bar().props.sx.opacity, 0);
  await act(async () => window.fire('mousemove'));
  assert.equal(bar().props.sx.opacity, 1);
  await act(async () => window.fire('keydown', { key: ' ', target: { closest: () => null } }));
  await act(async () => window.fire('keydown', { key: ' ', target: { closest: () => ({ tagName: 'BUTTON' }) } }));
  await act(async () => window.fire('keydown', { key: 'Escape', target: { closest: () => null } }));
  await act(async () => document.fire('fullscreenchange'));
  assert.deepEqual(calls, ['main', 'close', 'close']);
  // Closed: the teacher's theme and focus come back, and nothing listens any more.
  await act(async () => present.update(React.createElement(PresentJoin, { ...props, open: false })));
  assert.equal(present.toJSON(), null);
  assert.equal(attributes['data-theme-mode'], 'light');
  assert.deepEqual(record.focused.splice(0), ['opener']);
  assert.equal(window.count('keydown') + window.count('mousemove') + document.count('fullscreenchange'), 0);
  // Once the quiz runs, the page's own view replaces the joining details.
  const running = await render(React.createElement(PresentJoin, { ...props, open: true }, 'Question 3 of 12'));
  assert.match(textOf(running.toJSON()), /^Question 3 of 12Exit Present$/);
  await act(async () => running.unmount());
});
