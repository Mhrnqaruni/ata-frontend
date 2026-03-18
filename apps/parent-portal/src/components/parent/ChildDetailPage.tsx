import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BookOpenText, Brain, ClipboardText, SpinnerGap } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { parentAPI, type ParentChildSummaryResponse } from '@/lib/api/parent';
import { useAuth } from '@/hooks/useAuth';
import { ChildWorkspaceList } from './ChildWorkspaceList';

const formatPercent = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return 'No average yet';
  }
  return `${Math.round(value)}%`;
};

export const ChildDetailPage: React.FC = () => {
  const { studentId = '' } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { defaultChildId, getChildById } = useAuth();
  const child = getChildById(studentId);

  const [summary, setSummary] = useState<ParentChildSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryUnavailable, setSummaryUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      if (!studentId || !child) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setSummaryUnavailable(false);
        const response = await parentAPI.getChildSummary(studentId);
        if (active) {
          setSummary(response);
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        const detail =
          typeof err === 'object' && err !== null && 'response' in err
            ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to load child summary.')
            : 'Failed to load child summary.';
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 403) {
          setSummaryUnavailable(true);
          setSummary({
            success: true,
            child,
            quiz_summary: null,
            assessment_summary: null,
            analytics: null,
          });
          return;
        }

        setError(detail);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [child, studentId]);

  const renderedChild = summary?.child || child;

  const analyticsCards = useMemo(() => {
    const analytics = summary?.analytics;
    if (!analytics) {
      return [];
    }

    return [
      {
        label: 'Overall average',
        value: formatPercent(analytics.overall_average_percent),
      },
      {
        label: 'Overall grade',
        value: analytics.overall_grade !== null && analytics.overall_grade !== undefined ? String(analytics.overall_grade) : 'N/A',
      },
      {
        label: 'Latest activity',
        value: analytics.latest_activity_at ? new Date(analytics.latest_activity_at).toLocaleString() : 'No activity yet',
      },
    ];
  }, [summary?.analytics]);

  if (!child) {
    return <Navigate to={defaultChildId ? `/children/${defaultChildId}` : '/'} replace />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{renderedChild?.student_name || child.student_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Student ID {renderedChild?.student_school_id || child.student_school_id}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(renderedChild?.class_names || child.class_names).map((className) => (
              <Badge key={className} variant="outline">{className}</Badge>
            ))}
            <Badge variant={child.permissions.can_view_quizzes ? 'default' : 'outline'}>Quiz access</Badge>
            <Badge variant={child.permissions.can_view_assessments ? 'default' : 'outline'}>Assessment access</Badge>
            <Badge variant={child.permissions.can_use_ai_tools_for_child ? 'default' : 'outline'}>AI tools</Badge>
          </div>
        </div>
        <Button variant="soft" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </section>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <SpinnerGap size={18} className="animate-spin text-primary" />
            Loading child summary...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenText size={18} className="text-primary" />
                Quiz summary
              </CardTitle>
              <CardDescription>
                {summary?.quiz_summary
                  ? 'Rendered independently from the mixed-permission summary route.'
                  : summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'Quiz visibility is not enabled for this child.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summary?.quiz_summary ? (
                <>
                  <div>Records: {summary.quiz_summary.items.length}</div>
                  <div>Average: {formatPercent(summary.quiz_summary.average_percent)}</div>
                  <div>Pending review: {summary.quiz_summary.pending_review_count}</div>
                </>
              ) : (
                <div className="text-muted-foreground">
                  {summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'No quiz summary is available for this parent-child link.'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardText size={18} className="text-primary" />
                Assessment summary
              </CardTitle>
              <CardDescription>
                {summary?.assessment_summary
                  ? 'Assessment visibility is evaluated separately from quiz visibility.'
                  : summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'Assessment visibility is not enabled for this child.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summary?.assessment_summary ? (
                <>
                  <div>Records: {summary.assessment_summary.items.length}</div>
                  <div>Average: {formatPercent(summary.assessment_summary.average_percent)}</div>
                  <div>Pending review: {summary.assessment_summary.pending_review_count}</div>
                </>
              ) : (
                <div className="text-muted-foreground">
                  {summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'No assessment summary is available for this parent-child link.'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={18} className="text-primary" />
                Analytics summary
              </CardTitle>
              <CardDescription>
                {summary?.analytics
                  ? 'Academic overview rendered only when MST permits analytics access.'
                  : summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'Analytics access is not enabled for this child.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {summary?.analytics ? (
                analyticsCards.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">
                  {summaryUnavailable
                    ? 'Academic summary is not available for this parent-child link.'
                    : 'No analytics summary is available for this parent-child link.'}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <ChildWorkspaceList child={child} />
    </div>
  );
};
