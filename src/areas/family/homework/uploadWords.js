// The upload window's words and rules (design §5.4): each use's title, sentence and drop area, the files it takes,
// its main button's words, and which page is being sent.
// Area: family

const PAGES = { hint: 'Photos or a PDF · up to 20 pages', drag: ' · or drag them here', choose: 'Choose photos' };

/**
 * The window's words for each use: check (Check homework, ?dialog=check), add-pages (Add the missing pages) and
 * upload (the Notebook's materials). `drag` is added to the hint only where a mouse can drag (design §5.4).
 */
export const UPLOAD_WORDS = {
  check: {
    ...PAGES,
    title: 'Check homework',
    lead: 'AI marks it in about a minute. You can leave this window; the result shows in Past checks.',
    drop: 'Add each page of the homework',
  },
  'add-pages': {
    ...PAGES,
    title: 'Add the missing pages',
    lead: 'Your first pages are already here. Add the pages that were missing, then check them.',
    drop: 'Add each missing page',
  },
  // Add a worksheet (design §10.2): it says which window marks, and that this one doesn't.
  upload: {
    title: 'Add a worksheet',
    lead: (name) => `For the AI assistant to read, so its answers match ${name}’s lessons. It isn’t marked.`,
    drop: 'A photo, or a scanned file (PDF), of the worksheet',
    hint: 'Up to 20 pages.',
    drag: ' Or drag it here.',
    choose: 'Choose a file',
    first: 'Choose a photo or a file first.',
  },
};

const TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
/** Whether the window takes a file: a photo (JPG or PNG) or a PDF, as its file buttons offer. */
export const accepted = (file) => TYPES.includes(file.type) || /\.(pdf|png|jpe?g)$/i.test(file.name || '');

/** The main button's words: "Check homework" before a page is added, then "Check 2 pages"; "Add files" for materials. */
export function saveWords(use, count) {
  if (use === 'upload') return 'Add worksheet';
  if (!count) return 'Check homework';
  return `Check ${count} ${count === 1 ? 'page' : 'pages'}`;
}

/**
 * The main button's words while it sends, from `sizes` (each file's bytes) and `fraction`, how much of the upload has
 * gone: "Sending 1 of 2…" for pages (design §5.4), and for materials today's "Uploading 40%", then "Saving…".
 */
export function busyWords(use, sizes, fraction) {
  const gone = Math.min(Math.max(fraction || 0, 0), 1);
  if (use === 'upload') return 'Adding…'; // design §10.2, with the button's spinner
  // The page whose bytes the upload has reached; the last one once they have all gone.
  const reached = gone * sizes.reduce((sum, size) => sum + size, 0);
  let end = 0;
  let page = sizes.length;
  for (const [index, size] of sizes.entries()) {
    end += size;
    if (reached < end) {
      page = index + 1;
      break;
    }
  }
  return `Sending ${page} of ${sizes.length}…`;
}
