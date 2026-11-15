// An open question card (design.md §3.4): its type, points and time (live only) in one row with Copy, Delete and
// Close; the question with Picture and maths; the answers by type, with a typed answer's level; an explanation.
// Area: quizzes

import { useEffect, useRef } from 'react';
import {
  Button,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import FunctionsRounded from '@mui/icons-material/FunctionsRounded';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import PollOutlined from '@mui/icons-material/PollOutlined';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import ShortTextRounded from '@mui/icons-material/ShortTextRounded';
import ThumbsUpDownOutlined from '@mui/icons-material/ThumbsUpDownOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import MathInputWithPreview from '../../../components/common/MathInputWithPreview';
import NumberField from '../../../components/common/NumberField';
import { config } from '../../../config';
import { AcceptedAnswers, ChoiceAnswers, TrueFalseAnswer } from './Answers';
import MatchLevel from './MatchLevel';
import { addOption, MAX_ANSWERS, POINTS, SECONDS } from './questionModel';
import { CARD, TYPE_WORDS } from './words';

const TYPE_ICONS = {
  multiple_choice: RadioButtonCheckedRounded,
  true_false: ThumbsUpDownOutlined,
  short_answer: ShortTextRounded,
  poll: PollOutlined,
};
const small = { '& .MuiOutlinedInput-root': { minHeight: 36 }, '& .MuiOutlinedInput-input': { py: '7px' } };
// A number without the browser's spin arrows, which would hide its digits in a field this small.
const digits = {
  '& input': { fontVariantNumeric: 'tabular-nums', MozAppearance: 'textfield', pl: '12px' },
  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', m: 0 },
  '& .MuiInputAdornment-positionStart + input': { pl: 0 },
};

// "10 pts" or "30 s": a small number field that looks like a field, with its unit inside and its name as a tooltip.
// What's kept stays within its limits while the teacher types; the field shows the limit when they leave it.
function SmallNumber({ value, unit, label, tip, bounds, icon, onValue }) {
  const keep = (text) => {
    const number = Math.round(Number(text));
    if (Number.isFinite(number)) onValue(Math.min(bounds.max, Math.max(bounds.min, number)));
  };
  return (
    <Tooltip title={tip}>
      <NumberField
        value={value}
        onChange={(event) => keep(event.target.value)}
        inputProps={{ min: bounds.min, max: bounds.max, 'aria-label': label }}
        InputProps={{
          startAdornment: icon ? <InputAdornment position="start">{icon}</InputAdornment> : undefined,
          endAdornment: <InputAdornment position="end">{unit}</InputAdornment>,
        }}
        sx={{ ...small, ...digits, width: icon ? 108 : 96 }}
      />
    </Tooltip>
  );
}

// Puts $ $ around the selected text, or at the cursor, so the teacher types maths between them.
function wrapMaths(input, text) {
  const start = input?.selectionStart ?? text.length;
  const end = input?.selectionEnd ?? text.length;
  return { text: `${text.slice(0, start)}$${text.slice(start, end)}$${text.slice(end)}`, cursor: end + 1 };
}

export default function QuestionEditor({
  question,
  number,
  live,
  focus,
  canCopy,
  change,
  onType,
  onCopy,
  onDelete,
  onClose,
  onPicture,
}) {
  const textRef = useRef(null);
  const type = question.question_type;
  const TypeIcon = TYPE_ICONS[type] ?? RadioButtonCheckedRounded;
  const choices = type === 'multiple_choice' || type === 'poll';
  const explaining = typeof question.explanation === 'string';

  useEffect(() => {
    if (focus) textRef.current?.focus();
  }, [focus]);

  const addMaths = () => {
    const { text, cursor } = wrapMaths(textRef.current, question.question_text || '');
    change((current) => ({ ...current, question_text: text }));
    requestAnimationFrame(() => {
      textRef.current?.focus();
      textRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <section className="mst-qe-open" data-key={question.key} aria-label={`Question ${number}`}>
      <div className="mst-qe-open-head">
        <span className="mst-qe-badge" aria-hidden="true">
          {number}
        </span>
        <TextField
          select
          value={type}
          onChange={(event) => onType(event.target.value)}
          SelectProps={{
            // Named by its own words rather than by its value, which MUI would otherwise use as its name.
            SelectDisplayProps: { 'aria-label': `${CARD.type}, question ${number}`, 'aria-labelledby': undefined },
            renderValue: (value) => (
              <span className="mst-qe-type-value">
                <TypeIcon fontSize="small" aria-hidden="true" />
                {TYPE_WORDS[value]?.label}
              </span>
            ),
          }}
          sx={{ ...small, width: 196 }}
        >
          {Object.entries(TYPE_WORDS).map(([value, words]) => {
            const Icon = TYPE_ICONS[value];
            return (
              <MenuItem key={value} value={value}>
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={words.label} secondary={words.hint} />
              </MenuItem>
            );
          })}
        </TextField>
        {type === 'poll' ? null : (
          <SmallNumber
            value={question.points ?? POINTS.start}
            unit={CARD.pointsUnit}
            label={CARD.points}
            tip={CARD.pointsTip}
            bounds={POINTS}
            onValue={(points) => change((current) => ({ ...current, points }))}
          />
        )}
        {live ? (
          <SmallNumber
            value={question.time_limit_seconds ?? SECONDS.start}
            unit={CARD.timeUnit}
            label={CARD.time}
            tip={CARD.timeTip}
            bounds={SECONDS}
            icon={<TimerOutlined fontSize="small" />}
            onValue={(seconds) => change((current) => ({ ...current, time_limit_seconds: seconds }))}
          />
        ) : null}
        <span className="mst-qe-grow" />
        <Tooltip title={CARD.copy}>
          <span>
            <IconButton aria-label={`${CARD.copy}: question ${number}`} disabled={!canCopy} onClick={onCopy}>
              <ContentCopyOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={CARD.delete}>
          <IconButton aria-label={`${CARD.delete} ${number}`} onClick={onDelete}>
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={CARD.close}>
          <IconButton aria-label={`${CARD.close} question ${number}`} onClick={onClose}>
            <ExpandLessRounded />
          </IconButton>
        </Tooltip>
      </div>

      <MathInputWithPreview
        multiline
        minRows={1}
        maxRows={8}
        value={question.question_text || ''}
        placeholder={CARD.questionPlaceholder}
        inputRef={textRef}
        inputProps={{ 'aria-label': `${CARD.question} ${number}`, maxLength: 2000 }}
        onChange={(event) => {
          const value = event.target.value;
          change((current) => ({ ...current, question_text: value }));
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" className="mst-qe-text-tools">
              <Tooltip title={CARD.picture}>
                <IconButton size="small" aria-label={CARD.picture} onClick={onPicture}>
                  <ImageOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={CARD.maths}>
                <IconButton size="small" aria-label={CARD.maths} onClick={addMaths}>
                  <FunctionsRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      {question.media_url ? (
        <div className="mst-qe-picture">
          <img alt={CARD.pictureAlt} src={`${config.apiBaseUrl}${question.media_url}`} />
          <Button size="small" onClick={onPicture}>
            {CARD.replacePicture}
          </Button>
          <Button size="small" onClick={() => change((current) => ({ ...current, media_url: null }))}>
            {CARD.removePicture}
          </Button>
        </div>
      ) : null}

      {choices ? <ChoiceAnswers question={question} number={number} change={change} /> : null}
      {type === 'true_false' ? <TrueFalseAnswer question={question} change={change} /> : null}
      {type === 'short_answer' ? <AcceptedAnswers question={question} number={number} change={change} /> : null}
      {type === 'short_answer' ? <MatchLevel question={question} change={change} /> : null}
      {type === 'poll' ? <p className="mst-qe-note">{CARD.poll}</p> : null}

      {explaining ? (
        <TextField
          multiline
          minRows={1}
          maxRows={4}
          label={CARD.explanation}
          placeholder={CARD.explanationPlaceholder}
          value={question.explanation}
          inputProps={{ maxLength: 1000 }}
          onChange={(event) => {
            const value = event.target.value;
            change((current) => ({ ...current, explanation: value }));
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={CARD.removeExplanation}>
                  <IconButton
                    size="small"
                    aria-label={CARD.removeExplanation}
                    onClick={() => change((current) => ({ ...current, explanation: null }))}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      ) : null}

      {(choices && (question.options?.length ?? 0) < MAX_ANSWERS[type]) || !explaining ? (
        <div className="mst-qe-add-row">
          {choices && (question.options?.length ?? 0) < MAX_ANSWERS[type] ? (
            <Button size="small" startIcon={<AddRounded />} onClick={() => change(addOption)}>
              {CARD.addAnswer}
            </Button>
          ) : null}
          {explaining ? null : (
            <Button
              size="small"
              startIcon={<AddRounded />}
              onClick={() => change((current) => ({ ...current, explanation: '' }))}
            >
              {CARD.addExplanation}
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
