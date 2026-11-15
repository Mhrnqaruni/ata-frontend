// The quiz list's menus and windows, one open at a time (design.md §3.1, §3.10): a row's ⋯ menu (whose run items open
// the Start window), the tag menu, Change name (the shared rename window), Make a copy, Delete and Manage tags.
// Area: quizzes

import { useMemo } from 'react';
import RenameActivityDialog from '../../../components/common/RenameActivityDialog';
import { useAuth } from '../../../hooks/useAuth';
import CopyDialog from './CopyDialog';
import DeleteDialog from './DeleteDialog';
import ManageTags from './ManageTags';
import RowMenu from './RowMenu';
import TagMenu from './TagMenu';
import { renameInLibrary } from './queries';
import { LIBRARY } from './words';

// The menu's run and page items, as the list's openers name them (useQuizOpeners): Run again…, Start… and Send… open
// the Start window; Continue editing and Edit questions the editor; Results the results.
const OPENERS = { again: 'start', start: 'start', continue: 'edit', edit: 'edit', results: 'results' };

// open: { kind: 'menu' | 'tags' | 'rename' | 'copy' | 'delete' | 'manageTags', quizzes, anchor }, or null; the quizzes
// are as they were when it opened. rows: the rows shown, so the tag menu's ticks follow each change. actions: the
// list's (useLibraryActions); onAction(action, quiz): the list's openers; onCopied(copyId); onDeleted();
// onTagGone(tagId, intoId?); toast(message).
export default function LibraryDialogs(props) {
  const { open, setOpen, rows, tags, actions, onAction, onCopied, onDeleted, onTagGone, toast } = props;
  const { user } = useAuth();
  const kind = open?.kind;
  const quizzes = open?.quizzes || [];
  const quiz = quizzes[0];
  const close = () => setOpen(null);
  // The tag menu shows the rows as they are now, so a tick turns as soon as the list refreshes.
  const fresh = quizzes.map((item) => rows.find((row) => row.id === item.id) || item);
  // The rename window resets its field whenever its item changes, so the item only changes with the quiz.
  const renameId = kind === 'rename' ? quiz?.id : undefined;
  const renameTitle = kind === 'rename' ? quiz?.title : undefined;
  const renameItem = useMemo(
    () => (renameId ? { kind: 'quiz', id: renameId, name: renameTitle } : null),
    [renameId, renameTitle]
  );

  const pick = (action) => {
    if (OPENERS[action]) {
      close();
      return onAction(OPENERS[action], quiz);
    }
    if (action === 'archive') actions.archive([quiz]);
    if (action === 'unarchive') actions.unarchive([quiz]);
    const next = { rename: 'rename', copy: 'copy', tags: 'tags', delete: 'delete' }[action];
    return setOpen(next ? { ...open, kind: next } : null);
  };

  return (
    <>
      <RowMenu anchor={kind === 'menu' ? open.anchor : null} quiz={quiz} onClose={close} onPick={pick} />
      <TagMenu
        anchor={kind === 'tags' ? open.anchor : null}
        quizzes={kind === 'tags' ? fresh : []}
        tags={tags}
        busy={actions.busy}
        onClose={close}
        onToggle={(tag) => actions.toggleTag(tag, fresh)}
        onMake={(name) => actions.makeTag(name, fresh)}
      />
      {/* The window hands the new name to onSaved before it closes, so the row shows it as the window closes (X3);
          the refresh every rename starts then confirms it. */}
      <RenameActivityDialog
        item={renameItem}
        onClose={close}
        onSaved={(name) => {
          if (name) renameInLibrary(user?.id, renameId, name);
          toast(LIBRARY.renamed);
        }}
      />
      {kind === 'copy' && quiz ? (
        <CopyDialog
          key={quiz.id}
          quiz={quiz}
          onClose={close}
          onCopied={(copyId) => {
            close();
            toast(LIBRARY.copied);
            onCopied(copyId);
          }}
        />
      ) : null}
      <DeleteDialog
        quizzes={kind === 'delete' ? quizzes : []}
        busy={actions.busy}
        onDelete={async () => {
          const problem = await actions.remove(quizzes);
          if (problem === '') onDeleted();
          return problem;
        }}
        onArchive={async () => {
          if (await actions.archive(quizzes)) onDeleted();
          close();
        }}
        onClose={close}
      />
      <ManageTags open={kind === 'manageTags'} tags={tags} onClose={close} onGone={onTagGone} toast={toast} />
    </>
  );
}
