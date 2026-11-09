// The child's profile, "Sam's profile" (Phase 1.38 design §3): the child's avatar, name, year and note with Edit
// details, how the child is doing (the scores card), and the parent's latest chats about the child.
// Area: family

import { useId } from 'react';
import { Button, Skeleton } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import ChildAvatar from '../ChildAvatar';
import { familyApi, familyKeys } from '../familyApi';
import { familyPath } from '../familyPaths';
import { resultPath } from '../sections';
import FamilyPage from '../shell/FamilyPage';
import useDialogParam from '../useDialogParam';
import { emptyChat } from '../familyWords';
import { whenLabel } from '../whenLabel';
import ScoresCard from './ScoresCard';
import './profile.css';

const CHATS = 5; // the latest five chats (design §3.4)
const timeOf = (chat) => Date.parse(chat.updatedAt || chat.createdAt) || 0;

/** A chat row's meta: "Last message today at 18:20", "Last message yesterday at 09:05" or "Last message 7 Nov". */
export function lastMessage(at, now) {
  const when = whenLabel(at, now);
  return when && `Last message ${when.charAt(0).toLowerCase()}${when.slice(1)}`;
}

/** The title row's line under the name: the year, then the parent's note when there is one. */
export function profileLine(child) {
  const year = child.gradeLevel || 'Year not set';
  const note = (child.notes || '').trim();
  return note ? `${year} · ${note}` : year;
}

export default function ProfilePage() {
  const { child } = useOutletContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [, showEdit] = useDialogParam('edit-child');
  return (
    <FamilyPage
      section="Profile"
      title={child.displayName}
      // One line, cut off with an ellipsis when the note is long; Edit details shows all of it.
      subtitle={<span className="fam-profile-line">{profileLine(child)}</span>}
      leading={<ChildAvatar child={child} size={64} />}
      actions={
        <Button variant="outlined" startIcon={<EditOutlined />} onClick={showEdit} data-mst="family-edit-child">
          Edit details
        </Button>
      }
      className="fam-profile"
    >
      <div className="fam-profile-grid">
        {/* A dot opens its result, whose back link returns here. */}
        <ScoresCard
          childId={child.id}
          childName={child.displayName}
          onOpen={(item) => navigate(resultPath(child.id, item), { state: { from: pathname } })}
        />
        <Chats child={child} />
      </div>
    </FamilyPage>
  );
}

// "Your chats about Sam" (design §3.4): teacher Home's list, with up to five chats, newest first, from the chat list.
// Each row opens its chat in the Notebook, and See all opens the Notebook with its chat history open.
function Chats({ child }) {
  const { user } = useAuth();
  const heading = useId();
  const name = child.displayName;
  const chats = useQuery({
    queryKey: familyKeys.chats(sessionGeneration(), user?.id, child.id),
    queryFn: ({ signal }) => familyApi.chats(child.id, { signal }),
    enabled: !!user?.id,
  });
  // Chats with nothing in them yet are left out (the Designer, row 3): a "New chat" row read as a button.
  const all = (chats.data?.items ?? []).filter((chat) => !emptyChat(chat));
  const latest = [...all].sort((a, b) => timeOf(b) - timeOf(a)).slice(0, CHATS);
  let body;
  if (!chats.data && chats.isError)
    body = (
      <p className="mst-panel-empty">
        Could not load your chats about {name}.{' '}
        <Button onClick={() => chats.refetch()} data-mst="family-profile-chats-retry">
          Try again
        </Button>
      </p>
    );
  else if (!chats.data) body = <Skeleton height={64} sx={{ mx: 2 }} aria-hidden />;
  else if (!latest.length) body = <p className="mst-panel-empty">Your chats about {name} will show here.</p>;
  else
    body = (
      <ul className="mst-list">
        {latest.map((chat) => (
          <li key={chat.id}>
            <Link
              className="mst-list-row home-row-button"
              to={familyPath(child.id, 'notebook', '', { chat: chat.id })}
              data-mst="family-profile-chat"
            >
              <span className="mst-tile" data-size="sm" aria-hidden>
                <ForumOutlined />
              </span>
              <span className="mst-list-text">
                <span className="mst-list-title">{chat.title || 'New chat'}</span>
                <span className="mst-list-meta">{lastMessage(chat.updatedAt || chat.createdAt)}</span>
              </span>
              <ChevronRightRounded fontSize="small" className="fam-profile-chev" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <section
      className="mst-g1 mst-rim home-recent fam-profile-chats"
      aria-labelledby={heading}
      aria-busy={chats.isPending}
      data-mst="family-profile-chats"
    >
      <header>
        <h2 id={heading} className="mst-card-title">
          Your chats about {name}
        </h2>
        {/* See all only when there's more than the list shows (the tester: "are there more than two?") */}
        {all.length > CHATS && (
          <Button
            component={Link}
            to={`${familyPath(child.id, 'notebook')}?history=open`}
            size="small"
            endIcon={<ChevronRightRounded />}
            data-mst="family-profile-all-chats"
          >
            See all
          </Button>
        )}
      </header>
      {body}
    </section>
  );
}
