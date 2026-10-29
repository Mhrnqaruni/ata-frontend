// Explicit numeric scales: a value of 1 means 1%, never an inferred 100%.
function value(row, key, type) {
  let v = key.split(".").reduce((o, k) => o?.[k], row);
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  if (type === "string") return String(v).toLocaleLowerCase();
  if (type === "date") v = new Date(v).getTime();
  else if (type === "time" && typeof v === "string") {
    const matches = [...v.matchAll(/(\d+(?:\.\d+)?)\s*([hms])/g)];
    v = matches.length
      ? matches.reduce(
          (n, m) => n + Number(m[1]) * { h: 3600, m: 60, s: 1 }[m[2]],
          0,
        )
      : Number(v);
  } else v = Number(typeof v === "string" ? v.replace(/%$/, "").trim() : v);
  return Number.isFinite(v) ? v : null;
}
export function sortRows(rows, key, type = "string", direction = "asc") {
  return [...rows].sort((a, b) => {
    const av = value(a, key, type),
      bv = value(b, key, type);
    if (av == null && bv != null) return 1;
    if (bv == null && av != null) return -1;
    const cmp =
      av == null ? 0 : typeof av === "string" ? av.localeCompare(bv) : av - bv;
    if (cmp) return direction === "asc" ? cmp : -cmp;
    return String(a.entityId ?? a.id ?? "").localeCompare(
      String(b.entityId ?? b.id ?? ""),
    );
  });
}
