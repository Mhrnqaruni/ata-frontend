import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import ElapsedTime from "../../components/common/ElapsedTime";
import MathInputWithPreview from "../../components/common/MathInputWithPreview";
import QuickGroupReview from "../../components/assessments/QuickGroupReview";
import service from "../../services/quickAssessmentService";
import classService from "../../services/classService";

const labels = {
  queued: "Waiting to start",
  preparing: "Preparing pages",
  grouping: "Organising student pages",
  reading_questions: "Reading the questions",
  checking_questions: "Checking the question readings",
  checking_coverage: "Checking all papers match this exam",
  writing_marking_scheme: "Writing the marking scheme",
  checking_marking_scheme: "Checking answers and marks",
  starting_grading: "Starting grading",
};
const emptyFiles = () => ({ students: [], questions: [], keys: [] });

function FilePicker({ label, files, onChange, disabled }) {
  return (
    <Box sx={{ my: 2 }}>
      <Button component="label" variant="outlined" disabled={disabled}>
        {files.length
          ? `Add more ${label.toLowerCase()}`
          : `Choose ${label.toLowerCase()}`}
        <input
          type="file"
          hidden
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            onChange([...files, ...Array.from(e.target.files || [])]);
            e.target.value = "";
          }}
        />
      </Button>
      {files.map((f, i) => (
        <Stack
          key={i}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ py: 0.5 }}
        >
          <Typography
            variant="body2"
            sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
          >
            {f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB
          </Typography>
          <Button
            size="small"
            disabled={disabled}
            aria-label={`Remove ${f.name}`}
            onClick={() => onChange(files.filter((_, n) => n !== i))}
          >
            Remove
          </Button>
        </Stack>
      ))}
    </Box>
  );
}

