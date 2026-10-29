import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Divider,
} from "@mui/material";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
export default function AccountSettings({ open, onClose }) {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.fullName || user?.full_name || ""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const save = async (kind) => {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "name") {
        await api.patch("/api/auth/me", { fullName: name });
        setMessage("Name saved.");
        window.dispatchEvent(new Event("mst-account-changed"));
        localStorage.setItem("mst-account-update", String(Date.now()));
      } else {
        await api.post("/api/auth/change-password", {
          currentPassword: current,
          newPassword: password,
        });
        setCurrent("");
        setPassword("");
        logout();
        onClose();
      }
    } catch (e) {
      setMessage(
        e.response?.data?.detail ||
          (kind === "password"
            ? "Confirmation was interrupted. Sign in with your intended new password to check the outcome."
            : "Could not save your name."),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={
        busy
          ? undefined
          : () => {
              setCurrent("");
              setPassword("");
              onClose();
            }
      }
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Account settings</DialogTitle>
      <DialogContent>
        {message && (
          <Alert severity={message === "Name saved." ? "success" : "error"}>
            {typeof message === "string" ? message : "Check your entries."}
          </Alert>
        )}
        <h3>Personal details</h3>
        <TextField
          disabled={busy}
          fullWidth
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 120 }}
        />
        <Button disabled={busy || !name.trim()} onClick={() => save("name")}>
          Save name
        </Button>
        <Divider sx={{ my: 2 }} />
        <h3>Change password</h3>
        <TextField
          disabled={busy}
          fullWidth
          type="password"
          autoComplete="current-password"
          label="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          disabled={busy}
          fullWidth
          type="password"
          autoComplete="new-password"
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p>
          Use at least 8 characters (maximum 72 UTF-8 bytes). Changing your
          password signs you out. Sign in again with your new password.
        </p>
        <Button
          disabled={busy || !current || password.length < 8}
          onClick={() => save("password")}
        >
          Change password
        </Button>
      </DialogContent>
      <DialogActions>
        <Button
          disabled={busy}
          onClick={() => {
            setCurrent("");
            setPassword("");
            onClose();
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
