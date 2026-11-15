// Import with AI (R6, kept with clearer words): a file or pasted text in, questions out, added to the quiz for the
// teacher to check. The request is today's /api/quizzes/ai/parse, unchanged; it runs only on the teacher's press.
// Area: quizzes

import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  MenuItem,
  TextField,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import NumberField from '../../../components/common/NumberField';
import UploadDropzone from '../../../components/common/UploadDropzone';
import { readWithAI } from './api';
import { importedQuestion } from './questionModel';
import { IMPORT, TYPE_WORDS } from './words';

const FILES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
};
const WRITABLE = ['multiple_choice', 'true_false', 'short_answer']; // AI writes no polls

// The form today's import takes: the file, or the pasted text as a text file, and the choices.
function importForm({ file, text, kind, grade, count, types, level }) {
  const form = new FormData();
  form.append('document', file ?? new File([text.trim()], 'instructions.txt', { type: 'text/plain' }));
  form.append('document_type', kind);
  if (grade.trim()) form.append('grade_level', grade.trim());
  if (kind === 'lecture_material') {
    form.append('num_questions', String(count));
    form.append('question_types', types.join(','));
    form.append('difficulty', level);
  }
  if (text.trim()) form.append('custom_instructions', text.trim());
  return form;
}

function ImportForm({ onAdd, onBusy, onClose }) {
  const [choice, setChoice] = useState({
    file: null,
    text: '',
    kind: 'questions_and_answers',
    grade: '',
    count: 10,
    types: ['multiple_choice'],
    level: 'medium',
  });
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setChoice((now) => ({ ...now, ...patch }));
  const material = choice.kind === 'lecture_material';
  const ready = (choice.file || choice.text.trim()) && (!material || choice.types.length) && !reading;

  const run = async () => {
    setReading(true);
    onBusy(true);
    setError('');
    try {
      const data = await readWithAI(importForm(choice));
      if (!data?.questions?.length) throw new Error(IMPORT.none);
      onAdd(data.questions.map(importedQuestion));
    } catch (failure) {
      setError(
        /RESOURCE_EXHAUSTED|429/.test(failure.message) || failure.status === 429 ? IMPORT.busy : failure.message
      );
      setReading(false);
      onBusy(false);
    }
  };

  return (
    <>
      <DialogTitle>{IMPORT.title}</DialogTitle>
      <DialogContent className="mst-qe-import">
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField
          select
          label={IMPORT.startFrom}
          value={choice.kind}
          disabled={reading}
          onChange={(e) => set({ kind: e.target.value })}
        >
          {Object.entries(IMPORT.kinds).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        {reading ? (
          <div className="mst-ai-progress" role="status">
            <div className="mst-ai-bar" />
            <span>{IMPORT.reading}</span>
          </div>
        ) : (
          <UploadDropzone
            accept={FILES}
            files={choice.file ? [choice.file] : []}
            hint={IMPORT.fileHint}
            onDrop={(files) => set({ file: files[0] })}
            onRemove={() => set({ file: null })}
            size="compact"
            title={choice.file ? IMPORT.chooseAnother : IMPORT.choose}
          />
        )}
        <TextField
          multiline
          minRows={2}
          maxRows={4}
          label={IMPORT.pasted}
          placeholder={IMPORT.pastedPlaceholder}
          value={choice.text}
          disabled={reading}
          onChange={(e) => set({ text: e.target.value })}
        />
        <div className="mst-qe-import-row">
          <TextField
            label={IMPORT.grade}
            placeholder={IMPORT.gradePlaceholder}
            value={choice.grade}
            disabled={reading}
            onChange={(e) => set({ grade: e.target.value })}
          />
          {material ? (
            <NumberField
              label={IMPORT.howMany}
              value={choice.count}
              disabled={reading}
              inputProps={{ min: 1, max: 50 }}
              onChange={(e) => set({ count: Number(e.target.value) })}
            />
          ) : null}
        </div>
        {material ? (
          <div className="mst-qe-import-row">
            <TextField
              select
              label={IMPORT.types}
              value={choice.types}
              disabled={reading}
              SelectProps={{
                multiple: true,
                renderValue: (values) => values.map((value) => TYPE_WORDS[value].label).join(', '),
              }}
              onChange={(e) => set({ types: e.target.value })}
            >
              {WRITABLE.map((value) => (
                <MenuItem key={value} value={value}>
                  <Checkbox checked={choice.types.includes(value)} size="small" />
                  <ListItemText primary={TYPE_WORDS[value].label} />
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={IMPORT.difficulty}
              value={choice.level}
              disabled={reading}
              onChange={(e) => set({ level: e.target.value })}
            >
              {Object.entries(IMPORT.levels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </div>
        ) : null}
        <p className="mst-qe-note">{IMPORT.check}</p>
      </DialogContent>
      <DialogActions>
        <Button disabled={reading} onClick={onClose}>
          {IMPORT.cancel}
        </Button>
        <Button
          className="mst-ai"
          variant="contained"
          startIcon={<AutoAwesomeRounded />}
          disabled={!ready}
          onClick={run}
        >
          {IMPORT.run}
        </Button>
      </DialogActions>
    </>
  );
}

// onAdd(questions) adds the imported questions; the window then closes. It can't close while AI is reading.
export default function ImportWithAI({ open, onAdd, onClose }) {
  const [busy, setBusy] = useState(false);
  const close = () => {
    setBusy(false);
    onClose();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="sm" fullWidth>
      {open ? (
        <ImportForm
          onBusy={setBusy}
          onAdd={(questions) => {
            setBusy(false);
            onAdd(questions);
          }}
          onClose={close}
        />
      ) : null}
    </Dialog>
  );
}
