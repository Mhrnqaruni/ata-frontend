// The Notebook's header (Phase 1.38 design §4.3–4.4): teacher's chat header bar on computers, with Your chats, More and
// New chat; on phones one row with the chat's name, Chats, New and More. ?history=open opens Your chats on arrival.
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Button, Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import ListRounded from '@mui/icons-material/ListRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import { useLocation, useSearchParams } from 'react-router-dom';
import { emptyChat } from '../familyWords';
import { whenLabel } from '../whenLabel';
import ChatDialogs from './ChatDialogs';

const RECENT = 10; // the Your chats menu's latest chats; All chats… lists the rest
const BELOW = {
  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
  transformOrigin: { vertical: 'top', horizontal: 'right' },
};

/** `chat` is useFamilyChats' chat; `compact` gives the phone row; `sheet` makes the dialogs full screen. */
export default function ChatHeader({ child, chat, compact, sheet }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const trigger = useRef(null);
  const [chatsAt, setChatsAt] = useState(null);
  const [moreAt, setMoreAt] = useState(null);
  const [dialog, setDialog] = useState('');
  const data = chat.data;
  const name = data?.title || 'New chat';
  // From the child's profile (design §3.4): once the chat is in the address, the menu opens and the value goes.
  const arriving = params.get('history') === 'open';
  const ready = !!data && !!params.get('chat');
  useEffect(() => {
    if (!arriving || !ready || !trigger.current) return;
    setChatsAt(trigger.current);
    const next = new URLSearchParams(params);
    next.delete('history');
    setParams(next, { replace: true, state: location.state });
  }, [arriving, ready, params, setParams, location.state]);
  const open = (which) => {
    setChatsAt(null);
    setMoreAt(null);
    setDialog(which);
  };
  const history = (
    <Button
      ref={trigger}
      className="fam-nb-head-btn"
      startIcon={<HistoryRounded />}
      aria-haspopup="menu"
      aria-expanded={!!chatsAt}
      onClick={(e) => setChatsAt(e.currentTarget)}
      data-mst="family-chat-history"
    >
      {compact ? 'Chats' : 'Your chats'}
    </Button>
  );
  const more = (
    <IconButton
      aria-label="Chat options"
      aria-haspopup="menu"
      aria-expanded={!!moreAt}
      disabled={!data}
      onClick={(e) => setMoreAt(e.currentTarget)}
      data-mst="family-chat-options"
    >
      <MoreHorizRounded />
    </IconButton>
  );
  const fresh = (
    <Button
      variant={compact ? 'text' : 'outlined'}
      className={compact ? 'fam-nb-head-btn' : undefined}
      startIcon={<AddRounded />}
      aria-label={compact ? 'New chat' : undefined}
      disabled={chat.busy}
      onClick={() => void chat.create()}
      data-mst="family-chat-new"
    >
      {compact ? 'New' : 'New chat'}
    </Button>
  );
  return (
    <>
      {compact ? (
        <div className="fam-nb-row fam-nb-head">
          <p className="fam-nb-row-name">{name}</p>
          {history}
          {fresh}
          {more}
        </div>
      ) : (
        <header className="mst-chat-head fam-nb-head">
          <span className="mst-msg-avatar" aria-hidden>
            <AutoAwesomeRounded />
          </span>
          {/* The page's h1 already says "Assistant" to screen readers (NotebookPage), so this copy is for the eye. */}
          <div className="mst-chat-head-text">
            <span className="mst-chat-title" aria-hidden>
              Assistant
            </span>
            <span className="mst-hint">{name} · answers by AI</span>
          </div>
          {history}
          {more}
          {fresh}
        </header>
      )}
      <Menu
        open={!!chatsAt}
        anchorEl={chatsAt}
        onClose={() => setChatsAt(null)}
        className="fam-nb-menu fam-nb-chats"
        {...BELOW}
      >
        <ListSubheader className="fam-nb-menu-label">Your chats about {child.displayName}</ListSubheader>
        {/* Chats with nothing in them yet are left out (the Designer, row 4). */}
        {chat.items
          .filter((item) => !emptyChat(item))
          .slice(0, RECENT)
          .map((item) => {
            const on = item.id === data?.id;
            return (
              <MenuItem
                key={item.id}
                role="menuitemradio"
                aria-checked={on}
                selected={on}
                onClick={() => {
                  setChatsAt(null);
                  chat.select(item.id);
                }}
              >
                <span className="fam-nb-menu-text">
                  <span className="fam-nb-menu-name">{item.title || 'New chat'}</span>
                  <span className="fam-nb-menu-meta">{whenLabel(item.updatedAt || item.createdAt)}</span>
                </span>
                {on && <CheckRounded className="fam-nb-menu-check" aria-hidden />}
              </MenuItem>
            );
          })}
        <Divider />
        <MenuItem
          className="fam-nb-menu-all"
          onClick={() => {
            open('all');
            void chat.refresh();
          }}
        >
          <ListItemIcon>
            <ListRounded />
          </ListItemIcon>
          All chats…
        </MenuItem>
      </Menu>
      <Menu open={!!moreAt} anchorEl={moreAt} onClose={() => setMoreAt(null)} className="fam-nb-menu" {...BELOW}>
        <MenuItem onClick={() => open('rename')}>Rename chat</MenuItem>
        <MenuItem onClick={() => open('sound')}>How should answers sound?</MenuItem>
      </Menu>
      <ChatDialogs dialog={dialog} onClose={() => setDialog('')} child={child} chat={chat} sheet={sheet} />
    </>
  );
}
