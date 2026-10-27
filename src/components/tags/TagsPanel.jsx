import { useTeacherData } from '../../hooks/useTeacherData';
import QueryNotice from '../common/QueryNotice';
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Alert,
  Typography,
  Chip,
  Checkbox,
  Autocomplete,
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import MoreVert from "@mui/icons-material/MoreVert";
import tagService from "../../services/tagService";
import TagAnalytics from "./TagAnalytics";

export default function TagsPanel({ newRequest = 0 }) {
  // A parent request opens the dialog once; returning to Tags must not reopen it.
  const lastNewRequest=useRef(newRequest);
  const tagsQuery = useTeacherData('tags');
  const data = tagsQuery.data || { tags: [], students: [] };
  const loading = tagsQuery.isPending;
  const [selected, setSelected] = useState(null),
    [members, setMembers] = useState([]),
    [savedMembers, setSavedMembers] = useState([]);
  const [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [menu, setMenu] = useState(null),
    [nameDialog, setNameDialog] = useState(null),
    [name, setName] = useState("");
  const dirty =
    [...members].sort().join("|") !== [...savedMembers].sort().join("|");
  useEffect(() => {
    if (tagsQuery.data) {
      setSelected(previous => previous ? tagsQuery.data.tags.find(tag => tag.id === previous.id) || null : null);
      if (selected && !dirty) {
        const ids = tagsQuery.data.students.filter(student => student.tags.some(tag => tag.id === selected.id)).map(student => student.id);
        setMembers(ids);
        setSavedMembers(ids);
      }
    }
    // Keep unsaved membership selections local; a background refresh is not a Save.
  }, [tagsQuery.data]);
  // Membership changes are local until Save; changing the tag must not silently discard them.
  const canLeave = () =>
    !dirty ||
    window.confirm(
      "Discard unsaved membership changes? Your saved tag members will stay unchanged.",
    );
  const choose = (tag) => {
    if (busy || !canLeave()) return;
    const ids = data.students
      .filter((s) => s.tags.some((t) => t.id === tag?.id))
      .map((s) => s.id);
    setSelected(tag);
    setMembers(ids);
    setSavedMembers(ids);
    setMessage("");
  };
  const openName = (mode) => {
    if (busy || (mode === "create" && !canLeave())) return;
    setName(mode === "rename" ? selected.name : "");
    setNameDialog(mode);
    setError("");
  };
  useEffect(() => {
    if (newRequest !== lastNewRequest.current) { lastNewRequest.current=newRequest; openName("create"); }
  }, [newRequest]);
  const act = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();

      setMessage("Saved.");
      return true;
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === "string" ? detail : e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const visible = data.students.filter((s) =>
    `${s.name} ${s.studentId} ${s.classes.map((c) => c.name).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const saveName = async (event) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    const ok = await act(async () => {
      if (nameDialog === "rename") {
        await tagService.update(selected.id, { name: name.trim() });
        setSelected({ ...selected, name: name.trim() });
      } else {
        const tag = await tagService.create(name.trim());
        setSelected(tag);
        setMembers([]);
        setSavedMembers([]);
      }
    });
    if (ok) setNameDialog(null);
  };
  return (
    <Box className="mst-tags-panel" sx={{ display: "grid", gap: 2 }}>
      <QueryNotice query={tagsQuery} label="tags" />
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Autocomplete
          sx={{ flex: "1 1 0", width: "100%", maxWidth: 420, minWidth: 0 }}
          options={data.tags}
          value={selected}
          disabled={busy || loading}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(tag) => `${tag.name} (${tag.count ?? 0})`}
          onChange={(_, tag) => choose(tag)}
          renderInput={(params) => (
            <TextField {...params} size="small" label="Choose a tag" />
          )}
        />
        {selected && (
          <IconButton
            aria-label={`Options for tag ${selected.name}`}
            aria-haspopup="menu"
            onClick={(event) => setMenu(event.currentTarget)}
            disabled={busy}
          >
            <MoreVert />
          </IconButton>
        )}
        <Menu
          anchorEl={menu}
          open={Boolean(menu)}
          onClose={() => setMenu(null)}
        >
          <MenuItem
            onClick={() => {
              setMenu(null);
              openName("rename");
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenu(null);
              if (!canLeave()) return;
              act(async () => {
                await tagService.update(selected.id, {
                  name: selected.name,
                  archived: true,
                });
                setSelected(null);
                setMembers([]);
                setSavedMembers([]);
              });
            }}
          >
            Archive tag
          </MenuItem>
        </Menu>
      </Box>
      <TextField
        size="small"
        label="Find students by name, ID or class"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {selected ? (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" sx={{ mr: "auto" }}>
            {members.length} selected total · {visible.length} shown
            {dirty ? " · Unsaved changes" : ""}
          </Typography>
          <Button
            size="small"
            disabled={busy || !visible.length}
            onClick={() =>
              setMembers([
                ...new Set([...members, ...visible.map((s) => s.id)]),
              ])
            }
          >
            Select shown
          </Button>
          <Button
            size="small"
            disabled={busy || !visible.length}
            onClick={() =>
              setMembers(
                members.filter((id) => !visible.some((s) => s.id === id)),
              )
            }
          >
            Clear shown
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={busy || !dirty}
            onClick={() =>
              act(async () => {
                await tagService.members(selected.id, members);
                setSavedMembers([...members]);
              })
            }
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Choose a tag to manage its members, or use New tag to create one.
        </Typography>
      )}
      {loading ? (
        <Typography>Loading students…</Typography>
      ) : (
        <Box className="mst-tag-member-list">
          {visible.map((s) => (
            <Box className="mst-tag-member-row" key={s.id}>
              {selected && (
                <Checkbox
                  disabled={busy}
                  checked={members.includes(s.id)}
                  inputProps={{
                    "aria-label": `Include ${s.name} (${s.studentId})`,
                  }}
                  onChange={(event) =>
                    setMembers(
                      event.target.checked
                        ? [...new Set([...members, s.id])]
                        : members.filter((id) => id !== s.id),
                    )
                  }
                />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {s.name} <span className="mst-hint">· {s.studentId}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.classes.map((c) => c.name).join(" · ")}
                </Typography>
                {!selected && s.tags.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      flexWrap: "wrap",
                      mt: 0.5,
                    }}
                  >
                    {s.tags.map((tag) => (
                      <Chip key={tag.id} size="small" label={tag.name} />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {!loading && !visible.length && (
        <Alert
          severity="info"
          action={
            data.students.length ? (
              <Button onClick={() => setSearch("")}>Clear search</Button>
            ) : undefined
          }
        >
          {data.students.length
            ? "No students match this search."
            : "No enrolled students found. Add students to a class first."}
        </Alert>
      )}
      <TagAnalytics />
      <Dialog
        open={Boolean(nameDialog)}
        onClose={busy ? undefined : () => setNameDialog(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ component: "form", onSubmit: saveName }}
      >
        <DialogTitle>
          {nameDialog === "rename" ? "Rename tag" : "New tag"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Private label for students across your classes. Tags do not change
            AI grading.
          </Typography>
          <QueryNotice query={tagsQuery} label="tags" />
      {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label="Tag name"
            margin="dense"
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: 80 }}
            disabled={busy}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setNameDialog(null)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !name.trim()}
          >
            {busy
              ? "Saving…"
              : nameDialog === "rename"
                ? "Save name"
                : "Create tag"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
