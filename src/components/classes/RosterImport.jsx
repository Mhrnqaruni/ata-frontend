// The shared import part of the Create a class and Add students windows (Phase 1.42, design §3.4): files are read
// as they land, 3 at a time, joined into one list the teacher edits, and checked; nothing is saved here.
// Area: academics

import { useEffect, useMemo, useRef, useState } from 'react';
import classService from '../../services/classService';
import {
  MAX_STUDENTS,
  checkLimits,
  emptyRow,
  mergeRows,
  removeFile,
  rowProblem,
  rowsToSend,
  sortRows,
} from './rosterImport';
import RosterFiles from './RosterFiles';
import RosterList from './RosterList';
import './roster-import.css';

const AT_ONCE = 3;
const NO_CHECK = { hash: null, states: {}, canImport: false, failed: false };
const isReading = (entry) => entry.state === 'waiting' || entry.state === 'reading';

/**
 * The import part's state and actions, kept by the window so its button can read them.
 * @param {string|undefined} classId - the class being added to; none for a new class
 */
export function useRosterImport(classId) {
  const [files, setFiles] = useState([]); // {key, file, state, reason, rows, joined, local}
  const [rows, setRows] = useState([]);
  const [view, setView] = useState('files');
  const [check, setCheck] = useState(NO_CHECK);
  const [focusKey, setFocusKey] = useState(null);
  const controllers = useRef(new Map());
  const fileCount = useRef(0);
  const checkCount = useRef(0);
  const sortNext = useRef(false); // the first check after a join puts the rows needing a fix first
  const intent = useRef(null);

  // Start the waiting files, 3 at a time. A removed file's or a closed window's read is aborted and ignored.
  useEffect(() => {
    const running = files.filter((entry) => entry.state === 'reading').length;
    const start = files.filter((entry) => entry.state === 'waiting').slice(0, Math.max(0, AT_ONCE - running));
    if (!start.length) return;
    const keys = new Set(start.map((entry) => entry.key));
    setFiles((current) => current.map((entry) => (keys.has(entry.key) ? { ...entry, state: 'reading' } : entry)));
    for (const entry of start) {
      const controller = new AbortController();
      controllers.current.set(entry.key, controller);
      const finish = (result) => {
        if (controller.signal.aborted) return;
        controllers.current.delete(entry.key);
        setFiles((current) => current.map((item) => (item.key === entry.key ? { ...item, ...result } : item)));
      };
      classService.readRosterFile(entry.file, classId, controller.signal).then(
        (data) =>
          finish({ state: 'done', rows: data.rows, reason: data.note || (data.rows.length ? null : 'no_students') }),
        (error) =>
          finish({ state: error.reason === 'ai_failed' ? 'failed' : 'refused', reason: error.reason, rows: [] })
      );
    }
  }, [files, classId]);

  // When every read has finished, join the new students in the order the files came, and show the list.
  useEffect(() => {
    if (files.some(isReading)) return;
    const ready = files.filter((entry) => entry.state === 'done' && entry.rows.length && !entry.joined);
    if (!ready.length) return;
    const keys = new Set(ready.map((entry) => entry.key));
    setRows((current) =>
      ready.reduce(
        (list, entry) => mergeRows(list, { key: entry.key, name: entry.file.name, rows: entry.rows }),
        current
      )
    );
    setFiles((current) => current.map((entry) => (keys.has(entry.key) ? { ...entry, joined: true } : entry)));
    sortNext.current = true;
    setView('list');
  }, [files]);

  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((controller) => controller.abort());
  }, []);

  const busy = files.some(isReading);
  const sent = useMemo(() => rowsToSend(rows), [rows]);
  const payload = useMemo(() => sent.map((item) => item.body), [sent]);
  const hash = useMemo(() => JSON.stringify(payload), [payload]);

  const runCheck = () => {
    const mine = (checkCount.current += 1);
    const keys = sent.map((item) => item.key);
    classService.checkRoster(payload, classId).then(
      (data) => {
        if (mine !== checkCount.current) return;
        const states = Object.fromEntries(data.rows.map((state) => [keys[state.row - 1], state]));
        setCheck({ hash, states, canImport: data.canImport, failed: false });
        if (sortNext.current) {
          sortNext.current = false;
          setRows((current) =>
            sortRows(current, (row) => Boolean(rowProblem(row)) || states[row.key]?.status === 'conflict')
          );
        }
      },
      () => {
        if (mine === checkCount.current) setCheck((current) => ({ ...current, failed: true }));
      }
    );
  };

  // The check follows the list, half a second after the last change, once the reads are done (SOT-7).
  useEffect(() => {
    if (busy || !payload.length || check.hash === hash) return undefined;
    const timer = setTimeout(runCheck, 500);
    return () => clearTimeout(timer);
  }, [hash, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const edited = (change) => {
    sortNext.current = false;
    setRows(change);
  };

  const { states } = check;
  const live = rows.filter((row) => !row.removed);
  const skipped = live.filter((row) => states[row.key]?.status === 'skip');
  const needsFix = (row) => Boolean(rowProblem(row)) || states[row.key]?.status === 'conflict';
  const fixCount = live.filter(needsFix).length;
  const count = live.length - skipped.length;
  const fresh = check.hash === hash;
  const tooMany = payload.length > MAX_STUDENTS;

  return {
    files,
    rows,
    view,
    busy,
    check,
    states,
    skipped,
    fixCount,
    count,
    tooMany,
    focusKey,
    payload,
    hasList: rows.length > 0,
    allSkipped: fresh && live.length > 0 && skipped.length === live.length,
    canAdd: !busy && count > 0 && fixCount === 0 && fresh && check.canImport && !tooMany,
    setView,
    retryCheck: runCheck,
    // New files: each checked against the limits first; a refused one is listed with its reason, never sent.
    addFiles(accepted, rejected = []) {
      const kept = files.filter((entry) => !entry.local).map((entry) => entry.file);
      const entry = (file, reason) => {
        fileCount.current += 1;
        const base = { key: fileCount.current, file, reason, rows: [], joined: false, local: Boolean(reason) };
        return { ...base, state: reason ? 'refused' : 'waiting' };
      };
      setFiles((current) => [
        ...current,
        ...checkLimits(accepted, kept).map((item) => entry(item.file, item.reason)),
        ...rejected.map((file) => entry(file, checkLimits([file])[0].reason || 'wrong_type')),
      ]);
    },
    // Removing a file stops its read and takes its students out of the list (SOT-7).
    dropFile(key) {
      controllers.current.get(key)?.abort();
      controllers.current.delete(key);
      setFiles((current) => current.filter((entry) => entry.key !== key));
      setRows((current) => removeFile(current, key));
    },
    readAgain(key) {
      setFiles((current) =>
        current.map((entry) => (entry.key === key ? { ...entry, state: 'waiting', reason: null } : entry))
      );
    },
    // An edit clears "Check spelling", and a typed ID is an ordinary one: never matched by name (SOT-6).
    editRow(key, changes) {
      edited((current) =>
        current.map((row) =>
          row.key === key
            ? { ...row, ...changes, unclear: false, ...('studentId' in changes ? { madeId: false } : {}) }
            : row
        )
      );
    },
    setRemoved(keys, removed) {
      edited((current) => current.map((row) => (keys.includes(row.key) ? { ...row, removed } : row)));
    },
    addRow() {
      const row = emptyRow(rows.reduce((last, item) => Math.max(last, item.seq), 0) + 1);
      edited((current) => [row, ...current]);
      setFocusKey(row.key);
    },
    // One request id per press: the same rows (and name) again reuse it, so a retry returns the saved outcome.
    requestId(extra = '') {
      const key = `${hash}\u0000${extra}`;
      if (intent.current?.key !== key) intent.current = { key, id: crypto.randomUUID() };
      return intent.current.id;
    },
    reset() {
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
      checkCount.current += 1;
      sortNext.current = false;
      intent.current = null;
      setFiles([]);
      setRows([]);
      setView('files');
      setCheck(NO_CHECK);
      setFocusKey(null);
    },
  };
}

/**
 * The import part: the Files view on open and while the first files are read, then the List view.
 * @param {object} props
 * @param {object} props.roster - useRosterImport's answer
 * @param {React.ReactNode} [props.label] - a heading above the drop area (Create a class only)
 * @param {string} props.readingHint - the line under the files while they're read
 */
export default function RosterImport({ roster, label, readingHint }) {
  // Once a list exists it stays while more files are read (Designer D1); the first reads show in the Files view.
  const showList = roster.view === 'list' && roster.hasList;
  return (
    <div className="mst-roster" data-files={roster.files.length ? 'true' : undefined}>
      {showList ? (
        <RosterList roster={roster} />
      ) : (
        <RosterFiles label={label} readingHint={readingHint} roster={roster} />
      )}
    </div>
  );
}
