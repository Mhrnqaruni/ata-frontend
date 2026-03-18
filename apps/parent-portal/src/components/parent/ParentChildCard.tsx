import React from 'react';
import { BookOpenText, Brain, ChartBar, GraduationCap } from '@phosphor-icons/react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { ParentDashboardChildSummary } from '@/lib/api/parent';

interface ParentChildCardProps {
  child: ParentDashboardChildSummary;
  onOpenOverview: () => void;
}

const formatPercent = (value?: number | null): string => {
  if (value === null || value === undefined) {
    return 'No average yet';
  }
  return `${Math.round(value)}% average`;
};

export const ParentChildCard: React.FC<ParentChildCardProps> = ({
  child,
  onOpenOverview,
}) => {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{child.student_name}</CardTitle>
            <p className="text-sm text-muted-foreground">Student ID: {child.student_school_id}</p>
          </div>
          <Badge variant="secondary">{formatPercent(child.overall_average_percent)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {child.class_names.length > 0 ? (
            child.class_names.map((className) => (
              <Badge key={className} variant="outline" className="bg-background">
                {className}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="bg-background">No class assigned</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpenText size={18} className="text-primary" />
            Quizzes
          </div>
          <p className="mt-2 text-2xl font-semibold">{child.quiz_count}</p>
        </div>
        <div className="rounded-xl border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GraduationCap size={18} className="text-primary" />
            Assessments
          </div>
          <p className="mt-2 text-2xl font-semibold">{child.assessment_count}</p>
        </div>
        <div className="rounded-xl border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ChartBar size={18} className="text-primary" />
            Latest activity
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {child.latest_activity_at ? new Date(child.latest_activity_at).toLocaleString() : 'No activity recorded'}
          </p>
        </div>
        <div className="rounded-xl border bg-background px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain size={18} className="text-primary" />
            Parent access
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={child.permissions.can_view_quizzes ? 'default' : 'outline'}>Quiz view</Badge>
            <Badge variant={child.permissions.can_view_assessments ? 'default' : 'outline'}>Assessment view</Badge>
            <Badge variant={child.permissions.can_use_ai_tools_for_child ? 'default' : 'outline'}>AI tools</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onOpenOverview}>Open child overview</Button>
      </CardFooter>
    </Card>
  );
};
