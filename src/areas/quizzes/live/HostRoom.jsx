// The live room the teacher runs (SOT-9; design.md §3.7, §3.8): the header, the join strip, the lobby or the open
// question, Present for the board and the Finish window. Finishing opens this run's results (LV13).
// Area: quizzes

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import OpenInFullRounded from '@mui/icons-material/OpenInFullRounded';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import { useSnackbar } from '../../../hooks/useSnackbar';
import JoinStrip from '../shared/JoinStrip';
import PresentJoin from '../shared/PresentJoin';
import ShareJoin from '../shared/ShareJoin';
import { WORDS, classList } from '../words';
import { setPace } from './api';
import FinishDialog from './FinishDialog';
import { secondsLeft } from './liveClock';
import Lobby from './Lobby';
import MainAction from './MainAction';
import { answeredSplit, roomPeople } from './people';
import { PresentAnswered, PresentClock, PresentHere, PresentQuestion } from './PresentLive';
import { useAnswerCounts, usePeople, useRunClasses } from './queries';
import QuestionPanel, { PHONE } from './QuestionPanel';
import { FINISHED, everyoneAnswered, mainAction, timedChoice } from './roomState';
import TimedChoice from './TimedChoice';
import { useHostActions } from './useHostActions';
import { useHostRoom } from './useHostRoom';
import { useMarkingWait } from './useMarkingWait';
import { useNow } from './useNow';
import { LIVE } from './words';

// During questions the header stays condensed, so the question is the loudest thing on the page (design.md §3.7).
const CONDENSED = {
  '& .mst-page-head': { mb: 2 },
  '& .mst-page-head-title': { fontSize: 17, lineHeight: '24px' },
  '& .mst-page-head-sub': { display: 'none' },
};
// On a phone the header doesn't float: the title and Finish quiz share its row and scroll away (Phase 1.47 §3.6).
const PHONE_HEAD = {
  [`@media ${PHONE}`]: { '& .mst-page-head': { position: 'static' }, '& .mst-page-head-text': { flexBasis: 0 } },
};
// On a phone, Share is a 40 px icon button: its word stays for screen readers and in the tooltip.
const ICON_ONLY = {
  '& .MuiButton-root': {
    minWidth: 40,
    width: 40,
    height: 40,
    p: 0,
    fontSize: 0,
    border: 0,
    background: 'none',
    boxShadow: 'none',
    color: 'var(--mst-accent-ink)',
  },
  '& .MuiButton-startIcon': { m: 0 },
};

