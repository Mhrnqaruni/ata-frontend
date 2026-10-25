import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Alert,
  Typography,
  Chip,
  Checkbox,
  FormControlLabel,
  Paper,
  Autocomplete,
} from "@mui/material";
import tagService from "../../services/tagService";
import TagAnalytics from "./TagAnalytics";
export default function TagsPanel() {
  const [data, setData] = useState({ tags: [], students: [] }),
    [selected, setSelected] = useState(null),
    [members, setMembers] = useState([]);
  const [name, setName] = useState(""),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = () =>
    tagService
      .list()
      .then((result) => {
        setData(result);
        setSelected((previous) =>
          previous
            ? result.tags.find((t) => t.id === previous.id) || null
            : null,
        );
      });
  useEffect(() => {
    load().catch((e) => setError(e.response?.data?.detail || e.message));
  }, []);
  const choose = (tag) => {
    setSelected(tag);
    setName(tag?.name || "");
    setMembers(
      data.students
        .filter((s) => s.tags.some((t) => t.id === tag?.id))
        .map((s) => s.id),
    );
    setMessage("");
  };
  const act = async (action) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage("Saved.");
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };
  const visible = data.students.filter((s) =>
    `${s.name} ${s.studentId} ${s.classes.map((c) => c.name).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography>
        Private labels for students across your classes. Tags never change AI
        grading.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Autocomplete
          sx={{ minWidth: 240, flex: 1 }}
          options={data.tags}
          value={selected}
          disabled={busy}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(t) => `${t.name} (${t.count ?? 0})`}
          onChange={(_, tag) => choose(tag)}
          renderInput={(params) => (
            <TextField {...params} label="Choose a tag" />
          )}
        />
        <Button onClick={() => choose(null)}>New tag</Button>
      </Box>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <TextField
          label={selected ? "Tag name" : "New tag name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 80 }}
          disabled={busy}
        />
        <Button
          variant="contained"
          disabled={busy || !name.trim()}
          onClick={() =>
            act(async () => {
              if (selected) {
                await tagService.update(selected.id, { name });
                setSelected({ ...selected, name });
              } else {
                const tag = await tagService.create(name);
                setSelected(tag);
                setMembers([]);
              }
            })
          }
        >
          {selected ? "Rename" : "Create tag"}
        </Button>
        {selected && (
          <Button
            disabled={busy}
            onClick={() =>
              act(async () => {
                await tagService.update(selected.id, {
                  name: selected.name,
                  archived: true,
                });
                choose(null);
              })
            }
          >
            Archive tag
          </Button>
        )}
      </Box>
      <TextField
        label="Find students by name, ID or class"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {selected && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            disabled={busy}
            onClick={() =>
              setMembers([
                ...new Set([...members, ...visible.map((s) => s.id)]),
              ])
            }
          >
            Select shown students
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              setMembers(
                members.filter((id) => !visible.some((s) => s.id === id)),
              )
            }
          >
            Clear shown students
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => act(() => tagService.members(selected.id, members))}
          >
            Save members ({members.length})
          </Button>
        </Box>
      )}
      {visible.map((s) => (
        <Paper key={s.id} variant="outlined" sx={{ p: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {selected && (
              <Checkbox
                disabled={busy}
                checked={members.includes(s.id)}
                inputProps={{
                  "aria-label": `Include ${s.name} (${s.studentId})`,
                }}
                onChange={(e) =>
                  setMembers(
                    e.target.checked
                      ? [...members, s.id]
                      : members.filter((id) => id !== s.id),
                  )
                }
              />
            )}
            <Box>
              <Typography>
                {s.name} · {s.studentId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {s.classes.map((c) => c.name).join(" · ")}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
            {s.tags.map((t) => (
              <Chip key={t.id} size="small" label={t.name} />
            ))}
          </Box>
        </Paper>
      ))}
      {!visible.length && (
        <Alert severity="info">
          No enrolled students found. Add students to a class first.
        </Alert>
      )}
      <TagAnalytics />
    </Box>
  );
}
