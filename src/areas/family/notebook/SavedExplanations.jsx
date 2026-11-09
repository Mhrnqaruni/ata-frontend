// The Notebook's saved explanations (Phase 1.38 design §4.8; C-15): under Materials, the child's finished explanations,
// name and date, each opening at its own address with a way back to this chat. The list shows only when there are some.
// Area: family

import { useId } from 'react';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyPath } from '../familyPaths';
import { ukDate } from '../familyWords';

const SHOWN = 20; // a short list, newest first

export default function SavedExplanations({ childId }) {
  const userId = useAuth().user?.id;
  const location = useLocation();
  const heading = useId();
  const filter = { kind: 'learn', limit: SHOWN };
  const list = useQuery({
    queryKey: familyKeys.activities(sessionGeneration(), userId, childId, filter),
    queryFn: ({ signal }) => familyApi.listActivities(childId, filter, { signal }),
    enabled: Boolean(userId),
  });
  const items = (list.data?.items || []).filter((item) => item.status === 'completed');
  if (!items.length) return null;
  return (
    <section className="fam-nb-sec fam-nb-saved" aria-labelledby={heading}>
      <h2 id={heading} className="fam-nb-h2">
        Saved explanations
      </h2>
      <ul className="fam-nb-saved-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="fam-saved-row"
              to={familyPath(childId, 'notebook/explanations', item.id)}
              state={{ from: location.pathname + location.search }}
              data-mst="family-saved-explanation"
            >
              <span className="fam-saved-text">
                <span className="fam-saved-name">{item.title}</span>
                <span className="fam-saved-date">{ukDate(item.finishedAt || item.createdAt)}</span>
              </span>
              <ChevronRightRounded className="fam-saved-chev" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
