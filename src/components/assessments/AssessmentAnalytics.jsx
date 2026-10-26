import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Typography,
  Stack,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Link } from "react-router-dom";
import MathTextDisplay from "../common/MathTextDisplay";
import {
  getAssessmentAnalytics,
  downloadAssessmentAnalytics,
} from "../../services/assessmentAnalyticsService";
const percent = (value) => (value == null ? "—" : `${value.toFixed(1)}%`);
const marks = (value) => (value == null ? "—" : Number(value.toFixed(1)));
const panel = {
  p: { xs: 2, md: 3 },
  border: "1px solid",
  borderColor: "divider",
  backgroundImage: "none",
  borderRadius: 3,
  minWidth: 0,
};

export default function AssessmentAnalytics({ jobId }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0),
    [exporting, setExporting] = useState(""),
    [exportError, setExportError] = useState("");
  const [sort, setSort] = useState("name"),
    [showAll, setShowAll] = useState(false);
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
  const scoredQuestions = data.questions.filter(
    (q) => q.percentage != null && q.current,
  );
  const weakest = scoredQuestions.length
    ? scoredQuestions.reduce((a, b) => (a.percentage <= b.percentage ? a : b))
    : null;
  const students = [...data.students].sort((a, b) =>
    sort === "score" && s.comparable
      ? (b.percentage ?? -1) - (a.percentage ?? -1) ||
        a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name),
  );
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
      >
        <Typography variant="body2" color="text.secondary">
          Updated {new Date(data.generated_at).toLocaleString()}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            onClick={() => setRevision((v) => v + 1)}
            disabled={Boolean(exporting)}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => download("pdf")}
            disabled={Boolean(exporting)}
          >
            {exporting === "pdf" ? "Preparing PDF…" : "Download PDF"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => download("docx")}
            disabled={Boolean(exporting)}
          >
            {exporting === "docx" ? "Preparing Word…" : "Word"}
          </Button>
        </Stack>
      </Stack>
      {exportError && <Alert severity="error">{exportError}</Alert>}
      {data.warnings.map((message) => (
        <Alert severity="info" key={message}>
          {message}
        </Alert>
      ))}
      <Paper variant="outlined" sx={panel}>
        <Typography component="h2" variant="h6" gutterBottom>
          At a glance
        </Typography>
        <Box
          component="dl"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2,minmax(0,1fr))",
              md: "repeat(4,minmax(0,1fr))",
            },
            gap: 2,
            m: 0,
          }}
        >
          {[
            ["Graded submissions", `${s.graded} / ${s.submitted}`],
            ["Average score", percent(s.average)],
            ["Median score", percent(s.median)],
            ["Highest score", percent(s.highest)],
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography component="dt" variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography
                component="dd"
                variant="h5"
                sx={{ m: 0, mt: 0.5, fontWeight: 600 }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          {s.expected == null
            ? "Historical expected attendance is unavailable."
            : `${s.expected} expected roster students · ${s.no_submission} without a submission.`}{" "}
          {s.outsiders} outsider submissions · {s.incomplete} unfinished or
          unavailable.
        </Typography>
        {s.highest_students.length > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Highest score: {s.highest_students.map((p) => p.name).join(", ")}
            {s.highest_students.length > 1 ? " (tied)" : ""}.
          </Typography>
        )}
        {weakest && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {weakest.percentage < 100
              ? `A place to start your review: ${weakest.label}, averaging ${percent(weakest.percentage)} of its available marks.`
              : "All finalized question averages are at full marks."}
          </Typography>
        )}
        {!s.graded && (
          <Typography sx={{ mt: 1 }}>
            No complete finalized submissions yet. Question-level marks may
            still be available below.
          </Typography>
        )}
      </Paper>
      <Paper variant="outlined" sx={panel}>
        <Typography component="h2" variant="h6">
          Question performance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Average percentage of possible marks. Open a question to see its text
          and breakdown. Zero marks do not necessarily mean a blank answer.
        </Typography>
        {data.questions.map((q) => (
          <Accordion
            key={q.key}
            disableGutters
            elevation={0}
            sx={{
              backgroundImage: "none",
              "&:before": { display: "none" },
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls={`question-${q.key}`}
              id={`question-heading-${q.key}`}
            >
              <Box sx={{ width: "100%", minWidth: 0, pr: 1 }}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography fontWeight={600}>{q.label}</Typography>
                  <Typography>{percent(q.percentage)}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={q.percentage ?? 0}
                  aria-label={`${q.label} average marks`}
                  sx={{ height: 5, my: 1, borderRadius: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {q.graded} finalized · {q.unresolved} unresolved ·{" "}
                  {marks(q.average)} / {q.maximum} marks
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ overflowWrap: "anywhere" }}>
              <MathTextDisplay text={q.text} component="div" />
              <Stack
                direction="row"
                spacing={2}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2 }}
              >
                <Typography>Full marks: {q.full}</Typography>
                <Typography>Partial marks: {q.partial}</Typography>
                <Typography>Zero marks: {q.zero}</Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
      {s.comparable && s.graded > 0 && (
        <Accordion elevation={0} sx={{ ...panel, p: 0 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography component="h2" variant="h6">
              Score distribution
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {data.distribution.map((bin) => (
              <Stack
                direction="row"
                gap={2}
                alignItems="center"
                key={bin.label}
                sx={{ mb: 1 }}
              >
                <Typography sx={{ width: 95 }}>{bin.label}</Typography>
                <LinearProgress
                  aria-label={bin.label}
                  variant="determinate"
                  value={(bin.count / s.graded) * 100}
                  sx={{ flex: 1, height: 8, borderRadius: 2 }}
                />
                <Typography sx={{ minWidth: 25 }}>{bin.count}</Typography>
              </Stack>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      {data.class_comparison_available && data.classes.length > 1 && (
        <Paper variant="outlined" sx={panel}>
          <Typography component="h2" variant="h6">
            Classes in this assessment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Membership recorded when this assessment started.{" "}
            {data.overlapping_classes
              ? "Some students belong to more than one class; overall totals count them once."
              : ""}
          </Typography>
          {data.classes.map((c) => (
            <Stack
              direction="row"
              justifyContent="space-between"
              gap={2}
              key={c.id}
              sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Box>
                <Typography>{c.name}</Typography>
                <Typography variant="caption">
                  {c.graded} graded / {c.expected} expected
                </Typography>
              </Box>
              <Typography>{percent(c.average)}</Typography>
            </Stack>
          ))}
        </Paper>
      )}
      <Paper variant="outlined" sx={panel}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography component="h2" variant="h6">
              Student comparison
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Finalized scores only. Open Review for the answers and feedback.
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="student-sort-label">Sort students</InputLabel>
            <Select
              labelId="student-sort-label"
              label="Sort students"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="score" disabled={!s.comparable}>
                Highest score
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
          {(showAll ? students : students.slice(0, 10)).map((student) => (
            <Box
              component="li"
              key={`${student.kind}-${student.id}`}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr auto",
                  sm: "minmax(0,1fr) 120px 100px auto",
                },
                gap: 1,
                alignItems: "center",
                py: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <Typography fontWeight={600}>{student.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {student.status}
                  {student.kind === "outsider" ? " · Outsider" : ""}
                </Typography>
              </Box>
              <Typography>
                {marks(student.total)} / {marks(student.maximum)}
              </Typography>
              <Typography>{percent(student.percentage)}</Typography>
              <Button
                component={student.submitted ? Link : "button"}
                to={student.submitted ? `/assessments/${jobId}/review/${student.id}` : undefined}
                disabled={!student.submitted}
                size="small"
              >
                Review
              </Button>
            </Box>
          ))}
        </Box>
        {students.length > 10 && (
          <Button onClick={() => setShowAll((v) => !v)} sx={{ mt: 1 }}>
            {showAll
              ? "Show fewer students"
              : `Show all ${students.length} students`}
          </Button>
        )}
        {!students.length && (
          <Typography>No recorded submissions are available.</Typography>
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary">
        {data.method}
      </Typography>
    </Stack>
  );
}
