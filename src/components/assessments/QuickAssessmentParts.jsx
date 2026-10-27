import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import UploadDropzone, { formatBytes } from "../common/UploadDropzone";
import MathInputWithPreview from "../common/MathInputWithPreview";
import MathTextDisplay from "../common/MathTextDisplay";
import NumberField from "../common/NumberField";
import QuestionNavigator from "../common/QuestionNavigator";
import ElapsedTime from "../common/ElapsedTime";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

// Reuse the app upload interaction; this wrapper only supplies Quick's file roles.
export function QuickFiles({
  label,
  files,
  onChange,
  disabled,
  primary = false,
  replace = false,
  onError,
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      data-expanded={expanded}
      className={primary ? "qa-upload-primary" : "qa-upload-source"}
    >
      <UploadDropzone
        multiple
        accept={ACCEPT}
        disabled={disabled}
        files={files}
        title={
          primary
            ? files.length
              ? "Add more answer sheets"
              : "Choose answer sheets"
            : `${replace ? "Replace" : "Add"} ${label.toLowerCase()}`
        }
        label={primary ? undefined : label}
        size={primary && !files.length ? "large" : "compact"}
        hint={
          replace
            ? "Replaces the current source for this attempt"
            : primary
              ? "PDFs and images"
              : "PDF or images"
        }
        filesHeader={
          files.length
            ? `${files.length} ${files.length === 1 ? "file" : "files"} selected`
            : undefined
        }
        onDrop={(incoming) => onChange([...files, ...incoming])}
        onRemove={(file) => onChange(files.filter((item) => item !== file))}
        onDropRejected={() => onError?.("Use PDF, PNG, JPG or WebP files.")}
      />
      {files.length > 5 && (
        <Button
          size="small"
          disabled={disabled}
          sx={{ mt: 1 }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show fewer files" : `Show all ${files.length} files`}
        </Button>
      )}
    </div>
  );
}

export function QuickUploadPanel({
  files,
  pick,
  settings,
  setSettings,
  classes,
  busy,
  start,
  onError,
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const totalBytes = Object.values(files)
    .flat()
    .reduce((sum, file) => sum + file.size, 0);
  const selectedClass =
    classes.find((c) => c.id === settings.classId)?.name || "No class";
  return (
    <section className="qa-panel" aria-label="Upload an assessment">
      <div className="qa-section-heading">
        <div>
          <h2>Student answer sheets</h2>
          <p>Add PDFs or photos from one exam.</p>
        </div>
        <Tooltip title="Up to 50 files, 100 pages and 50 MB combined. Add a question paper in Options if the questions aren’t on the student sheets. AI proposes marks when none are provided.">
          <IconButton aria-label="File requirements and how grading works">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      <QuickFiles
        primary
        label="Student answer sheets"
        files={files.students}
        onChange={pick("students")}
        disabled={busy}
        onError={onError}
      />
      <p className="qa-limits">50 files · 100 pages · 50 MB total</p>
      <Accordion
        className="qa-options"
        disableGutters
        elevation={0}
        expanded={optionsOpen}
        onChange={(_, open) => setOptionsOpen(open)}
        disabled={busy}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreRounded />}
          aria-controls="quick-options-body"
          id="quick-options-title"
        >
          <TuneRounded className="qa-options-icon" />
          <span className="qa-options-copy">
            <strong>Assessment options</strong>
            <span>
              {selectedClass} ·{" "}
              {settings.reviewBeforeGrading
                ? "Review before grading"
                : "Grade automatically"}
              {files.questions.length + files.keys.length > 0
                ? " · Sources added"
                : ""}
            </span>
          </span>
          <span className="qa-optional">Optional</span>
        </AccordionSummary>
        <AccordionDetails id="quick-options-body">
          <div className="qa-fields-grid">
            <TextField
              size="small"
              label="Assessment name"
              value={settings.assessmentName}
              disabled={busy}
              onChange={(e) =>
                setSettings({ ...settings, assessmentName: e.target.value })
              }
            />
            <TextField
              size="small"
              select
              SelectProps={{ displayEmpty: true }}
              InputLabelProps={{ shrink: true }}
              label="Class"
              value={settings.classId}
              disabled={busy}
              onChange={(e) =>
                setSettings({ ...settings, classId: e.target.value })
              }
            >
              <MenuItem value="">No class</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="qa-review-choice">
            <div>
              <strong>Review the marking scheme first</strong>
              <p>
                Pause to edit before grading. AI proposes marks when none are
                given.
              </p>
            </div>
            <Switch
              checked={settings.reviewBeforeGrading}
              disabled={busy}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reviewBeforeGrading: e.target.checked,
                })
              }
              inputProps={{
                "aria-label": "Review the marking scheme before grading",
              }}
            />
          </div>
          <p className="qa-source-help">
            Add a question paper or key if information is missing.
          </p>
          <div className="qa-source-grid">
            <QuickFiles
              label="Question paper"
              files={files.questions}
              onChange={pick("questions")}
              disabled={busy}
              onError={onError}
            />
            <QuickFiles
              label="Answer key"
              files={files.keys}
              onChange={pick("keys")}
              disabled={busy}
              onError={onError}
            />
          </div>
        </AccordionDetails>
      </Accordion>
      <div className="qa-actionbar">
        <div className="qa-action-note">
          {files.students.length ? (
            <>
              <strong>
                {Object.values(files).flat().length} files ·{" "}
                {formatBytes(totalBytes)}
              </strong>
              <span>
                {settings.reviewBeforeGrading
                  ? "You’ll review the scheme before grading."
                  : "We’ll pause if anything needs a check."}
              </span>
            </>
          ) : (
            <span>Add answer sheets to get started.</span>
          )}
        </div>
        <Button
          variant="contained"
          className="qa-primary"
          endIcon={
            busy ? (
              <CircularProgress size={17} color="inherit" />
            ) : (
              <ArrowForwardRounded />
            )
          }
          disabled={busy || !files.students.length}
          onClick={start}
        >
          {busy ? "Uploading" : "Start grading"}
        </Button>
      </div>
    </section>
  );
}

