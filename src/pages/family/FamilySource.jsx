import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MathText from "../../components/common/MathTextDisplay";
import api from "../../services/api";

/** "Read": the original notes or pages. File previews use the authenticated API, never a public storage URL. */
export default function FamilySource({
  base,
  source,
  onQuiz,
  label = "Read notes",
  page = 1,
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = useMediaQuery("(max-width:599px)");
  const alive = useRef(true);
  const url = useRef(null);
  const requestSequence = useRef(0);
  const [requested, setRequested] = useState(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  function clear() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setPreview(null);
  }
  function close() {
    requestSequence.current += 1;
    clear();
    setOpen(false);
    setError("");
  }
  async function show(file, index) {
    const request = ++requestSequence.current;
    setRequested({ file, index });
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get(
        `${base}/materials/${source.id}/files/${file.index ?? index}`,
        { responseType: "blob" },
      );
      if (!alive.current || request !== requestSequence.current) return;
      clear();
      url.current = URL.createObjectURL(data);
      setPreview({ url: url.current, name: file.name, mime: file.mime });
    } catch {
      if (alive.current && request === requestSequence.current)
        setError("Could not open this file. Please try again.");
    } finally {
      if (alive.current && request === requestSequence.current) setBusy(false);
    }
  }
  function openReader() {
    setOpen(true);
    if (!source.body && source.files.length === 1)
      void show(source.files[0], 0);
  }
  return (
    <>
      <Button
        size="small"
        onClick={openReader}
        aria-label={`Read the notes: ${source.title}`}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        maxWidth="md"
        fullWidth
        fullScreen={phone}
        className="fam-dialog"
      >
        <DialogTitle>{preview?.name || source.title}</DialogTitle>
        <DialogContent>
          {preview ? (
            preview.mime === "application/pdf" ? (
              <iframe
                title={preview.name}
                src={`${preview.url}#page=${page}`}
                className="fam-pdf"
              />
            ) : (
              <Box
                component="img"
                src={preview.url}
                alt={`Page: ${preview.name}`}
                className="fam-page-img"
              />
            )
          ) : (
            <>
              {source.body && (
                <div className="fam-prose fam-notes">
                  <MathText text={source.body} />
                </div>
              )}
              {source.files.length > 0 && (
                <div className="fam-files-open">
                  {source.files.map((file, i) => (
                    <Button
                      key={i}
                      variant="outlined"
                      disabled={busy}
                      onClick={() => show(file, i)}
                      startIcon={
                        busy && requested?.index === i ? (
                          <CircularProgress
                            size={16}
                            aria-label="Opening file"
                          />
                        ) : null
                      }
                    >
                      {i + 1}. {file.name} · {file.pages} page
                      {file.pages === 1 ? "" : "s"}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
          {busy && !preview && source.files.length === 1 && !source.body && (
            <CircularProgress aria-label="Opening file" />
          )}
          {error && (
            <Alert
              severity="error"
              action={
                <Button onClick={() => show(requested.file, requested.index)}>
                  Try again
                </Button>
              }
            >
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {preview && (
            <Button
              component="a"
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original file
            </Button>
          )}
          {preview && source.files.length > 1 && (
            <Button onClick={clear}>All pages</Button>
          )}
          <span className="fam-grow" />
          <Button onClick={close}>Close</Button>
          {onQuiz && source.purpose !== "work" && (
            <Button
              variant="contained"
              onClick={() => {
                close();
                onQuiz();
              }}
            >
              Make a quiz on this
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
