import React, { useState } from 'react';
import {
  ArrowLeft,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  UserCircle,
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useToast, ToastContainer } from '../ui/toast';
import type { ParentDashboardChildSummary } from '@/lib/api/parent';
import type { ProjectRecord } from '@/lib/api/projects';
import { getAssetPath } from '@/lib/runtime';

interface ProjectHeaderProps {
  project: ProjectRecord;
  child?: ParentDashboardChildSummary | null;
  onBack: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => Promise<void>;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  child = null,
  onBack,
  onDelete,
  onRename,
}) => {
  const { toasts, dismissToast, error } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const [renaming, setRenaming] = useState(false);
  const manualLearnerName =
    typeof project.context_meta?.manual_learner_name === 'string'
      ? project.context_meta.manual_learner_name
      : null;

  const handleRename = async () => {
    const nextName = renameValue.trim();
    if (!nextName || nextName === project.name || !onRename) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      setRenaming(true);
      await onRename(nextName);
      setRenameDialogOpen(false);
    } catch {
      error('Failed to rename workspace.');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <>
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="soft" size="icon" onClick={onBack} className="h-9 w-9 rounded-full">
              <ArrowLeft size={16} />
            </Button>

            <img
              src={getAssetPath('/icon.png')}
              alt="MST star icon"
              className="h-7 w-7 shrink-0 object-contain"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold">{project.name}</h1>
                {child ? <Badge variant="secondary">{child.student_name}</Badge> : null}
                {project.linked_class_id ? <Badge variant="outline">Class linked</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {child ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <UserCircle size={14} />
                      {child.student_school_id}
                    </span>
                    {child.class_names.map((className) => (
                      <span key={className}>{className}</span>
                    ))}
                  </>
                ) : (
                  <span>
                    {manualLearnerName
                      ? `Manual learner workspace for ${manualLearnerName}.`
                      : 'This standalone parent workspace is not linked to an MST child yet.'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="soft" size="icon" className="h-9 w-9 rounded-full">
                  <DotsThreeVertical size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRenameDialogOpen(true)} disabled={!onRename}>
                  <PencilSimple size={16} className="mr-2" />
                  Rename workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash size={16} className="mr-2" />
                  Delete workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>
              Update the workspace name shown in the MST parent portal.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder="Workspace name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="soft" onClick={() => setRenameDialogOpen(false)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={() => void handleRename()} disabled={renaming || !renameValue.trim()}>
              {renaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This removes the workspace, sources, chats, and generated content tied to this project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="soft" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete();
              }}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};
