import React, {useEffect, useRef, useState} from 'react';
import {Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme} from '@mui/material';
import {Document, Page, pdfjs} from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import reviewService from '../../services/reviewService';
import MathTextDisplay from '../common/MathTextDisplay';

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
  const [zoom, setZoom] = useState(1);
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
        if (active) setError('The submitted script could not be loaded. Close this window and try opening it again; your unsaved draft stays in place. If the grading attempt changed, copy your draft before reopening the review.');
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
  return <Dialog open onClose={onClose} fullScreen={phone} fullWidth maxWidth="lg" aria-labelledby="script-dialog-title">
    <DialogTitle id="script-dialog-title">Submitted script · {studentName}</DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="warning" sx={{mb:1}}>{error}</Alert>}
      {!url && !error && <Box role="status" sx={{p:4, textAlign:'center'}}><CircularProgress size={28}/><p>Loading the retained script…</p></Box>}
      {source && <>
        <p style={{marginTop:0, overflowWrap:'anywhere'}}>{source.originals.length === 1 ? source.originals[0].name : source.name}{source.attempt ? ` · Attempt ${source.attempt}` : ''}</p>
        {!source.captured && <Alert severity="info">Historical file: the exact input at grading time was not captured.</Alert>}
        <p>{source.evidencePages?.length ? `AI-cited physical page${source.evidencePages.length>1?'s':''}: ${source.evidencePages.join(', ')}. Check the writing itself.` : 'No reliable question-page location was recorded. Browse the script to find this answer.'}</p>
        {source.pages > 1 && <Box sx={{display:'flex', alignItems:'center', justifyContent:'center', gap:2, mb:1}}>
          <Button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous page</Button>
          <span aria-live="polite">{page} / {source.pages}</span>
          <Button disabled={page>=source.pages} onClick={()=>setPage(value=>value+1)}>Next page</Button>
        </Box>}
        <Box sx={{display:'flex', gap:1, justifyContent:'center', mb:1}}>
          <Button disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.25))}>Zoom out</Button>
          <span style={{alignSelf:'center'}}>{Math.round(zoom*100)}%</span>
          <Button disabled={zoom>=2} onClick={()=>setZoom(value=>Math.min(2,value+.25))}>Zoom in</Button>
        </Box>
        <Box sx={{display:{xs:'block',md:'grid'},gridTemplateColumns:'minmax(0, 2fr) minmax(240px, 1fr)',gap:2}}>
        <Box ref={container} sx={{width:'100%', minWidth:0, overflow:'auto', bgcolor:'white'}}>
          {source.mime === 'application/pdf' ? <Document file={url} loading="Opening script…" onLoadError={()=>setError('The PDF could not be displayed. Use the downloaded original file.')}> 
            <Page pageNumber={Math.min(page, source.pages)} width={Math.min(width, 1100)*zoom} renderTextLayer={false} renderAnnotationLayer={false}/>
          </Document> : <img src={url} alt={`Submitted script for ${studentName}`} style={{display:'block', width:`${zoom*100}%`, maxWidth:'none', height:'auto'}}/>}
        </Box>
        <Box component="aside" sx={{minWidth:0, mt:{xs:2,md:0}, p:2, bgcolor:'action.hover', borderRadius:2, alignSelf:'start'}}>
          <strong>{question.printedLabel || 'Selected question'}</strong>
          <p><MathTextDisplay text={question.questionText}/></p>
          <strong>AI reading</strong>
          <p><MathTextDisplay text={question.studentAnswer || 'No answer was read.'}/></p>
          <small>Close this window to edit the mark or feedback. Your draft stays in place.</small>
        </Box>
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