export default function HostRoom({ run }) {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const questions = run.questions || [];
  const people = usePeople(run.id, Boolean(run.has_roster || run.class_id));
  const [room, connected] = useHostRoom(run, { onPeopleChange: people.refetch });
  const classes = useRunClasses(run.quiz_id, run.id);

  // Finishing, here or anywhere, opens this run's results once, with "Quiz finished · results saved".
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    showSnackbar(LIVE.finished, 'success');
    navigate(`/quizzes/${run.quiz_id}/results?run=${encodeURIComponent(run.id)}`, { replace: true });
  }, [navigate, run.id, run.quiz_id, showSnackbar]);
  const actions = useHostActions(run.id, { onFinished: leave });
  const finished = FINISHED.includes(room.status);
  useEffect(() => {
    if (finished) leave();
  }, [finished, leave]);

  const running = room.status === 'active' && Boolean(room.question);
  const last = running && room.question.order_index >= questions.length - 1;
  const now = useNow(running && (!room.closed || room.movesOnAt != null));
  // Once answering closes the clock reads 0, whatever was left when Show answers closed it.
  const seconds = room.closed
    ? 0
    : room.endsAt
      ? secondsLeft(room.endsAt, now)
      : (room.question?.time_limit_seconds ?? 0);
  const movesOnIn = room.movesOnAt ? secondsLeft(room.movesOnAt, now) : null;
  const groups = roomPeople(people.data || {});
  const split = answeredSplit(groups.inRoom, room.answered);
  const keyQuestion = questions.find((item) => String(item.id) === String(room.question?.id));
  // Read once the answers show, never while typed answers wait for the AI, and again when their marks arrive (C2).
  const counts = useAnswerCounts(
    run.id,
    room.question?.id,
    running && room.closed && !room.marksPending,
    room.marksRound
  ).data;
  // The top 5 shows between questions only when the run chose it at launch (SOT-9, Q5 b): never on a mirrored board
  // for a class whose teacher turned it off, though the teacher's socket always gets it.
  const showBoard = run.config_snapshot?.quiz_settings?.leaderboard === 'top5' && room.leaderboard.length > 0;
  const action = mainAction(room, questions.length, { lastClosed: actions.lastClosed });
  // A timed run's small control while its question is open, in place of the main button (Phase 1.47 R2).
  const everyone = everyoneAnswered(room, split);
  const choice = timedChoice(room, everyone);
  // Next question during marking waits for the marks, so the count shows first (design.md §3.4).
  const [press, waiting] = useMarkingWait((key) => actions.press(key, { last }), {
    marking: room.marksPending,
    questionId: room.question?.id,
  });

  // The pace, before the start: the switch moves at once, and comes back if the change is refused.
  const [paceChoice, setPaceChoice] = useState(null);
  const [paceError, setPaceError] = useState(null);
  const changePace = async (auto) => {
    setPaceChoice(auto);
    setPaceError(null);
    try {
      await setPace(run.id, auto, room.pace.cooldown);
    } catch {
      setPaceChoice(null);
      setPaceError(LIVE.paceFailed);
    }
  };

  const [present, setPresent] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // On a phone, Present and Share are 40 px icon buttons with their words in tooltips (Phase 1.47 §3.6).
  const phone = useMediaQuery(PHONE, { noSsr: true });
  const presentButton = (size) =>
    phone ? (
      <Tooltip title={WORDS.present}>
        <IconButton
          aria-label={WORDS.present}
          onClick={() => setPresent(true)}
          sx={{ width: 40, height: 40, color: 'var(--mst-accent-ink)' }}
        >
          <OpenInFullRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    ) : (
      <Button size={size} variant="outlined" startIcon={<OpenInFullRounded />} onClick={() => setPresent(true)}>
        {WORDS.present}
      </Button>
    );
  // Share's hidden "Copied ✓" region is as wide as its positioned parent (useCopy's srOnly), so it gets its own.
  const share = (size) => {
    const button = (
      <Box sx={{ position: 'relative', display: 'inline-flex', ...(phone ? ICON_ONLY : null) }}>
        <ShareJoin code={run.room_code} title={run.quiz_title} size={size} />
      </Box>
    );
    return phone ? <Tooltip title={WORDS.share}>{button}</Tooltip> : button;
  };
  const reconnecting = connected ? null : (
    <Typography
      component="span"
      role="status"
      sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-warn-ink)' }}
    >
      {LIVE.reconnecting}
    </Typography>
  );
  const context = [classes.length ? classList(classes) : null, LIVE.questions(questions.length)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box sx={{ containerType: 'inline-size', ...PHONE_HEAD, ...(running ? CONDENSED : null) }}>
      <PageHeader
        title={run.quiz_title}
        subtitle={context}
        actions={
          <>
            {running ? null : presentButton('medium')}
            {running ? null : share('medium')}
            <Button variant="text" onClick={() => setFinishing(true)}>
              {LIVE.finishQuiz}
            </Button>
          </>
        }
      />
      {/* Before the start, the lobby shows the join card instead (Phase 1.47 R3). */}
      {running ? (
        <Box sx={{ mb: 2 }}>
          <JoinStrip
            code={run.room_code}
            actions={
              <>
                {reconnecting}
                {presentButton('small')}
                {share('small')}
              </>
            }
          />
        </Box>
      ) : null}
      {running ? (
        <QuestionPanel
          room={room}
          keyQuestion={keyQuestion}
          total={questions.length}
          split={split}
          seconds={seconds}
          movesOnIn={movesOnIn}
          counts={counts}
          showBoard={showBoard}
          nameOf={(id) => groups.inRoom.find((person) => person.id === String(id))?.name}
          action={action}
          actions={{ ...actions, onPress: press }}
          choice={choice}
          everyone={everyone}
          waiting={waiting}
          last={last}
        />
      ) : (
        <Lobby
          people={groups}
          pace={{ auto: paceChoice ?? room.pace.auto, cooldown: room.pace.cooldown }}
          onPace={changePace}
          paceError={paceError}
          action={action}
          actions={{ ...actions, onPress: press }}
          code={run.room_code}
          onPresent={() => setPresent(true)}
          status={reconnecting}
        />
      )}
      <PresentJoin
        open={present}
        onClose={() => setPresent(false)}
        code={run.room_code}
        here={<PresentHere people={groups} />}
        controls={
          <>
            {running && !room.closed ? <PresentClock seconds={seconds} /> : null}
            {choice ? (
              // A timed run while pupils answer: "18 answered" and the small control, no main button (§3.2).
              <>
                <PresentAnswered count={split.count} />
                <TimedChoice choice={choice} last={last} busy={actions.busy} onPress={press} />
              </>
            ) : (
              <MainAction
                action={action}
                busy={actions.busy}
                onPress={press}
                waiting={waiting}
                seconds={room.closed ? movesOnIn : null}
                size="medium"
              />
            )}
          </>
        }
        // Space and → press the main button. In a timed run they do nothing while pupils answer, so a stray key can't
        // end the question, until everyone has answered: then they move on (design.md §3.2).
        onMain={() => {
          if (choice === 'everyone') press('reveal');
          else if (!choice && action && action !== 'starting') press(action);
        }}
      >
        {running ? (
          <PresentQuestion
            room={room}
            keyQuestion={keyQuestion}
            total={questions.length}
            seconds={seconds}
            answered={split.count}
            counts={counts}
          />
        ) : null}
      </PresentJoin>
      <FinishDialog
        open={finishing}
        onCancel={() => {
          setFinishing(false);
          actions.clearError();
        }}
        onConfirm={() => actions.press('finish', { last })}
        busy={actions.busy === 'finish'}
        error={finishing ? actions.error : null}
        facts={{
          started: room.status === 'active',
          question: room.question,
          closed: room.closed,
          last,
          answered: split.count,
          total: split.total,
        }}
      />
    </Box>
  );
}
