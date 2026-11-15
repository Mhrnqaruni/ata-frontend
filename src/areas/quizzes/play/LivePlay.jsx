// The pupil's live quiz at /quiz/join/:roomCode (SOT-9; design.md §3.12): join with the class-list check, wait, answer
// each question, see right or wrong, then the end. A reload or a phone that slept gets straight back in (#62).
// Area: quizzes

import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { cleanCode } from '../api/join';
import JoinForm, { ClassListCheck } from './JoinForm';
import LiveRoom from './LiveRoom';
import PlayFrame from './PlayFrame';
import { joinLive } from './api';
import { forgetPlace, readPlace, savePlace } from './place';
import { useJoinLookup } from './useJoinLookup';

export default function LivePlay() {
  const code = cleanCode(useParams().roomCode);
  const [place, setPlace] = useState(() => readPlace(code));
  const [check, setCheck] = useState(null); // a join whose number isn't on the class list, waiting for the pupil
  const [typed, setTyped] = useState({});
  const lookup = useJoinLookup(place ? null : code);
  if (!code) return <Navigate replace to="/join" />;

  const enter = (joined) => {
    const next = {
      roomCode: joined.session.room_code || code,
      session: joined.session,
      participant: joined.participant,
      guestToken: joined.guest_token,
    };
    savePlace(next);
    setCheck(null);
    setPlace(next);
  };
  const join = async ({ name, number }) => {
    setTyped({ name, number });
    const joined = await joinLive({ code, name, number });
    if (joined.on_class_list === false) setCheck(joined);
    else enter(joined);
  };
  const leave = () => {
    forgetPlace();
    setPlace(null);
  };

  if (place) return <LiveRoom key={place.session.id} place={place} onLeave={leave} />;
  return (
    <PlayFrame logo>
      {check ? (
        <ClassListCheck number={typed.number} onChange={() => setCheck(null)} onContinue={() => enter(check)} />
      ) : (
        <JoinForm code={code} lookup={lookup} onJoin={join} initial={typed} />
      )}
    </PlayFrame>
  );
}
