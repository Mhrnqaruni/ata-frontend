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
  PARENT_PROJECT_CONTEXT_STANDALONE,
  projectsAPI,
  type ProjectRecord,
} from '@/lib/api/projects';

interface CreateStandaloneWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: ProjectRecord) => void;
}

export const CreateStandaloneWorkspaceDialog: React.FC<CreateStandaloneWorkspaceDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setDescription('');
    setError(null);
  };

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
        linked_student_id: null,
        linked_class_id: null,
        context_type: PARENT_PROJECT_CONTEXT_STANDALONE,
        context_meta: {},
      });
      onCreated(response.data.project);
      reset();
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create standalone workspace</DialogTitle>
            <DialogDescription>
              Start a parent-only study workspace for your own teaching materials and AI study tools. You can
              connect this account to MST students later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="standalone-workspace-name">Workspace name</Label>
              <Input
                id="standalone-workspace-name"
                placeholder="e.g. Family science study plan"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="standalone-workspace-description">Description</Label>
              <Input
                id="standalone-workspace-description"
                placeholder="Optional study focus or family notes"
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
