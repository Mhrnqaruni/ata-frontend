import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { AuthPage } from './components/auth/AuthPage';
import { ParentRouteGuard } from './components/parent/ParentRouteGuard';
import { ParentAppShell } from './components/parent/ParentAppShell';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { ChildDetailPage } from './components/parent/ChildDetailPage';
import { ParentSettingsPage } from './components/parent/ParentSettingsPage';
import { ProjectWorkspace } from './components/project';
import { useAuth } from './hooks/useAuth';
import {
  isManualLearnerParentProject,
  isStandaloneParentProject,
  projectsAPI,
  type ProjectRecord,
} from './lib/api/projects';
import { createLogger } from '@/lib/logger';

const log = createLogger('parent-app');

function LegacyProjectRedirect() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  return <Navigate to={`/workspace/${projectId}`} replace />;
}

function ParentWorkspaceRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getChildById, workspacePolicy } = useAuth();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProject = async () => {
      try {
        setLoading(true);
        setAccessError(null);
        const response = await projectsAPI.get(projectId);
        const nextProject = response.data.project;
        const linkedStudentId = nextProject.linked_student_id?.trim();
        const linkedManualLearnerId = nextProject.linked_manual_learner_id?.trim();

        if (linkedStudentId) {
          const linkedChild = getChildById(linkedStudentId);
          if (!linkedChild) {
            throw new Error('This workspace is outside the current parent session scope.');
          }
        } else if (linkedManualLearnerId) {
          const allowedManualLearnerIds = workspacePolicy.manual_learner_ids_with_ai_access || [];
          if (
            !isManualLearnerParentProject(nextProject) ||
            !allowedManualLearnerIds.includes(linkedManualLearnerId)
          ) {
            throw new Error('This manual learner workspace is outside the current parent session scope.');
          }
        } else if (!workspacePolicy.can_use_standalone_workspaces || !isStandaloneParentProject(nextProject)) {
          throw new Error('This workspace is not available in the current parent session.');
        }

        let openedProject = nextProject;
        try {
          const openResponse = await projectsAPI.open(projectId);
          openedProject = openResponse.data.project || nextProject;
        } catch (openError) {
          log.warn({ err: openError, projectId }, 'failed to mark parent workspace as opened');
        }

        if (active) {
          setProject(openedProject);
        }
      } catch (error) {
        log.error({ err: error, projectId }, 'failed to load parent workspace');
        if (active) {
          setAccessError(
            error instanceof Error ? error.message : 'Failed to load the requested workspace.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (!projectId) {
      setAccessError('Workspace id is required.');
      setLoading(false);
      return;
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [
    getChildById,
    projectId,
    workspacePolicy.can_use_standalone_workspaces,
    workspacePolicy.manual_learner_ids_with_ai_access,
  ]);

  const child = project?.linked_student_id ? getChildById(project.linked_student_id) || null : null;

  const handleDeleteProject = async (id: string) => {
    await projectsAPI.delete(id);
    navigate(child ? `/children/${child.student_id}` : '/');
  };

  const handleRenameProject = async (newName: string) => {
    const response = await projectsAPI.update(projectId, { name: newName });
    setProject(response.data.project);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <CircleNotch size={18} className="animate-spin text-primary" />
          Loading parent workspace...
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WarningCircle size={20} className="text-destructive" />
            Workspace unavailable
          </CardTitle>
          <CardDescription>
            Parent workspaces must stay inside the current parent session scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-destructive">{accessError || 'The requested workspace could not be opened.'}</div>
          <Button variant="soft" onClick={() => navigate('/')}>Back to dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProjectWorkspace
      project={project}
      child={child}
      isParentWorkspace
      onBack={() => navigate(child ? `/children/${child.student_id}` : '/')}
      onDeleteProject={handleDeleteProject}
      onRenameProject={handleRenameProject}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/error" element={<AuthPage />} />
      <Route element={<ParentRouteGuard />}>
        <Route element={<ParentAppShell />}>
          <Route index element={<ParentDashboard />} />
          <Route path="settings" element={<ParentSettingsPage />} />
          <Route path="children/:studentId" element={<ChildDetailPage />} />
          <Route path="workspace/:projectId" element={<ParentWorkspaceRoute />} />
          <Route path="projects/:projectId" element={<LegacyProjectRedirect />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
