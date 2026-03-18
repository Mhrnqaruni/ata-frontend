import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, SpinnerGap } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { parentAPI, type ParentManualLearner } from '@/lib/api/parent';
import {
  isManualLearnerParentProject,
  projectsAPI,
  type ProjectRecord,
} from '@/lib/api/projects';
import { CreateManualLearnerWorkspaceDialog } from './CreateManualLearnerWorkspaceDialog';

export const ParentManualLearnerList: React.FC = () => {
  const navigate = useNavigate();
  const [learners, setLearners] = useState<ParentManualLearner[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLearner, setSelectedLearner] = useState<ParentManualLearner | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [learnersResponse, projectsResponse] = await Promise.all([
        parentAPI.getManualLearners(),
        projectsAPI.list(),
      ]);
      setLearners((learnersResponse.manual_learners || []).filter((learner) => learner.is_active));
      setProjects((projectsResponse.data.projects || []).filter((project) => isManualLearnerParentProject(project)));
    } catch {
      setError('Failed to load manual learners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const projectsByLearnerId = useMemo(() => {
    const grouped = new Map<string, ProjectRecord[]>();
    for (const project of projects) {
      const learnerId = project.linked_manual_learner_id;
      if (!learnerId) {
        continue;
      }
      const items = grouped.get(learnerId) || [];
      items.push(project);
      grouped.set(learnerId, items);
    }
    for (const [learnerId, items] of grouped.entries()) {
      grouped.set(
        learnerId,
        [...items].sort((left, right) => Date.parse(right.last_accessed) - Date.parse(left.last_accessed)),
      );
    }
    return grouped;
  }, [projects]);

  const handleCreated = (project: ProjectRecord) => {
    setProjects((current) => [project, ...current]);
    navigate(`/workspace/${project.id}`);
  };

  return (
    <>
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Manual learners</CardTitle>
          <CardDescription>
            Parent-managed learners stay outside MST class rosters but can still have their own study workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SpinnerGap size={18} className="animate-spin text-primary" />
              Loading manual learners...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : learners.length > 0 ? (
            learners.map((learner) => {
              const learnerProjects = projectsByLearnerId.get(learner.id) || [];
              return (
                <div key={learner.id} className="rounded-xl border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{learner.display_name}</h3>
                        {learner.grade_level ? <Badge variant="outline">{learner.grade_level}</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {learner.nickname ? `Nickname: ${learner.nickname}` : 'Parent-managed learner'}
                      </p>
                    </div>
                    <Button onClick={() => setSelectedLearner(learner)} className="gap-2">
                      <Plus size={16} />
                      Create workspace
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {learnerProjects.length > 0 ? (
                      learnerProjects.map((project) => (
                        <div
                          key={project.id}
                          className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.description || 'No description provided.'}
                            </div>
                          </div>
                          <Button variant="soft" className="gap-2" onClick={() => navigate(`/workspace/${project.id}`)}>
                            Open workspace
                            <ArrowRight size={16} />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                        No workspaces exist yet for {learner.display_name}.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No manual learners exist yet. Add them from Settings when you want a parent-only learner outside MST.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLearner ? (
        <CreateManualLearnerWorkspaceDialog
          learner={selectedLearner}
          open={Boolean(selectedLearner)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLearner(null);
            }
          }}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
};
