import React from 'react';
import { CircularProgress } from '@mui/material';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import QuizRounded from '@mui/icons-material/QuizRounded';
import StyleRounded from '@mui/icons-material/StyleRounded';
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { statusOf } from './familyWords';

/** Small pieces shared by the notebook, the chat and the panel. */
export const kindIcon = { learn: MenuBookRounded, quiz: QuizRounded, flashcards: StyleRounded, check: PhotoCameraRounded, mindmap: AccountTreeRounded, story: AutoStoriesRounded };

export function StatusChip({ row, attempt }) {
  const status = statusOf(row, attempt);
  return <span className="fam-status" data-tone={status.tone}>{status.tone === 'busy' && <i className="fam-dot" aria-hidden />}{status.text}</span>;
}

export function TopicCard({ topic, busy, loading, onClick, showYear = false }) {
  return <button type="button" className="fam-topic" disabled={busy} onClick={onClick}>
    <span className="fam-topic-icon" aria-hidden><MenuBookRounded /></span>
    <span className="fam-topic-text"><span className="fam-topic-title">{topic.title}</span><span className="fam-topic-sub">Maths topic</span></span>
    {showYear && <span className="fam-chip-year">Year {topic.year}</span>}
    {loading ? <CircularProgress size={20} aria-label="Adding topic" /> : <ChevronRightRounded className="fam-topic-go" aria-hidden />}
  </button>;
}
