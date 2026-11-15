// A quiz's tags in the editor (Phase 1.46, SOT-3; design.md §3.2): loaded once for a saved quiz, and saved on their
// own route as soon as they change, or as soon as a new quiz has been made.
// Area: quizzes

import { useCallback, useEffect, useRef, useState } from 'react';
import { setQuizTags, tagsOf } from './api';

// openedId: the quiz the page opened with (none for a new quiz); quiz: the editor's quiz, once it's loaded.
export default function useTags(openedId, quiz) {
  const [tags, setTags] = useState([]);
  const [state, setState] = useState(openedId ? 'loading' : 'ready');
  const [error, setError] = useState('');
  const latest = useRef(tags);
  const waiting = useRef(false); // tags chosen before the quiz had been saved
  const asked = useRef(false);
  const quizId = quiz?.id;

  useEffect(() => {
    latest.current = tags;
  });

  // The library is the one read with a quiz's tags, found by the quiz's saved title (api.js tagsOf).
  useEffect(() => {
    if (!openedId || !quiz || asked.current) return;
    asked.current = true;
    tagsOf(openedId, quiz.title)
      .then((found) => {
        setTags(found);
        setState('ready');
      })
      .catch(() => setState('failed'));
  }, [openedId, quiz]);

  const save = useCallback(async (id, next, before) => {
    try {
      setError('');
      await setQuizTags(
        id,
        next.map((tag) => tag.id)
      );
    } catch (failure) {
      setTags(before);
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    if (!quizId || !waiting.current) return;
    waiting.current = false;
    void save(quizId, latest.current, []);
  }, [quizId, save]);

  const change = useCallback(
    (next) => {
      const before = latest.current;
      setTags(next);
      if (quizId) void save(quizId, next, before);
      else waiting.current = true;
    },
    [quizId, save]
  );

  return { tags, state, error, change };
}
