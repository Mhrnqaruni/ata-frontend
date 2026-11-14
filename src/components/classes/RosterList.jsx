// The import part's List view (Phase 1.42, design §3.4): the summary, the skipped students, the failed files, and
// the list to check, where names and IDs are edited, rows removed and undone, and students added.
// Area: academics

import { useRef } from 'react';
import { Alert, Button, IconButton, Tooltip } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { alsoIn, groupRows, plural, reasonWords, rowProblem, skippedLine } from './rosterImport';

// A message's parts, with its {bold} parts in bold.
const Parts = ({ parts }) =>
  parts.map((part, index) => (typeof part === 'string' ? part : <b key={index}>{part.bold}</b>));

const keepTogether = (name) => name.replace(/ /g, '\u00a0');

// What a row needs: its own missing name or ID first, then the check's words (SOT-4). A saved ID under another
// name offers both ways out alike: the name may be a variant, or the ID a mistype (Designer P3-2).
function FixLine({ row, state, onUseSaved, onChangeId }) {
  const problem = rowProblem(row);
  if (problem) return <span className="mst-roster-fix">{problem}</span>;
  if (state.savedName) {
    return (
      <span className="mst-roster-fix">
        This ID is saved as <b>{state.savedName}</b>.{' '}
        <Button className="mst-inline-btn" data-mst="use-saved-name" onClick={onUseSaved} size="small">
          Use {state.savedName}
        </Button>
        {' · '}
        <Button className="mst-inline-btn" data-mst="change-the-id" onClick={onChangeId} size="small">
          Change the ID
        </Button>
      </span>
    );
  }
  return <span className="mst-roster-fix">{state.note}</span>;
}

function RosterRow({ row, state, roster }) {
  const idBox = useRef(null);
  const needsFix = !row.removed && (Boolean(rowProblem(row)) || state?.status === 'conflict');
  const also = !row.removed && state?.status === 'link' ? alsoIn(state.classes) : null;
  const name = row.name.trim() || 'this row';
  return (
    <li
      className="mst-roster-row"
      data-fix={needsFix ? 'true' : undefined}
      data-removed={row.removed ? 'true' : undefined}
    >
      <input
        aria-label="Name"
        autoFocus={row.key === roster.focusKey}
        className="mst-roster-input"
        disabled={row.removed}
        maxLength={120}
        name="name"
        onChange={(event) => roster.editRow(row.key, { name: event.target.value })}
        placeholder="Full name"
        value={row.name}
      />
      {row.removed ? (
        <Button className="mst-roster-undo" onClick={() => roster.setRemoved([row.key], false)} size="small">
          Undo
        </Button>
      ) : (
        <>
          <Tooltip describeChild title={row.madeId ? 'Made by MST: the file had no ID' : ''}>
            <input
              aria-label="Student ID"
              className="mst-roster-input mst-roster-id"
              maxLength={128}
              name="studentId"
              onChange={(event) => roster.editRow(row.key, { studentId: event.target.value })}
              placeholder="Student ID"
              ref={idBox}
              value={row.studentId}
            />
          </Tooltip>
          <span className="mst-roster-chips">
            {also ? (
              <span className="mst-roster-chip" data-tone="link" title={state.classes.join(', ')}>
                {also}
              </span>
            ) : null}
            {row.unclear ? (
              <span className="mst-roster-chip" data-tone="check">
                Check spelling
              </span>
            ) : null}
          </span>
          <IconButton
            aria-label={`Remove ${name} from the list`}
            className="mst-roster-remove"
            onClick={() => roster.setRemoved([row.key], true)}
          >
            <CloseRounded />
          </IconButton>
        </>
      )}
      {needsFix ? (
        <FixLine
          onChangeId={() => {
            idBox.current?.focus();
            idBox.current?.select();
          }}
          onUseSaved={() => roster.editRow(row.key, { name: state.savedName })}
          row={row}
          state={state}
        />
      ) : null}
      {row.removed
        ? null
        : row.notes.map((item) => (
            <span className="mst-roster-note" key={`${item.file}-${item.text}`}>
              {item.text}
            </span>
          ))}
    </li>
  );
}

// The hint under the list, each part only when it applies; no class names, so it stays short (Designer D4).
function hintFor(rows, states) {
  const live = rows.filter((row) => !row.removed);
  const hints = ['You can edit any name or ID.'];
  if (live.some((row) => row.madeId)) hints.push('MST- IDs were made by the app.');
  if (live.some((row) => states[row.key]?.status === 'link' && states[row.key].classes?.length)) {
    hints.push('“Also in” students stay in that class too.');
  }
  return hints.join(' ');
}

