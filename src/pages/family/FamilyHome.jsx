import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, ListSubheader, Paper, Stack, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import FamilyLearning from './FamilyLearning';
import { hasMode } from '../../services/accountModes';
import { queryClient, sessionGeneration } from '../../services/queryCache';

/** Child setup is deterministic. Learning tasks are attached in the next section. */
export default function FamilyHome() {
  const { user, enableMode } = useAuth();
  const enabled = hasMode(user, 'parent');
  const generation = sessionGeneration();
  const key = ['family', generation, user?.id, 'children'];
  const children = useQuery({ queryKey: key, enabled: !!user?.id && enabled,
    queryFn: async ({ signal }) => (await api.get('/api/parent/settings/manual-learners', { signal })).data });
  const [params, setParams] = useSearchParams();
  let rememberedChild = '';
  try { rememberedChild = sessionStorage.getItem(`mst.family.child.${user?.id}`) || ''; } catch { /* Storage is optional. */ }
  const selected = params.get('child') || rememberedChild;
  const setSelected = id => {
    try { sessionStorage.setItem(`mst.family.child.${user.id}`, id); } catch { /* URL selection still works. */ }
    setParams(id ? { child: id } : {}, { replace: true });
  };
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Never let account changes inherit child selection or pending form contents.
  useEffect(() => { setForm(null); setError(''); }, [user?.id]);
  const rows = children.data?.filter(child => child.isActive !== false) || [];
  const child = selected ? rows.find(item => item.id === selected) : rows[0];
  function addChild() { setError(''); setForm({ id: crypto.randomUUID(), name: '', year: '' }); }
  async function save() {
    const currentGeneration = sessionGeneration();
    setBusy(true); setError('');
    try {
      const method = form.edit ? 'patch' : 'put';
      await api[method](`/api/parent/settings/manual-learners/${form.id}`, {
        displayName: form.name.trim(), gradeLevel: form.year,
      });
      if (currentGeneration !== sessionGeneration()) return;
      await queryClient.invalidateQueries({ queryKey: key });
      setSelected(form.id); setForm(null);
    } catch (e) {
      if (currentGeneration === sessionGeneration()) setError(e.response?.data?.detail || 'Could not save. Please retry.');
    } finally { setBusy(false); }
  }
  if (user?.role === 'admin') return <Alert severity="info">Use an adult account for family learning.</Alert>;
  return <Box sx={{ maxWidth: 920, mx: 'auto' }}>
    <Stack spacing={3}>
      <Box><Typography variant="overline" color="primary">Parent mode</Typography>
        <Typography variant="h1">Your family</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>A space to help each child learn.</Typography></Box>
      {!enabled ? <Paper sx={{ p: 3 }}><Typography variant="h5">Start your family space</Typography>
        <Typography sx={{ my: 2 }}>Keep your family learning separate from your teaching.</Typography>
        <Button variant="contained" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await enableMode('parent'); } catch (e) { setError(e.message); } finally { setBusy(false); }
        }}>Enable Parent mode</Button></Paper> : children.isPending ? <CircularProgress aria-label="Loading your children" /> :
        children.isError ? <Alert severity="error" action={<Button onClick={() => children.refetch()}>Retry</Button>}>Could not load your children.</Alert> :
        rows.length === 0 ? <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 560 }}>
          <Typography variant="h4">Who are we helping?</Typography>
          <Typography color="text.secondary" sx={{ my: 2 }}>Add your child's name and school year. No school account needed.</Typography>
          <Button variant="contained" startIcon={<AddRounded />} onClick={addChild}>Add your child</Button>
        </Paper> : <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField select label="Learning for" value={child?.id || ''} onChange={e => {
              const value = e.target.value;
              if (value === '__add') addChild();
              else if (value === '__edit' && child) { setError(''); setForm({ id: child.id,
                name: child.displayName, year: child.gradeLevel || '', edit: true }); }
              else setSelected(value);
            }} sx={{ minWidth: 240, maxWidth: { sm: 380 } }}>
              {rows.map(item => <MenuItem key={item.id} value={item.id}>{item.displayName} · {item.gradeLevel || 'Year not set'}</MenuItem>)}
              <ListSubheader>Manage family</ListSubheader>
              <MenuItem value="__add">Add another child</MenuItem>
              {child && <MenuItem value="__edit">Edit {child.displayName}'s profile</MenuItem>}
            </TextField>
          </Stack>
          {child ? <FamilyLearning key={`${user.id}:${child.id}`} child={child} /> :
            <Alert severity="warning">That child is unavailable. Choose one of your children before preparing an activity.</Alert>}
        </>}
      {error && !form && <Alert severity="error">{error}</Alert>}
    </Stack>
    <Dialog open={!!form} onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="xs">
      <DialogTitle>{form?.edit ? "Edit child" : "Who are we helping?"}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <TextField autoFocus label="Child's first name" value={form?.name || ''} inputProps={{ maxLength: 255 }}
          onChange={e => setForm({ ...form, name: e.target.value })} disabled={busy} />
        <TextField select label="School year · England" value={form?.year || ''}
          onChange={e => setForm({ ...form, year: e.target.value })} disabled={busy}>
          {Array.from({ length: 11 }, (_, i) => `Year ${i + 1}`).map(year => <MenuItem value={year} key={year}>{year}</MenuItem>)}
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><Button disabled={busy} onClick={() => setForm(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || !form?.name.trim() || !form?.year} onClick={save}>{busy ? 'Saving…' : form?.edit ? 'Save changes' : 'Continue'}</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
