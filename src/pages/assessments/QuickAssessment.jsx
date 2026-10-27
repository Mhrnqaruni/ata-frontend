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
  Menu,
  IconButton,
  Tooltip,
} from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import QuickGroupReview from "../../components/assessments/QuickGroupReview";
import service from "../../services/quickAssessmentService";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import classService from "../../services/classService";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import {
  QuickFiles,
  QuickUploadPanel,
  QuickProgress,
  QuickSchemeReview,
} from "../../components/assessments/QuickAssessmentParts";
import "../../components/assessments/quick-assessment.css";

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

export default function QuickAssessment() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const request = useRef(crypto.randomUUID());
  const [files, setFiles] = useState(emptyFiles);
  const [settings, setSettings] = useState({
    assessmentName: `Quick assessment — ${new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
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
  const [unavailable, setUnavailable] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    setUnavailable(false);
    if (record && record.id !== id) {
      setRecord(null);
      setGroups(null);
      setConfig(null);
      setConfirmed(false);
    }
    let stopped = false,
      timer;
    const poll = async () => {
      try {
        const next = await service.get(id);
        if (stopped) return;
        setRecord(next);
        setSyncError(false);
        const key = `${next.id}:${next.revision}:${next.status}`;
        if (
          loadedRevision.current !== key &&
          ["needs_input", "failed", "interrupted"].includes(next.status)
        ) {
          setGroups(next.result?.groups || null);
          setConfig(next.result?.config || null);
          setConfirmed(false);
        }
        loadedRevision.current = key;
        if (["queued", "running"].includes(next.status))
          timer = setTimeout(poll, 5000);
      } catch (failure) {
        if (!stopped && failure.response?.status === 404) {
          setRecord(null);
          setUnavailable(true);
          setSyncError(false);
          setError(
            "This preparation is no longer available. Return to Assessments.",
          );
          return;
        }
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
    setError("");
    const valid = chosen.filter((f) => /\.(pdf|png|jpe?g|webp)$/i.test(f.name));
    if (valid.length !== chosen.length)
      setError(
        "Only PDFs, PNG, JPG and WebP images are supported. Other files were not added.",
      );
    const next = { ...files, [role]: valid };
    const all = Object.values(next).flat();
    if (all.some((file) => !file.size))
      return setError("Empty files cannot be uploaded.");
    if (
      all.length > 50 ||
      all.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024
    )
      return setError(
        "Use at most 50 files and 50 MB combined. Your previous selection is kept.",
      );
    setFiles(next);
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
    setBusy(true);
    try {
      await service.remove(id);
      navigate("/assessments");
    } catch {
      setDeleteOpen(false);
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
  // Use the returned issue, not locally edited flags, to keep the repair view stable.
  const groupingIssue =
    !!record?.result?.groups?.issues?.length ||
    !!record?.result?.groups?.groups?.some((g) => g.uncertain) ||
    /student ID|student page groups/i.test(record?.error || "");
  const blockedGroups =
    !!groups?.issues?.length || !!groups?.groups?.some((g) => g.uncertain);
  const needsAcknowledgement = !!config || record?.status !== "needs_input";
  const needsSource =
    record?.status === "needs_input" &&
    !config &&
    !groupingIssue &&
    !files.questions.length &&
    !files.keys.length;
  const message =
    labels[record?.stage] ||
    (record?.status === "completed"
      ? "Preparation complete. Grading has started."
      : record?.status === "failed"
        ? "Your files are saved. You can retry."
        : record?.status === "interrupted"
          ? "The last AI request could not be confirmed."
          : config
            ? "Check the scheme, then start grading."
            : "Check the items below to continue.");
  return (
    <Box
      className={`qa-page${record && record.status !== "completed" ? " qa-has-actions" : ""}`}
    >
      <PageHeader
        title={record?.settings.assessmentName || "Quick assessment"}
        subtitle={
          record
            ? "Quick assessment"
            : "Add your students’ answer sheets to start."
        }
        actions={
          record && record.status !== "completed" ? (
            <Tooltip title="Assessment actions">
              <IconButton
                aria-label="Assessment actions"
                aria-haspopup="menu"
                disabled={busy}
                onClick={(e) => setMoreAnchor(e.currentTarget)}
              >
                <MoreHorizRounded />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
        backTo="/assessments"
        backLabel="Back to assessments"
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === "string"
            ? error
            : "Check your inputs and try again."}
        </Alert>
      )}
      {syncError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Reconnecting. Showing the last confirmed update.
        </Alert>
      )}
      {!id ? (
        <QuickUploadPanel
          files={files}
          pick={pick}
          settings={settings}
          setSettings={setSettings}
          classes={classes}
          busy={busy}
          start={start}
          onError={setError}
        />
      ) : !record ? (
        unavailable ? null : (
          <section className="qa-panel" aria-label="Loading assessment">
            <CircularProgress size={24} />
            <p>Loading your assessment…</p>
          </section>
        )
      ) : (
        <>
          <section
            className="qa-panel"
            aria-label="Assessment progress and review"
          >
            {record.status !== "needs_input" && (
              <QuickProgress
                record={record}
                running={running}
                message={message}
              />
            )}
            {record.error && !config && !groupingIssue && (
              <Alert
                severity={record.status === "needs_input" ? "info" : "warning"}
                sx={{ mt: 1 }}
              >
                {record.error}
              </Alert>
            )}
            {record.status === "completed" ? (
              <div className="qa-actionbar">
                <span className="qa-action-note">
                  Follow progress and review results in Assessments.
                </span>
                <Button
                  variant="contained"
                  className="qa-primary"
                  endIcon={<ArrowForwardRounded />}
                  onClick={() => navigate("/assessments")}
                >
                  View grading progress
                </Button>
              </div>
            ) : (
              !running && (
                <>
                  {groups && !config && groupingIssue && (
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
                    <QuickSchemeReview
                      config={config}
                      busy={busy}
                      changeQuestion={changeQuestion}
                    />
                  )}
                  {!config &&
                    !groupingIssue &&
                    record.status === "needs_input" && (
                      <div className="qa-recovery-sources">
                        <div className="qa-section-heading">
                          <div>
                            <h2>Supporting documents</h2>
                            <p>
                              Add a complete paper or key if information is
                              missing.
                            </p>
                          </div>
                        </div>
                        <div className="qa-source-grid">
                          <QuickFiles
                            label="Question paper"
                            replace={record.files?.some(
                              (file) => file.role === "question",
                            )}
                            files={files.questions}
                            onChange={pick("questions")}
                            disabled={busy}
                            onError={setError}
                          />
                          <QuickFiles
                            label="Answer key"
                            replace={record.files?.some(
                              (file) => file.role === "key",
                            )}
                            files={files.keys}
                            onChange={pick("keys")}
                            disabled={busy}
                            onError={setError}
                          />
                        </div>
                      </div>
                    )}
                  <div className="qa-actionbar">
                    <div>
                      {needsAcknowledgement && (
                        <FormControlLabel
                          className="qa-confirm"
                          control={
                            <Checkbox
                              disabled={busy}
                              checked={confirmed}
                              onChange={(e) => setConfirmed(e.target.checked)}
                            />
                          }
                          label={
                            config
                              ? "I’ve checked the marking scheme."
                              : record.status === "needs_input"
                                ? "I’ve checked my changes."
                                : "Retry preparation; new AI calls may be charged."
                          }
                        />
                      )}
                      {needsSource && (
                        <p>Add a question paper or answer key to continue.</p>
                      )}
                      {blockedGroups && (
                        <p>Confirm each student group before continuing.</p>
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
                      disabled={
                        busy ||
                        (needsAcknowledgement && !confirmed) ||
                        blockedGroups ||
                        needsSource
                      }
                      onClick={resume}
                    >
                      {busy
                        ? "Saving"
                        : config
                          ? "Start grading"
                          : record.status === "needs_input"
                            ? "Save and continue"
                            : "Retry preparation"}
                    </Button>
                  </div>
                </>
              )
            )}
          </section>
          <Menu
            anchorEl={moreAnchor}
            open={!!moreAnchor}
            onClose={() => setMoreAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                setDeleteOpen(true);
              }}
            >
              <DeleteOutlineRounded fontSize="small" sx={{ mr: 1 }} />
              Delete preparation
            </MenuItem>
          </Menu>
          <ConfirmationModal
            open={deleteOpen}
            busy={busy}
            onClose={() => setDeleteOpen(false)}
            onConfirm={remove}
            confirmLabel="Delete"
            title="Delete this preparation?"
            description={`Remove “${record.settings.assessmentName}” from your assessments? It will not publish grades. Internal history is retained.`}
          />
        </>
      )}
    </Box>
  );
}
