// The parent's chat with the AI assistant for one child (Phase 1.38 design §4.5–4.7): its messages, the things made in it,
// a new chat's welcome and the composer, with drafts kept, retry-safe sending, older messages and dictation.
// Area: family

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../services/queryCache';
import { familyApi } from './familyApi';
import { familyError } from './familyErrors';
import { mergeDictation } from './familyPresentation';
import { isRunning as running } from './familyWords';
import ChatTimeline, { MineBubble, Thinking } from './notebook/ChatTimeline';
import Composer from './notebook/Composer';
import NotebookWelcome from './notebook/NotebookWelcome';
import { chatCards } from './notebook/chatCards';
import { chatIdeas } from './notebook/notebookWords';

/**
 * Reconnect observes saved jobs. Only an explicit Send dispatches new work. `chat` is useFamilyChats' chat; `materials`
 * are the ticked materials and `materialIds` their ids; `activities` and `attempts` are the notebook home's; `isNew(id)`
 * is a made thing's New mark and `resultLink(row)` its { to, state }. `narrow` is under 1200 px, where Materials is a
 * tab: `onMaterials` opens it, and `onUpload(files)` takes the paperclip's files.
 */
export default function FamilyConversation({
  child,
  chat,
  suggestion,
  materials = [],
  materialIds,
  activities,
  attempts = [],
  isNew,
  resultLink,
  onMaterials,
  onUpload,
  narrow,
}) {
  const { user } = useAuth(),
    generation = sessionGeneration();
  const key = chat.key;
  const draftKey = [...key, 'draft'];
  const storageKey = `mst.family.draft.${user.id}.${child.id}.${chat.id || 'latest'}`;
  const pendingKey = storageKey + '.request';
  const readPending = () => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey) || 'null');
    } catch {
      return null;
    }
  };
  const readDraft = () => {
    try {
      return sessionStorage.getItem(storageKey) || readPending()?.payload?.text || '';
    } catch {
      return '';
    }
  };
  const dictationInsertion = useRef(null);
  const [dictationUndo, setDictationUndo] = useState(null);
  const [text, setText] = useState(() => queryClient.getQueryData(draftKey) || readDraft());
  const [pending, setPendingState] = useState(() => queryClient.getQueryData([...key, 'pending']) || readPending()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const setPending = (value) => {
    setPendingState(value);
    queryClient.setQueryData([...key, 'pending'], value);
    try {
      if (value) sessionStorage.setItem(pendingKey, JSON.stringify(value));
      else sessionStorage.removeItem(pendingKey);
    } catch {
      /* Request remains in memory. */
    }
  };
  const [outgoing, setOutgoing] = useState(null);
  const alive = useRef(true),
    log = useRef(null),
    nearBottom = useRef(true),
    input = useRef(null),
    lastSeen = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const valid = () => alive.current && generation === sessionGeneration();
  const data = chat.data;
  const waiting = data?.turns.some((t) => running(t.activity));
  function change(value) {
    setText(value);
    queryClient.setQueryData(draftKey, value);
    try {
      if (value) sessionStorage.setItem(storageKey, value);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* In-memory draft remains available. */
    }
  }
  useEffect(() => {
    if (pending && data?.turns.some((turn) => turn.id === pending.id)) {
      const sent = pending.payload.text;
      setPending(null);
      if (text === sent) change('');
    }
  }, [data?.turns, pending?.id]);

  // One timeline: messages and things made here stay where they happened; new things arrive at the bottom.
  const items = [
    ...(data?.turns || []).map((turn) => ({
      kind: 'turn',
      key: `t${turn.id}`,
      at: Date.parse(turn.activity?.createdAt) || 0,
      turn,
    })),
    ...chatCards(activities, data?.id).map((row) => ({
      kind: 'act',
      key: `a${row.id}`,
      at: Date.parse(row.createdAt) || 0,
      row,
    })),
  ].sort((a, b) => a.at - b.at);
  const tail = items.at(-1);
  // Changes when something is added at the end or the newest item changes state; waits until the chat itself has loaded.
  const tailSignature = !data
    ? ''
    : outgoing
      ? `out:${outgoing.at}`
      : `${items.length}:${tail ? `${tail.key}:${tail.kind === 'turn' ? tail.turn.activity.status : tail.row.status}` : ''}`;

  // A chat opens at its newest message, and follows new ones only when the parent is already at the bottom (or has
  // just sent something).
  useLayoutEffect(() => {
    const el = log.current;
    if (!el || !tailSignature || lastSeen.current === tailSignature) return;
    const first = lastSeen.current === null;
    lastSeen.current = tailSignature;
    if (!first && !nearBottom.current) return;
    const answer = el.querySelector('[data-fresh-answer="true"]');
    if (answer && answer.offsetHeight > el.clientHeight * 0.6) answer.scrollIntoView({ block: 'start' });
    else el.scrollTop = el.scrollHeight;
  }, [tailSignature]);
  // A suggestion fills the box; one marked `send` (e.g. "Explain this" on a marked question) is sent straight away when the chat is free.
  useEffect(() => {
    if (!suggestion) return;
    if (suggestion.send && data && !busy && !waiting) {
      void send(null, suggestion.text);
      return;
    }
    change(suggestion.text);
    input.current?.focus();
  }, [suggestion?.id]);

  function insertDictation(transcript, automatic = false) {
    const current = queryClient.getQueryData(draftKey) ?? text;
    const next = mergeDictation(current, transcript, dictationInsertion.current, automatic);
    if (next === null) return false;
    setDictationUndo({ before: current, after: next });
    change(next);
    return true; // Only a draft update. Send remains a separate explicit action.
  }
  async function olderMessages() {
    const element = log.current,
      height = element?.scrollHeight || 0,
      top = element?.scrollTop || 0;
    nearBottom.current = false;
    await chat.loadOlder();
    requestAnimationFrame(() => {
      if (element && alive.current) element.scrollTop = top + element.scrollHeight - height;
    });
  }
  // Sends a message (or an explain-more request) under a client-made ID that a retry reuses, so it never sends twice.
  async function send(expandTurn = null, forced = null) {
    const typed = forced ?? text;
    if ((!typed.trim() && !expandTurn) || !data || busy || waiting) return;
    const sent = expandTurn ? 'Please explain that answer in more detail, with a simple example.' : typed.trim();
    const payload = {
      conversationId: data.id,
      revision: data.revision,
      text: sent,
      materialIds,
      detail: expandTurn ? 'expanded' : 'brief',
      targetMessageId: expandTurn?.id || null,
    };
    const signature = JSON.stringify({
      conversationId: payload.conversationId,
      text: payload.text,
      materialIds: payload.materialIds,
      detail: payload.detail,
      targetMessageId: payload.targetMessageId,
    });
    const request = pending?.signature === signature ? pending : { id: crypto.randomUUID(), signature, payload };
    setPending(request);
    setBusy(true);
    setError('');
    nearBottom.current = true;
    setOutgoing({ text: sent, at: Date.now() });
    if (!expandTurn && !forced) change('');
    try {
      await familyApi.sendMessage(child.id, request.id, request.payload);
      if (valid()) {
        setPending(null);
        await chat.refresh();
        setOutgoing(null);
      }
    } catch (e) {
      if (valid()) {
        setOutgoing(null);
        if (!queryClient.getQueryData(draftKey) && !expandTurn) change(sent); // Preserve anything typed while the request was in flight.
        setError(familyError(e, 'The message may not have sent. Tap send again: it won’t be sent twice.'));
        if (e.response?.status === 409) {
          setPending(null);
          await chat.refresh();
          await queryClient.invalidateQueries({
            queryKey: ['family', generation, user.id, child.id, 'home'],
          });
        }
      }
    } finally {
      if (valid()) setBusy(false);
    }
  }
  const canSend = !!data && !busy && !waiting && !!text.trim();
  const fresh = !!data && !data.turns.length && !outgoing;
  return (
    <section className="fam-nb-chat" aria-label="Chat">
      <div
        className="mst-chat-scroll fam-nb-log"
        ref={log}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        <div className="mst-chat-column">
          {fresh && (
            <NotebookWelcome
              name={child.displayName}
              ideas={chatIdeas(materials, child.displayName)}
              narrow={narrow}
              onIdea={(idea) => {
                change(idea);
                input.current?.focus();
              }}
            />
          )}
          {chat.hasOlder && (
            <Button className="fam-nb-older" disabled={chat.busy} onClick={olderMessages}>
              Load older messages
            </Button>
          )}
          {chat.query.isPending && <CircularProgress size={24} aria-label="Loading the chat" />}
          {chat.query.isError && (
            <Alert
              severity="error"
              action={
                <Button variant="outlined" onClick={() => chat.refresh()}>
                  Try again
                </Button>
              }
            >
              This chat couldn’t load. Check the connection, then try again.
            </Alert>
          )}
          {(items.length > 0 || outgoing) && (
            <div className="fam-nb-msgs">
              <ChatTimeline
                items={items}
                child={child}
                attempts={attempts}
                isNew={isNew}
                resultLink={resultLink}
                onSimpler={(turn) => send(turn)}
                disabled={busy || waiting}
              />
              {outgoing && (
                <>
                  <MineBubble text={outgoing.text} sending />
                  <Thinking since={outgoing.at} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Composer
        name={child.displayName}
        text={text}
        onChange={change}
        onSend={() => void send()}
        canSend={canSend}
        answering={!!(waiting || outgoing)}
        inputRef={input}
        narrow={narrow}
        materialCount={materialIds.length}
        onMaterials={onMaterials}
        onFiles={onUpload}
        ready={!!data}
        error={error}
        onDismissError={() => setError('')}
        undo={
          dictationUndo?.after === text
            ? () => {
                change(dictationUndo.before);
                setDictationUndo(null);
              }
            : null
        }
        dictation={{
          childId: child.id,
          conversationId: chat.id,
          disabled: !data,
          onBegin: () => {
            dictationInsertion.current = {
              text,
              start: input.current?.selectionStart ?? text.length,
              end: input.current?.selectionEnd ?? text.length,
            };
          },
          onReady: (transcript) => insertDictation(transcript, true),
          onInsert: (transcript) => insertDictation(transcript),
        }}
      />
    </section>
  );
}
