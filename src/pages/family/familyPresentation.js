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
