// The quiz list's actions on one quiz or many (SOT-3 to SOT-5): archive and unarchive with Undo, delete, and adding
// or taking off a tag, each one request through the bulk route, leaving its message. A failure says why.
// Area: quizzes

import { useRef, useState } from 'react';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { bulk, createTag } from './api';
import { tagState } from './rows';
import { LIBRARY } from './words';

const idsOf = (quizzes) => quizzes.map((quiz) => quiz.id);

// toast(message, undo?): the list's message. Each action resolves true when it worked; one runs at a time.
export function useLibraryActions(toast) {
  const { showSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const running = useRef(false); // a double click never sends twice

  const guarded = async (work) => {
    if (running.current) return undefined;
    running.current = true;
    setBusy(true);
    try {
      return await work();
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  // Runs an action; a failure shows the API's sentence in the app's message, with its reference.
  const run = (work) =>
    guarded(async () => {
      try {
        await work();
        return true;
      } catch (error) {
        showSnackbar(error.message, 'error', error.reference);
        return false;
      }
    });

  // Archive (or unarchive) the quizzes; Undo puts them back as they were (SOT-4: archiving only hides a quiz).
  const setArchived = (quizzes, archived) =>
    run(async () => {
      const ids = idsOf(quizzes);
      await bulk(archived ? 'archive' : 'unarchive', ids);
      const back = () =>
        run(async () => {
          await bulk(archived ? 'unarchive' : 'archive', ids);
          toast(archived ? LIBRARY.unarchived(ids.length) : LIBRARY.archived(ids.length));
        });
      toast(archived ? LIBRARY.archived(ids.length) : LIBRARY.unarchived(ids.length), back);
    });

  // Delete the quizzes, all or none. Resolves '' when done, or { text, refused } for the delete window: the sentence it
  // shows, and whether the API refused because some are still running (SOT-5's 409 names them), which no retry fixes.
  const remove = (quizzes) =>
    guarded(async () => {
      try {
        await bulk('delete', idsOf(quizzes));
        toast(LIBRARY.deleted(quizzes.length));
        return '';
      } catch (error) {
        const titles = error.status === 409 ? error.data?.titles : null;
        return titles?.length ? { text: LIBRARY.stillRunning(titles), refused: true } : { text: error.message };
      }
    });

  // A tag every chosen quiz has comes off them all; otherwise it's added to those without it.
  const toggleTag = (tag, quizzes) =>
    run(async () => {
      const off = tagState(tag.id, quizzes) === 'all';
      const { changed } = await bulk(off ? 'remove_tags' : 'add_tags', idsOf(quizzes), [tag.id]);
      toast(off ? LIBRARY.tagRemoved(tag.name, changed) : LIBRARY.tagAdded(tag.name, changed));
    });

  // Make a tag (or take the teacher's own of that name, in any case), then add it to the chosen quizzes.
  const makeTag = (name, quizzes) =>
    run(async () => {
      const tag = await createTag(name);
      const { changed } = await bulk('add_tags', idsOf(quizzes), [tag.id]);
      toast(LIBRARY.tagAdded(tag.name, changed));
    });

  return {
    busy,
    archive: (quizzes) => setArchived(quizzes, true),
    unarchive: (quizzes) => setArchived(quizzes, false),
    remove,
    toggleTag,
    makeTag,
  };
}
