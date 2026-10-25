import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Alert,
  Autocomplete,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import tagService from "../../services/tagService";
export default function TagAnalytics({ activityId, quizId }) {
  const [data, setData] = useState(null),
    [selected, setSelected] = useState([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError("");
    tagService
      .analytics({
        activity_id: activityId,
        quiz_id: quizId,
        tag_ids: selected.map((t) => t.id).join(","),
      })
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.response?.data?.detail || e.message));
    return () => {
      active = false;
    };
  }, [open, activityId, quizId, JSON.stringify(selected)]);
  return (
    <Accordion expanded={open} onChange={(_, v) => setOpen(v)} sx={{ my: 2 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        Tag analytics
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Membership is recorded when the activity is created. Older work
          without a recorded audience is excluded. Overlapping tags count once
          per student and activity.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {!data && !error && <Typography>Loading tag results…</Typography>}
        {data && (
          <>
            <Autocomplete
              multiple
              options={data.tags}
              value={selected}
              getOptionLabel={(t) => t.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, v) => setSelected(v)}
              renderInput={(params) => (
                <TextField {...params} label="Filter tags (any selected)" />
              )}
            />
            <Typography sx={{ my: 2 }}>
              {data.distinct_students} students · {data.participated}/
              {data.expected} participations · {data.scored} scored attempts ·
              Average{" "}
              {data.average_percentage == null
                ? "not available"
                : `${data.average_percentage}%`}
            </Typography>
            <TableContainer>
              <Table size="small" aria-label="Tag analytics">
                <TableHead>
                  <TableRow>
                    {[
                      "Student",
                      "Classes at creation",
                      "Activity",
                      "Score",
                    ].map((t) => (
                      <TableCell key={t}>{t}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((r) => (
                    <TableRow
                      key={`${r.kind}:${r.activity_id}:${r.student_id}`}
                    >
                      <TableCell>
                        {r.name} · {r.school_id}
                      </TableCell>
                      <TableCell>
                        {r.classes.map((c) => c.name).join(", ")}
                      </TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>
                        {r.percentage == null
                          ? r.participated
                            ? "Not scored"
                            : "Not participated"
                          : `${r.percentage}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {!data.rows.length && (
              <Alert severity="info">No recorded tag results yet.</Alert>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
