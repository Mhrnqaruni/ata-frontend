// The Activities page (design §1.4–1.6): the group's four kinds in one list card, each with its tile and today's
// one-line description, opening its section. The phone's tab bar leads here; on computers it's a working address too.
// Area: family

import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Link, useOutletContext } from 'react-router-dom';
import { familyPath } from '../familyPaths';
import { SECTIONS } from '../sections';
import FamilyPage from '../shell/FamilyPage';
import { NewChip } from './ActivityRow';
import { KIND_ICONS, PAGE_WORDS } from './listWords';
import './lists.css';

export default function ActivitiesPage() {
  const { child, marks } = useOutletContext();
  const kinds = SECTIONS.filter((section) => section.group === 'activities');
  return (
    <FamilyPage
      section="Activities"
      title="Activities"
      subtitle={PAGE_WORDS.activities.subtitle(child.displayName)}
      className="fam-list-page"
    >
      <div className="fam-list-body">
        <div className="mst-g1 mst-rim home-recent fam-list-card">
          <ul className="mst-list">
            {kinds.map((section) => {
              const Icon = KIND_ICONS[section.kind];
              // The kind has something new: "Quizzes, new" (design §1.6).
              const fresh = marks?.counts[section.kind] > 0;
              return (
                <li key={section.id} className="fam-list-item">
                  <Link
                    to={familyPath(child.id, section.segment)}
                    className="mst-list-row home-row-button fam-list-link"
                    data-tile=""
                    data-mst={`family-activities-${section.id}`}
                  >
                    {/* Teacher's tile in the accent tint: the icon tells the kinds apart (design §1.2). */}
                    <span className="mst-tile" data-size="sm" aria-hidden>
                      <Icon />
                    </span>
                    <span className="mst-list-text">
                      <span className="mst-list-title">
                        {section.label}
                        {fresh && <span className="fam-sr">, new</span>}
                      </span>
                      <span className="mst-list-meta">{section.hint}</span>
                    </span>
                    {fresh && (
                      <span className="fam-list-end">
                        <NewChip />
                      </span>
                    )}
                    <ChevronRightRounded className="fam-list-chev" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </FamilyPage>
  );
}
