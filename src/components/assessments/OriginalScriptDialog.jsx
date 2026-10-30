import React, {useEffect, useRef, useState} from 'react';
import {Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme} from '@mui/material';
import {Document, Page, pdfjs} from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import reviewService from '../../services/reviewService';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Read-only comparison. Closing or paging never saves a mark or a transcription. */
export default function OriginalScriptDialog({jobId, studentId, studentName, question, onClose}) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [source, setSource] = useState(null);
  const [url, setUrl] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(600);
  const [downloading, setDownloading] = useState(false);
  const container = useRef(null);
  const alive = useRef(true);
  useEffect(() => {
    let active = true, ownedUrl;
    alive.current = true;
    (async () => {
      try {
        const metadata = await reviewService.source(jobId, studentId, question.questionId, question.sourceExecutionId || 'legacy');
        const blob = await reviewService.sourceContent(jobId, studentId, question.questionId, metadata);
        if (!active) return;
        ownedUrl = URL.createObjectURL(blob);
        setSource(metadata); setPage(metadata.evidencePages?.[0] || 1); setUrl(ownedUrl);
      } catch {
        if (active) setError('The submitted script could not be loaded. Close this window and refresh the review before trying again.');
      }
    })();
    return () => { active = false; alive.current = false; if (ownedUrl) URL.revokeObjectURL(ownedUrl); };
  }, [jobId, studentId, question.questionId, question.sourceExecutionId]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, Math.floor(entries[0].contentRect.width))));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [url]);
  const download = async original => {
    setDownloading(true);
    try {
      const blob = await reviewService.sourceContent(jobId, studentId, question.questionId, source, original.index);
      if (!alive.current) return;
      const link = document.createElement('a'), address = URL.createObjectURL(blob);
      link.href = address; link.download = original.name; link.click();
      setTimeout(() => URL.revokeObjectURL(address), 1000);
    } catch { if (alive.current) setError('The original file could not be downloaded. The review draft is unchanged.'); }
    finally { if (alive.current) setDownloading(false); }
  };
  return <Dialog open onClose={onClose} fullScreen={phone} fullWidth maxWidth="md" aria-labelledby="script-dialog-title">
    <DialogTitle id="script-dialog-title">Submitted script · {studentName}</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="warning" sx={{mb:1}}>{error}</Alert>}
      {!url && !error && <Box role="status" sx={{p:4, textAlign:'center'}}><CircularProgress size={28}/><p>Loading the retained script…</p></Box>}
      {source && <>
        <p style={{marginTop:0}}>{source.name}{source.attempt ? ` · Attempt ${source.attempt}` : ''}</p>
        {!source.captured && <Alert severity="info">Historical file: the exact input at grading time was not captured.</Alert>}
        <p>{source.evidencePages?.length ? `AI-cited physical page${source.evidencePages.length>1?'s':''}: ${source.evidencePages.join(', ')}. Check the writing itself.` : 'No reliable question-page location was recorded. Browse the script to find this answer.'}</p>
        {source.pages > 1 && <Box sx={{display:'flex', alignItems:'center', justifyContent:'center', gap:2, mb:1}}>
          <Button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous page</Button>
          <span aria-live="polite">{page} / {source.pages}</span>
          <Button disabled={page>=source.pages} onClick={()=>setPage(value=>value+1)}>Next page</Button>
        </Box>}
        <Box ref={container} sx={{width:'100%', minWidth:0, overflow:'auto', bgcolor:'white'}}>
          {source.mime === 'application/pdf' ? <Document file={url} loading="Opening script…" onLoadError={()=>setError('The PDF could not be displayed. Use the downloaded original file.')}> 
            <Page pageNumber={Math.min(page, source.pages)} width={Math.min(width, 1100)} renderTextLayer={false} renderAnnotationLayer={false}/>
          </Document> : <img src={url} alt={`Submitted script for ${studentName}`} style={{display:'block', width:'100%', height:'auto'}}/>}
        </Box>
        {!!source.originals.length && <Box sx={{mt:2}}>
          <span>Original uploads</span>
          {source.originals.map(original=><Button key={original.index} disabled={downloading} onClick={()=>download(original)} sx={{display:'block', textTransform:'none', overflowWrap:'anywhere', textAlign:'left'}}>Download {original.name}</Button>)}
        </Box>}
      </>}
    </DialogContent>
    <DialogActions>
      {url && source && <Button component="a" href={url} download={source.mime === 'application/pdf' ? 'submitted-script.pdf' : 'submitted-script.png'}>Download script</Button>}
      <Button variant="contained" onClick={onClose}>Back to review</Button>
    </DialogActions>
  </Dialog>;
}
