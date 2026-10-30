import FamilyDictation from "./FamilyDictation";
import FamilyEvidence from "./FamilyEvidence";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import AttachFileRounded from "@mui/icons-material/AttachFileRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import QuizRounded from "@mui/icons-material/QuizRounded";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { queryClient, sessionGeneration } from "../../services/queryCache";
import FamilyMarkdown from "./FamilyMarkdown";
import api from "../../services/api";
import { isRunning as running, kindWords, levelWords } from "./familyWords";
import { StatusChip, kindIcon } from "./FamilyParts";

const ukDay = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};
const levelName = (value) =>
  (levelWords.find(([v]) => v === value) || [, value])[1];

/** The card a parent acts on in the chat; it reads the same state as "Done so far", so the two never disagree. */
function ActivityCard({ row, attempt, onOpen }) {
  const Icon = kindIcon[row.kind] || AutoAwesomeRounded;
  const words = kindWords[row.kind] || {
    label: "Activity",
    making: "Getting it ready",
    ready: "It’s ready",
  };
  const ready = row.status === "completed";
  const busy = running(row);
  const what =
    row.kind === "quiz" || row.kind === "flashcards"
      ? `${words.label} · ${row.count} ${row.kind === "quiz" ? "questions" : "cards"}`
      : words.label;
  const action = !ready
    ? busy
      ? null
      : "See what happened"
    : row.kind === "quiz"
      ? attempt
        ? "See results"
        : "Start quiz"
      : {
          flashcards: "Open cards",
          mindmap: "Open map",
          story: "Read story",
          check: "See marking",
        }[row.kind] || "Open";
  return (
    <article
      className="fam-card-act"
      data-state={busy ? "busy" : ready ? "ready" : "other"}
    >
      <span className="fam-act-icon" data-kind={row.kind} aria-hidden>
        <Icon />
      </span>
      <div className="fam-card-act-body">
        <Typography component="h3" className="fam-card-act-title">
          {busy ? `${words.making}…` : row.title}
        </Typography>
        <Typography className="fam-small">
          {busy
            ? "About a minute"
            : row.title === words.label
              ? ukDay(row.createdAt)
              : `${what}${row.kind === "quiz" && row.difficulty ? ` · ${levelName(row.difficulty)}` : ""}`}
        </Typography>
        {busy && <LinearProgress className="fam-making-bar" />}
      </div>
      {!busy && !(ready && !attempt) && (
        <StatusChip row={row} attempt={attempt} />
      )}
      {action && (
        <Button
          variant={ready && !attempt ? "contained" : "outlined"}
          onClick={() => onOpen(row)}
        >
          {action}
        </Button>
      )}
    </article>
  );
}

/** "Today", "Yesterday" or "28 Oct": the separators a parent knows from messaging apps. */
function dayLabel(ms) {
  const d = new Date(ms);
  const today = new Date();
  const start = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  return diff === 0
    ? "Today"
    : diff === 1
      ? "Yesterday"
      : d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
        });
}
const clock = (ms) =>
  new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** The assistant is working: three soft dots and words that change with the wait (honest, never a fake percentage). */
function Thinking({ since, topic, stage }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const words =
    s < 45
      ? stage || "Preparing your reply…"
      : "Still working on it. You can leave and come back.";
  return (
    <div
      className="fam-msg fam-msg-ai fam-thinking"
      role="status"
      aria-live="polite"
    >
      <span className="fam-msg-avatar fam-avatar-busy" aria-hidden>
        <AutoAwesomeRounded />
      </span>
      <div className="fam-bubble fam-bubble-thinking">
        <span className="fam-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>{words}</span>
      </div>
    </div>
  );
}

