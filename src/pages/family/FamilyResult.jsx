import React, { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../services/queryCache';
import MathText from '../../components/common/MathTextDisplay';

const Prose = ({ text }) => <Box sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75 }}><MathText text={text} /></Box>;

/** Adult review and parent-recorded practice; generated work is not completion. */
export default function FamilyResult({ activity, onRecord, busy, attempts = [], draftKey, saveError, onNext, sourceFiles = [] }) {
  // A session-only, owner/child/activity-scoped draft survives navigation, not sign-out.
  const { data: draft } = useQuery({ queryKey: draftKey, enabled: false,
    queryFn: () => ({ answers: {}, attemptId: crypto.randomUUID() }),
    initialData: () => ({ answers: {}, attemptId: crypto.randomUUID() }), gcTime: 3600000 });
  const answers = draft.answers;
  const setAnswers = value => queryClient.setQueryData(draftKey, { ...draft, answers: value });
  const resetDraft = () => queryClient.setQueryData(draftKey, { answers: {}, attemptId: crypto.randomUUID() });
  const [reveal, setReveal] = useState(false);

  const result = activity.result;
  if (!result) return null;
  const recorded = attempts.filter(row => row.activityId === activity.id);
  return <Stack spacing={2.5}>
    <Typography variant="h4">{result.title}</Typography>
    {result.needsInformation && <Alert severity="warning">{result.message}</Alert>}
    {result.explanation && <Prose text={result.explanation} />}
    {activity.kind === 'quiz' && result.questions.length > 0 && <>
      <Typography color="text.secondary">Review the questions, then record your child’s answers. Results are recorded by you.</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap aria-label="Quiz questions">
        {result.questions.map((question, index) => <Button key={question.id} size="small" variant="outlined"
          onClick={() => document.getElementById(`family-${activity.id}-${question.id}`)?.scrollIntoView({ behavior: 'auto', block: 'center' })}>
          {index + 1}{answers[question.id] !== undefined ? ' ✓' : ''}</Button>)}
      </Stack>
      {result.questions.map((question, index) => <Box id={`family-${activity.id}-${question.id}`} key={question.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Question {index + 1}</Typography>
        <Prose text={question.text} />
        <RadioGroup aria-label={`Answer for question ${index + 1}`} value={answers[question.id] ?? ''}
          onChange={event => setAnswers({ ...answers, [question.id]: Number(event.target.value) })}>
          {question.options.map((option, i) => <FormControlLabel key={i} value={i} control={<Radio disabled={busy} size="small" inputProps={{ "aria-label": `Question ${index + 1}, option ${i + 1}: ${option}` }} />} label={<MathText text={option} />} />)}
        </RadioGroup>
        {reveal && <Alert severity="info"><MathText text={`Answer: ${question.options[question.correctIndex]}\n${question.explanation}`} /></Alert>}
      </Box>)}
      <Typography variant="body2" color="text.secondary">{Object.keys(answers).length} of {result.questions.length} answers entered · draft kept in this session</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" onClick={() => setReveal(!reveal)}>{reveal ? 'Hide answers' : 'Review answers'}</Button>
        <Button variant="contained" disabled={busy || Object.keys(answers).length !== result.questions.length}
          onClick={async () => { if (await onRecord(draft.attemptId, answers)) resetDraft(); }}>Save practice result</Button>
        {Object.keys(answers).length > 0 && <Button disabled={busy} onClick={resetDraft}>Reset unsaved answers</Button>}
      </Stack>
      {saveError && <Alert severity="error">{saveError}</Alert>}
      {recorded.map(record => <Alert key={record.id} severity="success">Recorded by parent: {record.score} / {record.total} · {new Date(record.createdAt).toLocaleDateString()}</Alert>)}
    </>}
    {activity.kind === 'flashcards' && <Typography color="text.secondary">{result.cards.length} cards · Select a card to reveal its answer.</Typography>}
    {activity.kind === 'flashcards' && result.cards.map((card, i) => <Accordion key={i} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><MathText text={`${i + 1}. ${card.front}`} /></AccordionSummary>
      <AccordionDetails><Prose text={card.back} /></AccordionDetails>
    </Accordion>)}
    {activity.kind === 'check' && !result.needsInformation && <>
      <Alert severity="info">AI guidance, not an official grade. Review suggested answers against the original work.</Alert>
      {result.checks.length > 0 && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Looks correct: ${result.checks.filter(check => check.judgement === 'correct').length}`} />
        <Chip size="small" label={`To review: ${result.checks.filter(check => check.judgement !== 'correct').length}`} />
      </Stack>}
      {result.checks.map(check => <Box key={check.label} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}><Typography variant="h6">{check.label}</Typography>
          <Chip size="small" label={check.judgement === 'correct' ? 'Looks correct' : check.judgement === 'uncertain' ? 'Unclear — review needed' : 'Needs another look'}
            color={check.judgement === 'correct' ? 'success' : 'warning'} /></Stack>
        <Prose text={check.question} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Written answer</Typography><Prose text={check.studentAnswer} />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Suggested answer</Typography><Prose text={check.expectedAnswer} />
        <Prose text={check.feedback} />
      </Box>)}
    </>}
    {result.references.length > 0 && <Typography variant="caption" color="text.secondary">Source pages: {result.references.map(ref => `${sourceFiles[ref.fileNumber - 1]?.name || `File ${ref.fileNumber}`}, page ${ref.page}`).join(' · ')}</Typography>}
    {activity.kind !== 'quiz' && !result.needsInformation && <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={busy} onClick={onNext}>Try 3 practice questions</Button>}
    {result.nextStep && <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}><Typography variant="subtitle2">A useful next step</Typography><Prose text={result.nextStep} /></Box>}
  </Stack>;
}
