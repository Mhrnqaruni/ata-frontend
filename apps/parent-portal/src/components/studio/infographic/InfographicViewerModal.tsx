/**
 * InfographicViewerModal Component
 * Educational Note: Modal for viewing and downloading infographics.
 * Displays full-size image with hover download, key sections, and source info.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ChartPieSlice, DownloadSimple, PencilSimple } from '@phosphor-icons/react';
import type { InfographicJob } from '@/lib/api/studio';
import { getAuthUrl } from '@/lib/api/client';

interface InfographicViewerModalProps {
  viewingInfographicJob: InfographicJob | null;
  onClose: () => void;
  onEdit?: (instructions: string) => void;
  isGenerating?: boolean;
  defaultEditInput?: string;
}

export const InfographicViewerModal: React.FC<InfographicViewerModalProps> = ({
  viewingInfographicJob,
  onClose,
  onEdit,
  isGenerating,
  defaultEditInput,
}) => {
  const [editInput, setEditInput] = useState('');

  // Clear edit input when viewing a different job, restore on retry
  useEffect(() => {
    setEditInput(defaultEditInput || '');
  }, [viewingInfographicJob?.id, defaultEditInput]);

  return (
    <Dialog open={viewingInfographicJob !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChartPieSlice size={20} className="text-amber-600" />
            {viewingInfographicJob?.topic_title || 'Infographic'}
            {viewingInfographicJob?.parent_job_id && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                <PencilSimple size={10} />
                Edited version
              </span>
            )}
          </DialogTitle>
          {viewingInfographicJob?.topic_summary && (
            <DialogDescription>
              {viewingInfographicJob.topic_summary}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Infographic Image */}
        {viewingInfographicJob?.image_url && (
          <div className="py-4">
            <div className="relative group rounded-lg overflow-hidden border bg-muted">
              <img
                src={getAuthUrl(viewingInfographicJob.image_url)}
                alt={viewingInfographicJob.topic_title || 'Infographic'}
                className="w-full h-auto object-contain"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() => {
                    if (viewingInfographicJob?.image?.filename && viewingInfographicJob.image_url) {
                      const link = document.createElement('a');
                      link.href = getAuthUrl(viewingInfographicJob.image_url);
                      link.download = viewingInfographicJob.image.filename;
                      link.click();
                    }
                  }}
                >
                  <DownloadSimple size={14} />
                  Download
                </Button>
              </div>
            </div>

            {/* Key Sections */}
            {viewingInfographicJob.key_sections && viewingInfographicJob.key_sections.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Key Sections</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingInfographicJob.key_sections.map((section, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs"
                    >
                      {section.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source info */}
            <p className="text-xs text-muted-foreground mt-4">
              Generated from: {viewingInfographicJob.source_name}
            </p>
          </div>
        )}

        {/* Edit input section */}
        {onEdit && (
          <div className="px-6 py-3 border-t-2 border-orange-200 bg-orange-50/30 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                placeholder="Describe changes... (e.g., 'use darker colors', 'add more data points')"
                className="flex-1"
                disabled={isGenerating}
                onKeyDown={(e) => e.key === 'Enter' && editInput.trim() && !isGenerating && onEdit(editInput.trim())}
              />
              <Button
                onClick={() => editInput.trim() && onEdit(editInput.trim())}
                disabled={!editInput.trim() || isGenerating}
                size="sm"
              >
                <PencilSimple size={14} className="mr-1" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
