// Homework's saved-but-not-marked rows (design §5.3; SOT C-21, C-24): the homework uploads in the notebook home that
// no check there uses, and where they go among Past checks, newest first.
// Area: family

const HOME_ACTIVITIES = 50; // the notebook home holds a child's newest 50 activities (SOT A5)

/**
 * The home's work uploads with no check. A check is always made after its upload, so when the home's activities are a
 * full window, only uploads newer than its oldest activity count: an older one may have a check outside the window.
 */
export function unmarkedUploads(home) {
  const activities = home?.activities ?? [];
  const used = new Set(
    activities
      .filter((row) => row.kind === 'check')
      .flatMap((row) => (row.materialIds?.length ? row.materialIds : [row.materialId]))
  );
  const full = activities.length >= HOME_ACTIVITIES;
  const oldest = Math.min(...activities.map((row) => Date.parse(row.createdAt)));
  return (home?.materials ?? []).filter(
    (material) =>
      material.purpose === 'work' && !used.has(material.id) && (!full || Date.parse(material.createdAt) > oldest)
  );
}

/**
 * Past checks' rows, newest first (design §5.3): the list's `items` as { item }, with each of the newest-first
 * `uploads` as { upload } before the first item made before it. One older than every item shown goes last.
 */
export function withUploads(items, uploads) {
  const rows = items.map((item) => ({ item }));
  for (const upload of uploads) {
    const at = Date.parse(upload.createdAt);
    const next = rows.findIndex((row) => row.item && Date.parse(row.item.createdAt) < at);
    rows.splice(next < 0 ? rows.length : next, 0, { upload });
  }
  return rows;
}
