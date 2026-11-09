// The add, edit and remove dialogs for children (Phase 1.38 design §3.5; C-9, C-18), in teacher's dialog, each opened
// from the address (?dialog=add-child, edit-child or remove-child) so Back closes it. The shell draws them on every page.
// Area: family

import { useId, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  useMediaQuery,
} from '@mui/material';
import PersonRemoveOutlined from '@mui/icons-material/PersonRemoveOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import { familyPath } from '../familyPaths';
import useDialogParam, { openAt, useLiveLocation } from '../useDialogParam';
import { ChildForm, blankChild, detailsOf, saveChild } from './ChildForm';

/** `child` is the address's child, or null; `children` are the parent's active children. */
export default function ChildDialogs({ child, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const live = useLiveLocation();
  // Phones get a full-screen sheet (design §3.5, [HIG: Sheets]).
  const phone = useMediaQuery('(max-width:599px)');
  const nameRef = useRef(null);
  const confirm = useId();
  const [adding, , hideAdd] = useDialogParam('add-child');
  const [editing, , hideEdit] = useDialogParam('edit-child');
  const [removing, showRemove, hideRemove] = useDialogParam('remove-child');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  // The dialog the address asks for. It opens fresh: blank to add, or with the child's details to edit. Remove's
  // confirm sits over the edit dialog, which keeps its form.
  const dialog = adding ? 'add' : (editing || removing) && child ? 'edit' : '';
  const [shown, setShown] = useState('');
  if (shown !== dialog) {
    setShown(dialog);
    setForm(dialog === 'add' ? blankChild() : dialog === 'edit' ? detailsOf(child) : null);
    setError('');
    setTried(false);
  }
  const close = () => (dialog === 'add' ? hideAdd() : hideEdit());
  const name = child?.displayName || 'this child';
  const ready = form && form.name.trim() && form.year;

  async function save() {
    setTried(true);
    if (!ready || busy) return;
    const current = form;
    setBusy(true);
    setError('');
    try {
      const saved = await saveChild(current, user.id, () => setForm((value) => value && { ...value, saved: true }));
      if (!saved) return;
      // A new child's page takes the add dialog's place in the history (unless Back closed it meanwhile; the switcher
      // lists the child then); an edit goes back to the page.
      if (dialog !== 'add') close();
      else if (openAt(live.current, 'add-child')) navigate(familyPath(current.id), { replace: true });
    } catch (e) {
      setError(familyError(e, 'Could not save. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const generation = sessionGeneration();
    const id = child.id;
    setBusy(true);
    setError('');
    try {
      await familyApi.removeChild(id);
      if (generation !== sessionGeneration()) return;
      // The list drops the child at once, so its page never shows it as unavailable. The next child's Home, or the
      // first-run screen when none is left, takes the dialogs' place in the history (design §3.5).
      const key = familyKeys.children(generation, user.id);
      queryClient.setQueryData(key, (list) => list?.filter((item) => item.id !== id));
      const next = children.find((item) => item.id !== id);
      navigate(next ? familyPath(next.id) : '/family', { replace: true });
      void queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      // Back to the edit dialog, which shows what went wrong.
      setError(familyError(e, 'Could not remove. Please try again.'));
      hideRemove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={!!form}
        onClose={() => {
          if (!busy) close();
        }}
        fullWidth
        maxWidth="sm"
        fullScreen={phone}
        TransitionProps={{ onEntered: () => nameRef.current?.focus() }}
        className="fam-child-dialog"
      >
        <DialogTitle>{form?.edit ? `Edit ${name}’s details` : 'Add a child'}</DialogTitle>
        <DialogContent>
          {/* One sentence on what happens (design §10.1). */}
          {!form?.edit && (
            <Typography className="fam-dialog-sub">Their first name and school year are all you need.</Typography>
          )}
          {form && (
            <ChildForm
              form={form}
              setForm={setForm}
              busy={busy}
              nameRef={nameRef}
              tried={tried}
              childName={child?.displayName}
            />
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
              {form?.saved &&
                ' Your child is saved. Try the upload again, or close and add worksheets from their notebook.'}
            </Alert>
          )}
          {/* Apart at the end of the form, as Contacts keeps Delete at the end of Edit, never beside Cancel. */}
          {form?.edit && !form?.saved && (
            <div className="fam-cf-remove">
              <Button
                startIcon={<PersonRemoveOutlined />}
                disabled={busy}
                onClick={showRemove}
                data-mst="family-remove-child"
              >
                Remove {name}
              </Button>
              {/* What Remove does, before it's pressed (row 3's tester: "I'd never press it"). */}
              <span className="fam-cf-remove-note">Takes {name} off parent mode. It asks you first.</span>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {/* What's missing is said under each field (ChildForm, design §10.1). */}
          <span className="fam-grow" />
          <Button disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy} onClick={save} data-mst="family-save-child">
            {busy ? 'Saving…' : form?.saved ? 'Try the upload again' : form?.edit ? 'Save changes' : 'Add child'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Teacher's ConfirmationModal, built from its parts with design §3.5's words, because its own buttons always
        say Cancel and "Deleting…". The destructive button is red and never the default ([HIG: Alerts]). */}
      <Dialog
        open={removing && !!child}
        onClose={() => {
          if (!busy) hideRemove();
        }}
        aria-labelledby={`${confirm}-title`}
        aria-describedby={`${confirm}-text`}
        PaperProps={{ 'data-mst': 'confirm-dialog' }}
      >
        <DialogTitle id={`${confirm}-title`}>Remove {name} from parent mode?</DialogTitle>
        <DialogContent>
          <DialogContentText id={`${confirm}-text`}>
            {name}’s page and lists go away. {name}’s homework checks, chats and activities stay saved on MySmartTeach,
            but you won’t see them in parent mode.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={hideRemove} data-mst="family-keep-child">
            Keep {name}
          </Button>
          <Button variant="contained" color="error" disabled={busy} onClick={remove} data-mst="family-confirm-remove">
            {busy ? 'Removing…' : `Remove ${name}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
