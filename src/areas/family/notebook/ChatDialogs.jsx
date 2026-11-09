// The Notebook header's three windows (Phase 1.38 design §4.4), moved from FamilyConversation.jsx: All chats (today's
// history), Rename chat, and How should answers sound?, the chat's note for the AI assistant.
// Area: family

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { familyApi } from '../familyApi';
import { emptyChat } from '../familyWords';
import { whenLabel } from '../whenLabel';

/** `dialog` is '', 'all', 'rename' or 'sound'; `chat` is useFamilyChats' chat; `sheet` makes them full screen. */
export default function ChatDialogs({ dialog, onClose, child, chat, sheet }) {
  const data = chat.data;
  const [shown, setShown] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Each opening starts from the chat as it is now.
  if (shown !== dialog) {
    setShown(dialog);
    setTitle(data?.title || '');
    setNote(data?.preference || '');
    setError('');
  }
  async function saveNote() {
    setSaving(true);
    setError('');
    try {
      await familyApi.setChatPreference(child.id, data.id, note);
      await chat.refresh();
      onClose();
    } catch {
      setError('Couldn’t save. Check the connection, then try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Dialog
        open={dialog === 'all'}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        fullScreen={sheet}
        className="fam-dialog fam-dialog-top"
      >
        <DialogTitle>All chats</DialogTitle>
        <DialogContent>
          <ul className="fam-chat-list">
            <li>
              <button
                type="button"
                className="fam-chat-row fam-chat-new"
                disabled={chat.busy}
                onClick={async () => {
                  if (await chat.create()) onClose();
                }}
              >
                <AddRounded aria-hidden />
                <span>Start a new chat</span>
              </button>
            </li>
            {chat.items
              .filter((item) => !emptyChat(item))
              .map((item) => {
                const on = item.id === data?.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="fam-chat-row"
                      data-on={on}
                      aria-current={on ? 'true' : undefined}
                      onClick={() => {
                        chat.select(item.id);
                        onClose();
                      }}
                    >
                      <ChatBubbleOutlineRounded className="fam-chat-row-icon" aria-hidden />
                      <span className="fam-chat-row-text">
                        <span className="fam-chat-row-title">{item.title || 'New chat'}</span>
                        <span className="fam-small">{whenLabel(item.updatedAt || item.createdAt)}</span>
                      </span>
                      {on && (
                        <span className="fam-chat-row-now">
                          <CheckRounded aria-hidden />
                          Current
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
          {chat.hasMoreChats && (
            <Button onClick={chat.moreChats} disabled={chat.busy}>
              Show older chats
            </Button>
          )}
          {chat.error && <Alert severity="error">{chat.error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={dialog === 'rename'} onClose={onClose} fullWidth maxWidth="xs" className="fam-dialog">
        <DialogTitle>Rename chat</DialogTitle>
        <DialogContent>
          <div className="fam-form">
            {chat.error && <Alert severity="error">{chat.error}</Alert>}
            <TextField
              label="Chat name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              inputProps={{ maxLength: 120 }}
              fullWidth
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || chat.busy}
            onClick={async () => {
              if (await chat.rename(title.trim())) onClose();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === 'sound'}
        onClose={() => !saving && onClose()}
        fullWidth
        maxWidth="sm"
        fullScreen={sheet}
        className="fam-dialog"
      >
        <DialogTitle>How should answers sound?</DialogTitle>
        <DialogContent>
          <div className="fam-form">
            <Typography className="fam-lead-s">
              Tell the AI assistant what works for {child.displayName}. It uses this note in this chat only.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Your note"
              placeholder="For example: short sentences, lots of pictures in words, use football examples"
              value={note}
              inputProps={{ maxLength: 500 }}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" disabled={saving || !data} onClick={saveNote}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
