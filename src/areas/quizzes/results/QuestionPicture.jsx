// A question's picture on the results page, as today's results showed it: a small button that opens it in a window.
// Area: quizzes

import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip } from '@mui/material';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import { config } from '../../../config';
import { RESULTS } from './words';

// src: the picture's address on the API, as the quiz stores it; number and text name the question.
export default function QuestionPicture({ src, number, text }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title={RESULTS.picture}>
        <IconButton aria-label={`${RESULTS.picture}, question ${number}`} onClick={() => setOpen(true)} size="small">
          <ImageOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog fullWidth maxWidth="sm" onClose={() => setOpen(false)} open={open}>
        <DialogTitle>Question {number}</DialogTitle>
        <DialogContent>
          <p className="quiz-results-picture-text">{text}</p>
          <img
            alt={`The picture for question ${number}`}
            className="quiz-results-picture"
            src={`${config.apiBaseUrl}${src}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
