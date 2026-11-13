// The Create a class window (Phase 1.42, design §3.2): the class name, then any class lists, read and checked before
// anything is saved; the class and its students are made together in one call, or not at all.
// Area: academics

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import classService from '../../services/classService';
import ConfirmationModal from '../common/ConfirmationModal';
import RosterImport, { useRosterImport } from './RosterImport';
import { plural } from './rosterImport';

// On a phone the count leaves the button, since the summary shows it (Designer P3-1).
const withCount = (count) => (
  <>
    Create class<span className="mst-roster-count">{` with ${plural(count, 'student')}`}</span>
  </>
);

const STUDENTS_LABEL = (
  <>
    Students <span className="mst-roster-optional">(optional)</span>
  </>
);

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(made: {id: string, name: string}, notice: string) => void} props.onCreated - opens the new class's page
 */
export default function AddClassModal({ open, onClose, onCreated }) {
  const roster = useRosterImport(undefined);
  const { reset } = roster;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);

  // A closed window starts fresh: its reads are dropped, and nothing was saved (SOT-15).
  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => {
      reset();
      setName('');
      setNameError(null);
      setFailed(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = name.trim();
  const withRows = roster.count > 0;
  const ready = trimmed.length >= 3 && !roster.busy && !saving && (!withRows || roster.canAdd);
  const label = saving
    ? 'Creating…'
    : roster.busy || !withRows
      ? 'Create class'
      : roster.fixCount
        ? `Fix ${plural(roster.fixCount, 'row')} first`
        : withCount(roster.count);

  const close = () => {
    if (saving) return;
    if (roster.hasList) setAsking(true);
    else onClose();
  };

  // With rows, one call makes the class and its students (SOT-5); without, today's empty class.
  const create = async () => {
    setSaving(true);
    setNameError(null);
    setFailed(false);
    try {
      if (withRows) {
        const made = await classService.createClassWithRows(roster.requestId(trimmed), trimmed, roster.payload);
        const students = made.outcome.created + made.outcome.linked;
        onCreated(made.class, `Created ${made.class.name} with ${plural(students, 'student')}.`);
      } else {
        const made = await classService.createClass({ name: trimmed });
        onCreated(made, `Created ${made.name}.`);
      }
    } catch (err) {
      if (withRows) {
        setFailed(true);
        roster.retryCheck(); // a row someone took meanwhile shows as a fix
      } else {
        setNameError(err.message || 'The class could not be created. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        disableEscapeKeyDown={saving}
        maxWidth={false}
        onClose={close}
        open={open}
        PaperProps={{ className: 'mst-roster-dialog', 'data-mst': 'create-class-window' }}
      >
        <DialogTitle>
          Create a class
          <IconButton aria-label="Close" disabled={saving} onClick={close}>
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <div className="mst-roster-body">
          <TextField
            autoFocus
            disabled={saving}
            error={Boolean(nameError)}
            fullWidth
            helperText={nameError || undefined}
            inputProps={{ maxLength: 100 }}
            label="Class name"
            name="className"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && ready && create()}
            placeholder="For example: 7B Science"
            required
            value={name}
          />
          <RosterImport
            label={STUDENTS_LABEL}
            readingHint={`Usually under a minute.${trimmed ? '' : ' You can type the class name meanwhile.'}`}
            roster={roster}
          />
          {failed ? (
            <Alert className="mst-roster-error" severity="error">
              The students weren&apos;t added. Nothing was saved, so you can try again.
            </Alert>
          ) : null}
        </div>
        <DialogActions>
          <Button disabled={saving} onClick={close} variant="outlined">
            Cancel
          </Button>
          <Button
            data-mst="create-class"
            disabled={!ready}
            onClick={create}
            startIcon={saving ? <CircularProgress color="inherit" size={20} /> : null}
            variant="contained"
          >
            {label}
          </Button>
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
