// "Go to question" (design.md §3.4; DR-5): below 1100 px of width, or with the outline hidden, a field that takes "57"
// or "osmosis" and opens the first question it finds, beside the Outline button.
// Area: quizzes

import { useState } from 'react';
import { Button, InputAdornment, TextField } from '@mui/material';
import FormatListNumberedRounded from '@mui/icons-material/FormatListNumberedRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { questionMatches } from './questionModel';
import { QUESTIONS } from './words';

// onOutline opens the outline: as a drawer when narrow, back at the side when wide.
export default function GoToField({ questions, onGo, onOutline, wide }) {
  const [text, setText] = useState('');
  const [missing, setMissing] = useState(false);
  const go = () => {
    const [first] = questionMatches(questions, text);
    setMissing(first === undefined);
    if (first !== undefined) onGo(questions[first].key);
  };
  return (
    <div className="mst-qe-goto">
      <TextField
        value={text}
        placeholder={QUESTIONS.goToPlaceholder}
        error={missing}
        helperText={missing ? QUESTIONS.noneFound(text.trim()) : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setMissing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            go();
          }
        }}
        inputProps={{ 'aria-label': QUESTIONS.goTo }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ width: 300, maxWidth: '100%', '& .MuiOutlinedInput-root': { minHeight: 40 } }}
      />
      <Button variant="outlined" startIcon={<FormatListNumberedRounded />} onClick={onOutline}>
        {wide ? QUESTIONS.showOutline : QUESTIONS.outline}
      </Button>
    </div>
  );
}
