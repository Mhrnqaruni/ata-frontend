// The editor's bottom bar (design.md §3.0, item 5): glass 2, held at the bottom of the window, with the step's way
// back on the left and its way on to the right. The page leaves room for it, so nothing hides under it (P5).
// Area: quizzes

export default function BottomBar({ start, end }) {
  return (
    <div className="mst-builder-foot mst-qe-bar" data-mst="editor-bar">
      <div className="mst-qe-bar-side">{start}</div>
      <div className="mst-qe-bar-side">{end}</div>
    </div>
  );
}
