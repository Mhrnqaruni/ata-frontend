import React, { useEffect, useRef, useState } from 'react';
import { TextField, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useNumberInput from '../../../hooks/useNumberInput';
import MathInputWithPreview from '../../common/MathInputWithPreview';
import MathTextDisplay from '../../common/MathTextDisplay';
import QuestionNavigator from '../../common/QuestionNavigator';
import { ExtractionSummary, QuestionReadingNotes } from './ExtractionReviewNotes';

const MaxScoreField = ({ value, onChange, disabled }) => {
  const props = useNumberInput(value || 0, onChange, { defaultValue: 0, min: 1, max: 1000, integer: false });
  return <TextField type="number" label="Marks" {...props} disabled={disabled}
    inputProps={{ min: 1 }} sx={{ maxWidth: 150 }} />;
};

export default function StructureReviewer({ config, dispatch, disabled }) {
  const questions = config.sections.flatMap(section => section.questions);
  const questionIds = new Set(questions.map(question => question.id));
  const readingReview = config.extractionReview ? {
    ...config.extractionReview,
    issues: (config.extractionReview.issues || []).filter(issue => !issue.questionId || questionIds.has(issue.questionId)),
  } : null;
  const [expanded, setExpanded] = useState(questions[0] ? [questions[0].id] : []);
  const [selectedId, setSelectedId] = useState(questions[0]?.id);
  const [showAll, setShowAll] = useState(false);
  const activeId = questionIds.has(selectedId) ? selectedId : questions[0]?.id;
  const selectQuestion = id => {
    setSelectedId(id); setShowAll(false);
    setExpanded(previous => previous.includes(id) ? previous : [...previous, id]);
  };
  const navItems = questions.map((question, index) => ({
    id: question.id, number: index + 1, title: question.text || 'Untitled question',
    state: (readingReview?.issues || []).some(issue => issue.questionId === question.id) ? 'Needs review' : undefined,
  }));
  const known = useRef(new Set(questions.map(q => q.id)));
  useEffect(() => {
    const ids = new Set(config.sections.flatMap(section => section.questions.map(q => q.id)));
    const added = [...ids].filter(id => !known.current.has(id));
    setExpanded(previous => [...previous.filter(id => ids.has(id)), ...added]);
    if (added.length) { setSelectedId(added[added.length - 1]); setShowAll(false); }
    known.current = ids;
  }, [config.sections]);
  const update = (sectionId, questionId, field, value) =>
    dispatch({ type: 'UPDATE_QUESTION_FIELD', payload: { sectionId, questionId, field, value } });
  const toggle = id => setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  return (
    <div className="mst-structure-review">
      <ExtractionSummary review={readingReview} />
      {config.paperInstructions && <MathInputWithPreview fullWidth multiline minRows={2}
        label="Paper instructions" value={config.paperInstructions} disabled={disabled}
        helperText="These instructions apply to every question."
        onChange={event => dispatch({type:'UPDATE_CONFIG_FIELD', payload:{field:'paperInstructions', value:event.target.value}})} /> }
      <div className="mst-structure-toolbar">
        <p>Check the extracted questions and answers before you continue.</p>
        {showAll && <div>
          <Button size="small" onClick={() => setExpanded(questions.map(q => q.id))}>Expand all</Button>
          <Button size="small" onClick={() => setExpanded([])}>Collapse all</Button>
        </div>}
      </div>
      <div className="mst-question-workspace mst-extraction-workspace">
        <QuestionNavigator items={navItems} selected={showAll ? null : activeId} onSelect={selectQuestion}>
          <Button fullWidth size="small" variant={showAll ? "contained" : "outlined"} aria-pressed={showAll}
            sx={{ mb: 1 }} onClick={() => { setShowAll(true); setExpanded(questions.map(q => q.id)); }}>See all</Button>
        </QuestionNavigator>
        <div>
      {config.sections.map((section, sectionIndex) => (
        (showAll || !questions.length || section.questions.some(q => q.id === activeId)) && (
        <section className="mst-sr-section" key={section.id}>
          <h3>Section {sectionIndex + 1} · {section.title} <span className="mst-count">{section.questions.length}</span></h3>
          <div className="mst-sr-list">
            {section.questions.filter(q => showAll || q.id === activeId).map((q) => {
              const open = expanded.includes(q.id);
              const readingIssues = (readingReview?.issues || []).filter(issue => issue.questionId === q.id);
              const number = questions.findIndex(item => item.id === q.id) + 1;
              return (
                <div className="mst-sr-q" key={q.id}>
                  <button type="button" className="mst-extracted-toggle" onClick={() => toggle(q.id)}
                    aria-expanded={open} aria-controls={`extracted-${q.id}`} aria-label={`${q.printedLabel || `Question ${number}`}: ${q.text || 'Untitled'}`}>
                    <span className="mst-question-num" aria-hidden="true">{q.printedLabel || number}</span>
                    <span className="mst-extracted-preview"><MathTextDisplay text={q.text || `Question ${number} · add question text`} />{readingIssues.length > 0 ? ' · Check source' : ''}</span>
                    <span className="mst-hint">{q.maxScore ?? 0} marks</span>
                    <span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div id={`extracted-${q.id}`} className="mst-extracted-body">
                    <QuestionReadingNotes issues={readingIssues} />
                    <div className="mst-extracted-actions">
                      <MaxScoreField value={q.maxScore} onChange={value => update(section.id, q.id, 'maxScore', value)} disabled={disabled} />
                      <IconButton aria-label={`Remove question ${number}`} disabled={disabled}
                        onClick={() => dispatch({ type: 'REMOVE_QUESTION', payload: { sectionId: section.id, questionId: q.id } })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                    <MathInputWithPreview fullWidth multiline minRows={2} label="Question" value={q.text || ''}
                      onChange={event => update(section.id, q.id, 'text', event.target.value)} disabled={disabled} />
                    <div className="mst-form-row">
                      <MathInputWithPreview fullWidth multiline minRows={2} label="Model answer" helperText="Review or enter the expected answer" value={q.answer || ''}
                        onChange={event => update(section.id, q.id, 'answer', event.target.value)} disabled={disabled} />
                      <MathInputWithPreview fullWidth multiline minRows={2} label="Marking scheme" helperText="What earns the marks" value={q.rubric || ''}
                        onChange={event => update(section.id, q.id, 'rubric', event.target.value)} disabled={disabled} />
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
          <Button size="small" startIcon={<AddIcon />} disabled={disabled}
            onClick={() => dispatch({ type: 'ADD_QUESTION', payload: { sectionId: section.id } })}>Add a question</Button>
        </section>
      )))}
        </div>
      </div>
    </div>
  );
}
