// The pupil's homework at /quiz/sp/join/:accessCode (SOT-10; Phase 1.47 design.md §3.5): join with the class-list
// check, answer question by question (each saved), check the answers, hand in, and get proof it reached the teacher.
// Area: quizzes

import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { cleanCode } from '../api/join';
import { formatDateTime } from '../../../utils/dates';
import CheckAnswers from './CheckAnswers';
import HandedIn from './HandedIn';
import HomeworkQuestion from './HomeworkQuestion';
import JoinForm, { ClassListCheck } from './JoinForm';
import PlayFrame from './PlayFrame';
import { joinHomework } from './api';
import { useHomeworkPlay } from './useHomeworkPlay';
import { useJoinLookup } from './useJoinLookup';
import { PLAY } from './words';

export default function HomeworkPlay() {
  const code = cleanCode(useParams().accessCode);
  const [run, setRun] = useState(null);
  const [check, setCheck] = useState(null);
  const [typed, setTyped] = useState({});
  const lookup = useJoinLookup(code);
  if (!code) return <Navigate replace to="/join" />;
  const join = async ({ name, number }) => {
    setTyped({ name, number });
    const joined = await joinHomework({ code, name, number });
    if (joined.on_class_list === false) setCheck(joined);
    else setRun(joined);
  };
  if (run) return <Homework key={run.session_id} run={run} teacher={lookup.data?.teacher_name} />;
  return (
    <PlayFrame logo>
      {check ? (
        <ClassListCheck
          number={typed.number}
          onChange={() => setCheck(null)}
          onContinue={() => {
            setRun(check);
            setCheck(null);
          }}
        />
      ) : (
        <JoinForm code={code} lookup={lookup} homework onJoin={join} initial={typed} />
      )}
    </PlayFrame>
  );
}

// The homework once joined: a question, Check answers, or the proof of handing in.
function Homework({ run, teacher }) {
  const play = useHomeworkPlay(run);
  const [checking, setChecking] = useState(false);
  const questions = run.questions || [];
  const question = questions[play.index];
  if (play.handedIn) {
    return (
      <PlayFrame>
        <HandedIn run={run} result={play.handedIn} teacher={teacher} />
      </PlayFrame>
    );
  }
  const openCheck = async () => {
    await play.setIndex(play.index); // saves a typed answer first
    setChecking(true);
  };
  return (
    <PlayFrame bar>
      {checking || !question ? (
        <CheckAnswers
          play={play}
          questions={questions}
          mustAnswerAll={Boolean(run.settings?.require_all_answers)}
          onOpen={(index) => {
            setChecking(false);
            play.setIndex(index);
          }}
        />
      ) : (
        <HomeworkQuestion
          play={play}
          question={question}
          total={run.total_questions || questions.length}
          back={run.settings?.allow_navigation !== false}
          onCheck={openCheck}
          due={run.deadline ? PLAY.dueAt(formatDateTime(run.deadline)) : null}
          scoreShown={run.settings?.show_final_score_to_students !== false}
        />
      )}
    </PlayFrame>
  );
}
