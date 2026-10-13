// /src/hooks/usePageCounts.js
// Counts the pages of chosen files in the browser: PDFs are read with pdf.js (loaded only when first needed),
// images count as one page. A file that can't be read simply gets no count.

import { useEffect, useState } from "react";

const keyOf = (file) => `${file.name}:${file.size}:${file.lastModified}`;
const cache = new Map();
let pdfjsPromise = null;

const loadPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import("react-pdf"), import("pdfjs-dist/build/pdf.worker.min.js?url")]).then(([mod, worker]) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return mod.pdfjs;
    });
  }
  return pdfjsPromise;
};

const countPages = async (file) => {
  const name = (file.name || "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(name)) return 1;
  if (!name.endsWith(".pdf")) return null;
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const doc = await task.promise;
    const pages = doc.numPages;
    await doc.destroy();
    return pages;
  } catch {
    return null;
  }
};

export default function usePageCounts(files = []) {
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    files.forEach((file) => {
      const key = keyOf(file);
      if (cache.has(key)) return;
      cache.set(key, undefined);
      countPages(file)
        .catch(() => null)
        .then((pages) => {
          cache.set(key, pages);
          if (alive) force((n) => n + 1);
        });
    });
    return () => {
      alive = false;
    };
  }, [files]);
  return (file) => {
    const pages = cache.get(keyOf(file));
    return typeof pages === "number" ? `${pages} ${pages === 1 ? "page" : "pages"}` : null;
  };
}