const STAGES = [
  { title: "Student pages", stages: ["queued", "preparing", "grouping"] },
  {
    title: "Questions",
    stages: ["reading_questions", "checking_questions", "checking_coverage"],
  },
  {
    title: "Marking scheme",
    stages: [
      "writing_marking_scheme",
      "checking_marking_scheme",
      "starting_grading",
    ],
  },
];
export function QuickProgress({ record, running, message }) {
  const current = STAGES.findIndex((step) =>
    step.stages.includes(record.stage),
  );
  return (
    <div className="qa-progress">
      <div className="qa-status-heading">
        <span className="qa-status-icon" data-state={record.status}>
          {running ? (
            <CircularProgress size={24} />
          ) : record.status === "completed" ? (
            <CheckRounded />
          ) : ["failed", "interrupted"].includes(record.status) ? (
            <WarningAmberRounded />
          ) : (
            <DescriptionOutlined />
          )}
        </span>
        <div>
          <h2>
            {running
              ? "Preparing your assessment"
              : record.status === "completed"
                ? "Grading has started"
                : record.status === "needs_input"
                  ? "A quick check before we continue"
                  : record.status === "interrupted"
                    ? "Preparation was interrupted"
                    : "Preparation couldn’t finish"}
          </h2>
        </div>
      </div>
      <div className="qa-progress-meta" role="status" aria-live="polite">
        <span>{message}</span>
        <ElapsedTime clock={record.clock} />
      </div>
      {running && (
        <>
          <ol className="qa-stage-list" aria-label="Preparation stages">
            {STAGES.map((step, i) => (
              <li
                key={step.title}
                data-state={
                  i < current ? "done" : i === current ? "current" : "waiting"
                }
              >
                <span>
                  {i < current ? <CheckRounded fontSize="inherit" /> : i + 1}
                </span>
                {step.title}
              </li>
            ))}
          </ol>
          <p className="qa-muted">
            Your files are saved. You can come back from Assessments.
          </p>
        </>
      )}
    </div>
  );
}

export function QuickSchemeReview({ config, busy, changeQuestion }) {
  const [selected, setSelected] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const questions = config.sections.flatMap((s, si) =>
    s.questions.map((q, qi) => ({ q, si, qi })),
  );
  const active = questions[Math.min(selected, questions.length - 1)];
  if (!active) return null;
  const { q, si, qi } = active;
  return (
    <section className="qa-scheme" aria-label="Review marking scheme">
      <div className="qa-section-heading">
        <div>
          <h2>Review marking scheme</h2>
          <p>AI-generated · edit anything before grading.</p>
        </div>
        <Chip
          size="small"
          label={`${questions.reduce((sum, item) => sum + (Number(item.q.maxScore) || 0), 0)} marks`}
        />
      </div>
      <div className="qa-scheme-layout">
        <fieldset
          className="qa-question-navigation"
          disabled={busy}
          aria-label="Question navigation"
        >
          <QuestionNavigator
            items={questions.map((item, i) => ({
              id: item.q.id,
              number: i + 1,
            }))}
            selected={q.id}
            onSelect={(id) => {
              if (!busy) {
                setSelected(questions.findIndex((item) => item.q.id === id));
                setEditingQuestion(false);
              }
            }}
          />
        </fieldset>
        <div className="qa-scheme-editor">
          <div className="qa-question-heading">
            <h3>Question {selected + 1}</h3>
            <NumberField
              key={q.id}
              size="small"
              disabled={busy}
              inputProps={{ min: 1, step: 1 }}
              label="Marks"
              type="number"
              value={q.maxScore ?? ""}
              onChange={(e) =>
                changeQuestion(
                  si,
                  qi,
                  "maxScore",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              sx={{ width: 104 }}
            />
          </div>
          <Stack spacing={2}>
            <div className="qa-prompt-preview">
              <div className="qa-prompt-text">
                {editingQuestion ? (
                  <span>Question wording</span>
                ) : (
                  <MathTextDisplay text={q.text} />
                )}
              </div>
              <Button
                size="small"
                disabled={busy}
                onClick={() => setEditingQuestion(!editingQuestion)}
              >
                {editingQuestion ? "Done editing" : "Edit question"}
              </Button>
            </div>
            {editingQuestion && (
              <MathInputWithPreview
                disabled={busy}
                multiline
                minRows={2}
                label="Question"
                value={q.text}
                onChange={(e) => changeQuestion(si, qi, "text", e.target.value)}
              />
            )}
            <MathInputWithPreview
              disabled={busy}
              multiline
              minRows={2}
              label="Expected answer"
              value={q.answer || ""}
              onChange={(e) => changeQuestion(si, qi, "answer", e.target.value)}
            />
            <MathInputWithPreview
              disabled={busy}
              multiline
              minRows={2}
              label="Marking criteria"
              value={q.rubric || ""}
              onChange={(e) => changeQuestion(si, qi, "rubric", e.target.value)}
            />
          </Stack>
        </div>
      </div>
    </section>
  );
}
