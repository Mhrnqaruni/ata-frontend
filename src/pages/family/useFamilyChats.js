import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { queryClient, sessionGeneration } from "../../services/queryCache";
import api from "../../services/api";

/** Every cache entry and draft is scoped by adult, child and explicit chat ID. */
export default function useFamilyChats(child) {
  const { user } = useAuth(),
    generation = sessionGeneration();
  const [params, setParams] = useSearchParams();
  const base = `/api/family/children/${child.id}`;
  const prefix = ["family", generation, user.id, child.id];
  const id = params.get("chat");
  const createRequest = useRef(null);
  const currentId = useRef(id);
  currentId.current = id;
  const key = [...prefix, "conversation", id || "latest"];
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [older, setOlder] = useState([]),
    [olderCursor, setOlderCursor] = useState(undefined);
  const [extraChats, setExtraChats] = useState([]),
    [listCursor, setListCursor] = useState(undefined);
  const previousPage = useRef({ id: null, turns: [] });
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      (
        await api.get(
          id ? `${base}/conversations/${id}` : `${base}/conversation`,
          { signal },
        )
      ).data,
    refetchInterval: (q) =>
      q.state.data?.turns.some((t) =>
        ["queued", "running"].includes(t.activity.status),
      )
        ? 1500
        : false,
  });
  const list = useQuery({
    queryKey: [...prefix, "chats"],
    queryFn: async ({ signal }) =>
      (await api.get(`${base}/conversations`, { signal })).data,
  });
  function select(value) {
    const next = new URLSearchParams(params);
    next.set("child", child.id);
    next.set("chat", value);
    setParams(next, { replace: true });
  }
  useEffect(() => {
    setOlder([]);
    setOlderCursor(undefined);
    setError("");
  }, [id, child.id]);
  useEffect(() => {
    if (!id && query.data?.id) {
      queryClient.setQueryData(
        [...prefix, "conversation", query.data.id],
        query.data,
      );
      select(query.data.id);
    }
  }, [id, query.data?.id]);
  useEffect(() => {
    if (!query.data) return;
    const page = query.data;
    if (previousPage.current.id === page.id) {
      const current = new Set(page.turns.map((t) => t.id));
      const displaced = previousPage.current.turns.filter(
        (t) => !current.has(t.id),
      );
      if (displaced.length)
        setOlder((rows) =>
          [...rows, ...displaced].filter(
            (t, i, a) => a.findIndex((x) => x.id === t.id) === i,
          ),
        );
    }
    previousPage.current = { id: page.id, turns: page.turns };
  }, [query.data]);
  const data = query.data
    ? {
        ...query.data,
        turns: [...older, ...query.data.turns]
          .filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
          .sort((a, b) => a.sequence - b.sequence),
      }
    : null;
  const valid = () => generation === sessionGeneration();
  async function run(work) {
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      if (valid())
        setError(
          typeof e.response?.data?.detail === "string"
            ? e.response.data.detail
            : "Could not save this chat. Please retry.",
        );
      return false;
    } finally {
      if (valid()) setBusy(false);
    }
  }
  async function refresh() {
    await Promise.all([
      query.refetch(),
      queryClient.invalidateQueries({ queryKey: [...prefix, "chats"] }),
    ]);
  }
  async function create() {
    return run(async () => {
      const uuid = createRequest.current || crypto.randomUUID();
      createRequest.current = uuid;
      await api.put(`${base}/conversation/${uuid}`);
      createRequest.current = null;
      if (valid()) {
        await queryClient.invalidateQueries({ queryKey: [...prefix, "chats"] });
        select(uuid);
      }
    });
  }
  async function rename(title) {
    return run(async () => {
      await api.patch(`${base}/conversations/${data.id}`, {
        revision: data.revision,
        title,
      });
      if (valid()) await refresh();
    });
  }
  async function setSources(materialIds) {
    if (!data || busy) return;
    const captured = data.id;
    return run(async () => {
      await api.patch(`${base}/conversations/${captured}`, {
        revision: data.revision,
        materialIds,
      });
      if (valid())
        await queryClient.invalidateQueries({
          queryKey: [...prefix, "conversation", captured],
        });
    });
  }
  async function loadOlder() {
    const capturedId = data?.id;
    const cursor =
      olderCursor === undefined ? query.data?.nextBefore : olderCursor;
    if (!cursor) return;
    return run(async () => {
      const response = (
        await api.get(`${base}/conversations/${data.id}`, {
          params: { before: cursor },
        })
      ).data;
      if (valid() && currentId.current === capturedId) {
        setOlder((rows) => [...response.turns, ...rows]);
        setOlderCursor(response.nextBefore);
      }
    });
  }
  async function moreChats() {
    const cursor =
      listCursor === undefined ? list.data?.nextCursor : listCursor;
    if (!cursor) return;
    return run(async () => {
      const response = (
        await api.get(`${base}/conversations`, { params: { before: cursor } })
      ).data;
      if (valid()) {
        setExtraChats((rows) => [...rows, ...response.items]);
        setListCursor(response.nextCursor);
      }
    });
  }
  return {
    id: data?.id || id,
    data,
    key,
    query,
    busy,
    error,
    select,
    create,
    rename,
    setSources,
    refresh,
    loadOlder,
    hasOlder:
      (olderCursor === undefined ? query.data?.nextBefore : olderCursor) !=
      null,
    items: [...(list.data?.items || []), ...extraChats].filter(
      (t, i, a) => a.findIndex((x) => x.id === t.id) === i,
    ),
    moreChats,
    hasMoreChats:
      (listCursor === undefined ? list.data?.nextCursor : listCursor) != null,
  };
}
