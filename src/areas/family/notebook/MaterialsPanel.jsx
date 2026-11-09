// The Notebook's Materials (Phase 1.38 design §4.8): what the answers use, ticked for this chat, each with View (today's
// reader), then Add a worksheet and Choose a topic, and the saved explanations under them.
// Area: family

import { useId } from 'react';
import { Checkbox } from '@mui/material';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import FamilySource from '../FamilySource';
import { materialMeta, materialState } from './notebookWords';
import SavedExplanations from './SavedExplanations';

/**
 * `sources` are the child's materials, named, without homework photos (they're in Homework); `selectedIds` the ones the
 * chat uses. `onToggle(id, checked)` changes the chat's materials; `onQuiz(ids, options)` makes a quiz on one (the
 * reader passes `{ replace: true }`, so the make dialog takes its place).
 */
export default function MaterialsPanel({
  child,
  sources,
  selectedIds,
  chatBusy,
  onToggle,
  onQuiz,
  onUpload,
  onPickTopic,
}) {
  const heading = useId();
  return (
    <>
      <section className="fam-nb-sec fam-nb-mats" aria-labelledby={heading}>
        <h2 id={heading} className="fam-nb-h2">
          Materials
        </h2>
        <p className="fam-nb-lead">Worksheets and notes the answers use. Untick any you don’t want used.</p>
        {sources.length > 0 && (
          <ul className="fam-nb-mat-list">
            {sources.map((item) => {
              const state = materialState(item.indexing);
              return (
                <li key={item.id} className="fam-nb-mat">
                  <Checkbox
                    size="small"
                    disabled={chatBusy}
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) => onToggle(item.id, e.target.checked)}
                    inputProps={{ 'aria-label': `Use ${item.title} in the chat` }}
                  />
                  <span className="fam-nb-mat-text">
                    <span className="fam-nb-mat-name" title={item.title}>
                      {item.title}
                    </span>
                    <span className="fam-nb-mat-meta">{materialMeta(item)}</span>
                    {state && (
                      <span className="fam-nb-mat-meta" role="status">
                        {state}
                      </span>
                    )}
                  </span>
                  <FamilySource
                    childId={child.id}
                    source={item}
                    label="View"
                    onQuiz={(options) => onQuiz([item.id], options)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="fam-nb-add" onClick={onUpload} data-mst="family-upload">
          <AddPhotoAlternateOutlined aria-hidden />
          <span className="fam-nb-add-text">
            <span className="fam-nb-add-name">Add a worksheet</span>
            <span className="fam-nb-add-line">For the AI assistant to read. It isn’t marked.</span>
          </span>
        </button>
        <button type="button" className="fam-nb-add" onClick={onPickTopic} data-mst="family-pick-topic">
          <MenuBookOutlined aria-hidden />
          <span className="fam-nb-add-text">
            <span className="fam-nb-add-name">Choose a topic</span>
            <span className="fam-nb-add-line">Ready-made notes for {child.gradeLevel || 'every year'}</span>
          </span>
        </button>
      </section>
      <SavedExplanations childId={child.id} />
    </>
  );
}
