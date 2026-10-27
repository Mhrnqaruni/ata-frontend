import React, { useEffect, useMemo, useState } from "react";
import { Typography } from "@mui/material";

export function formatElapsed(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}h ` : ""}${minutes}m ${String(total % 60).padStart(2, "0")}s`;
}

/** The server supplies accumulated elapsed time; browser ticks only interpolate it. */
export default function ElapsedTime({ clock }) {
  const observedAt = useMemo(() => performance.now(), [clock?.server_now]);
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!clock?.running) return;
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, [clock?.running]);
  if (clock?.elapsed_seconds == null) return null;
  const seconds =
    clock.elapsed_seconds +
    (clock.running ? Math.max(0, now - observedAt) / 1000 : 0);
  return (
    <Typography variant="caption" color="text.secondary">
      {clock.running ? "Elapsed" : "Processing time"}: {formatElapsed(seconds)}
    </Typography>
  );
}
