import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  PARENT_PROJECT_CONTEXT_ATA_CHILD,
  projectsAPI,
  type ProjectRecord,
} from '@/lib/api/projects';
import type { ParentDashboardChildSummary } from '@/lib/api/parent';

interface CreateWorkspaceDialogProps {
  child: ParentDashboardChildSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: ProjectRecord) => void;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  child,
  open,
  onOpenChange,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await projectsAPI.create({
        name: name.trim(),
        description: description.trim(),
        linked_student_id: child.student_id,
        linked_class_id: child.class_ids.length === 1 ? child.class_ids[0] : null,
        context_type: PARENT_PROJECT_CONTEXT_ATA_CHILD,
        context_meta: {
          student_name: child.student_name,
          student_school_id: child.student_school_id,
          class_names: child.class_names,
        },
      });
      onCreated(response.data.project);
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to create workspace.');
      } else {
        setError('Failed to create workspace.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create study workspace</DialogTitle>
            <DialogDescription>
              This workspace will stay linked to {child.student_name} so all chat, source, and studio actions stay scoped correctly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                placeholder={`e.g. ${child.student_name} science revision`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-description">Description</Label>
              <Input
                id="workspace-description"
                placeholder="Optional study focus or notes"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="soft" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
