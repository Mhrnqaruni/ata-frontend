import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Stack,
  Typography,
} from "@mui/material";
import service from "../../services/quickAssessmentService";

export default function QuickGroupReview({
  preparation,
  value,
  onChange,
  disabled = false,
}) {
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const groups = value?.groups || [];
  const group = groups[Math.min(selected, groups.length - 1)];
  const update = (next) =>
    onChange({
      ...value,
      groups: next.map((g) => {
        const previous = groups.find((old) => old.id === g.id);
        const pagesChanged =
          !previous ||
          JSON.stringify(previous.pages) !== JSON.stringify(g.pages);
        return pagesChanged
          ? {
              ...g,
              uncertain: true,
              reason: "Pages changed. Check this student group again.",
            }
          : g;
      }),
    });
  const edit = (field, content) =>
    update(
      groups.map((g) => (g.id === group.id ? { ...g, [field]: content } : g)),
    );
  const move = (pageIndex, target) => {
    const page = group.pages[pageIndex];
    update(
      groups
        .map((g) =>
          g.id === group.id
            ? { ...g, pages: g.pages.filter((_, i) => i !== pageIndex) }
            : g.id === target
              ? { ...g, pages: [...g.pages, page] }
              : g,
        )
        .filter((g) => g.pages.length),
    );
  };
  const split = (index) => {
    const next = groups
      .flatMap((g) =>
        g.id !== group.id
          ? [g]
          : [
              { ...g, pages: g.pages.slice(0, index) },
              {
                id: crypto.randomUUID(),
                name: "",
                studentNumber: "",
                pages: g.pages.slice(index),
                uncertain: true,
                reason: "",
              },
            ],
      )
      .filter((g) => g.pages.length);
    update(next);
  };
  const reorder = (index, delta) => {
    const pages = [...group.pages];
    [pages[index], pages[index + delta]] = [pages[index + delta], pages[index]];
    edit("pages", pages);
  };
  const show = async (p) => {
    try {
      setPreview(
        URL.createObjectURL(
          await service.page(preparation.id, p.inputId, p.page),
        ),
      );
    } catch {
      setError("Could not load this page. Try again.");
    }
  };
  const close = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };
  if (!group) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6">Check student pages</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Each group is one student. Move, reorder or split pages if needed.
        Similar names can belong to different students.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        disabled={disabled}
        select
        fullWidth
        label="Student group"
        value={group.id}
        onChange={(e) =>
          setSelected(groups.findIndex((g) => g.id === e.target.value))
        }
      >
        {groups.map((g, i) => (
          <MenuItem key={g.id} value={g.id}>
            {g.name || `Student ${i + 1}`} · {g.pages.length} pages
            {g.uncertain ? " · Check needed" : ""}
          </MenuItem>
        ))}
      </TextField>
      {(value.issues || []).map((issue, i) => (
        <Alert
          key={i}
          severity="warning"
          sx={{ my: 1 }}
          action={
            <Button
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  issues: value.issues.filter((_, n) => n !== i),
                })
              }
            >
              Resolved
            </Button>
          }
        >
          {issue}
        </Alert>
      ))}
      {group.reason && (
        <Alert severity="warning" sx={{ my: 1 }}>
          {group.reason}
        </Alert>
      )}
      {group.uncertain && (
        <Button
          disabled={disabled}
          onClick={() =>
            update(
              groups.map((g) =>
                g.id === group.id ? { ...g, uncertain: false, reason: "" } : g,
              ),
            )
          }
          sx={{ my: 1 }}
        >
          Confirm these pages belong to this student
        </Button>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ my: 2 }}>
        <TextField
          disabled={disabled}
          fullWidth
          label="Student name (optional)"
          value={group.name}
          onChange={(e) => edit("name", e.target.value)}
        />
        <TextField
          disabled={disabled}
          fullWidth
          label="Student ID (optional)"
          value={group.studentNumber}
          onChange={(e) => edit("studentNumber", e.target.value)}
        />
      </Stack>
      {group.pages.map((p, i) => (
        <Box
          key={`${p.inputId}-${p.page}`}
          sx={{
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            minWidth: 0,
          }}
        >
          <Typography sx={{ overflowWrap: "anywhere" }}>
            {i + 1}. {preparation.files.find((f) => f.id === p.inputId)?.name} ·
            page {p.page}
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            spacing={1}
            sx={{ mt: 1 }}
          >
            <Button size="small" onClick={() => show(p)}>
              View page
            </Button>
            <Button
              size="small"
              disabled={disabled || !i}
              onClick={() => reorder(i, -1)}
            >
              Earlier
            </Button>
            <Button
              size="small"
              disabled={disabled || i === group.pages.length - 1}
              onClick={() => reorder(i, 1)}
            >
              Later
            </Button>
            {i > 0 && (
              <Button disabled={disabled} size="small" onClick={() => split(i)}>
                Split before this page
              </Button>
            )}
            {groups.length > 1 && (
              <TextField
                disabled={disabled}
                select
                size="small"
                label="Move to student"
                value=""
                sx={{ minWidth: 165 }}
                onChange={(e) => move(i, e.target.value)}
              >
                {groups
                  .filter((g) => g.id !== group.id)
                  .map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name || `Student ${groups.indexOf(g) + 1}`}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          </Stack>
        </Box>
      ))}
      <Dialog open={!!preview} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle>Original student page</DialogTitle>
        <DialogContent>
          <img
            src={preview || undefined}
            alt="Uploaded student answer sheet"
            style={{ width: "100%", height: "auto" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
