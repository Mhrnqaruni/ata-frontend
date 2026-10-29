import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { sessionGeneration } from "../../services/queryCache";

/** Serial saves preserve edits made during a request; conflicts never overwrite another tab. */
export default function useActivityProgress(activity, initial) {
  const path = `/api/family/children/${activity.childId}/activities/${activity.id}/progress`;
  const [value, setValue] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef(initial),
    revision = useRef(0),
    queued = useRef(null),
    running = useRef(false),
    alive = useRef(true),
    timer = useRef(null),
    blocked = useRef(false);
  const generation = sessionGeneration();
  const flush = useCallback(async () => {
    if (running.current || blocked.current || !queued.current) return;
    running.current = true;
    if (alive.current) setSaving(true);
    while (
      queued.current &&
      !blocked.current &&
      generation === sessionGeneration()
    ) {
      const data = queued.current;
      queued.current = null;
      try {
        const response = await api.put(path, {
          revision: revision.current,
          requestId: crypto.randomUUID(),
          data,
        });
        revision.current = response.data.revision;
      } catch (e) {
        blocked.current = true;
        queued.current = data;
        if (alive.current)
          setError(
            e.response?.status === 409
              ? "This activity changed in another tab. Recent unconfirmed edits may be lost if you close. Reopen to load the saved version before editing."
              : "Could not confirm the save. Recent edits are not confirmed saved. Closing or reloading may lose them; reopen to check the saved version once connected.",
          );
        break;
      }
    }
    running.current = false;
    if (alive.current) setSaving(false);
  }, [path, generation]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    api
      .get(path, { signal: controller.signal })
      .then(({ data }) => {
        if (!alive.current) return;
        revision.current = data.revision;
        const saved = Object.keys(data.data).length
          ? { ...initial, ...data.data }
          : initial;
        current.current = saved;
        setValue(saved);
        setReady(true);
      })
      .catch((e) => {
        if (alive.current && e.code !== "ERR_CANCELED")
          setError(
            "Could not load saved progress. Close and reopen this activity.",
          );
      });
    return () => {
      alive.current = false;
      controller.abort();
      clearTimeout(timer.current);
      void flush();
    };
  }, [path]);
  useEffect(() => {
    const warn = (event) => {
      if (queued.current || running.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const update = (patch) => {
    if (!ready || blocked.current) return;
    const next = { ...current.current, ...patch };
    current.current = next;
    setValue(next);
    setSaving(true);
    queued.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 250);
  };
  return { value, update, ready, error, saving };
}
