import React from "react";
import FamilySource from "./FamilySource";

/** Evidence lives outside specialised viewers, preserving their progress and interaction. */
export default function FamilyEvidence({ base, activity }) {
  const evidence = activity?.evidence;
  const references = evidence?.pages || activity?.result?.references || [];
  if ((!evidence || evidence.outcome === "general") && !references.length)
    return null;
  const files = activity?.sourceFiles || [];
  const used = [...new Set(references.map((item) => item.fileNumber))];
  return (
    <details className="fam-evidence">
      <summary>Sources & coverage</summary>
      <p className="fam-small">
        {evidence?.outcome === "general"
          ? "General help; no document pages used."
          : references.length
            ? "Based on these selected pages, not the entire book."
            : "No supporting passage was found in the selected materials."}
      </p>
      {used.map((number) => {
        const file = files[number - 1];
        if (!file?.materialId) return null;
        const pages = [
          ...new Set(
            references
              .filter((item) => item.fileNumber === number)
              .map((item) => item.page),
          ),
        ].sort((a, b) => a - b);
        return (
          <div key={number}>
            <span className="fam-small">PDF pages {pages.join(", ")}</span>
            <FamilySource
              base={base}
              source={{
                id: file.materialId,
                title: file.name,
                files: [file],
                purpose: "learning",
              }}
              page={pages[0]}
              label={file.name}
            />
          </div>
        );
      })}
    </details>
  );
}
