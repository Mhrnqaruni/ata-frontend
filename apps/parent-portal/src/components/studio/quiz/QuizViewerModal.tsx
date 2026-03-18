/**
 * QuizViewerModal Component
 * Educational Note: Modal for viewing interactive quiz questions.
 * Uses QuizViewer component for question display and answer checking.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Exam, WarningCircle } from '@phosphor-icons/react';
import { QuizViewer } from './QuizViewer';
import type { QuizJob } from '@/lib/api/studio';
import { getQuizJobErrorMessage, isQuizJobErrored, isQuizJobReady } from './quizState';

interface QuizViewerModalProps {
  viewingQuizJob: QuizJob | null;
  onClose: () => void;
}

export const QuizViewerModal: React.FC<QuizViewerModalProps> = ({
  viewingQuizJob,
  onClose,
}) => {
  const isErrored = viewingQuizJob ? isQuizJobErrored(viewingQuizJob) : false;
  const isReady = viewingQuizJob ? isQuizJobReady(viewingQuizJob) : false;

  return (
    <Dialog open={viewingQuizJob !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isErrored ? (
              <WarningCircle size={20} className="text-destructive" weight="fill" />
            ) : (
              <Exam size={20} className="text-orange-600" />
            )}
            {isErrored ? 'Quiz Generation Failed' : `Quiz - ${viewingQuizJob?.source_name}`}
          </DialogTitle>
          {!isErrored && viewingQuizJob?.topic_summary && (
            <DialogDescription>
              {viewingQuizJob.topic_summary}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {viewingQuizJob && isReady && (
            <QuizViewer
              questions={viewingQuizJob.questions}
              topicSummary={viewingQuizJob.topic_summary}
            />
          )}
          {viewingQuizJob && isErrored && (
            <div className="h-full flex items-center justify-center p-6">
              <div className="max-w-lg text-center space-y-3">
                <p className="text-sm font-medium text-foreground">
                  This quiz job did not complete successfully.
                </p>
                <p className="text-sm text-muted-foreground">
                  {getQuizJobErrorMessage(viewingQuizJob)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Retry quiz generation from the Studio panel after adjusting the source or prompt focus.
                </p>
              </div>
            </div>
          )}
          {viewingQuizJob && !isErrored && !isReady && (
            <div className="h-full flex items-center justify-center p-6">
              <div className="max-w-lg text-center space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Quiz details are not ready yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Refresh the Studio panel and try again once generation completes.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
