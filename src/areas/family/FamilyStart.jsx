// /family (C-1, design §3.15): an old-style link goes to its new address; otherwise the last family page in this tab
// opens, else the current child's page, else the setup screen when there's no child yet.
// Area: family

import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { sessionGeneration } from '../../services/queryCache';
import { familyApi, familyKeys } from './familyApi';
import { oldLinkPath, startPath } from './familyPaths';
import { currentChild, lastPage } from './familyMemory';
import FamilySetup from './FamilySetup';
import FamilyLoading from './FamilyLoading';

export default function FamilyStart() {
  const { user } = useAuth();
  const { search } = useLocation();
  const children = useQuery({
    queryKey: familyKeys.children(sessionGeneration(), user?.id),
    enabled: !!user?.id,
    queryFn: ({ signal }) => familyApi.children({ signal }),
  });
  const old = oldLinkPath(search);
  if (old) return <Navigate to={old} replace />;
  if (children.isPending) return <FamilyLoading />;
  // Today's screen shows its own error and, with no child, the setup screen.
  if (children.isError) return <FamilySetup />;
  const target = startPath({
    last: lastPage.read(user.id),
    current: currentChild.read(user.id),
    children: children.data,
  });
  return target ? <Navigate to={target} replace /> : <FamilySetup />;
}
