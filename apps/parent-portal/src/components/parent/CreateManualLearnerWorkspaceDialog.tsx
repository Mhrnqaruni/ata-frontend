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
  PARENT_PROJECT_CONTEXT_MANUAL_LEARNER,
  projectsAPI,
  type ProjectRecord,
} from '@/lib/api/projects';
import type { ParentManualLearner } from '@/lib/api/parent';

interface CreateManualLearnerWorkspaceDialogProps {
  learner: ParentManualLearner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: ProjectRecord) => void;
}

export const CreateManualLearnerWorkspaceDialog: React.FC<CreateManualLearnerWorkspaceDialogProps> = ({
  learner,
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
        linked_manual_learner_id: learner.id,
        linked_class_id: null,
        context_type: PARENT_PROJECT_CONTEXT_MANUAL_LEARNER,
        context_meta: {
          manual_learner_name: learner.display_name,
          manual_learner_grade_level: learner.grade_level,
        },
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
            <DialogTitle>Create learner workspace</DialogTitle>
            <DialogDescription>
              Start a workspace linked to {learner.display_name} without creating a real MST student record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-learner-workspace-name">Workspace name</Label>
              <Input
                id="manual-learner-workspace-name"
                placeholder={`e.g. ${learner.display_name} reading practice`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-learner-workspace-description">Description</Label>
              <Input
                id="manual-learner-workspace-description"
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
