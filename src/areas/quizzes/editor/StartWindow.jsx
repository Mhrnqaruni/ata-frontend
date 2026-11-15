// The Start window (Phase 1.46 S5.3; SOT-6; design.md §3.6; DR-7): the classes, pre-ticked from the quiz, then the
// pace (live) or the due date (homework), then Start now or Send. Any lane can open it with a quiz in useEditor's form.
// Area: quizzes

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import ClassChooser from '../../../components/tags/ClassChooser';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { formatDateTime } from '../../../utils/dates';
import * as api from './api';
import { modeOf } from './editorState';
import { homeworkBody, launchAudience, quizMovesOn, sendHomework, startLive, tomorrowAtFive } from './launch';
import { useAudienceNames, useRecentClassIds } from './queries';
import { joinNames, START } from './words';

// A pace with its own line under its label, always shown, so the words can't contradict the tick (Phase 1.47 R1).
// The label's 11 px top keeps its first line level with the radio.
function PaceChoice({ value, label, line }) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio />}
      disableTypography
      sx={{ alignItems: 'flex-start', mr: 0 }}
      label={
        <Box component="span" sx={{ display: 'grid', gap: 0.25, pt: '11px', pb: 1 }}>
          <Box component="span" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: 'var(--mst-ink)' }}>
            {label}
          </Box>
          <Box component="span" sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
            {line}
          </Box>
        </Box>
      }
    />
  );
}

const pad = (number) => String(number).padStart(2, '0');
const dayOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const hasAny = (spec) => Boolean(spec?.class_ids?.length || spec?.tag_ids?.length);

function StartForm({ quiz, chooseFirst, onBusy, onClose }) {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const live = modeOf(quiz.settings) === 'live';
  const pair = quiz.quizPhase === 'pre' || quiz.quizPhase === 'post';
  const [chosen, setChosen] = useState(quiz.audience);
  const [choosing, setChoosing] = useState(chooseFirst && !pair);
  const [movesOn, setMovesOn] = useState(quizMovesOn(quiz.settings));
  const [due, setDue] = useState(tomorrowAtFive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [madeRun, setMadeRun] = useState(null); // a homework run made but not started, which Try again starts
  const recent = useRecentClassIds();
  const names = useAudienceNames(chosen);
  const named = joinNames([...names.classes, ...names.groups]);
  const needClasses = !hasAny(chosen) && hasAny(quiz.audience); // the server can't run such a quiz for anyone
  const late = !live && due.getTime() <= Date.now();
  const working = (value) => {
    setBusy(value);
    onBusy(value);
  };

  const start = async () => {
    working(true);
    setError('');
    const audience = launchAudience(chosen, quiz.audience);
    try {
      if (live) {
        const run = await startLive(api, { quizId: quiz.id, audience, movesOn, settings: quiz.settings });
        navigate(`/quizzes/sessions/${run.id}/host`);
        return;
      }
      const body = homeworkBody({ quizId: quiz.id, settings: quiz.settings, due, audience });
      const result = await sendHomework(api, body, madeRun);
      if (!result.started) {
        setMadeRun(result.id);
        setError(START.startFailed);
        working(false);
        return;
      }
      showSnackbar(START.sent(named, formatDateTime(due)), 'success');
      navigate(`/quizzes/sp-sessions/${result.id}/host?share=1`); // the homework page opens Share (design.md §3.6)
    } catch (failure) {
      setError(failure.message);
      working(false);
    }
  };

  const setDay = (text) => {
    const [year, month, day] = text.split('-').map(Number);
    if (year && month && day) setDue(new Date(year, month - 1, day, due.getHours(), due.getMinutes()));
  };
  const setTime = (text) => {
    const [hours, minutes] = text.split(':').map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes))
      setDue(new Date(due.getFullYear(), due.getMonth(), due.getDate(), hours, minutes));
  };

  return (
    <>
      <DialogTitle>{quiz.title.trim()}</DialogTitle>
      <DialogContent className="mst-qe-start">
        {error ? <Alert severity="error">{error}</Alert> : null}
        <div className="mst-qe-field">
          <div className="mst-qe-label">{START.classes}</div>
          <div className="mst-qe-start-classes">
            {hasAny(chosen) ? (
              [...names.classes, ...names.groups].map((name, index) => (
                <Chip key={`${index}-${name}`} label={name} size="small" />
              ))
            ) : (
              <span className="mst-qe-start-anyone">{START.anyone}</span>
            )}
            {pair ? null : (
              <Button size="small" disabled={busy || Boolean(madeRun)} onClick={() => setChoosing(true)}>
                {START.change}
              </Button>
            )}
          </div>
          {pair ? <p className="mst-qe-help">{START.pairLocked}</p> : null}
          {needClasses ? (
            <p className="mst-qe-help" data-tone="warn" role="status">
              {START.needClasses}
            </p>
          ) : null}
        </div>
        {live ? (
          <div className="mst-qe-field">
            <div className="mst-qe-label" id="mst-qe-pace">
              {START.pace}
            </div>
            <RadioGroup
              aria-labelledby="mst-qe-pace"
              value={movesOn ? 'itself' : 'hand'}
              onChange={(event) => setMovesOn(event.target.value === 'itself')}
            >
              <PaceChoice value="hand" label={START.byHand} line={START.byHandLine} />
              <PaceChoice
                value="itself"
                label={START.byItself}
                line={START.byItselfLine(quiz.settings?.cooldown_seconds ?? 10)}
              />
            </RadioGroup>
          </div>
        ) : (
          <div className="mst-qe-field">
            <div className="mst-qe-label">{START.due}</div>
            <div className="mst-qe-start-due">
              <TextField
                type="date"
                value={dayOf(due)}
                disabled={Boolean(madeRun)}
                inputProps={{ 'aria-label': START.date, min: dayOf(new Date()) }}
                onChange={(event) => setDay(event.target.value)}
              />
              <TextField
                type="time"
                value={timeOf(due)}
                disabled={Boolean(madeRun)}
                inputProps={{ 'aria-label': START.time, step: 300 }}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <p className="mst-qe-help" data-tone={late ? 'warn' : undefined}>
              {late ? START.dueBefore : `${formatDateTime(due)} · ${START.dueLine}`}
            </p>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          {START.cancel}
        </Button>
        <Button variant="contained" disabled={busy || needClasses || late} onClick={start} data-mst="start-run">
          {live ? (busy ? START.starting : START.start) : busy ? START.sending : madeRun ? START.tryAgain : START.send}
        </Button>
      </DialogActions>
      <ClassChooser
        open={choosing}
        value={chosen ?? { class_ids: [], tag_ids: [], mode: 'union' }}
        recentClassIds={recent}
        onClose={() => setChoosing(false)}
        onDone={(next) => {
          setChoosing(false);
          setChosen(next);
        }}
      />
    </>
  );
}

// quiz: { id, title, settings, audience, quizPhase }, as useEditor keeps it; chooseFirst opens the class chooser at once.
export default function StartWindow({ open, quiz, chooseFirst = false, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth={false}
      PaperProps={{ sx: { width: 480, maxWidth: 'calc(100% - 16px)' }, 'data-mst': 'start-window' }}
    >
      {open && quiz ? <StartForm quiz={quiz} chooseFirst={chooseFirst} onBusy={setBusy} onClose={onClose} /> : null}
    </Dialog>
  );
}
