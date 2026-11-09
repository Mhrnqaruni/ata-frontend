// The Notebook's composer (Phase 1.38 design §4.7): teacher's floating glass box with the message field, dictation and
// Send; under 1200 px, where Materials is a tab, the paperclip and the line that says which materials answers use.
// Area: family

import { useRef } from 'react';
import { Alert, Button, CircularProgress, IconButton, TextField } from '@mui/material';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import FamilyDictation from '../FamilyDictation';
import { usingLine } from './notebookWords';

/**
 * A controlled box: `text` and `onChange`, `onSend` when `canSend`. `answering` shows while a reply is on its way.
 * `onFiles(files)` takes the paperclip's files; `onMaterials` opens the Materials tab. `dictation` is FamilyDictation's
 * props, and `undo` offers to take back the last dictation.
 */
export default function Composer({
  name,
  text,
  onChange,
  onSend,
  canSend,
  answering,
  inputRef,
  narrow,
  materialCount,
  onMaterials,
  onFiles,
  ready,
  error,
  onDismissError,
  undo,
  dictation,
}) {
  const attach = useRef(null);
  const [words, action] = usingLine(materialCount);
  return (
    <div className="mst-chat-column mst-chat-composer-wrap fam-nb-compose">
      {undo && (
        <Button size="small" className="fam-nb-undo" onClick={undo}>
          Undo dictation
        </Button>
      )}
      {error && (
        <Alert severity="error" onClose={onDismissError}>
          {error}
        </Alert>
      )}
      {narrow && (
        <button type="button" className="fam-nb-using" onClick={onMaterials} data-mst="family-chat-materials">
          <MenuBookOutlined aria-hidden />
          <span>
            {words} · <b>{action}</b>
          </span>
        </button>
      )}
      <div className="mst-composer fam-nb-box">
        {narrow && (
          <>
            <IconButton
              className="fam-icon-btn"
              aria-label="Add a photo or PDF"
              onClick={() => attach.current?.click()}
              disabled={!ready}
            >
              <AttachFileRounded />
            </IconButton>
            <input
              ref={attach}
              hidden
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (files.length) onFiles(files);
              }}
            />
          </>
        )}
        {/* .fam-compose-input is the keyboard rule's hook (useTypingRule.js). */}
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          variant="standard"
          className="fam-compose-input"
          placeholder={answering ? 'Answering…' : `Ask anything about ${name}’s schoolwork…`}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          InputProps={{ disableUnderline: true }}
          inputProps={{ maxLength: 4000, 'aria-label': 'Message' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <FamilyDictation {...dictation} />
        <Button
          variant="contained"
          className="fam-nb-send"
          aria-label={answering ? 'Answering' : 'Send'}
          disabled={!canSend}
          onClick={onSend}
          data-mst="family-chat-send"
        >
          {answering ? <CircularProgress size={20} color="inherit" aria-hidden /> : <ArrowUpwardRounded />}
        </Button>
      </div>
    </div>
  );
}
