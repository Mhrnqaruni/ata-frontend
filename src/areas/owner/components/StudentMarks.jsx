// One assessment's students and marks: a row per student that opens to each answer exactly as stored (§3.6).
// The answer, mark, feedback and the AI's readings are printed as text, never HTML (SOT-10).
// Area: owner

import { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import StatusChip from '../../../components/assessments/StatusChip';
import { count } from '../format';
import { useReadings } from '../ownerQueries';
import { Tag } from './Chips';
import TextViewer from './TextViewer';

const mark = (got, top) => (got === null || got === undefined ? '—' : `${got}${top ? ` / ${top}` : ''}`);

// A student's or an answer's status in MST's words; one with no marking yet, or no sheet, as a tag.
function Status({ status }) {
  if (status === 'no_submission') return <Tag>No submission</Tag>;
  if (status === 'pending_grade') return <Tag>Not marked yet</Tag>;
  return <StatusChip status={status} />;
}

function Readings({ assessmentId, answer }) {
  const [open, setOpen] = useState(false);
  const readings = useReadings(assessmentId, answer.result_id, open);
  if (!answer.readings) return null;
  return (
    <div className="owner-readings">
      <Button onClick={() => setOpen(!open)} size="small">
        {open ? 'Hide' : 'Show'} the AI&apos;s readings ({count(answer.readings)})
      </Button>
      {open && readings.data
        ? readings.data.map((reading) => (
            <TextViewer
              expanded
              key={`${reading.run_number}-${reading.created_at}`}
              title={`Reading ${reading.run_number + 1}${reading.mark === null ? '' : ` · ${reading.mark}`}`}
              value={reading.text || reading.comment}
            />
          ))
        : null}
      {open && readings.error ? <p className="owner-dash">Couldn&apos;t load the readings. Try again.</p> : null}
    </div>
  );
}

function Answer({ answer, assessmentId }) {
  return (
    <li className="owner-answer">
      <span className="owner-answer-q">Question {answer.question}</span>
      <dl className="owner-call-rows">
        <div>
          <dt>Answer</dt>
          <dd className="owner-plain">{answer.answer ?? '—'}</dd>
        </div>
        <div>
          <dt>Mark</dt>
          <dd>{mark(answer.mark, answer.max_mark)}</dd>
        </div>
        {answer.feedback ? (
          <div>
            <dt>Feedback</dt>
            <dd className="owner-plain">{answer.feedback}</dd>
          </div>
        ) : null}
        <div>
          <dt>Status</dt>
          <dd>
            <Status status={answer.status} />
          </dd>
        </div>
        {answer.hold_reason ? (
          <div>
            <dt>Why it&apos;s held</dt>
            <dd className="owner-plain">{answer.hold_reason}</dd>
          </div>
        ) : null}
      </dl>
      <Readings answer={answer} assessmentId={assessmentId} />
    </li>
  );
}

function Student({ student, assessmentId, expanded }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (expanded !== undefined) setOpen(expanded);
  }, [expanded]);
  const canOpen = student.answers.length > 0;
  return (
    <li className="owner-student" data-open={open ? 'true' : 'false'}>
      <button
        aria-expanded={canOpen ? open : undefined}
        className="owner-student-head"
        disabled={!canOpen}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {canOpen ? <ExpandMoreRounded aria-hidden="true" className="owner-viewer-arrow" /> : <span />}
        <span className="owner-student-name">
          {student.name || 'Unnamed'}
          {student.student_number ? <span className="owner-sub">{student.student_number}</span> : null}
        </span>
        {student.not_in_class ? <Tag hint="This sheet's student isn't on the class list.">Not in class</Tag> : <span />}
        <span className="owner-call-num">{mark(student.mark, student.max_mark)}</span>
        <Status status={student.status} />
        <span className="owner-call-num">{student.held ? `${count(student.held)} held` : ''}</span>
      </button>
      {open ? (
        <ol className="owner-answers">
          {student.answers.map((answer) => (
            <Answer answer={answer} assessmentId={assessmentId} key={answer.result_id} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export default function StudentMarks({ students, assessmentId, expanded }) {
  if (!students.length) return <p className="mst-panel-empty">No students or answers yet.</p>;
  return (
    <ul className="owner-students">
      {students.map((student) => (
        <Student assessmentId={assessmentId} expanded={expanded} key={student.student_key} student={student} />
      ))}
    </ul>
  );
}
