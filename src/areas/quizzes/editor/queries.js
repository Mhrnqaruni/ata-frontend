// The quiz editor's reads (Phase 1.46): the names of the classes and student groups a quiz is for, the chooser's
// Recent classes (SOT-11), and the teacher's quiz tags, on the quiz area's shared keys.
// Area: quizzes

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recentClassIds } from '../../../components/tags/classChoice';
import { useAuth } from '../../../hooks/useAuth';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { quizKeys } from '../queries';
import { listTags, recentQuizzes } from './api';

const RECENT = { sort: 'last_used', limit: 20 };

// The audience's class names and its student groups' names, "…" for one not loaded yet, and whether any is.
export function useAudienceNames(audience) {
  const classes = useTeacherData('classes').data;
  const groups = useTeacherData('tags').data?.tags;
  return useMemo(() => {
    const named = (list, id) => list?.find((item) => item.id === id)?.name ?? null;
    const classNames = (audience?.class_ids || []).map((id) => named(classes, id));
    const groupNames = (audience?.tag_ids || []).map((id) => named(groups, id));
    const loading = [...classNames, ...groupNames].includes(null);
    const shown = (names) => names.map((name) => name ?? '…');
    return { classes: shown(classNames), groups: shown(groupNames), loading };
  }, [audience, classes, groups]);
}

// Recent: the classes of the teacher's most recently used quizzes, newest first (GET /api/quiz-library).
export function useRecentClassIds() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: quizKeys.library(user?.id, RECENT),
    queryFn: recentQuizzes,
    enabled: Boolean(user?.id),
    staleTime: 60000,
  });
  return useMemo(() => recentClassIds(query.data), [query.data]);
}

// The teacher's quiz tags, to pick from or make new (GET /api/quiz-tags).
export function useQuizTagList() {
  const { user } = useAuth();
  return useQuery({ queryKey: quizKeys.tags(user?.id), queryFn: listTags, enabled: Boolean(user?.id) });
}
