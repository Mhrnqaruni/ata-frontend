// "Before and after a topic", in More options (design.md §3.5; C5): just this quiz, a 'before' quiz, or an 'after'
// quiz that follows a 'before' quiz already run, taking its classes and mode so the two compare (crud.py's rules).
// Area: quizzes

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Skeleton,
} from '@mui/material';
import { beforeQuizzes, getQuiz } from './api';
import { audienceFrom, modeOf } from './editorState';
import { useAudienceNames } from './queries';
import { SETTINGS } from './words';

// The 'before' quizzes that have been run, in both modes: the 'after' quiz takes the mode of the one chosen.
function useBeforeQuizzes(open) {
  const [state, setState] = useState({ items: null, error: '' });
  useEffect(() => {
    if (!open) return undefined;
    let current = true;
    setState({ items: null, error: '' });
    Promise.all([beforeQuizzes({ mode: 'live' }), beforeQuizzes({ mode: 'self_paced' })])
      .then(([live, homework]) => current && setState({ items: [...live, ...homework], error: '' }))
      .catch((failure) => current && setState({ items: [], error: failure.message }));
    return () => {
      current = false;
    };
  }, [open]);
  return state;
}

function BeforeRow({ quiz, onChoose }) {
  const names = useAudienceNames(audienceFrom(quiz));
  const classes = [...names.classes, ...names.groups].join(', ');
  return (
    <li className="mst-qe-before">
      <span className="mst-qe-before-text">
        <span className="mst-qe-before-title">{quiz.display_title || quiz.title}</span>
        <span className="mst-qe-before-facts">
          {[SETTINGS.beforeQuestions(quiz.question_count ?? 0), classes].filter(Boolean).join(' · ')}
        </span>
      </span>
      <Button variant="outlined" size="small" onClick={() => onChoose(quiz)}>
        {SETTINGS.choose}
      </Button>
    </li>
  );
}

// The linked 'before' quiz's title, looked up once for an 'after' quiz that was opened with its link.
function useLinkedTitle(linkedQuizId, known) {
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (!linkedQuizId || known) return undefined;
    let current = true;
    getQuiz(linkedQuizId)
      .then((quiz) => current && setTitle(quiz.display_title || quiz.title))
      .catch(() => current && setTitle(''));
    return () => {
      current = false;
    };
  }, [linkedQuizId, known]);
  return known || title;
}

// onPair(fields, mode): the quiz's phase and link, and for an 'after' quiz the classes and mode it takes.
export default function BeforeAfter({ quiz, onPair }) {
  const [picking, setPicking] = useState(false);
  const [linkedTitle, setLinkedTitle] = useState('');
  const { items, error } = useBeforeQuizzes(picking);
  const title = useLinkedTitle(quiz.linkedQuizId, linkedTitle);
  const locked = Boolean(quiz.id && quiz.quizPhase === 'post' && quiz.linkedQuizId);

  const choose = (pre) => {
    setPicking(false);
    setLinkedTitle(pre.display_title || pre.title);
    onPair(
      { quizPhase: 'post', linkedQuizId: pre.id, audience: audienceFrom(pre), classId: pre.class_id ?? null },
      modeOf(pre.settings)
    );
  };

  return (
    <div className="mst-qe-pair">
      <div className="mst-qe-label" id="mst-qe-pair-label">
        {SETTINGS.pair}
      </div>
      <RadioGroup
        aria-labelledby="mst-qe-pair-label"
        value={quiz.quizPhase}
        onChange={(event) => {
          const phase = event.target.value;
          if (phase === 'post') setPicking(true);
          else onPair({ quizPhase: phase, linkedQuizId: null });
        }}
      >
        {Object.entries(SETTINGS.pairs).map(([phase, words]) => (
          <div className="mst-qe-pair-choice" key={phase}>
            <FormControlLabel
              value={phase}
              control={<Radio />}
              label={words.label}
              disabled={locked && phase !== 'post'}
            />
            <p className="mst-qe-help">{words.line}</p>
            {phase === 'post' && quiz.quizPhase === 'post' ? (
              <div className="mst-qe-pair-link">
                {quiz.linkedQuizId ? <span>{SETTINGS.follows(title || '…')}</span> : null}
                {locked ? null : (
                  <Button size="small" onClick={() => setPicking(true)}>
                    {quiz.linkedQuizId ? SETTINGS.changeBefore : SETTINGS.pickBefore}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </RadioGroup>
      {locked ? <p className="mst-qe-help">{SETTINGS.pairLocked}</p> : null}

      <Dialog open={picking} onClose={() => setPicking(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{SETTINGS.beforeTitle}</DialogTitle>
        <DialogContent>
          <p className="mst-qe-help" style={{ marginTop: 0 }}>
            {SETTINGS.beforeRule}
          </p>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {items === null ? (
            Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height={56} />)
          ) : items.length ? (
            <ul className="mst-qe-before-list">
              {items.map((pre) => (
                <BeforeRow key={pre.id} quiz={pre} onChoose={choose} />
              ))}
            </ul>
          ) : error ? null : (
            <p className="mst-qe-help">{SETTINGS.beforeNone}</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicking(false)}>{SETTINGS.cancel}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
