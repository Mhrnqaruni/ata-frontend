import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Skeleton, Menu, MenuItem } from "@mui/material";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import { Link } from "react-router-dom";
import MathTextDisplay from "../common/MathTextDisplay";
import {
  getAssessmentAnalytics,
  downloadAssessmentAnalytics,
} from "../../services/assessmentAnalyticsService";
import "./assessment-analytics.css";
const percent = (value) => (value == null ? "—" : `${value.toFixed(1)}%`);
const marks = (value) => (value == null ? "—" : Number(value.toFixed(1)));

export default function AssessmentAnalytics({ jobId, assessmentOnly = false }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0),
    [exporting, setExporting] = useState(""),
    [exportError, setExportError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    getAssessmentAnalytics(jobId)
      .then((value) => {
        if (alive) setData(value);
      })
      .catch((failure) => {
        if (alive)
          setError(
            typeof failure.response?.data?.detail === "string"
              ? failure.response.data.detail
              : "Could not load analytics. Try again.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [jobId, revision]);
  const download = async (format) => {
    if (exporting) return;
    setExporting(format);
    setExportError("");
    try {
      await downloadAssessmentAnalytics(jobId, format);
    } catch {
      setExportError(
        "The report could not be downloaded. Try again, or choose Word if PDF is unavailable.",
      );
    } finally {
      setExporting("");
    }
  };
  if (loading)
    return (
      <Box aria-label="Loading analytics">
        <Skeleton height={110} />
        <Skeleton height={260} />
      </Box>
    );
  if (error)
    return (
      <Alert
        severity="warning"
        action={
          <Button onClick={() => setRevision((v) => v + 1)}>Retry</Button>
        }
      >
        {error}
      </Alert>
    );
  if (!data) return null;
  const s = data.summary;
  const ranked = s.comparable
    ? [...data.students]
        .filter((student) => student.percentage != null)
        .sort(
          (a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name),
        )
    : [];
  const others = data.students
    .filter((student) => !ranked.includes(student))
    .sort((a, b) => a.name.localeCompare(b.name));
  const students = showAll
    ? [...ranked, ...others]
    : (ranked.length ? ranked : others).slice(0, 5);
  const selected = data.questions.find(
    (question) => question.key === selectedKey,
  );
  return (
    <div className="mst-assessment-analytics">
      <div className="aa-toolbar">
        <p>
          Updated{" "}
          {new Date(data.generated_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div className="aa-actions">
          <Button
            size="small"
            startIcon={<RefreshRounded />}
            onClick={() => setRevision((v) => v + 1)}
            disabled={Boolean(exporting)}
          >
            Refresh
          </Button>
          <Button
            size="small"
            startIcon={<DownloadRounded />}
            endIcon={<ArrowDropDownRounded />}
            variant="contained"
            aria-haspopup="menu"
            aria-controls={
              downloadAnchor ? "assessment-download-menu" : undefined
            }
            aria-expanded={Boolean(downloadAnchor)}
            onClick={(event) => setDownloadAnchor(event.currentTarget)}
            disabled={Boolean(exporting)}
          >
            {exporting
              ? `Preparing ${exporting === "pdf" ? "PDF" : "Word"}…`
              : "Download"}
          </Button>
          <Menu
            id="assessment-download-menu"
            anchorEl={downloadAnchor}
            open={Boolean(downloadAnchor)}
            onClose={() => setDownloadAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setDownloadAnchor(null);
                download("pdf");
              }}
            >
              PDF (.pdf)
            </MenuItem>
            <MenuItem
              onClick={() => {
                setDownloadAnchor(null);
                download("docx");
              }}
            >
              Word (.docx)
            </MenuItem>
          </Menu>
        </div>
      </div>
      {exportError && <Alert severity="error">{exportError}</Alert>}
      {!s.comparable && (
        <Alert severity="warning">
          Different marking versions are present. Scores remain visible, but
          students are not ranked against each other.
        </Alert>
      )}
      <section
        className="aa-surface aa-overview"
        aria-labelledby="aa-overview-title"
      >
        <div className="aa-section-heading">
          <h2 id="aa-overview-title">At a glance</h2>
          <span>{s.graded < 5 ? "Small sample" : "Finalized results"}</span>
        </div>
        <dl className="aa-metrics">
          <div>
            <dt>Average score</dt>
            <dd>{percent(s.average)}</dd>
            <small>
              Based on {s.graded} graded{" "}
              {s.graded === 1 ? "submission" : "submissions"}
            </small>
          </div>
          <div>
            <dt>Graded submissions</dt>
            <dd className="aa-count-value">
              {s.graded} of {s.submitted}
            </dd>
            <small>
              received submissions graded · {s.incomplete} unfinished
            </small>
          </div>
        </dl>
        <div className="aa-summary-line">
          <span>
            {assessmentOnly ? "Students in this assessment; no class is assigned." : <>
              {s.expected == null ? "Assigned group unavailable." : `${s.no_submission} of ${s.expected} assigned students have no submission.`}{" "}
              {s.outsiders} {s.outsiders === 1 ? "submission is" : "submissions are"} outside the assigned group.
            </>}
          </span>
        </div>
        <details className="aa-more-stats">
          <summary>More statistics</summary>
          <dl>
            <div>
              <dt>Median score</dt>
              <dd>{percent(s.median)}</dd>
            </div>
            <div>
              <dt>Highest score</dt>
              <dd>{percent(s.highest)}</dd>
            </div>
          </dl>
        </details>
      </section>
      <div className="aa-main-grid">
        <section
          className="aa-surface aa-questions"
          aria-labelledby="aa-questions-title"
        >
          <div className="aa-section-heading">
            <h2 id="aa-questions-title">Average marks by question</h2>
            <span>{data.questions.length} questions</span>
          </div>
          <p className="aa-description">
            Percentage of possible marks. Select a question for details.
          </p>
          <div className="aa-question-grid">
            {(showQuestions ? data.questions : data.questions.slice(0, 6)).map(
              (q) => (
                <button
                  type="button"
                  className="aa-question-tile"
                  key={q.key}
                  aria-pressed={selectedKey === q.key}
                  aria-controls="aa-question-detail"
                  onClick={() =>
                    setSelectedKey(selectedKey === q.key ? null : q.key)
                  }
                >
                  <span className="aa-tile-label">{q.label}</span>
                  <strong>{percent(q.percentage)}</strong>
                  <span className="aa-mini-track" aria-hidden="true">
                    <span style={{ width: `${q.percentage ?? 0}%` }} />
                  </span>
                  <span className="aa-tile-caption">
                    {q.graded} graded
                    {q.unresolved ? ` · ${q.unresolved} pending` : ""}
                  </span>
                </button>
              ),
            )}
          </div>
          {data.questions.length > 6 && (
            <Button
              size="small"
              onClick={() => setShowQuestions((v) => !v)}
              sx={{ mt: 1 }}
            >
              {showQuestions
                ? "Show fewer"
                : `Show all ${data.questions.length} questions`}
            </Button>
          )}
          <div
            id="aa-question-detail"
            className={
              selected ? "aa-question-detail" : "aa-detail-placeholder"
            }
          >
            {selected ? (
              <>
                <div className="aa-section-heading">
                  <h3>{selected.label}</h3>
                  <span>
                    {marks(selected.average)} / {selected.maximum} average marks
                  </span>
                </div>
                <MathTextDisplay text={selected.text} component="div" />
                <div className="aa-mark-counts">
                  <span>
                    <b>{selected.full}</b> Full marks
                  </span>
                  <span>
                    <b>{selected.partial}</b> Partial
                  </span>
                  <span>
                    <b>{selected.zero}</b> Zero marks
                  </span>
                </div>
                <p className="aa-footnote">
                  {selected.unresolved} unresolved. Zero marks do not
                  necessarily mean a blank answer.
                </p>
              </>
            ) : (
              <p>
                Select a question above to see the paper and mark breakdown.
              </p>
            )}
          </div>
        </section>
        <section
          className="aa-surface aa-leaderboard"
          aria-labelledby="aa-leaderboard-title"
        >
          <div className="aa-section-heading">
            <h2 id="aa-leaderboard-title">
              <EmojiEventsOutlined aria-hidden="true" /> Student leaderboard
            </h2>
            <span>{ranked.length} ranked</span>
          </div>
          <p className="aa-description">
            Finalized scores. Equal scores share a rank.
          </p>
          <ol className="aa-student-list">
            {students.map((student) => {
              // Competition ranks keep ties equal, independent of name ordering.
              const rank =
                s.comparable && student.percentage != null
                  ? ranked.findIndex(
                      (p) => Math.abs(p.percentage - student.percentage) < 1e-8,
                    ) + 1
                  : null;
              return (
                <li
                  key={`${student.kind}-${student.id}`}
                  className={rank === 1 ? "aa-first-place" : ""}
                >
                  <span
                    className="aa-rank"
                    aria-label={rank ? `Rank ${rank}` : "Not ranked"}
                  >
                    {rank ?? "—"}
                  </span>
                  <div className="aa-student-name">
                    <strong>{student.name}</strong>
                    <span>
                      {student.percentage == null
                        ? `Not ranked · ${student.status}`
                        : `${marks(student.total)} / ${marks(student.maximum)} marks`}
                      {student.kind === "outsider" && !assessmentOnly ? " · Outsider" : ""}
                    </span>
                  </div>
                  <div className="aa-student-score">
                    <strong>{percent(student.percentage)}</strong>
                    {student.submitted && (
                      <Link
                        to={`/assessments/${jobId}/review/${student.id}`}
                        aria-label={`Review ${student.name}`}
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {!students.length && (
            <p className="aa-description">No recorded submissions yet.</p>
          )}
          {(showAll || data.students.length > students.length) && (
            <Button
              fullWidth
              size="small"
              onClick={() => setShowAll((v) => !v)}
              sx={{ mt: 1 }}
            >
              {showAll
                ? "Show top students"
                : `View all ${data.students.length} students`}
            </Button>
          )}
          {s.incomplete > 0 && (
            <p className="aa-footnote">
              {s.incomplete} unfinished submissions are not ranked.
            </p>
          )}
        </section>
      </div>
      <div className="aa-secondary-grid">
        {s.comparable && s.graded > 0 && (
          <details className="aa-surface aa-details">
            <summary>
              Score distribution{" "}
              <span>
                {s.graded} graded {s.graded === 1 ? "student" : "students"}
              </span>
            </summary>
            <div className="aa-distribution">
              {data.distribution.map((bin) => (
                <div key={bin.label}>
                  <span>{bin.label}</span>
                  <span className="aa-mini-track" aria-hidden="true">
                    <span
                      style={{ width: `${(bin.count / s.graded) * 100}%` }}
                    />
                  </span>
                  <b>{bin.count}</b>
                </div>
              ))}
            </div>
          </details>
        )}
        {data.class_comparison_available && data.classes.length > 1 && (
          <details className="aa-surface aa-details">
            <summary>
              Compare classes <span>{data.classes.length} classes</span>
            </summary>
            <div className="aa-class-list">
              {data.classes.map((c) => (
                <div key={c.id}>
                  <span>
                    {c.name}
                    <small>
                      {c.graded} graded / {c.expected} expected
                    </small>
                  </span>
                  <b>{percent(c.average)}</b>
                </div>
              ))}
            </div>
            {data.overlapping_classes && (
              <p className="aa-footnote">
                Class membership overlaps. Overall totals count each student
                once.
              </p>
            )}
          </details>
        )}
        <details className="aa-surface aa-details">
          <summary>
            About these results{" "}
            <span>
              {data.warnings.length
                ? `${data.warnings.length} ${data.warnings.length === 1 ? "note" : "notes"}`
                : "How scores are calculated"}
            </span>
          </summary>
          <div className="aa-notes">
            {data.warnings.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p>{data.method}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
