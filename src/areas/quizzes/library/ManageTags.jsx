// Manage tags, from the Tag filter's menu (L7; SOT-3): each quiz tag with its number of quizzes, to rename (a name
// already taken offers to merge the two) or delete (the quizzes stay, with their other tags).
// Area: quizzes

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DriveFileRenameOutline from '@mui/icons-material/DriveFileRenameOutline';
import ConfirmDialog from '../shared/ConfirmDialog';
import { deleteTag, mergeTag, renameTag } from './api';
import { LIBRARY } from './words';

// One tag's row: its name and number of quizzes, with Rename and Delete; or, while renamed, the name to save.
function TagRow({ tag, editing, busy, onEdit, onName, onSave, onCancel, onDelete }) {
  if (editing)
    return (
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}
      >
        <TextField
          autoFocus
          value={editing.name}
          onChange={(event) => onName(event.target.value)}
          inputProps={{ maxLength: 40, 'aria-label': LIBRARY.tagName }}
          sx={{ flex: 1 }}
        />
        <Button
          type="submit"
          size="small"
          variant="contained"
          disabled={busy || !editing.name.trim() || editing.name.trim() === tag.name}
        >
          {LIBRARY.save}
        </Button>
        <Button size="small" disabled={busy} onClick={onCancel}>
          {LIBRARY.cancel}
        </Button>
      </Box>
    );
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 52 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>
          {tag.name}
        </Typography>
        <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
          {LIBRARY.tagCount(tag.quiz_count)}
        </Typography>
      </Box>
      <Tooltip title={LIBRARY.renameTag(tag.name)}>
        <IconButton aria-label={LIBRARY.renameTag(tag.name)} disabled={busy} onClick={onEdit}>
          <DriveFileRenameOutline fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={LIBRARY.deleteTag(tag.name)}>
        <IconButton aria-label={LIBRARY.deleteTag(tag.name)} disabled={busy} onClick={onDelete}>
          <DeleteOutline fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// tags: the teacher's tags; onGone(tagId, intoId?) when a tag is deleted or merged into another; toast(message).
export default function ManageTags({ open, tags, onClose, onGone, toast }) {
  const [editing, setEditing] = useState(null); // { id, name }: the tag being renamed, and its new name
  const [taken, setTaken] = useState(null); // { tag, into }: the new name is already another tag's
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const attempt = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  const rename = (tag) =>
    attempt(async () => {
      const name = editing.name.trim();
      try {
        await renameTag(tag.id, name);
      } catch (failure) {
        const into = failure.status === 409 ? failure.data?.existing_tag_id : null;
        if (!into) throw failure;
        setTaken({ tag, into: (tags || []).find((each) => String(each.id) === String(into)) || { id: into, name } });
        return;
      }
      setEditing(null);
      toast(LIBRARY.tagRenamed);
    });
  const merge = () =>
    attempt(async () => {
      await mergeTag(taken.tag.id, taken.into.id);
      onGone(taken.tag.id, taken.into.id);
      setTaken(null);
      setEditing(null);
      toast(LIBRARY.tagsMerged);
    });
  const remove = () =>
    attempt(async () => {
      await deleteTag(deleting.id);
      onGone(deleting.id);
      setDeleting(null);
      toast(LIBRARY.tagDeleted);
    });
  const stopEditing = () => {
    setEditing(null);
    setTaken(null);
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="manage-tags">
        <DialogTitle id="manage-tags">{LIBRARY.manageTags}</DialogTitle>
        <DialogContent>
          {error && !deleting ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ) : null}
          {tags?.length ? (
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {tags.map((tag) => (
                <Box component="li" key={tag.id} sx={{ borderBottom: '1px solid var(--mst-edge)' }}>
                  <TagRow
                    tag={tag}
                    editing={editing?.id === tag.id ? editing : null}
                    busy={busy}
                    onEdit={() => {
                      setError('');
                      setTaken(null);
                      setEditing({ id: tag.id, name: tag.name });
                    }}
                    onName={(name) => {
                      setTaken(null);
                      setEditing({ id: tag.id, name });
                    }}
                    onSave={() => rename(tag)}
                    onCancel={stopEditing}
                    onDelete={() => setDeleting(tag)}
                  />
                  {taken?.tag.id === tag.id ? (
                    <Alert
                      severity="info"
                      sx={{ mb: 1 }}
                      action={
                        <Button color="inherit" size="small" disabled={busy} onClick={merge}>
                          {LIBRARY.mergeInto(taken.into.name)}
                        </Button>
                      }
                    >
                      {LIBRARY.tagTaken(taken.into.name)}
                    </Alert>
                  ) : null}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 14, color: 'var(--mst-ink-2)' }}>{LIBRARY.noTags}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={onClose}>
            {LIBRARY.done}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting ? LIBRARY.deleteTagTitle(deleting.name) : ''}
        tone="bad"
        confirmLabel={LIBRARY.deleteTagButton}
        busy={busy}
        error={deleting ? error : ''}
        onConfirm={remove}
        onCancel={() => {
          setError('');
          setDeleting(null);
        }}
      >
        {deleting ? LIBRARY.deleteTagText(deleting.quiz_count) : null}
      </ConfirmDialog>
    </>
  );
}