/** @param {{roster: object}} props - useRosterImport's answer */
export default function RosterList({ roster }) {
  const { files, rows, states, skipped, fixCount, count, allSkipped } = roster;
  const names = Object.fromEntries(files.map((entry) => [entry.key, entry.file.name]));
  const joined = files.filter((entry) => entry.joined).length;
  const failed = files.filter((entry) => entry.reason);
  const reading = files.filter((entry) => entry.state === 'waiting' || entry.state === 'reading').length;
  const shown = rows.filter((row) => row.removed || states[row.key]?.status !== 'skip');
  const groups = groupRows(shown);
  const summary = allSkipped ? (
    skipped.length === 1 ? (
      'This student is already in this class.'
    ) : (
      `All ${skipped.length} students are already in this class.`
    )
  ) : (
    <>
      <b>{plural(count, 'student')}</b>
      {joined ? ` from ${plural(joined, 'file')}` : ''}
      {fixCount ? (
        <span className="mst-roster-fixcount">{` · ${fixCount} ${fixCount === 1 ? 'needs' : 'need'} a fix`}</span>
      ) : null}
    </>
  );
  return (
    <>
      <div className="mst-roster-sum">
        <p aria-live="polite">{summary}</p>
        <Button className="mst-inline-btn" data-mst="roster-files" onClick={() => roster.setView('files')} size="small">
          Add or remove files
        </Button>
      </div>
      {reading ? (
        <div className="mst-roster-reading" role="status">
          {reading === 1 ? 'Reading 1 more file…' : `Reading ${reading} more files…`}
          <div aria-hidden="true" className="mst-ai-bar" />
        </div>
      ) : null}
      {skipped.length && !allSkipped ? (
        <p className="mst-roster-quiet">
          {skippedLine(
            skipped.map((row) => ({
              name: keepTogether(row.name),
              savedName: states[row.key]?.savedName && keepTogether(states[row.key].savedName),
            }))
          )}
        </p>
      ) : null}
      {failed.length ? (
        <Alert className="mst-roster-alert" severity="warning">
          {failed.map((entry) => {
            const words = reasonWords(entry.reason, entry.file.name);
            return (
              <span className="mst-roster-alert-line" key={entry.key}>
                <Parts parts={words.message} />
                {words.again ? (
                  <>
                    {' '}
                    <Button className="mst-inline-btn" onClick={() => roster.readAgain(entry.key)} size="small">
                      Read it again
                    </Button>
                  </>
                ) : null}
              </span>
            );
          })}
        </Alert>
      ) : null}
      {roster.check.failed ? (
        <Alert
          action={
            <Button color="inherit" onClick={roster.retryCheck} size="small">
              Try again
            </Button>
          }
          className="mst-roster-alert"
          severity="error"
        >
          Couldn&apos;t check the list just now. Your files and edits are kept.
        </Alert>
      ) : null}
      {roster.tooMany ? (
        <Alert className="mst-roster-alert" severity="error">
          Up to 1,000 students at a time. Remove a file or some rows.
        </Alert>
      ) : null}
      {allSkipped ? null : (
        <>
          <div className="mst-roster-box" role="group" aria-label="Students to add">
            <div aria-hidden="true" className="mst-roster-head">
              <span>Name</span>
              <span>Student ID</span>
            </div>
            <ul className="mst-roster-groups">
              {groups.map((group) => {
                const left = group.rows.filter((row) => !row.removed);
                return (
                  <li className="mst-roster-group" key={group.key}>
                    {group.file != null ? (
                      <div className="mst-roster-sub">
                        <span>{[names[group.file], group.section].filter(Boolean).join(' · ')}</span>
                        {left.length ? (
                          <Button
                            className="mst-inline-btn"
                            onClick={() =>
                              roster.setRemoved(
                                left.map((row) => row.key),
                                true
                              )
                            }
                            size="small"
                          >
                            Remove all {left.length}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    <ul className="mst-roster-rows">
                      {group.rows.map((row) => (
                        <RosterRow key={row.key} roster={roster} row={row} state={states[row.key]} />
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mst-roster-under">
            <Button data-mst="roster-add-row" onClick={roster.addRow} size="small" startIcon={<AddRounded />}>
              Add a student
            </Button>
          </div>
          <p className="mst-roster-hint">{hintFor(shown, states)}</p>
        </>
      )}
    </>
  );
}