/** Reconnect observes saved jobs. Only an explicit Send dispatches new work. */
export default function FamilyConversation({
  child,
  chat,
  uploadState,
  onHomework,
  suggestion,
  materials = [],
  available = [],
  onUseMaterial,
  materialIds,
  onMaterials,
  onToggleMaterial,
  onCreate,
  onUpload,
  onTopic,
  activities,
  attempts = [],
  onActivity,
  starter,
  compact,
}) {
  const { user } = useAuth(),
    generation = sessionGeneration();
  const key = chat.key;
  const draftKey = [...key, "draft"];
  const storageKey = `mst.family.draft.${user.id}.${child.id}.${chat.id || "latest"}`;
  const pendingKey = storageKey + ".request";
  const readPending = () => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingKey) || "null");
    } catch {
      return null;
    }
  };
  const readDraft = () => {
    try {
      return (
        sessionStorage.getItem(storageKey) || readPending()?.payload?.text || ""
      );
    } catch {
      return "";
    }
  };
  const base = `/api/family/children/${child.id}/conversation`;
  const conversation = {
    ...chat.query,
    data: chat.data,
    refetch: chat.refresh,
  };
  const [historyOpen, setHistoryOpen] = useState(false),
    [rename, setRename] = useState(null);
  const attach = useRef(null),
    dictationInsertion = useRef(null);
  const [dictationUndo, setDictationUndo] = useState(null);
  const [text, setText] = useState(
    () => queryClient.getQueryData(draftKey) || readDraft(),
  );
  const [pending, setPendingState] = useState(
      () => queryClient.getQueryData([...key, "pending"]) || readPending(),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const setPending = (value) => {
    setPendingState(value);
    queryClient.setQueryData([...key, "pending"], value);
    try {
      if (value) sessionStorage.setItem(pendingKey, JSON.stringify(value));
      else sessionStorage.removeItem(pendingKey);
    } catch {
      /* Request remains in memory. */
    }
  };
  const [outgoing, setOutgoing] = useState(null);
  const [makeMenu, setMakeMenu] = useState(null);
  const [context, setContext] = useState(false),
    [preference, setPreference] = useState(""),
    [newDialog, setNewDialog] = useState(false),
    [menu, setMenu] = useState(null);
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
  const data = conversation.data;
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
      if (text === sent) change("");
    }
  }, [data?.turns, pending?.id]);
  const topicName =
    materials.length === 1
      ? materials[0].title
      : materials.length
        ? `${materials.length} topics`
        : "";

  // One timeline: messages and activity cards stay where they happened; new things arrive at the bottom.
  const items = [
    ...(data?.turns || []).map((turn) => ({
      kind: "turn",
      key: `t${turn.id}`,
      at: Date.parse(turn.activity?.createdAt) || 0,
      turn,
    })),
    ...activities
      .filter(
        (row) =>
          row.conversationId === data?.id ||
          (!row.conversationId && chat.items[0]?.id === data?.id),
      )
      .slice(0, 12)
      .map((row) => ({
        kind: "act",
        key: `a${row.id}`,
        at: Date.parse(row.createdAt) || 0,
        row,
      })),
  ].sort((a, b) => a.at - b.at);
  const tail = items.at(-1);
  // Changes when something is added at the end or the newest item changes state; waits until the chat itself has loaded.
  const tailSignature = !data
    ? ""
    : outgoing
      ? `out:${outgoing.at}`
      : `${items.length}:${tail ? `${tail.key}:${tail.kind === "turn" ? tail.turn.activity.status : tail.row.status}` : ""}`;

  // Follow the conversation only when the parent is already at the bottom (or has just sent something).
  useLayoutEffect(() => {
    const el = log.current;
    if (!el || !tailSignature || lastSeen.current === tailSignature) return;
    const first = lastSeen.current === null;
    lastSeen.current = tailSignature;
    if (!first && !nearBottom.current) return;
    const answer = el.querySelector('[data-fresh-answer="true"]');
    if (answer && answer.offsetHeight > el.clientHeight * 0.6)
      answer.scrollIntoView({ block: "start" });
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

  async function olderMessages() {
    const element = log.current,
      height = element?.scrollHeight || 0,
      top = element?.scrollTop || 0;
    nearBottom.current = false;
    await chat.loadOlder();
    requestAnimationFrame(() => {
      if (element && alive.current)
        element.scrollTop = top + element.scrollHeight - height;
    });
  }
  async function send(expandTurn = null, forced = null) {
    const typed = forced ?? text;
    if ((!typed.trim() && !expandTurn) || !data || busy || waiting) return;
    const sent = expandTurn
      ? "Please explain that answer in more detail, with a simple example."
      : typed.trim();
    const payload = {
      conversationId: data.id,
      revision: data.revision,
      text: sent,
      materialIds,
      detail: expandTurn ? "expanded" : "brief",
      targetMessageId: expandTurn?.id || null,
    };
    const signature = JSON.stringify({
      conversationId: payload.conversationId,
      text: payload.text,
      materialIds: payload.materialIds,
      detail: payload.detail,
      targetMessageId: payload.targetMessageId,
    });
    const request =
      pending?.signature === signature
        ? pending
        : { id: crypto.randomUUID(), signature, payload };
    setPending(request);
    setBusy(true);
    setError("");
    nearBottom.current = true;
    setOutgoing({ text: sent, at: Date.now() });
    if (!expandTurn && !forced) change("");
    try {
      await api.put(`${base}/messages/${request.id}`, request.payload);
      if (valid()) {
        setPending(null);
        await chat.refresh();
        setOutgoing(null);
      }
    } catch (e) {
      if (valid()) {
        setOutgoing(null);
        if (!queryClient.getQueryData(draftKey) && !expandTurn) change(sent); // Preserve anything typed while the request was in flight.
        setError(
          typeof e.response?.data?.detail === "string"
            ? e.response.data.detail
            : "The message may not have sent. Tap send again: it won’t be sent twice.",
        );
        if (e.response?.status === 409) {
          setPending(null);
          await conversation.refetch();
          await queryClient.invalidateQueries({
            queryKey: ["family", generation, user.id, child.id, "home"],
          });
        }
      }
    } finally {
      if (valid()) setBusy(false);
    }
  }
  async function saveContext() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`${base}/${data.id}`, { preference });
      if (valid()) {
        await conversation.refetch();
        setContext(false);
      }
    } catch {
      if (valid()) setError("Could not save. Please try again.");
    } finally {
      if (valid()) setBusy(false);
    }
  }
  async function newConversation() {
    if (await chat.create()) setNewDialog(false);
  }
  const canSend = !!data && !busy && !waiting && !!text.trim();
  let lastDay = "";
  const dayRow = (at) => {
    if (!at) return null;
    const label = dayLabel(at);
    if (label === lastDay) return null;
    lastDay = label;
    return (
      <div className="fam-day" role="separator">
        <span>{label}</span>
      </div>
    );
  };
  return (
    <section className="fam-chat" aria-label="Chat">
      <header className="fam-chat-head">
        <Button
          className="fam-chat-title-button"
          aria-label={`${data?.title || "New chat"}: chat menu`}
          endIcon={<ExpandMoreRounded />}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          onClick={(e) => setMenu(e.currentTarget)}
          disabled={!data}
        >
          <span className="fam-chat-title-text">
            {data?.title || "New chat"}
          </span>
        </Button>
      </header>

      <Menu
        open={!!menu}
        anchorEl={menu}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          disabled={chat.busy}
          onClick={() => {
            setMenu(null);
            void chat.create();
          }}
        >
          New chat
        </MenuItem>
        {chat.items.slice(0, 6).map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === data?.id}
            onClick={() => {
              chat.select(item.id);
              setMenu(null);
            }}
          >
            {item.title || "New chat"}
            {item.id === data?.id ? " · Current" : ""}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            setMenu(null);
            setHistoryOpen(true);
            void chat.refresh();
          }}
        >
          All chats…
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null);
            setRename(data?.title || "");
          }}
        >
          Rename chat
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenu(null);
            setPreference(data?.preference || "");
            setContext(true);
          }}
        >
          How should answers sound?
        </MenuItem>
      </Menu>
      <div
        className="fam-log"
        ref={log}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions text"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        <div className="fam-log-inner">
          {data && !data.turns.length && !outgoing && (
            <div className="fam-empty-chat">
              <Typography component="h2" className="fam-bubble-title">
                What shall we work on?
              </Typography>
              {materialIds.length > 0 && (
                <Typography className="fam-small">With {topicName}</Typography>
              )}
            </div>
          )}
          {!data?.turns.length && !outgoing && starter}
          {chat.hasOlder && (
            <Button disabled={chat.busy} onClick={olderMessages}>
              Load older messages
            </Button>
          )}
          {!data?.turns.length &&
            !outgoing &&
            !materialIds.length &&
            available.length > 0 && (
              <div
                className="fam-suggest"
                role="group"
                aria-label="Your topics"
              >
                {available.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="fam-suggest-chip"
                    onClick={() => onUseMaterial(item.id)}
                  >
                    <MenuBookRounded aria-hidden />
                    Use {item.title}
                  </button>
                ))}
              </div>
            )}
          {!data?.turns.length && !outgoing && materialIds.length > 0 && (
            <div className="fam-suggest" role="group" aria-label="Ideas">
              <button
                type="button"
                className="fam-suggest-chip"
                onClick={() => onCreate("quiz")}
              >
                <QuizRounded aria-hidden />
                Quiz on {topicName}
              </button>
              <button
                type="button"
                className="fam-suggest-chip"
                onClick={() => {
                  change(`Explain ${topicName} with an example.`);
                  input.current?.focus();
                }}
              >
                <LightbulbOutlined aria-hidden />
                Explain {topicName} with an example
              </button>
              <button
                type="button"
                className="fam-suggest-chip"
                onClick={() => onCreate("flashcards")}
              >
                {React.createElement(kindIcon.flashcards, {
                  "aria-hidden": true,
                })}
                Flashcards for {topicName}
              </button>
            </div>
          )}
          {conversation.isPending && (
            <CircularProgress size={24} aria-label="Loading the chat" />
          )}
          {conversation.isError && (
            <Alert
              severity="error"
              action={
                <Button onClick={() => conversation.refetch()}>
                  Try again
                </Button>
              }
            >
              Could not load the chat.
            </Alert>
          )}
          {items.map((item, index) => {
            if (item.kind === "act")
              return (
                <React.Fragment key={item.key}>
                  {dayRow(item.at)}
                  <ActivityCard
                    row={item.row}
                    attempt={attempts.find((a) => a.activityId === item.row.id)}
                    onOpen={onActivity}
                  />
                </React.Fragment>
              );
            const { turn } = item;
            const status = turn.activity.status;
            const latest = index === items.length - 1;
            return (
              <React.Fragment key={item.key}>
                {dayRow(item.at)}
                <div className="fam-msg fam-msg-me">
                  <div className="fam-bubble">{turn.text}</div>
                </div>
                <span className="fam-time fam-time-me">
                  {item.at ? clock(item.at) : ""}
                </span>
                {running(turn.activity) ? (
                  <Thinking
                    stage={turn.activity.stage}
                    since={item.at || Date.now()}
                    topic={topicName}
                  />
                ) : (
                  <div
                    className="fam-msg fam-msg-ai"
                    key={`${turn.id}:${status}`}
                    data-fresh-answer={latest}
                  >
                    <span className="fam-msg-avatar" aria-hidden>
                      <AutoAwesomeRounded />
                    </span>
                    <div className="fam-bubble fam-bubble-answer">
                      {turn.activity.result ? (
                        <>
                          <div className="fam-prose">
                            <FamilyMarkdown
                              text={
                                turn.activity.result.explanation ||
                                turn.activity.result.message
                              }
                            />
                          </div>
                          <FamilyEvidence
                            base={`/api/family/children/${child.id}`}
                            activity={turn.activity}
                          />
                          {latest &&
                            turn.activity.status === "completed" &&
                            turn.activity.result.explanation?.length > 60 && (
                              <button
                                type="button"
                                className="fam-more-chip"
                                disabled={busy || waiting}
                                onClick={() => send(turn)}
                              >
                                Explain more
                              </button>
                            )}
                        </>
                      ) : (
                        <Alert severity="warning">
                          {turn.activity.error ||
                            "This reply couldn’t finish. Your message is saved. Check its status before deliberately trying again."}
                        </Alert>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {outgoing && (
            <>
              {dayRow(outgoing.at)}
              <div className="fam-msg fam-msg-me fam-sending">
                <div className="fam-bubble">{outgoing.text}</div>
              </div>
              <span className="fam-time fam-time-me">Sending…</span>
              <Thinking since={outgoing.at} topic={topicName} />
            </>
          )}
        </div>
      </div>
      <div className="fam-compose-wrap">
        {dictationUndo?.after === text && (
          <Button
            size="small"
            onClick={() => {
              change(dictationUndo.before);
              setDictationUndo(null);
            }}
          >
            Undo dictation
          </Button>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <div className="fam-compose">
          {uploadState?.files?.length > 0 && (
            <Typography role="status" className="fam-small">
              {uploadState.submitted
                ? uploadState.percent === 100
                  ? "Saving…"
                  : `Uploading ${uploadState.percent || 0}%`
                : `${uploadState.files.length} file${uploadState.files.length === 1 ? "" : "s"} ready`}
            </Typography>
          )}
          {
            <button
              type="button"
              className="fam-source-context"
              onClick={onMaterials}
            >
              <MenuBookRounded aria-hidden />
              {materialIds.length
                ? `Using ${materialIds.length} ${materialIds.length === 1 ? "material" : "materials"} · Change`
                : "General help · Add materials"}
            </button>
          }
          <div className="fam-compose-row">
            <IconButton
              className="fam-icon-btn"
              aria-label="Attach a photo or PDF"
              onClick={() => attach.current?.click()}
              disabled={!data}
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
                e.target.value = "";
                if (files.length) onUpload(files);
              }}
            />
            <TextField
              inputRef={input}
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              variant="standard"
              className="fam-compose-input"
              placeholder={waiting || outgoing ? "Answering…" : "Ask anything…"}
              value={text}
              onChange={(e) => change(e.target.value)}
              InputProps={{ disableUnderline: true }}
              inputProps={{ maxLength: 4000, "aria-label": "Message" }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <FamilyDictation
              key={`${child.id}:${chat.id}`}
              childId={child.id}
              conversationId={chat.id}
              disabled={!data}
              onBegin={() => {
                dictationInsertion.current = {
                  text,
                  start: input.current?.selectionStart ?? text.length,
                  end: input.current?.selectionEnd ?? text.length,
                };
              }}
              onInsert={(transcript) => {
                const at = dictationInsertion.current;
                const next =
                  at && at.text === text
                    ? text.slice(0, at.start) + transcript + text.slice(at.end)
                    : [text, transcript].filter(Boolean).join(" ");
                if (next.length > 4000) return false;
                setDictationUndo({ before: text, after: next });
                change(next);
                input.current?.focus();
                return true;
              }}
            />
            <IconButton
              className="fam-send"
              aria-label={waiting || outgoing ? "Answering" : "Send"}
              disabled={!canSend}
              onClick={() => send()}
            >
              {waiting || outgoing ? (
                <CircularProgress size={20} color="inherit" aria-hidden />
              ) : (
                <ArrowUpwardRounded />
              )}
            </IconButton>
          </div>
        </div>
      </div>
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="xs"
        fullScreen={compact}
        className="fam-dialog fam-dialog-top"
      >
        <DialogTitle>Chat history</DialogTitle>
        <DialogContent>
          <ul className="fam-chat-list">
            <li>
              <button
                type="button"
                className="fam-chat-row fam-chat-new"
                disabled={chat.busy}
                onClick={async () => {
                  if (await chat.create()) setHistoryOpen(false);
                }}
              >
                <AddRounded aria-hidden />
                <span>Start a new chat</span>
              </button>
            </li>
            {chat.items.map((item) => {
              const on = item.id === data?.id;
              const at = Date.parse(item.updatedAt || item.createdAt);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="fam-chat-row"
                    data-on={on}
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      chat.select(item.id);
                      setHistoryOpen(false);
                    }}
                  >
                    <ChatBubbleOutlineRounded
                      className="fam-chat-row-icon"
                      aria-hidden
                    />
                    <span className="fam-chat-row-text">
                      <span className="fam-chat-row-title">
                        {item.title || "New chat"}
                      </span>
                      {at ? (
                        <span className="fam-small">
                          {dayLabel(at)}
                          {dayLabel(at) === "Today" ||
                          dayLabel(at) === "Yesterday"
                            ? ` · ${clock(at)}`
                            : ""}
                        </span>
                      ) : null}
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
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={rename !== null}
        onClose={() => setRename(null)}
        className="fam-dialog"
      >
        <DialogTitle>Rename chat</DialogTitle>
        <DialogContent>
          {chat.error && <Alert severity="error">{chat.error}</Alert>}
          <TextField
            label="Chat name"
            value={rename || ""}
            onChange={(e) => setRename(e.target.value)}
            inputProps={{ maxLength: 120 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRename(null)}>Cancel</Button>
          <Button
            disabled={!rename?.trim() || chat.busy}
            onClick={async () => {
              if (await chat.rename(rename.trim())) setRename(null);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={context}
        onClose={() => !busy && setContext(false)}
        fullWidth
        maxWidth="sm"
        className="fam-dialog"
      >
        <DialogTitle>Explanation style</DialogTitle>
        <DialogContent>
          <div className="fam-form">
            <Typography className="fam-lead-s">
              Tell us what works for {child.displayName}. We only use the topics
              you pick and this chat.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Your note"
              placeholder="For example: short sentences, lots of pictures in words, use football examples"
              value={preference}
              inputProps={{ maxLength: 500 }}
              onChange={(e) => setPreference(e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContext(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy} onClick={saveContext}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={newDialog}
        onClose={() => !busy && setNewDialog(false)}
        fullWidth
        maxWidth="xs"
        className="fam-dialog"
      >
        <DialogTitle>Start a new chat?</DialogTitle>
        <DialogContent>
          {chat.error && <Alert severity="error">{chat.error}</Alert>}
          <Typography>
            Nothing is deleted. Your topics, quizzes and scores stay, and the
            old messages are kept. The new chat simply starts fresh.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={busy || waiting}
            onClick={newConversation}
          >
            {busy ? "Starting…" : "Start a new chat"}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
