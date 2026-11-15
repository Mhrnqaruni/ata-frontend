// The quiz editor's state and saving (Phase 1.46, SOT-1.3, SOT-11): load the quiz, change it, autosave a draft after
// 2 s of quiet once it has a title, save a quiz that isn't a draft on request after the full checks, add pictures.
// Area: quizzes

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { getQuiz, saveQuiz, uploadPicture } from './api';
import { quizProblems } from './draft';
import { audienceFrom, idsByKey, initialState, newQuiz, payloadOf, quizFrom, reduce } from './editorState';

export const AUTOSAVE_MS = 2000;
export const PICTURE_MAX_BYTES = 5 * 1024 * 1024; // the server's limit

// The new quiz's own address, without telling the router: it would play the page's entrance again while the teacher
// types. A reload or Back then opens the quiz from its address.
const showAddress = (quizId) => window.history.replaceState(window.history.state, '', `/quizzes/${quizId}/edit`);

export default function useEditor(quizId) {
  const [state, dispatch] = useReducer(reduce, quizId, (id) => initialState(id ? null : newQuiz()));
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [save, setSave] = useState({ phase: 'idle', at: null, error: null });
  const latest = useRef(state);
  // What the server has, known at once (the state follows on the next render): the version saved, and each
  // question's saved id by its key, which a picture needs.
  const savedVersion = useRef(0);
  const savedIds = useRef({});
  const busy = useRef(null); // the save or picture upload going on, which the next one waits for

  useLayoutEffect(() => {
    latest.current = state;
    savedVersion.current = Math.max(savedVersion.current, state.savedVersion);
  });

  useEffect(() => {
    if (!quizId) return undefined;
    const controller = new AbortController();
    getQuiz(quizId, { signal: controller.signal })
      .then((data) => {
        const loaded = quizFrom(data);
        savedIds.current = Object.fromEntries(loaded.questions.map((question) => [question.key, question.id]));
        dispatch({ type: 'load', quiz: loaded });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error);
      });
    return () => controller.abort();
  }, [quizId, attempt]);

  const reload = useCallback(() => {
    setLoadError(null);
    setAttempt((count) => count + 1);
  }, []);

  // Runs one save or upload at a time: each waits for the one before, so a picture never goes to a question that a
  // save has just replaced.
  const exclusive = useCallback(async (work) => {
    while (busy.current) await busy.current;
    const run = work();
    busy.current = run;
    try {
      return await run;
    } finally {
      busy.current = null;
    }
  }, []);

  // Saves the quiz now, after the checks its status needs: a draft is held only by its title (and a post quiz's link);
  // any other quiz needs every question finished (SOT-1.3). Resolves to { ok, ids } or { ok: false, problems | error }.
  const saveNow = useCallback(
    () =>
      exclusive(async () => {
        const { quiz, version } = latest.current;
        if (quiz.id && version <= savedVersion.current) return { ok: true, ids: {} };
        const problems = quizProblems(quiz, { draft: quiz.status === 'draft' });
        if (problems.length) return { ok: false, problems };
        const keys = quiz.questions.map((question) => question.key);
        setSave((now) => ({ ...now, phase: 'saving', error: null }));
        try {
          const data = await saveQuiz(quiz.id, payloadOf(quiz));
          const ids = idsByKey(keys, data.questions);
          savedVersion.current = Math.max(savedVersion.current, version);
          savedIds.current = ids;
          dispatch({ type: 'saved', id: data.id, ids, version, audience: audienceFrom(data) });
          if (!quiz.id) showAddress(data.id);
          setSave({ phase: 'saved', at: Date.now(), error: null });
          return { ok: true, ids, data };
        } catch (error) {
          setSave({ phase: 'failed', at: null, error });
          return { ok: false, error };
        }
      }),
    [exclusive]
  );

  const { quiz, version } = state;
  const changed = version > state.savedVersion;
  const autosave = Boolean(quiz && quiz.status === 'draft' && quiz.title.trim() && changed);
  useEffect(() => {
    if (!autosave) return undefined;
    const timer = setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [autosave, version, saveNow]);

  // Leaving the page another way, such as the sidebar, still saves a draft's last changes.
  const saveOnLeaving = useCallback(() => {
    const { quiz: last, version: now } = latest.current;
    if (last?.status === 'draft' && last.title.trim() && now > savedVersion.current) void saveNow();
  }, [saveNow]);
  useEffect(() => saveOnLeaving, [saveOnLeaving]);

  // Leaving with unsaved work asks first.
  const unsaved = Boolean(quiz && (changed || save.phase === 'saving'));
  useEffect(() => {
    if (!unsaved) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // A question's picture, stored against its saved id: the quiz is saved first if it has changes, then the picture
  // goes to the question's id as that save left it.
  const addPicture = useCallback(
    async (key, file) => {
      if (file.size > PICTURE_MAX_BYTES) return { ok: false, error: new Error('Pictures can be up to 5 MB.') };
      const result = await saveNow();
      if (!result.ok) return result;
      return exclusive(async () => {
        const questionId = savedIds.current[key];
        if (!questionId) return { ok: false, error: new Error("Couldn't save the question. Try again.") };
        try {
          const data = await uploadPicture(questionId, file);
          dispatch({ type: 'question', key, patch: { media_url: data.media_url }, alreadySaved: true });
          return { ok: true };
        } catch (error) {
          return { ok: false, error };
        }
      });
    },
    [exclusive, saveNow]
  );

  return { quiz, loadError, reload, dispatch, save, saveNow, changed, addPicture };
}
