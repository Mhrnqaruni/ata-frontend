/**
 * BlogSection Component
 * Educational Note: Self-contained section for blog post generation.
 */

import React, { useEffect, useCallback } from 'react';
import { useStudioContext, useFilteredJobs } from '../StudioContext';
import { useBlogGeneration } from '../blog/useBlogGeneration';
import { BlogListItem } from '../blog/BlogListItem';
import { BlogProgressIndicator } from '../blog/BlogProgressIndicator';
import { BlogViewerModal } from '../blog/BlogViewerModal';
import { ConfigErrorBanner } from '../shared/ConfigErrorBanner';

export const BlogSection: React.FC = () => {
  const { projectId, registerGenerationHandler } = useStudioContext();

  const {
    savedBlogJobs,
    currentBlogJob,
    isGeneratingBlog,
    viewingBlogJob,
    setViewingBlogJob,
    configError,
    pendingEditInput,
    loadSavedJobs,
    handleBlogGeneration,
    handleBlogEdit,
    downloadBlog,
  } = useBlogGeneration(projectId);

  const filteredJobs = useFilteredJobs(savedBlogJobs);

  useEffect(() => {
    loadSavedJobs();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async (signal: Parameters<typeof handleBlogGeneration>[0]) => {
    await handleBlogGeneration(signal);
  }, [handleBlogGeneration]);

  useEffect(() => {
    registerGenerationHandler('blog', handleGenerate);
  }, [registerGenerationHandler, handleGenerate]);

  if (filteredJobs.length === 0 && !isGeneratingBlog && !configError) {
    return null;
  }

  return (
    <>
      <ConfigErrorBanner message={configError} />

      {isGeneratingBlog && (
        <BlogProgressIndicator currentBlogJob={currentBlogJob} />
      )}

      {filteredJobs.map((job) => (
        <BlogListItem
          key={job.id}
          job={job}
          onOpen={() => setViewingBlogJob(job)}
          onDownload={(e) => {
            e.stopPropagation();
            downloadBlog(job.id);
          }}
        />
      ))}

      <BlogViewerModal
        projectId={projectId}
        viewingBlogJob={viewingBlogJob}
        onClose={() => setViewingBlogJob(null)}
        onDownload={downloadBlog}
        onEdit={(instructions) => viewingBlogJob && handleBlogEdit(viewingBlogJob, instructions)}
        isGenerating={isGeneratingBlog}
        defaultEditInput={pendingEditInput}
      />
    </>
  );
};
