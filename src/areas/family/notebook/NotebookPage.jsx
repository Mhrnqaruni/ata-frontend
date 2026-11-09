// The Assistant, at /notebook (Phase 1.38 design §4; the Manager's D6 rename): the address's child's chat with the AI
// helper, with ?chat= as today, inside the shell. Its h1 is visually hidden, as the chat's header shows the name.
// Area: family

import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import FamilyLearning from '../FamilyLearning';
import FamilyPage from '../shell/FamilyPage';
import useTypingRule from './useTypingRule';
import './notebook.css';

export default function NotebookPage() {
  const { child, marks } = useOutletContext();
  const { user } = useAuth();
  useTypingRule();
  return (
    <FamilyPage section="Assistant" title="Assistant" hideTitle>
      <FamilyLearning key={`${user.id}:${child.id}`} child={child} isNew={marks?.isNew} />
    </FamilyPage>
  );
}
