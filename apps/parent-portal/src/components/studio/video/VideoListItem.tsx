/**
 * VideoListItem Component
 * Educational Note: Renders a saved video in the Generated Content list.
 * Clicking opens video in modal viewer. Download button downloads video file.
 */

import React from 'react';
import { VideoCamera, DownloadSimple, PencilSimple } from '@phosphor-icons/react';
import type { VideoJob } from '@/lib/api/studio';

interface VideoListItemProps {
  job: VideoJob;
  onOpen: () => void;
  onDownload: (e: React.MouseEvent) => void;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({
  job,
  onOpen,
  onDownload,
}) => {
  return (
    <div
      onClick={onOpen}
      className="flex items-start gap-2.5 p-2.5 bg-muted/50 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
    >
      <VideoCamera size={16} weight="duotone" className="text-orange-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-1.5">
          {job.source_name || 'Video'}
          {job.parent_job_id && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-500/10 px-1 py-0.5 rounded flex-shrink-0">
              <PencilSimple size={9} />
              Edited
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-500 truncate">
          {job.videos.length} video{job.videos.length > 1 ? 's' : ''} • {job.aspect_ratio} • {job.duration_seconds}s
        </p>
      </div>
      {/* Download button */}
      <button
        onClick={onDownload}
        className="p-1.5 hover:bg-orange-600/20 rounded transition-colors"
        title="Download Video"
      >
        <DownloadSimple size={14} className="text-orange-600" />
      </button>
    </div>
  );
};
