// The Add students window on a class page (Phase 1.42, design §3.3): "Import from files" first, and "Add one
// student"; each tab keeps what was dropped or typed while the window is open, and the window keeps one height.
// Area: academics

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import classService from '../../services/classService';
import ConfirmationModal from '../common/ConfirmationModal';
import RosterImport, { useRosterImport } from './RosterImport';
import StudentFields from './StudentFields';
import { addedNotice, plural } from './rosterImport';

const NO_STUDENT = { name: '', studentId: '' };
const SAVE_FAILED = "The students weren't added. Nothing was saved, so you can try again.";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.classId
 * @param {string} props.className - in the title, so a teacher with many classes can't add to the wrong one
 * @param {() => void} props.onClose
 * @param {(notice: string) => void} props.onAdded - after adding: the page closes the window and shows the notice
 */
export default function AddStudentsDialog({ open, classId, className, onClose, onAdded }) {
  const roster = useRosterImport(classId);
  const { reset } = roster;
  const [tab, setTab] = useState(0);
  const [student, setStudent] = useState(NO_STUDENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [height, setHeight] = useState(null);
  const body = useRef(null);

  // A closed window starts fresh: its reads are dropped, and nothing was saved (SOT-15).
  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => {
      reset();
      setTab(0);
      setStudent(NO_STUDENT);
      setError(null);
      setHeight(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (saving) return;
    if (roster.hasList) setAsking(true);
    else onClose();
  };

  // The one-student tab keeps the import tab's height, so nothing jumps.
  const changeTab = (_, next) => {
    if (next === 1) setHeight(body.current?.offsetHeight ?? null);
    setError(null);
    setTab(next);
  };

  const addRows = async () => {
    setSaving(true);
    setError(null);
    try {
      onAdded(addedNotice(await classService.commitRoster(classId, roster.requestId(), roster.payload)));
    } catch {
      setError(SAVE_FAILED);
      roster.retryCheck(); // a row someone took meanwhile shows as a fix
    } finally {
      setSaving(false);
    }
  };

  // A blank ID is sent as none, and the app makes an MST- one (D1).
  const addOne = async () => {
    const studentId = student.studentId.trim();
    setSaving(true);
    setError(null);
    try {
      const added = await classService.addStudentToClass(classId, {
        name: student.name.trim(),
        ...(studentId ? { studentId } : {}),
      });
      onAdded(`Added ${added.name} (ID ${added.studentId}).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const oneReady = student.name.trim().length >= 2;
  const importLabel = saving
    ? 'Adding…'
    : roster.busy || !roster.count
      ? 'Add students'
      : roster.fixCount
        ? `Fix ${plural(roster.fixCount, 'row')} first`
        : `Add ${plural(roster.count, 'student')}`;

  return (
    <>
      <Dialog
        disableEscapeKeyDown={saving}
        maxWidth={false}
        onClose={close}
        open={open}
        PaperProps={{ className: 'mst-roster-dialog', 'data-mst': 'add-students-window' }}
      >
        <DialogTitle>
          Add students to {className}
          <IconButton aria-label="Close" disabled={saving} onClick={close}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <div className="mst-roster-body" ref={body} style={{ minHeight: tab === 1 && height ? height : undefined }}>
          <Tabs aria-label="How to add students" onChange={changeTab} value={tab} variant="fullWidth">
            <Tab data-mst="add-students-files" disabled={saving} label="Import from files" />
            <Tab data-mst="add-students-one" disabled={saving} label="Add one student" />
          </Tabs>
          {tab === 0 ? (
            <RosterImport readingHint="Usually under a minute. Keep this window open." roster={roster} />
          ) : (
            <div className="mst-roster-one">
              <StudentFields
                disabled={saving}
                onChange={setStudent}
                onKeyDown={(event) => event.key === 'Enter' && oneReady && !saving && addOne()}
                optionalId
                value={student}
              />
            </div>
          )}
          {error ? (
            <Alert className="mst-roster-error" severity="error">
              {error}
            </Alert>
          ) : null}
        </div>
        <DialogActions>
          <Button disabled={saving} onClick={close} variant="outlined">
            Cancel
          </Button>
          {tab === 0 ? (
            <Button
              data-mst="add-students-confirm"
              disabled={!roster.canAdd || saving}
              onClick={addRows}
              startIcon={saving ? <CircularProgress color="inherit" size={20} /> : null}
              variant="contained"
            >
              {importLabel}
            </Button>
          ) : (
            <Button
              data-mst="add-one-student"
              disabled={!oneReady || saving}
              onClick={addOne}
              startIcon={saving ? <CircularProgress color="inherit" size={20} /> : null}
              variant="contained"
            >
              {saving ? 'Adding…' : 'Add student'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <ConfirmationModal
        cancelLabel="Keep checking"
        confirmLabel="Discard"
        description="Nothing has been added yet."
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onClose();
        }}
        open={asking}
        title="Discard this list?"
      />
    </>
  );
}
