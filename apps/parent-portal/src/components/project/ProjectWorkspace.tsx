import React, { useCallback, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { SourcesPanel } from '../sources';
import { ChatPanel } from '../chat';
import { StudioPanel, type StudioSignal } from '../studio';
import { ProjectHeader } from './ProjectHeader';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  type ImperativePanelHandle,
} from '../ui/resizable';
import { useAuth } from '@/hooks/useAuth';
import type { ParentDashboardChildSummary } from '@/lib/api/parent';
import type { ProjectRecord } from '@/lib/api/projects';
import type { Source } from '@/lib/api/sources';

interface ProjectWorkspaceProps {
  project: ProjectRecord;
  child?: ParentDashboardChildSummary | null;
  isParentWorkspace?: boolean;
  onBack: () => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject?: (newName: string) => Promise<void>;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  child = null,
  isParentWorkspace = false,
  onBack,
  onDeleteProject,
  onRenameProject,
}) => {
  const { workspacePolicy, canUseAiForChild, isToolAllowed } = useAuth();

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [sourcesVersion, setSourcesVersion] = useState(0);
  const [studioSignals, setStudioSignals] = useState<StudioSignal[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<Source[]>([]);

  const linkedStudentId = project.linked_student_id || child?.student_id || null;
  const linkedManualLearnerId = project.linked_manual_learner_id || null;
  const canUseAiWorkspace = !isParentWorkspace
    || (
      linkedManualLearnerId
        ? Boolean(
            (workspacePolicy.allowed_tools || []).length > 0
            && (workspacePolicy.manual_learner_ids_with_ai_access || []).includes(linkedManualLearnerId),
          )
        : canUseAiForChild(linkedStudentId)
    );
  const canUseStudyChat = canUseAiWorkspace && (!isParentWorkspace || isToolAllowed('study_chat'));

  const handleCostsChange = useCallback(() => {
    // Header cost tracking is intentionally hidden in parent runtime.
  }, []);

  const handleSourcesChange = useCallback(() => {
    setSourcesVersion((value) => value + 1);
  }, []);

  const handleSignalsChange = useCallback((signals: StudioSignal[]) => {
    setStudioSignals(signals);
  }, []);

  const handleActiveChatChange = useCallback((chatId: string | null, sourceIds: string[]) => {
    setActiveChatId(chatId);
    setSelectedSourceIds(sourceIds);
  }, []);

  const handleSelectedSourcesChange = useCallback((newIds: string[]) => {
    setSelectedSourceIds(newIds);
  }, []);

  const handleSourcesUpdated = useCallback((sources: Source[]) => {
    setAvailableSources(sources);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <ProjectHeader
        project={project}
        child={child}
        onBack={onBack}
        onDelete={() => onDeleteProject(project.id)}
        onRename={onRenameProject}
      />

      <div className="flex-1 flex flex-col px-3 min-h-0">
        <div className="flex-1 rounded-2xl overflow-hidden bg-background min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              ref={leftPanelRef}
              defaultSize={20}
              minSize={15}
              maxSize={40}
              collapsible
              collapsedSize={4}
              onCollapse={() => setLeftPanelOpen(false)}
              onExpand={() => setLeftPanelOpen(true)}
              className="bg-card overflow-hidden rounded-2xl"
            >
              <div className="h-full flex flex-col relative">
                <SourcesPanel
                  projectId={project.id}
                  isCollapsed={!leftPanelOpen}
                  onExpand={() => leftPanelRef.current?.expand()}
                  onSourcesChange={handleSourcesChange}
                  onSourcesUpdated={handleSourcesUpdated}
                  activeChatId={activeChatId}
                  selectedSourceIds={selectedSourceIds}
                  onSelectedSourcesChange={handleSelectedSourcesChange}
                  isParentWorkspace={isParentWorkspace}
                  canUseAiWorkspace={canUseAiWorkspace}
                />
                {leftPanelOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => leftPanelRef.current?.collapse()}
                    className="absolute top-2 right-2 z-10 h-8 w-8 hover:bg-muted"
                  >
                    <CaretLeft size={16} />
                  </Button>
                ) : null}
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={55} minSize={30} className="bg-card overflow-hidden rounded-2xl min-w-0">
              <div className="h-full min-h-0 min-w-0 w-full flex flex-col overflow-hidden">
                <ChatPanel
                  projectId={project.id}
                  projectName={project.name}
                  sourcesVersion={sourcesVersion}
                  onCostsChange={handleCostsChange}
                  onSignalsChange={handleSignalsChange}
                  selectedSourceIds={selectedSourceIds}
                  onActiveChatChange={handleActiveChatChange}
                  isParentWorkspace={isParentWorkspace}
                  canUseStudyChat={canUseStudyChat}
                  linkedStudentId={linkedStudentId}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={25}
              minSize={18}
              maxSize={40}
              collapsible
              collapsedSize={4}
              onCollapse={() => setRightPanelOpen(false)}
              onExpand={() => setRightPanelOpen(true)}
              className="bg-card overflow-hidden rounded-2xl"
            >
              <div className="h-full flex flex-col relative">
                <StudioPanel
                  projectId={project.id}
                  signals={studioSignals}
                  isCollapsed={!rightPanelOpen}
                  onExpand={() => rightPanelRef.current?.expand()}
                  isParentWorkspace={isParentWorkspace}
                  canUseAiWorkspace={canUseAiWorkspace}
                  allowedToolKeys={workspacePolicy.allowed_tools}
                  linkedStudentId={linkedStudentId}
                  availableSources={availableSources}
                  selectedSourceIds={selectedSourceIds}
                />
                {rightPanelOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => rightPanelRef.current?.collapse()}
                    className="absolute top-2 left-2 z-10 h-8 w-8 hover:bg-muted"
                  >
                    <CaretRight size={16} />
                  </Button>
                ) : null}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

      </div>
    </div>
  );
};
