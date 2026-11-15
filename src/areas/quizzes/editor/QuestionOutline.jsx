// The question outline (design.md §3.4; DR-5): a Find box that takes "57" or "osmosis", then one line per question,
// the current one lit, a red dot on anything unfinished, and dragging (or Alt and an arrow key) to reorder.
// Area: quizzes

import { useMemo, useState } from 'react';
import { Button, InputAdornment, TextField } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { ISSUES, issueOf } from './draft';
import { questionMatches } from './questionModel';
import { QUESTIONS } from './words';

const oneLine = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

export default function QuestionOutline({ questions, current, onGo, onMove, onHide, autoFocus = false }) {
  const [find, setFind] = useState('');
  const [dragging, setDragging] = useState(null); // the place being dragged
  const [over, setOver] = useState(null); // the place it would land
  const shown = useMemo(() => questionMatches(questions, find), [questions, find]);
  const filtering = Boolean(find.trim());

  const drop = (to) => {
    if (dragging !== null && to !== dragging) onMove(dragging, to);
    setDragging(null);
    setOver(null);
  };
  const keyMove = (event, index) => {
    if (!event.altKey || filtering || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const to = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= questions.length) return;
    onMove(index, to);
    requestAnimationFrame(() => document.getElementById(`outline-${questions[index].key}`)?.focus());
  };

  return (
    <nav className="mst-qe-outline" aria-label={QUESTIONS.outline}>
      <TextField
        value={find}
        autoFocus={autoFocus}
        placeholder={QUESTIONS.find}
        onChange={(event) => setFind(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && shown.length) {
            event.preventDefault();
            onGo(questions[shown[0]].key);
          }
        }}
        inputProps={{ 'aria-label': QUESTIONS.find }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ '& .MuiOutlinedInput-root': { minHeight: 40 } }}
      />
      {filtering && !shown.length ? (
        <p className="mst-qe-outline-empty" role="status">
          {QUESTIONS.noneFound(find.trim())}
        </p>
      ) : null}
      <ol className="mst-qe-outline-list" title={filtering ? undefined : QUESTIONS.moveHint}>
        {shown.map((index) => {
          const question = questions[index];
          const issue = issueOf(question);
          return (
            <li
              key={question.key}
              draggable={!filtering}
              data-over={over === index && dragging !== index ? (dragging < index ? 'after' : 'before') : undefined}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
                setDragging(index);
              }}
              onDragOver={(event) => {
                if (dragging === null) return;
                event.preventDefault();
                setOver(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                drop(index);
              }}
              onDragEnd={() => {
                setDragging(null);
                setOver(null);
              }}
            >
              <button
                type="button"
                id={`outline-${question.key}`}
                className="mst-qe-outline-item"
                aria-current={question.key === current ? 'true' : undefined}
                onClick={() => onGo(question.key)}
                onKeyDown={(event) => keyMove(event, index)}
              >
                <span className="mst-qe-outline-num">{index + 1}</span>
                <span className="mst-qe-outline-text">{oneLine(question.question_text) || QUESTIONS.untitled}</span>
                {issue ? (
                  <>
                    <span className="mst-qe-dot" aria-hidden="true" title={ISSUES[issue].tip} />
                    <span className="mst-qe-sr">, {ISSUES[issue].card}</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      {onHide ? (
        <Button size="small" startIcon={<VisibilityOffOutlined />} onClick={onHide} sx={{ alignSelf: 'flex-start' }}>
          {QUESTIONS.hideOutline}
        </Button>
      ) : null}
    </nav>
  );
}
