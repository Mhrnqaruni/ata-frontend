import React, { useEffect, useRef, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, Typography, CircularProgress } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import MathText from '../../components/common/MathTextDisplay';
import api from '../../services/api';

/** File previews use the authenticated API, never a public storage URL. */
export default function FamilySource({ base, source }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const url = useRef(null);
  const invoker = useRef(null);
  const [requested, setRequested] = useState(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (url.current) URL.revokeObjectURL(url.current); }; }, []);
  function close() { if (url.current) URL.revokeObjectURL(url.current); url.current = null; setPreview(null); }
  async function open(file, index, button) {
    if (button) invoker.current = button;
    setRequested({ file, index });
    setBusy(true); setError('');
    try {
      const { data } = await api.get(`${base}/materials/${source.id}/files/${index}`, { responseType: 'blob' });
      if (!alive.current) return;
      close(); url.current = URL.createObjectURL(data); setPreview({ url: url.current, name: file.name, mime: file.mime });
    } catch { if (alive.current) setError('Could not open this file. Please try again.'); }
    finally { if (alive.current) setBusy(false); }
  }
  return <>
    <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0, boxShadow: 'none' }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography variant="body2">View original material</Typography></AccordionSummary>
      <AccordionDetails>
        {source.body && <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}><MathText text={source.body} /></Box>}
        <Stack spacing={0.5}>{source.files.map((file, i) => <Button disabled={busy} key={i} sx={{ justifyContent: 'flex-start', textAlign: 'left', overflowWrap: 'anywhere', minWidth: 0 }} onClick={event => open(file, i, event.currentTarget)}>{busy && requested?.index === i && <CircularProgress size={16} sx={{ mr: 1 }} aria-label="Opening file" />}{i + 1}. {file.name} · {file.pages} page(s)</Button>)}</Stack>
        {source.provenance?.author && <Typography variant="caption" color="text.secondary">Original {source.provenance.author} notes · version {source.provenance.version}</Typography>}
        {error && <Alert severity="error" action={<Button onClick={() => open(requested.file, requested.index)}>Retry</Button>}>{error}</Alert>}
      </AccordionDetails>
    </Accordion>
    <Dialog open={!!preview} onClose={close} maxWidth="md" fullWidth TransitionProps={{ onExited: () => invoker.current?.focus() }}>
      <DialogTitle>{preview?.name}</DialogTitle><DialogContent>
        {preview?.mime === 'application/pdf' ? <iframe title="Original material" src={preview.url} style={{ width: '100%', height: '65vh', border: 0 }} /> :
          preview && <Box component="img" src={preview.url} alt="Uploaded original page" sx={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} />}
      </DialogContent><DialogActions><Button onClick={close}>Close</Button></DialogActions>
    </Dialog>
  </>;
}
