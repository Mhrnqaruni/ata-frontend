import React, { useEffect, useRef, useState } from 'react';
import { TextField, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useNumberInput from '../../../hooks/useNumberInput';

const MaxScoreField = ({ value, onChange, disabled }) => {
  const props = useNumberInput(value || 0, onChange, { defaultValue: 0, min: 1, max: 1000 });
  return <TextField type="number" label="Marks" {...props} disabled={disabled}
    inputProps={{ min: 1 }} sx={{ maxWidth: 150 }} />;
};

export default function StructureReviewer({ config, dispatch, disabled }) {
  const questions = config.sections.flatMap(section => section.questions);
  const [expanded, setExpanded] = useState([]);
  const known = useRef(new Set(questions.map(q => q.id)));
  useEffect(() => {
    const ids = new Set(config.sections.flatMap(section => section.questions.map(q => q.id)));
    const added = [...ids].filter(id => !known.current.has(id));
    setExpanded(previous => [...previous.filter(id => ids.has(id)), ...added]);
    known.current = ids;
  }, [config.sections]);
  const update = (sectionId, questionId, field, value) =>
    dispatch({ type: 'UPDATE_QUESTION_FIELD', payload: { sectionId, questionId, field, value } });
  const toggle = id => setExpanded(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  return (
    <div className="mst-structure-review">
      <div className="mst-structure-toolbar">
        <p>Check the extracted questions and answers before you continue.</p>
        <div>
          <Button size="small" onClick={() => setExpanded(questions.map(q => q.id))}>Expand all</Button>
          <Button size="small" onClick={() => setExpanded([])}>Collapse all</Button>
        </div>
      </div>
      {config.sections.map((section, sectionIndex) => (
        <section className="mst-sr-section" key={section.id}>
          <h3>Section {sectionIndex + 1} · {section.title} <span className="mst-count">{section.questions.length}</span></h3>
          <div className="mst-sr-list">
            {section.questions.map((q, index) => {
              const open = expanded.includes(q.id);
              const number = questions.findIndex(item => item.id === q.id) + 1;
              return (
                <div className="mst-sr-q" key={q.id}>
                  <button type="button" className="mst-extracted-toggle" onClick={() => toggle(q.id)}
                    aria-expanded={open} aria-controls={`extracted-${q.id}`} aria-label={`Question ${number}: ${q.text || 'Untitled'}`}>
                    <span className="mst-question-num" aria-hidden="true">{number}</span>
                    <span className="mst-extracted-preview">{q.text || `Question ${number} · add question text`}</span>
                    <span className="mst-hint">{q.maxScore ?? 0} marks</span>
                    <span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div id={`extracted-${q.id}`} className="mst-extracted-body">
                    <div className="mst-extracted-actions">
                      <MaxScoreField value={q.maxScore} onChange={value => update(section.id, q.id, 'maxScore', value)} disabled={disabled} />
                      <IconButton aria-label={`Remove question ${number}`} disabled={disabled}
                        onClick={() => dispatch({ type: 'REMOVE_QUESTION', payload: { sectionId: section.id, questionId: q.id } })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                    <TextField fullWidth multiline minRows={2} label="Question" value={q.text || ''}
                      onChange={event => update(section.id, q.id, 'text', event.target.value)} disabled={disabled} />
                    <div className="mst-form-row">
                      <TextField fullWidth multiline minRows={2} label="Model answer" helperText="Read from the answer key" value={q.answer || ''}
                        onChange={event => update(section.id, q.id, 'answer', event.target.value)} disabled={disabled} />
                      <TextField fullWidth multiline minRows={2} label="Marking scheme" helperText="What earns the marks" value={q.rubric || ''}
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
      ))}
    </div>
  );
}
