/**
 * SocialPostViewerModal Component
 * Educational Note: Modal for viewing social posts across multiple platforms.
 * Features: Platform-specific styling, images with download, copy to clipboard.
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
import { ShareNetwork, DownloadSimple, PencilSimple } from '@phosphor-icons/react';
import { useToast } from '../../ui/toast';
import type { SocialPostJob } from '@/lib/api/studio';
import { getAuthUrl } from '@/lib/api/client';

interface SocialPostViewerModalProps {
  viewingSocialPostJob: SocialPostJob | null;
  onClose: () => void;
  onEdit?: (instructions: string) => void;
  isGenerating?: boolean;
  defaultEditInput?: string;
}

export const SocialPostViewerModal: React.FC<SocialPostViewerModalProps> = ({
  viewingSocialPostJob,
  onClose,
  onEdit,
  isGenerating,
  defaultEditInput,
}) => {
  const { success: showSuccess } = useToast();
  const [editInput, setEditInput] = useState('');

  // Clear edit input when viewing a different job, restore on retry
  useEffect(() => {
    setEditInput(defaultEditInput || '');
  }, [viewingSocialPostJob?.id, defaultEditInput]);
  const postCount = viewingSocialPostJob?.posts.length || 0;

  // Responsive grid: 1 post = centered single col, 2 = 2-col, 3 = 3-col
  const gridClass = postCount === 1
    ? 'grid grid-cols-1 max-w-sm mx-auto gap-6 py-4'
    : postCount === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-6 py-4'
      : 'grid grid-cols-1 md:grid-cols-3 gap-6 py-4';

  // Adjust modal width based on post count
  const dialogMaxWidth = postCount === 1 ? 'sm:max-w-lg' : 'sm:max-w-4xl';

  return (
    <Dialog open={viewingSocialPostJob !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${dialogMaxWidth} max-h-[90vh] overflow-y-auto flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShareNetwork size={20} className="text-cyan-600" />
            Social Posts
            {viewingSocialPostJob?.parent_job_id && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                <PencilSimple size={10} />
                Edited version
              </span>
            )}
          </DialogTitle>
          {viewingSocialPostJob?.topic_summary && (
            <DialogDescription>
              {viewingSocialPostJob.topic_summary}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className={gridClass}>
          {viewingSocialPostJob?.posts.map((post, index) => (
            <div key={index} className="flex flex-col gap-3 border rounded-lg overflow-hidden bg-card">
              {/* Platform Badge */}
              <div className="px-3 py-2 border-b bg-muted/30">
                <span className={`text-xs font-medium uppercase tracking-wide ${
                  post.platform === 'linkedin' ? 'text-blue-600' :
                  post.platform === 'instagram' ? 'text-pink-600' :
                  'text-sky-500'
                }`}>
                  {post.platform === 'twitter' ? 'X (Twitter)' : post.platform}
                </span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {post.aspect_ratio}
                </span>
              </div>

              {/* Image */}
              {post.image_url && (
                <div className="relative group">
                  <img
                    src={getAuthUrl(post.image_url)}
                    alt={`${post.platform} post`}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => {
                        if (post.image?.filename && post.image_url) {
                          const link = document.createElement('a');
                          link.href = getAuthUrl(post.image_url);
                          link.download = post.image.filename;
                          link.click();
                        }
                      }}
                    >
                      <DownloadSimple size={14} />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {/* Copy/Caption */}
              <div className="px-3 pb-3 flex-1">
                <p className="text-sm whitespace-pre-line">{post.copy}</p>
                {post.hashtags.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {post.hashtags.join(' ')}
                  </p>
                )}
              </div>

              {/* Copy to clipboard */}
              <div className="px-3 pb-3">
                <Button
                  size="sm"
                  variant="soft"
                  className="w-full text-xs"
                  onClick={() => {
                    const fullText = `${post.copy}\n\n${post.hashtags.join(' ')}`;
                    navigator.clipboard.writeText(fullText);
                    showSuccess('Copied to clipboard!');
                  }}
                >
                  Copy Caption
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit input section */}
        {onEdit && (
          <div className="px-6 py-3 border-t-2 border-orange-200 bg-orange-50/30 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                placeholder="Describe changes... (e.g., 'make tone more casual', 'add emojis')"
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
