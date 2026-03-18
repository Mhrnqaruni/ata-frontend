import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkle, UsersThree } from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '@/hooks/useAuth';
import { ParentChildCard } from './ParentChildCard';
import { ParentManualLearnerList } from './ParentManualLearnerList';
import { ParentStandaloneWorkspaceList } from './ParentStandaloneWorkspaceList';

const formatDashboardGrade = (value: number | null): string => {
  if (value === null) {
    return 'N/A';
  }
  return `${Math.round(value)}%`;
};

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { parent, children, defaultChildId, workspacePolicy } = useAuth();
  const canUseStandaloneWorkspaces = workspacePolicy.can_use_standalone_workspaces;

  const sortedChildren = useMemo(() => {
    return [...children].sort((left, right) => {
      const leftTime = left.latest_activity_at ? Date.parse(left.latest_activity_at) : 0;
      const rightTime = right.latest_activity_at ? Date.parse(right.latest_activity_at) : 0;
      return rightTime - leftTime;
    });
  }, [children]);

  const summary = useMemo(() => {
    return children.reduce(
      (accumulator, child) => ({
        quizzes: accumulator.quizzes + child.quiz_count,
        assessments: accumulator.assessments + child.assessment_count,
      }),
      { quizzes: 0, assessments: 0 },
    );
  }, [children]);

  const overallSchoolGrade = useMemo(() => {
    const gradedChildren = children.filter(
      (child) => child.overall_average_percent !== null && child.overall_average_percent !== undefined,
    );
    if (gradedChildren.length === 0) {
      return null;
    }
    const total = gradedChildren.reduce(
      (sum, child) => sum + (child.overall_average_percent || 0),
      0,
    );
    return total / gradedChildren.length;
  }, [children]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-[#7D4BFF] text-primary-foreground shadow-xl">
          <CardHeader className="space-y-3 pb-6">
            <CardDescription className="text-primary-foreground/80">MST Parent Portal</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {parent?.full_name ? `Welcome back, ${parent.full_name}` : 'Your family learning workspace'}
            </CardTitle>
            <p className="max-w-xl text-sm text-primary-foreground/85">
              Review family progress, organise study materials, and open parent-safe AI workspaces for quizzes, flash
              cards, mind maps, presentations, and audio overviews.
            </p>
          </CardHeader>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersThree size={20} className="text-primary" />
              At a glance
            </CardTitle>
            <CardDescription>High-level family learning activity from your current MST parent account.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Linked children</div>
              <div className="mt-1 text-2xl font-semibold">{children.length}</div>
            </div>
            <div className="rounded-xl border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Quiz records</div>
              <div className="mt-1 text-2xl font-semibold">{summary.quizzes}</div>
            </div>
            <div className="rounded-xl border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Assessment records</div>
              <div className="mt-1 text-2xl font-semibold">{summary.assessments}</div>
            </div>
            <div className="rounded-xl border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Overall student grade</div>
              <div className="mt-1 text-2xl font-semibold">{formatDashboardGrade(overallSchoolGrade)}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {canUseStandaloneWorkspaces ? (
        <section className="space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Sparkle size={22} className="text-primary" />
              Standalone study mode
            </h2>
            <p className="text-sm text-muted-foreground">
              Use parent-only workspaces for your own teaching materials, family revision plans, and AI study support.
            </p>
          </div>
          <ParentStandaloneWorkspaceList />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Your children</h2>
            <p className="text-sm text-muted-foreground">
              Select a child to view summaries and create child-linked workspaces when MST links are available.
            </p>
          </div>
          {defaultChildId ? (
            <Button variant="soft" onClick={() => navigate(`/children/${defaultChildId}`)} className="gap-2">
              Open default child
              <ArrowRight size={16} />
            </Button>
          ) : null}
        </div>

        {sortedChildren.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {sortedChildren.map((child) => (
              <ParentChildCard
                key={child.student_id}
                child={child}
                onOpenOverview={() => navigate(`/children/${child.student_id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No MST children are linked to this parent account yet. You can still use standalone parent workspaces
              below while waiting for links or approvals.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Manual learners</h2>
          <p className="text-sm text-muted-foreground">
            Parent-managed learners live outside MST rosters but can still have their own study workspaces.
          </p>
        </div>
        <ParentManualLearnerList />
      </section>
    </div>
  );
};
