// Choose a topic (Phase 1.38 design §10.3): MySmartTeach's ready-made notes as a search field and radio rows by year,
// the child's year first; one is chosen, then "Add to Sam's materials". It opens from the address (?dialog=topics).
// Area: family

import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import useDialogParam from '../useDialogParam';
import './makeDialog.css';

/**
 * `sources` are the child's materials, so a topic already added is chosen again rather than added twice.
 * `onChosen(materialId)` runs once the topic's notes are ready to use.
 */
export default function TopicPicker({ child, sources, onChosen }) {
  const userId = useAuth().user?.id;
  const generation = sessionGeneration();
  const phone = useMediaQuery('(max-width:599px)');
  const [open, , hide] = useDialogParam('topics');
  const catalogue = useQuery({
    queryKey: familyKeys.topics(generation, userId),
    queryFn: ({ signal }) => familyApi.topics({ signal }),
    enabled: open,
  });
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const year = Number((child.gradeLevel || '').replace(/[^0-9]/g, ''));
  const words = search.trim().toLowerCase();
  const topics = (catalogue.data?.topics || []).filter((topic) => !words || topic.title.toLowerCase().includes(words));
  // The child's year first, then the other years in order (design §10.3).
  const years = [...new Set(topics.map((topic) => topic.year))].sort((a, b) =>
    a === year ? -1 : b === year ? 1 : a - b
  );
  function close() {
    if (busy) return;
    setPicked(null);
    setSearch('');
    setError('');
    hide();
  }
  async function add() {
    const topic = picked;
    if (!topic || busy) return;
    const existing = sources.find((item) => item.provenance?.id === topic.id);
    if (existing) {
      onChosen(existing.id);
      close();
      return;
    }
    // A retry of the same topic after an error reuses its id, so it's never added twice.
    if (pending.current?.topicId !== topic.id) pending.current = { id: crypto.randomUUID(), topicId: topic.id };
    setBusy(true);
    setError('');
    try {
      const data = await familyApi.addTopic(child.id, pending.current.id, topic.id);
      pending.current = null;
      await queryClient.invalidateQueries({ queryKey: familyKeys.home(generation, userId, child.id) });
      onChosen(data.id);
      setBusy(false);
      close();
    } catch (e) {
      setError(familyError(e, 'This could not finish. Your saved work is safe.'));
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      fullScreen={phone}
      className="fam-dialog fam-dialog-top fam-topics"
      aria-labelledby="fam-topics-title"
    >
      <DialogTitle id="fam-topics-title">Choose a topic</DialogTitle>
      <DialogContent>
        <p className="fam-dialog-lead">
          Ready-made notes for {child.gradeLevel || 'each school year'}. The AI assistant reads them like a worksheet.
        </p>
        <TextField
          className="fam-tp-search"
          placeholder="Search topics"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          InputProps={{ startAdornment: <SearchRounded className="fam-tp-search-icon" aria-hidden /> }}
          inputProps={{ 'aria-label': 'Search topics' }}
        />
        {catalogue.isError && (
          <Alert severity="error" action={<Button onClick={() => catalogue.refetch()}>Try again</Button>}>
            The topics couldn’t load just now. Try again in a moment.
          </Alert>
        )}
        {catalogue.isPending && <CircularProgress aria-label="Loading topics" />}
        {catalogue.data && !topics.length && <p className="fam-small">No topic matches that. Try another word.</p>}
        {years.map((y) => (
          <div key={y} className="fam-tp-group" role="radiogroup" aria-label={`Year ${y}`}>
            <Typography className="fam-tp-label">Year {y}</Typography>
            {topics
              .filter((topic) => topic.year === y)
              .map((topic) => {
                const on = picked?.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="mst-g1 mst-rim fam-tp-row"
                    disabled={busy}
                    onClick={() => setPicked(topic)}
                  >
                    {on ? <RadioButtonCheckedRounded aria-hidden /> : <RadioButtonUncheckedRounded aria-hidden />}
                    <span className="fam-tp-text">
                      <span className="fam-tp-name">{topic.title}</span>
                      <span className="fam-tp-meta">MySmartTeach notes</span>
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!picked || busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
          onClick={add}
          data-mst="family-topic-add"
        >
          {busy ? 'Adding…' : `Add to ${child.displayName}’s materials`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
