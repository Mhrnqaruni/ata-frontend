import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

const fields = { text: 'Question', answer: 'Answer', rubric: 'Marking scheme', maxScore: 'Marks', structure: 'Question structure' };
const kinds = { printed: 'Printed', handwritten: 'Handwritten', mixed: 'Mixed print and handwriting', uncertain: 'Uncertain document type' };

function ReadingNote({ issue }) {
  const alternatives = [...new Set(issue.alternatives || [])].filter(Boolean);
  return <Box sx={{ overflowWrap: 'anywhere' }}>
    <Typography variant="body2" fontWeight={600}>
      {fields[issue.field] || 'Source'} · {issue.document === 'questions' ? 'Question paper' : 'Answer key'}
      {issue.fileIndex ? ` · file ${issue.fileIndex}` : ''}
      {issue.page ? ` · page ${issue.page}` : ''}
    </Typography>
    <Typography variant="body2">{issue.note}</Typography>
    {alternatives.length > 0 && <>
      <Typography variant="body2" sx={{ mt: 0.5 }}>Possible readings (not confirmed):</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {alternatives.map((value, index) => <li key={index}><Typography variant="body2">{value}</Typography></li>)}
      </Box>
    </>}
  </Box>;
}

export function ExtractionSummary({ review }) {
  if (!review) return null;
  const issues=review.issues || [];
  const general=issues.filter(issue=>!issue.questionId);
  return <Box sx={{mb:2}}>
    {issues.length>0 && <Alert severity="warning" sx={{mb:1}}>Check the flagged source notes before continuing. Edit unclear questions or answers below.</Alert>}
    {!review.answerKeyDocumentType && <Alert severity="info" sx={{mb:1}}>No answer key was uploaded. Review or prepare the shared answers and marking scheme before grading.</Alert>}
    <details className="mst-source-notes"><summary>Source notes</summary>
      <Typography variant="body2" sx={{mt:1}}>{review.readerCount===3?'Three independent readings compared.':'Documents read visually.'} {kinds[review.questionDocumentType]||'Uncertain'} question paper{review.answerKeyDocumentType?` · ${kinds[review.answerKeyDocumentType]||'Uncertain'} answer key`:''}. {review.reconciled?'Differences were checked against the originals. ':''}Review the extracted content; agreement is not a guarantee of accuracy.</Typography>
      {general.map((issue,index)=><Alert key={index} severity="warning" sx={{mt:1}}><ReadingNote issue={issue}/></Alert>)}
    </details>
  </Box>;
}

export function QuestionReadingNotes({ issues }) {
  if (!issues.length) return null;
  return <Alert severity="warning" sx={{ mb: 2 }}>
    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Check source: {[...new Set(issues.map(issue=>fields[issue.field] || "Source"))].join(", ")}</Typography>
    {issues.map((issue, index) => <Box key={index} sx={{ mt: index ? 1.5 : 0 }}><ReadingNote issue={issue} /></Box>)}
    <Typography variant="body2" sx={{ mt: 1 }}>Check the original and edit the fields below. These notes describe the AI extraction.</Typography>
  </Alert>;
}
