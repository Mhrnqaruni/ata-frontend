/** Display metadata never grants source access; actions always use scoped IDs. */
export const activityBasis = (selectedIds, hasConversation) =>
  selectedIds.length ? "materials" : hasConversation ? "conversation" : "topic";
const clean = (value) =>
  String(value || "").replace(
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,
    "",
  );
export const materialName = (material) =>
  clean(
    material.files?.length === 1 ? material.files[0].name : material.title,
  ) || "Materials";
export function safeMarkdownUrl(value) {
  if (!/^https?:\/\//i.test(value || "")) return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

/** Automatic speech insertion is allowed only into the unchanged captured draft. */
export function mergeDictation(
  current,
  transcript,
  captured,
  automatic = false,
) {
  const unchanged = captured && captured.text === current;
  if (automatic && !unchanged) return null;
  const left = unchanged ? current.slice(0, captured.start) : current;
  const right = unchanged ? current.slice(captured.end) : "";
  const before =
    left && !/\s$/.test(left) && !/^[.,!?;:)]/.test(transcript) ? " " : "";
  const after = right && !/^[\s.,!?;:)]/.test(right) ? " " : "";
  const next = left + before + transcript + after + right;
  return next.length <= 4000 ? next : null;
}
