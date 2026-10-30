const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { createRequire } = require("module");
const requireProduct = createRequire(path.join(__dirname, "../package.json"));
const React = requireProduct("react"),
  Renderer = requireProduct("react-test-renderer"),
  esbuild = requireProduct("esbuild");
const { act } = Renderer;
let resolveDownload;
const api = {
  get: () => new Promise((resolve) => (resolveDownload = resolve)),
};
const mui = { useMediaQuery: () => false };
for (const name of [
  "Alert",
  "Box",
  "Button",
  "CircularProgress",
  "Dialog",
  "DialogActions",
  "DialogContent",
  "DialogTitle",
  "Typography",
])
  mui[name] = name;
const raw = fs.readFileSync(
  path.join(__dirname, "../src/pages/family/FamilySource.jsx"),
  "utf8",
);
const compiled = esbuild.transformSync(raw, {
  loader: "jsx",
  format: "cjs",
}).code;
const moduleMock = { exports: {} };
new Function("require", "module", "exports", compiled)(
  (id) =>
    id === "react"
      ? React
      : id === "@mui/material"
        ? mui
        : id.includes("MathText")
          ? () => null
          : id.includes("services/api")
            ? api
            : requireProduct(id),
  moduleMock,
  moduleMock.exports,
);
const Component = moduleMock.exports.default;
const source = {
  id: "review",
  title: "Two books",
  files: [
    { name: "A.pdf", mime: "application/pdf", pages: 2 },
    { name: "B.pdf", mime: "application/pdf", pages: 2 },
  ],
};
test("closing a pending multi-file reader permits reopening both files", async () => {
  let view;
  await act(async () => {
    view = Renderer.create(
      React.createElement(Component, { base: "/test", source }),
    );
  });
  const read = () =>
    view.root
      .findAllByType("Button")
      .find((x) => x.props.children === "Read notes");
  await act(async () => read().props.onClick());
  const files = () =>
    view.root
      .findAllByType("Button")
      .filter((x) => x.props.variant === "outlined");
  await act(async () => {
    files()[0].props.onClick();
  });
  await act(async () =>
    view.root
      .findAllByType("Button")
      .find((x) => x.props.children === "Close")
      .props.onClick(),
  );
  await act(async () => {
    resolveDownload({ data: new Blob(["sample"]) });
    await Promise.resolve();
  });
  await act(async () => read().props.onClick());
  if (files().some((x) => x.props.disabled))
    throw Error("Reader controls remained disabled after cancellation");

  await act(async () => view.unmount());
});
