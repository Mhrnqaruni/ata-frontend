import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import { Chip, IconButton, Menu, Tooltip } from "@mui/material";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import service from "../../services/quickAssessmentService";

export default function QuickGroupReview({
  preparation,
  value,
  onChange,
  disabled = false,
}) {
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [error, setError] = useState("");
  const [pageMenu, setPageMenu] = useState(null);
  const [movePage, setMovePage] = useState(null);
  const [destination, setDestination] = useState("");
  const [opening, setOpening] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
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
    setPreviewLabel(
      `${preparation.files.find((file) => file.id === p.inputId)?.name || "Student paper"} · page ${p.page}`,
    );
    setOpening(true);
    setError("");
    try {
      setPreview(
        URL.createObjectURL(
          await service.page(preparation.id, p.inputId, p.page),
        ),
      );
    } catch {
      setError("Could not load this page. Try again.");
    } finally {
      setOpening(false);
    }
  };
  const close = () => {
    setPreview(null);
  };
  if (!group) return null;
  const selectedIndex = groups.indexOf(group);
  const remaining = groups.filter((g) => g.uncertain).length;
  return (
    <section className="qa-group-panel" aria-label="Check student pages">
      <div className="qa-group-title">
        <div>
          <h2>Check student pages</h2>
          <p>One group per student. Check only what needs attention.</p>
        </div>
        <Chip
          size="small"
          color={remaining ? "warning" : "success"}
          variant="outlined"
          label={remaining ? `${remaining} to check` : "All checked"}
        />
      </div>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <div className="qa-group-nav">
        <Tooltip title="Previous student">
          <span>
            <IconButton
              disabled={disabled || selectedIndex === 0}
              aria-label="Previous student"
              onClick={() => setSelected(selectedIndex - 1)}
            >
              <ChevronLeftRounded />
            </IconButton>
          </span>
        </Tooltip>
        <TextField
          size="small"
          disabled={disabled}
          select
          label="Student"
          SelectProps={{
            renderValue: () =>
              `${group.name || `Student ${selectedIndex + 1}`} · ${group.pages.length} ${group.pages.length === 1 ? "page" : "pages"}`,
          }}
          value={group.id}
          onChange={(e) =>
            setSelected(groups.findIndex((g) => g.id === e.target.value))
          }
        >
          {groups.map((g, i) => (
            <MenuItem key={g.id} value={g.id}>
              {g.name || `Student ${i + 1}`} · {g.pages.length}{" "}
              {g.pages.length === 1 ? "page" : "pages"}
              {g.uncertain ? " · Check needed" : " · Checked"}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title="Next student">
          <span>
            <IconButton
              disabled={disabled || selectedIndex === groups.length - 1}
              aria-label="Next student"
              onClick={() => setSelected(selectedIndex + 1)}
            >
              <ChevronRightRounded />
            </IconButton>
          </span>
        </Tooltip>
      </div>
      {(value.issues || []).map((issue, i) => (
        <Alert
          key={i}
          severity="warning"
          sx={{ mb: 2 }}
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
        <Alert severity="warning" sx={{ mb: 2 }}>
          {group.reason}
        </Alert>
      )}
      <div aria-label="Student pages">
        {group.pages.map((p, i) => (
          <div className="qa-page-row" key={`${p.inputId}-${p.page}`}>
            <span className="qa-page-number" aria-hidden="true">
              {i + 1}
            </span>
            <span className="qa-page-label">
              <strong>
                {preparation.files.find((f) => f.id === p.inputId)?.name}
              </strong>
              <span>Original page {p.page}</span>
            </span>
            <span className="qa-page-actions">
              <Button
                size="small"
                disabled={disabled || opening}
                aria-label={`View ${preparation.files.find((file) => file.id === p.inputId)?.name || "student paper"}, page ${p.page}`}
                onClick={() => show(p)}
              >
                {opening ? "Opening…" : "View"}
              </Button>
              <Tooltip title="Page actions">
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label={`Page ${i + 1} actions`}
                  aria-haspopup="menu"
                  onClick={(e) =>
                    setPageMenu({ anchor: e.currentTarget, index: i })
                  }
                >
                  <MoreHorizRounded />
                </IconButton>
              </Tooltip>
            </span>
          </div>
        ))}
      </div>
      <div className="qa-fields-grid" style={{ marginTop: 18 }}>
        <TextField
          disabled={disabled}
          size="small"
          label="Student name"
          placeholder={`Student ${selectedIndex + 1}`}
          value={group.name}
          onChange={(e) => edit("name", e.target.value)}
        />
        <TextField
          disabled={disabled}
          size="small"
          label="Student ID (optional)"
          value={group.studentNumber}
          onChange={(e) => edit("studentNumber", e.target.value)}
        />
      </div>
      <div className="qa-group-confirm">
        {group.uncertain ? (
          <Button
            variant="outlined"
            startIcon={<CheckRounded />}
            disabled={disabled}
            onClick={() =>
              update(
                groups.map((g) =>
                  g.id === group.id
                    ? { ...g, uncertain: false, reason: "" }
                    : g,
                ),
              )
            }
          >
            Confirm student pages
          </Button>
        ) : (
          <Chip
            size="small"
            icon={<CheckRounded />}
            label="Pages checked"
            color="success"
            variant="outlined"
          />
        )}
      </div>
      <Menu
        anchorEl={pageMenu?.anchor}
        open={!!pageMenu}
        onClose={() => setPageMenu(null)}
      >
        <MenuItem
          disabled={disabled || !pageMenu?.index}
          onClick={() => {
            reorder(pageMenu.index, -1);
            setPageMenu(null);
          }}
        >
          Move earlier
        </MenuItem>
        <MenuItem
          disabled={disabled || pageMenu?.index === group.pages.length - 1}
          onClick={() => {
            reorder(pageMenu.index, 1);
            setPageMenu(null);
          }}
        >
          Move later
        </MenuItem>
        <MenuItem
          disabled={disabled || !pageMenu?.index}
          onClick={() => {
            split(pageMenu.index);
            setPageMenu(null);
          }}
        >
          Start new student here
        </MenuItem>
        <MenuItem
          disabled={disabled || groups.length < 2}
          onClick={() => {
            setMovePage(pageMenu.index);
            setDestination("");
            setPageMenu(null);
          }}
        >
          Move to another student…
        </MenuItem>
      </Menu>
      <Dialog
        open={movePage !== null}
        onClose={() => setMovePage(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Move page to another student</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            select
            label="Student"
            value={destination}
            sx={{ mt: 1 }}
            onChange={(e) => setDestination(e.target.value)}
          >
            {groups
              .filter((g) => g.id !== group.id)
              .map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name || `Student ${groups.indexOf(g) + 1}`}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovePage(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!destination || disabled}
            onClick={() => {
              move(movePage, destination);
              setMovePage(null);
            }}
          >
            Move page
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!preview} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle sx={{ overflowWrap: "anywhere" }}>
          {previewLabel}
        </DialogTitle>
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
    </section>
  );
}
