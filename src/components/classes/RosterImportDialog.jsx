import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
} from "@mui/material";
import api from "../../services/api";
import { invalidateTeacher, cacheFamilies } from "../../services/queryCache";
export default function RosterImportDialog({ open, onClose, classId }) {
  const [file, setFile] = useState(null),
    [data, setData] = useState(null),
    [sheet, setSheet] = useState(""),
    [nameCol, setNameCol] = useState(""),
    [idCol, setIdCol] = useState(""),
    [skip, setSkip] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  const intent = useRef(null);
  const [checked, setChecked] = useState(null);
  const reset = () => {
    setFile(null);
    setData(null);
    setResult(null);
    setError("");
    setSkip({});
    setSheet("");
    setNameCol("");
    setIdCol("");
    setChecked(null);
    intent.current = null;
    onClose();
  };
  const preview = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (sheet) body.append("sheet", sheet);
      setData(
        (
          await api.post(`/api/classes/${classId}/imports/preview`, body, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data,
      );
      intent.current = null;
    } catch (e) {
      setError(e.response?.data?.detail || "Could not read this file.");
    } finally {
      setBusy(false);
    }
  };
  const rows = (data?.rows || []).map((r) => ({
    ...r,
    name: nameCol === "" ? "" : r.values[Number(nameCol)] || "",
    studentId: idCol === "" ? "" : r.values[Number(idCol)] || "",
  }));
  const selected = rows.filter((r) => !skip[r.row]);
  const valid =
    nameCol !== "" &&
    idCol !== "" &&
    nameCol !== idCol &&
    selected.length > 0 &&
    selected.every(
      (r) =>
        r.name.trim().length >= 2 &&
        r.studentId.trim() &&
        !r.checkColumns.includes(Number(nameCol)) &&
        !r.checkColumns.includes(Number(idCol)),
    );
  const payloadFor = () => ({
    rows: selected.map((r) => ({
      row: r.row,
      name: r.name,
      studentId: r.studentId,
    })),
  });
  const check = async () => {
    setBusy(true);
    setError("");
    const payload = payloadFor();
    try {
      setChecked({
        hash: JSON.stringify(payload),
        data: (await api.post(`/api/classes/${classId}/imports/check`, payload))
          .data,
      });
    } catch (e) {
      setError(e.response?.data?.detail || "Could not check these rows.");
    } finally {
      setBusy(false);
    }
  };
  const checkedNow =
    checked?.hash === JSON.stringify(payloadFor()) ? checked.data : null;
  const commit = async () => {
    if (!valid || !checkedNow?.canImport) return;
    setBusy(true);
    setError("");
    const payload = {
      rows: selected.map((r) => ({
        row: r.row,
        name: r.name,
        studentId: r.studentId,
      })),
    };
    const hash = JSON.stringify(payload);
    if (!intent.current || intent.current.hash !== hash)
      intent.current = { id: crypto.randomUUID(), hash };
    try {
      setResult(
        (
          await api.put(
            `/api/classes/${classId}/imports/${intent.current.id}`,
            payload,
          )
        ).data,
      );
      await invalidateTeacher(cacheFamilies.roster);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Confirmation interrupted. Retry the same import to check its outcome.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : reset}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Import students into this class</DialogTitle>
      <DialogContent>
        <p>
          CSV or XLSX · school IDs are required. Existing students and grades
          are preserved. Correct missing or conflicting IDs in your file before
          importing.
        </p>
        {error && (
          <Alert severity="error">
            {typeof error === "string" ? error : "Check the selected rows."}
          </Alert>
        )}
        {result ? (
          <Alert severity="success">
            {result.created} created, {result.linked} linked, {result.skipped}{" "}
            already in this class.
          </Alert>
        ) : (
          <>
            <Button
              component="a"
              href="data:text/csv;charset=utf-8,Student%20name%2CSchool%20ID%0AAlex%2C001%0A"
              download="student-roster-template.csv"
            >
              Download CSV template
            </Button>
            <input
              aria-label="Roster CSV or XLSX"
              type="file"
              accept=".csv,.xlsx"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files[0]);
                setData(null);
                setSheet("");
                setNameCol("");
                setIdCol("");
                setSkip({});
                setChecked(null);
                intent.current = null;
              }}
            />
            {data?.sheets?.length > 1 && (
              <TextField
                select
                label="Worksheet"
                value={sheet}
                disabled={busy}
                onChange={(e) => {
                  setSheet(e.target.value);
                  setData({ ...data, headers: [], rows: [] });
                  setNameCol("");
                  setIdCol("");
                  setSkip({});
                  setChecked(null);
                  intent.current = null;
                }}
              >
                {data.sheets.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Button disabled={!file || busy} onClick={preview}>
              Read file
            </Button>
            {!!data?.headers?.length && (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    margin: "16px 0",
                  }}
                >
                  {[
                    [nameCol, setNameCol, "Student name"],
                    [idCol, setIdCol, "School ID"],
                  ].map(([v, set, label]) => (
                    <TextField
                      key={label}
                      select
                      disabled={busy}
                      label={label}
                      value={v}
                      sx={{ minWidth: 180 }}
                      onChange={(e) => set(e.target.value)}
                    >
                      {data.headers.map((h, i) => (
                        <MenuItem key={i} value={String(i)}>
                          {i + 1}: {h || "(blank heading)"}
                        </MenuItem>
                      ))}
                    </TextField>
                  ))}
                </div>
                <p>
                  {selected.length} selected of {rows.length} rows. Uncheck rows
                  to exclude them. Numeric/formula identity cells must be saved
                  as text in the file.
                </p>
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Include</TableCell>
                        <TableCell>Row</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Check</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.row}>
                          <TableCell>
                            <Checkbox
                              disabled={busy}
                              checked={!skip[r.row]}
                              onChange={(e) =>
                                setSkip({ ...skip, [r.row]: !e.target.checked })
                              }
                              inputProps={{
                                "aria-label": `Include row ${r.row}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>{r.row}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.studentId}</TableCell>
                          <TableCell>
                            {checkedNow?.rows.find((v) => v.row === r.row)
                              ?.note || ""}{" "}
                            {r.name.trim().length < 2 || !r.studentId.trim()
                              ? "Name must have at least2 characters; school ID required"
                              : r.checkColumns.includes(Number(idCol)) ||
                                  r.checkColumns.includes(Number(nameCol))
                                ? "Numeric/formula cell: correct file"
                                : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
        {!valid && data?.rows?.length > 0 && (
          <Alert severity="info">
            Choose different Name and ID columns, then correct or exclude
            invalid rows before checking the import.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={reset}>
          {result ? "Done" : "Cancel"}
        </Button>
        {!result && !checkedNow && (
          <Button disabled={!valid || busy} onClick={check}>
            Check selected rows
          </Button>
        )}
        {!result && (
          <Button
            variant="contained"
            disabled={!valid || busy || !checkedNow?.canImport}
            onClick={commit}
          >
            {busy ? "Working…" : "Import selected students"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
