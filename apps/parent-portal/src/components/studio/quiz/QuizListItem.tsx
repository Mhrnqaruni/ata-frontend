/**
 * QuizListItem Component
 * Educational Note: Renders saved quizzes in the Generated Content list.
 */

import React from 'react';
import { Exam, WarningCircle } from '@phosphor-icons/react';
import type { QuizJob } from '@/lib/api/studio';
import { getQuizJobErrorMessage, isQuizJobErrored } from './quizState';

interface QuizListItemProps {
  job: QuizJob;
  onClick: () => void;
}

export const QuizListItem: React.FC<QuizListItemProps> = ({ job, onClick }) => {
  const isErrored = isQuizJobErrored(job);

  return (
    <div
      className={[
        'flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer',
        isErrored
          ? 'bg-destructive/5 border-destructive/30 hover:border-destructive/60'
          : 'bg-muted/50 hover:border-primary/50',
      ].join(' ')}
      onClick={onClick}
    >
      <div
        className={[
          'p-1.5 rounded-md flex-shrink-0',
          isErrored ? 'bg-destructive/10' : 'bg-orange-500/10',
        ].join(' ')}
      >
        {isErrored ? (
          <WarningCircle size={16} className="text-destructive" weight="fill" />
        ) : (
          <Exam size={16} className="text-orange-600" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-xs font-medium truncate">{job.source_name}</p>
        <p
          className={[
            'text-[11px] truncate',
            isErrored ? 'text-destructive' : 'text-muted-foreground',
          ].join(' ')}
        >
          {isErrored ? getQuizJobErrorMessage(job) : 'Quiz ready'}
        </p>
      </div>
      <span
        className={[
          'text-[11px] flex-shrink-0',
          isErrored ? 'text-destructive font-medium' : 'text-muted-foreground',
        ].join(' ')}
      >
        {isErrored ? 'Failed' : job.question_count}
      </span>
    </div>
  );
};
