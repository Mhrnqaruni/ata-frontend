import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, SpinnerGap } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  isStandaloneParentProject,
  projectsAPI,
  type ProjectRecord,
} from '@/lib/api/projects';
import { CreateStandaloneWorkspaceDialog } from './CreateStandaloneWorkspaceDialog';

const formatDate = (value: string): string => new Date(value).toLocaleString();

export const ParentStandaloneWorkspaceList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await projectsAPI.list();
      setProjects((response.data.projects || []).filter((project) => isStandaloneParentProject(project)));
    } catch {
      setError('Failed to load standalone workspaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const sortedProjects = useMemo(
    () => [...projects].sort((left, right) => Date.parse(right.last_accessed) - Date.parse(left.last_accessed)),
    [projects],
  );

  const handleCreated = (project: ProjectRecord) => {
    setProjects((current) => [project, ...current]);
    navigate(`/workspace/${project.id}`);
  };

  return (
    <>
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Standalone study workspaces</CardTitle>
            <CardDescription>
              Parent-only study workspaces that are not linked to an MST student yet.
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus size={16} />
            Create workspace
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SpinnerGap size={18} className="animate-spin text-primary" />
              Loading workspaces...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : sortedProjects.length > 0 ? (
            sortedProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.description || 'No description provided yet.'}
                  </p>
                  <p className="text-xs text-muted-foreground">Last opened: {formatDate(project.last_accessed)}</p>
                </div>
                <Button variant="soft" className="gap-2" onClick={() => navigate(`/workspace/${project.id}`)}>
                  Open workspace
                  <ArrowRight size={16} />
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No standalone workspaces exist yet. Create one to start using the MST parent study tools.
            </div>
          )}
        </CardContent>
      </Card>

      <CreateStandaloneWorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </>
  );
};
