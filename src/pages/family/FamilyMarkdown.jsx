import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { safeMarkdownUrl } from "./familyPresentation";

/** Raw HTML and model images are disabled; source citations use separate validated controls. */
export default React.memo(function FamilyMarkdown({ text = "" }) {
  return (
    <div className="fam-markdown">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              trust: false,
              strict: "ignore",
              throwOnError: false,
              maxExpand: 100,
              maxSize: 20,
            },
          ],
        ]}
        urlTransform={safeMarkdownUrl}
        components={{
          img: () => null,
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          table: ({ children }) => (
            <div
              className="fam-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable answer table"
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {String(text).slice(0, 16000)}
      </ReactMarkdown>
    </div>
  );
});