export default function QuickAssessment() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const request = useRef(crypto.randomUUID());
  const [files, setFiles] = useState(emptyFiles);
  const [settings, setSettings] = useState({
    assessmentName: `Quick assessment — ${new Date().toLocaleString()}`,
    classId: "",
    reviewBeforeGrading: false,
  });
  const [classes, setClasses] = useState([]);
  const [record, setRecord] = useState(null);
  const [groups, setGroups] = useState(null);
  const [config, setConfig] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState(false);
  const loadedRevision = useRef(null);
  const running = ["queued", "running"].includes(record?.status);
  useEffect(() => {
    classService
      .getAllClasses()
      .then(setClasses)
      .catch(() =>
        setError(
          "Classes could not load. You can still create a classless assessment.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!id) {
      setRecord(null);
      loadedRevision.current = null;
      return;
    }
    let stopped = false,
      timer;
    const poll = async () => {
      try {
        const next = await service.get(id);
        if (stopped) return;
        setRecord(next);
        setSyncError(false);
        const key = `${next.revision}:${next.status}`;
        if (loadedRevision.current !== key && next.status === "needs_input") {
          setGroups(next.result?.groups || null);
          setConfig(next.result?.config || null);
          setConfirmed(false);
        }
        loadedRevision.current = key;
        if (["queued", "running"].includes(next.status))
          timer = setTimeout(poll, 5000);
      } catch {
        if (!stopped) {
          setSyncError(true);
          timer = setTimeout(poll, 10000);
        }
      }
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, record?.revision]);
  const pick = (role) => (chosen) => {
    const valid = chosen.filter((f) => /\.(pdf|png|jpe?g|webp)$/i.test(f.name));
    if (valid.length !== chosen.length)
      setError(
        "Only PDFs, PNG, JPG and WebP images are supported. Other files were not added.",
      );
    setFiles((previous) => ({ ...previous, [role]: valid }));
  };
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await service.start(request.current, settings, files);
      setRecord(next);
      setParams({ id: next.id });
      setFiles(emptyFiles());
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Upload did not finish. Your selected files are still here; try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const resume = async () => {
    setBusy(true);
    setError("");
    try {
      const agreed = groups;
      const next = await service.resume(
        id,
        record.revision,
        agreed,
        config,
        files,
      );
      setRecord(next);
      setFiles(emptyFiles());
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Could not resume. Your changes are still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !window.confirm(
        "Delete this Quick assessment preparation? Unfinished preparation will not publish grades.",
      )
    )
      return;
    setBusy(true);
    try {
      await service.remove(id);
      navigate("/assessments");
    } catch {
      setError("Could not delete this preparation.");
      setBusy(false);
    }
  };
  const changeQuestion = (si, qi, field, value) =>
    setConfig((previous) => ({
      ...previous,
      sections: previous.sections.map((s, i) =>
        i !== si
          ? s
          : {
              ...s,
              questions: s.questions.map((q, j) =>
                j !== qi ? q : { ...q, [field]: value },
              ),
            },
      ),
    }));
  return (
    <Box sx={{ maxWidth: 940, mx: "auto", px: { xs: 1, sm: 2 }, pb: 4 }}>
      <Button onClick={() => navigate("/assessments")} sx={{ mb: 1 }}>
        Back to assessments
      </Button>
      <PageHeader
        title="Quick assessment"
        subtitle="Upload student answer sheets. We’ll organise the pages and prepare a marking scheme."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === "string"
            ? error
            : "Check your inputs and try again."}
        </Alert>
      )}
      {syncError && (
        <Alert severity="warning">
          Reconnecting. Showing the last confirmed update.
        </Alert>
      )}
      {!id ? (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, sm: 3 }, bgcolor: "background.paper" }}
        >
          <Typography component="h2" variant="h6">
            Student answer sheets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PDF, PNG, JPG or WebP · up to 50 files, 100 pages and 50 MB
            combined. Questions should be visible on the papers, or added below.
          </Typography>
          <FilePicker
            label="Student files"
            files={files.students}
            onChange={pick("students")}
            disabled={busy}
          />
          <Typography variant="body2">
            {files.students.length} files selected · page and student counts
            checked after upload
          </Typography>
          <Box component="details" sx={{ my: 3 }}>
            <Box
              component="summary"
              sx={{ cursor: "pointer", fontWeight: 600 }}
            >
              Extra settings
            </Box>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Assessment name"
                value={settings.assessmentName}
                disabled={busy}
                onChange={(e) =>
                  setSettings({ ...settings, assessmentName: e.target.value })
                }
              />
              <TextField
                select
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
                label="Class"
                value={settings.classId}
                disabled={busy}
                onChange={(e) =>
                  setSettings({ ...settings, classId: e.target.value })
                }
                helperText="Without a class, students stay in this assessment. No class is created."
              >
                <MenuItem value="">None</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={settings.reviewBeforeGrading}
                    disabled={busy}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        reviewBeforeGrading: e.target.checked,
                      })
                    }
                  />
                }
                label="Review marking scheme before grading"
              />
            </Stack>
            <FilePicker
              label="Question paper files"
              files={files.questions}
              onChange={pick("questions")}
              disabled={busy}
            />
            <FilePicker
              label="Answer key files"
              files={files.keys}
              onChange={pick("keys")}
              disabled={busy}
            />
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {settings.reviewBeforeGrading
              ? "We’ll prepare the questions and marking scheme, then pause for your review."
              : "Grading starts automatically when preparation is complete. We’ll pause if something needs your input."}{" "}
            AI-proposed marks are used where the paper gives none.
          </Typography>
          <Button
            variant="contained"
            disabled={busy || !files.students.length}
            onClick={start}
          >
            {busy ? "Uploading…" : "Start grading"}
          </Button>
        </Paper>
      ) : !record ? (
        <CircularProgress aria-label="Loading Quick assessment" />
      ) : (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            component="h2"
            variant="h6"
            sx={{ overflowWrap: "anywhere" }}
          >
            {record.settings.assessmentName}
          </Typography>
          <Box role="status" aria-live="polite" sx={{ my: 2 }}>
            <Typography>
              {labels[record.stage] ||
                (record.status === "completed"
                  ? "Preparation complete. Grading has started."
                  : record.status === "failed"
                    ? "Preparation failed"
                    : record.status === "interrupted"
                      ? "Processing interrupted"
                      : "Your input is needed")}
            </Typography>
            <ElapsedTime clock={record.clock} />
          </Box>
          {running && (
            <Typography variant="body2">
              Your files are saved. You can leave this page and return from
              Assessments.
            </Typography>
          )}
          {record.error && (
            <Alert
              severity={record.status === "needs_input" ? "info" : "warning"}
            >
              {record.error}
            </Alert>
          )}
          {record.status === "completed" ? (
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() =>
                navigate(`/assessments/${record.assessmentId}/results`)
              }
            >
              Open assessment
            </Button>
          ) : (
            !running && (
              <>
                {groups && !config && (
                  <QuickGroupReview
                    preparation={record}
                    disabled={busy}
                    value={groups}
                    onChange={(next) => {
                      setGroups(next);
                      setConfirmed(false);
                    }}
                  />
                )}
                {config && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      AI-generated marking scheme. Check and edit it before
                      grading. Original marks are preserved when readable.
                    </Alert>
                    {config.sections.map((section, si) =>
                      section.questions.map((q, qi) => (
                        <Box
                          component="details"
                          key={q.id}
                          sx={{
                            py: 2,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <summary>
                            Question {qi + 1} · {q.maxScore} marks
                          </summary>
                          <Stack spacing={2} sx={{ mt: 2 }}>
                            <MathInputWithPreview
                              disabled={busy}
                              multiline
                              fullWidth
                              label="Question"
                              value={q.text}
                              onChange={(e) =>
                                changeQuestion(si, qi, "text", e.target.value)
                              }
                            />
                            <MathInputWithPreview
                              disabled={busy}
                              multiline
                              fullWidth
                              label="Answer"
                              value={q.answer || ""}
                              onChange={(e) =>
                                changeQuestion(si, qi, "answer", e.target.value)
                              }
                            />
                            <MathInputWithPreview
                              disabled={busy}
                              multiline
                              fullWidth
                              label="Marking criteria"
                              value={q.rubric || ""}
                              onChange={(e) =>
                                changeQuestion(si, qi, "rubric", e.target.value)
                              }
                            />
                            <TextField
                              disabled={busy}
                              label="Maximum marks"
                              type="number"
                              value={q.maxScore ?? ""}
                              onChange={(e) =>
                                changeQuestion(
                                  si,
                                  qi,
                                  "maxScore",
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </Stack>
                        </Box>
                      )),
                    )}
                  </Box>
                )}
                {!config && (
                  <>
                    <FilePicker
                      label="Question paper files"
                      files={files.questions}
                      onChange={pick("questions")}
                      disabled={busy}
                    />
                    <FilePicker
                      label="Answer key files"
                      files={files.keys}
                      onChange={pick("keys")}
                      disabled={busy}
                    />
                  </>
                )}
                <FormControlLabel
                  sx={{ my: 2 }}
                  control={
                    <Checkbox
                      disabled={busy}
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                  }
                  label={
                    config
                      ? "I checked the questions, answers and marks."
                      : "I checked the page groups and supplied any missing information. Retrying may make new AI calls."
                  }
                />
                <Button
                  variant="contained"
                  disabled={
                    busy ||
                    !confirmed ||
                    !!groups?.issues?.length ||
                    !!groups?.groups?.some((g) => g.uncertain)
                  }
                  onClick={resume}
                >
                  {busy
                    ? "Saving…"
                    : config
                      ? "Start grading with this scheme"
                      : "Continue preparation"}
                </Button>
              </>
            )
          )}
          {record.status !== "completed" && (
            <Button
              color="error"
              sx={{ mt: 2, display: "block" }}
              disabled={busy}
              onClick={remove}
            >
              Delete preparation
            </Button>
          )}
        </Paper>
      )}
    </Box>
  );
}
