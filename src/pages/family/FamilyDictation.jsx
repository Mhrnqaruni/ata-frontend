import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import MicNoneRounded from "@mui/icons-material/MicNoneRounded";
import api from "../../services/api";
import { canDictate, recordAudio } from "./dictationAudio";

/** A transcript is staged for review, never sent or appended to a different chat. */
export default function FamilyDictation({
  childId,
  conversationId,
  disabled,
  onInsert,
  onBegin,
}) {
  const [open, setOpen] = useState(false),
    [state, setState] = useState("idle"),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const active = useRef(true),
    recorder = useRef(null),
    abort = useRef(null),
    timer = useRef(null),
    request = useRef(null),
    epoch = useRef(0);
  const cleanup = () => {
    clearTimeout(timer.current);
    abort.current?.abort();
    recorder.current?.cancel();
    recorder.current = null;
  };
  const cancel = () => {
    epoch.current++;
    cleanup();
    setOpen(false);
    setState("idle");
    setText("");
    setError("");
  };
  useEffect(() => {
    active.current = true;
    const hide = () => {
      if (document.hidden) {
        epoch.current++;
        cleanup();
        setState("idle");
        setError(
          "Recording stopped when this page was hidden. Your draft is unchanged.",
        );
      }
    };
    const leave = () => {
      epoch.current++;
      cleanup();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      active.current = false;
      leave();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, [childId, conversationId]);
  const endpoint = (id) =>
    `/api/family/children/${childId}/conversations/${conversationId}/dictations/${id}`;
  const receive = (data) => {
    if (data.state === "response") {
      setText(data.transcript || "");
      setState("review");
      if (!data.transcript)
        setError("No clear speech was found. You can try another recording.");
    } else {
      setState("pending");
      setError(
        data.state === "dispatching"
          ? "Still transcribing. Check again shortly."
          : "This transcription could not be recovered. Your typed draft is unchanged.",
      );
    }
  };
  async function stop() {
    const token = epoch.current;
    if (!recorder.current) return;
    const capture = recorder.current;
    recorder.current = null;
    setState("transcribing");
    clearTimeout(timer.current);
    try {
      const audio = await capture.stop();
      if (!active.current || token !== epoch.current) return;
      const id = crypto.randomUUID();
      request.current = id;
      const form = new FormData();
      form.append("audio", audio, "dictation.wav");
      const { data } = await api.put(endpoint(id), form, {
        timeout: 110000,
        headers: { "Content-Type": undefined },
      });
      if (active.current && token === epoch.current) receive(data);
    } catch {
      if (active.current && token === epoch.current) {
        setState("pending");
        setError(
          "Could not confirm the transcript. Check its saved status; no automatic AI retry was made.",
        );
      }
    }
  }
  async function start() {
    const token = ++epoch.current;
    setError("");
    setText("");
    setState("permission");
    abort.current = new AbortController();
    try {
      recorder.current = await recordAudio(
        abort.current.signal,
        () => void stop(),
      );
      if (!active.current || token !== epoch.current) {
        cleanup();
        return;
      }
      setState("recording");
      timer.current = setTimeout(() => void stop(), 60000);
    } catch {
      if (active.current && token === epoch.current) {
        cleanup();
        setState("idle");
        setError(
          "Microphone unavailable or permission denied. You can keep typing.",
        );
      }
    }
  }
  async function check() {
    const token = epoch.current;
    try {
      const { data } = await api.get(endpoint(request.current));
      if (active.current && token === epoch.current) receive(data);
    } catch {
      if (active.current && token === epoch.current)
        setError("Could not check this recording. Please try again later.");
    }
  }
  return (
    <>
      <IconButton
        className="fam-icon-btn"
        aria-label="Dictate a message"
        disabled={disabled || !canDictate()}
        title={
          canDictate()
            ? "Dictate a message"
            : "Dictation requires a supported browser and HTTPS"
        }
        onClick={() => {
          onBegin?.();
          setOpen(true);
          setError("");
          setState("idle");
        }}
      >
        <MicNoneRounded />
      </IconButton>
      <Dialog
        open={open}
        onClose={cancel}
        fullWidth
        maxWidth="sm"
        className="fam-dialog"
      >
        <DialogTitle>Dictate a message</DialogTitle>
        <DialogContent>
          {state === "idle" && (
            <>
              <Typography>
                Speak for up to a minute, then check your words. Nothing is sent
                to the chat automatically.
              </Typography>
              <details>
                <summary>How your audio is handled</summary>
                <Typography className="fam-small">
                  Audio goes to our AI provider for transcription; MST does not
                  save the recording. The transcript is recoverable for 24
                  hours. A minimal request receipt prevents duplicate
                  processing; operational backups follow the app’s retention
                  policy.
                </Typography>
              </details>
            </>
          )}
          {["permission", "recording", "transcribing"].includes(state) && (
            <Typography role="status">
              {
                {
                  permission: "Waiting for microphone permission…",
                  recording: "Listening… Stop when you’re ready.",
                  transcribing: "Turning your recording into text…",
                }[state]
              }
            </Typography>
          )}
          {state === "review" && (
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              label="Check your words"
              value={text}
              onChange={(event) => setText(event.target.value)}
              helperText="Check names and numbers before inserting."
            />
          )}
          {error && <Alert severity="info">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel}>Cancel</Button>
          {state === "idle" && (
            <Button variant="contained" onClick={start}>
              Start recording
            </Button>
          )}
          {state === "recording" && (
            <Button variant="contained" onClick={stop}>
              Stop recording
            </Button>
          )}
          {state === "pending" && request.current && (
            <Button onClick={check}>Check saved status</Button>
          )}
          {state === "review" && (
            <Button
              variant="contained"
              disabled={!text.trim()}
              onClick={() => {
                if (onInsert(text.trim())) cancel();
                else
                  setError(
                    "Your message would exceed 4,000 characters. Shorten this transcript or copy it before closing.",
                  );
              }}
            >
              Insert into draft
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
