import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import MathText from '../../components/common/MathTextDisplay';

const Prose = ({ text }) => <Box sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75 }}><MathText text={text} /></Box>;

/** Adult review and parent-recorded practice; generated work is not completion. */
export default function FamilyResult({ activity, onRecord, busy, attempts = [] }) {
  const [answers, setAnswers] = useState({});
  const [reveal, setReveal] = useState(false);
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID());
  const result = activity.result;
  if (!result) return null;
  const recorded = attempts.filter(row => row.activityId === activity.id);
  return <Stack spacing={2.5}>
    <Typography variant="h4">{result.title}</Typography>
    {result.needsInformation && <Alert severity="warning">{result.message}</Alert>}
    {result.explanation && <Prose text={result.explanation} />}
    {activity.kind === 'quiz' && result.questions.length > 0 && <>
      <Typography color="text.secondary">Review these questions first. You can record the answers your child gives; this is recorded by you, not an independent school assessment.</Typography>
      {result.questions.map((question, index) => <Box key={question.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Question {index + 1}</Typography>
        <Prose text={question.text} />
        <RadioGroup aria-label={`Answer for question ${index + 1}`} value={answers[question.id] ?? ''}
          onChange={event => setAnswers({ ...answers, [question.id]: Number(event.target.value) })}>
          {question.options.map((option, i) => <FormControlLabel key={i} value={i} control={<Radio size="small" inputProps={{ "aria-label": `Question ${index + 1}, option ${i + 1}: ${option}` }} />} label={<MathText text={option} />} />)}
        </RadioGroup>
        {reveal && <Alert severity="info"><MathText text={`Answer: ${question.options[question.correctIndex]}\n${question.explanation}`} /></Alert>}
      </Box>)}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide answers' : 'Review answers'}</Button>
        <Button variant="contained" disabled={busy || Object.keys(answers).length !== result.questions.length}
          onClick={async () => { if (await onRecord(attemptId, answers)) { setAttemptId(crypto.randomUUID()); setAnswers({}); } }}>Save parent-recorded practice</Button>
      </Stack>
      {recorded.map(record => <Alert key={record.id} severity="success">Recorded by parent: {record.score} / {record.total} · {new Date(record.createdAt).toLocaleDateString()}</Alert>)}
    </>}
    {activity.kind === 'flashcards' && result.cards.map((card, i) => <Accordion key={i} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><MathText text={`${i + 1}. ${card.front}`} /></AccordionSummary>
      <AccordionDetails><Prose text={card.back} /></AccordionDetails>
    </Accordion>)}
    {activity.kind === 'check' && <>
      <Alert severity="info">AI guidance for your review, not an official grade. Expected answers are AI-generated unless an answer key is visible in your files.</Alert>
      {result.checks.map(check => <Box key={check.label} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Typography variant="h6">{check.label}</Typography>
          <Chip size="small" label={check.judgement === 'correct' ? 'Looks correct' : check.judgement === 'uncertain' ? 'Unclear — review needed' : 'Needs another look'}
            color={check.judgement === 'correct' ? 'success' : 'warning'} /></Stack>
        <Prose text={check.question} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Written answer</Typography><Prose text={check.studentAnswer} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Suggested answer</Typography><Prose text={check.expectedAnswer} />
        <Prose text={check.feedback} />
      </Box>)}
    </>}
    {result.references.length > 0 && <Typography variant="caption" color="text.secondary">Source pages: {result.references.map(ref => `file ${ref.fileNumber}, page ${ref.page}`).join(' · ')}</Typography>}
    {result.nextStep && <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}><Typography variant="subtitle2">A useful next step</Typography><Prose text={result.nextStep} /></Box>}
  </Stack>;
}
