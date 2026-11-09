const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { createRequire } = require('module');
const requireProduct = createRequire(path.join(__dirname, '../package.json'));
const React = requireProduct('react'),
  Renderer = requireProduct('react-test-renderer'),
  esbuild = requireProduct('esbuild');
const { act } = Renderer;
let resolveDownload;
let downloads = 0;
// The family service's file download, which the reader calls (Phase 1.37, S2.2).
const familyApi = {
  materialFile: () => {
    downloads += 1;
    return new Promise((resolve) => (resolveDownload = resolve));
  },
};
const mui = {};
// The reader opens from the address (Phase 1.37, S2.6); here a plain state stands in for useDialogParam.
const useDialogParam = () => {
  const [open, setOpen] = React.useState(false);
  return [open, () => setOpen(true), () => setOpen(false)];
};
for (const name of ['Alert', 'Button', 'CircularProgress', 'Dialog', 'Typography']) mui[name] = name;
const raw = fs.readFileSync(path.join(__dirname, '../src/areas/family/FamilySource.jsx'), 'utf8');
const compiled = esbuild.transformSync(raw, {
  loader: 'jsx',
  format: 'cjs',
}).code;
const moduleMock = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (id) =>
    id === 'react'
      ? React
      : id === '@mui/material'
        ? mui
        : id.startsWith('@mui/icons-material') || id.includes('MathText')
          ? () => null
          : id.endsWith('.css')
            ? {}
            : id.includes('familyApi')
              ? { familyApi }
              : id.includes('useDialogParam')
                ? { __esModule: true, default: useDialogParam }
                : requireProduct(id),
  moduleMock,
  moduleMock.exports
);
const Component = moduleMock.exports.default;
const source = {
  id: 'review',
  title: 'Two books',
  files: [
    { name: 'A.pdf', mime: 'application/pdf', pages: 2 },
    { name: 'B.pdf', mime: 'application/pdf', pages: 2 },
  ],
};
// The reader of Phase 1.38 design §10.4: one page at a time, Previous and Next page, Close as the one exit.
test('closing the reader during a download, then reopening it, starts afresh at page 1', async () => {
  let view;
  await act(async () => {
    view = Renderer.create(React.createElement(Component, { childId: 'test', source, label: 'Read notes' }));
  });
  const button = (text) => view.root.findAllByType('Button').find((x) => x.props.children === text);
  const text = (className) => view.root.findAll((x) => x.props.className === className)[0];
  await act(async () => button('Read notes').props.onClick());
  if (downloads !== 1) throw Error(`Opening the reader should download page 1 once, not ${downloads} times`);
  // Page 2 is asked for while page 1 is still downloading; then the reader closes before either arrives.
  await act(async () => button('Next page').props.onClick());
  await act(async () => button('Close').props.onClick());
  await act(async () => {
    resolveDownload(new Blob(['sample']));
    await Promise.resolve();
  });
  if (view.root.findAllByType('iframe').length) throw Error('A download cancelled by Close was shown');
  // Reopening starts at page 1 again, with a fresh download and working buttons.
  await act(async () => button('Read notes').props.onClick());
  if (downloads !== 3) throw Error(`Reopening should download page 1 afresh (${downloads} downloads)`);
  const progress = text('fam-viewer-progress');
  if (!progress || progress.children.join('') !== 'Page 1 of 2') throw Error('The reader did not reopen at page 1');
  if (button('Previous page').props.disabled !== true || button('Next page').props.disabled)
    throw Error('Reader controls did not reset after cancellation');
  await act(async () => view.unmount());
});
