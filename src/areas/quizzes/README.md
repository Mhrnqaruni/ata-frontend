# quizzes (frontend)

The quiz pages, rebuilt in Phase 1.46 (`Shared/MST-production/Phase 1.46 - Quiz Upgrade/`: its Source of Truth's SOT-16 and SOT-18, and `design.md`). Teachers' addresses stay the same. Each new page starts as a **stub** that shows today's page from `pages/quizzes/`, so every address works from day one; its lane then builds the page in that file. Today's page file is deleted when its replacement is merged.

## Who owns what (SOT-18)
| Folder or file | What it is | Lane (worker) |
| --- | --- | --- |
| `QuizRoutes.jsx` | Every quiz address, as two route lists that `App.jsx` places: `pupilQuizRoutes` (no sign-in) and `teacherQuizRoutes` (teacher sign-in) | 3 (W3) only |
| `OldResultsAddress.jsx` | The old results addresses, which forward to `/quizzes/:quizId/results` | 3 (W3) |
| `README.md`, `words.js`, `queries.js`, `api/`, `shared/` | This file, and the parts every lane shares (see below) | 3 (W3) |
| `library/` | The quiz list: search, filters, rows, tags, archive, bulk actions, the first visit (L1–L14) | 4 (W4) |
| `editor/` | Create and edit: details, questions, settings, Finish editing, the Start window (C, Q, P, S) | 5 (W5) |
| `live/`, `homework/` | The teacher's live page and homework page (LV, SP1–SP4) | 6 (W6) |
| `play/` | The pupils' screens: `/join`, live and homework (ST, SP5–SP10) | 7 (W6) |
| `results/` | One results page per quiz (AN) | 8 (W7) |

Outside this folder, Lane 3 also owns `App.jsx`, `services/pages.js`, `scripts/maps/areas.mjs`, the class chooser in `components/tags/` and the old pages in `pages/quizzes/`. The date words are in `src/utils/dates.js`, shared by the whole app.

## The addresses
| Address | Page file | Today's page behind the stub, or the built page |
| --- | --- | --- |
| `/join`, `/join/:code` | `play/JoinPage.jsx` | **Built (S6.3, Lane 7):** one place to type a code; the public lookup (SOT-8) says whether it's a live or a homework run, then opens that run's pupil page |
| `/quiz/join`, `/quiz/join/:roomCode` | `play/LivePlay.jsx` | **Built (S6.3, Lane 7):** the pupil's live screen at 390 px: join with the class-list check, tap then Send (counted only when the server accepts it, with Try again), shared places, the run's leaderboard choice |
| `/quiz/sp/join`, `/quiz/sp/join/:accessCode` | `play/HomeworkPlay.jsx` | **Built (S6.3, Lane 7):** the pupil's homework screen: what the run allows (no points when the score is off; saved-only when feedback is off) and proof of handing in |
| `/quizzes` | `library/LibraryPage.jsx` | `pages/Quizzes` |
| `/quizzes/new`, `/quizzes/:quizId/edit` | `editor/EditorPage.jsx` | `QuizBuilder` |
| `/quizzes/:quizId/results` | `results/ResultsPage.jsx` | **Built (S6.4, Lane 8):** one results page per quiz, live and homework alike. A run picker and, when a run has more than one class, a class filter sit in the header (kept in `?run=` and `?class=`); the summary comes first, then the pupils and the questions. It keeps today's downloads (each pupil's report, every report as a ZIP, the spreadsheet), matching a walk-in to a pupil, marking the answers that wait for a mark, a post quiz's before-and-after and the student-group results |
| `/quizzes/sessions/:sessionId/host` | `live/HostPage.jsx` | **Built (S6.1, Lane 6):** the compact live host page: the question, timer and Show answers / Next on the first screen, Present and Share, Finish to the results |
| `/quizzes/sp-sessions/:sessionId/host` | `homework/HomeworkPage.jsx` | **Built (S6.2, Lane 6):** handed in, working on it and not started, live; Share with the due date (`?share=1` opens Share on arrival); Close homework in the app's own window |
| `/quizzes/:quizId/analytics`, `/quizzes/sp-sessions/:sessionId/analytics` | `OldResultsAddress.jsx` | Forward to `/quizzes/:quizId/results` (a homework run adds `?run=`) |

Each address has its page name in `services/pages.js` (`join`, `join.code` and `quizzes.results` are new), for the UI log.

## The shared parts (S3.2): import these, don't copy them
Their exports are stable: a change that would break a lane goes through Lane 3. Paths are from `src/areas/quizzes/`.

| Import | Exports | Use it for |
| --- | --- | --- |
| `./words` | `STATES` (`label`, `tone`, `pulse`, `tip` for `draft`, `ready`, `live`, `homework`, `finished`, `archived`), `STATE_ORDER`, `stateLabel(state, { deadline })`, `stateActions(state, mode)`, `classList(classes, { max })`, `WORDS`, `NEVER_ON_SCREEN`, `neverShownIn(text)` | Every state's word, dot, tooltip and buttons (design.md §5): `stateActions` gives `[{ action: 'edit' \| 'start' \| 'open' \| 'results', label, variant }]`, with Start or Send by `mode`. `WORDS` holds the words two or more pages say, such as `notOnClassList`, `noClassYet`, `belowHalf` and `copied`. Test your own words with `neverShownIn` |
| `./queries` | `quizKeys.library(userId, params?)`, `.tags(userId)`, `.quiz(userId, quizId)`, `.runs(userId, quizId)`, `.summary(userId, quizId, runId, classId?)`, `.join(code)`; `libraryParams(params)` | The keys of the reads several pages share. Your folder's `queries.js` makes the hooks, with your `api.js`. The library, tags and a quiz are in the `quizzes` family, runs and summaries in `quizSession`, so the app's refreshes after a quiz changes reach them; `quizKeys.library(userId)` with no params is every page and filter of the list |
| `./queries` (S3.4) | `libraryQuery(userId, params)` | `{ queryKey, queryFn }` for `GET /api/quiz-library` (`{ items, total, counts, live_now }`), with repeated filters sent as `state=draft&state=ready`: spread it into `useQuery`. Home's panel uses it |
| `./links` (S3.4) | `quizLink(item)`, `editLink(quizId)`, `resultsLink(quizId, runId?)`, `runLink({ id, kind })` | Where a quiz opens, from its library item: an open run's live or homework page, the editor for a draft or a quiz never run, else its results (design.md §3.1's row click) |
| `./api/join` | `lookupJoin(code, { signal })`, `cleanCode(code)`, `joinPath(kind, code)` | `GET /api/quiz-join/:code` (no sign-in): `{ kind: 'live' \| 'homework', quiz_title, teacher_name }`. A refusal is an `Error` with the sentence to show and its `status`: 404 ("This quiz has finished." or "No quiz has this code. Check it with your teacher."), 429, or null offline. `joinPath` is today's pupil page for a run |
| `./shared/joining` | `cleanCode`, `joinLink(code)`, `joinAddress()`, `joinPath(kind, code)`, `inviteText({ title, code, due })`, `qrFileName(code)` | The short link `/join/<code>` the QR codes hold, "app…/join" to type, and Share's invite |
| `./shared/StatusDot` | default `StatusDot({ state, deadline, tip = true, sx })` | A state as an 8 px dot and its word (12/16 600), with its tooltip, in 48 px rows |
| `./shared/ClassNames` | default `ClassNames({ classes, max = 2, sx })` | "8B, 9C +1", every name in a tooltip; "No class yet" in ink-3 |
| `./shared/ConfirmDialog` | default `ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, onConfirm, onCancel, tone = 'accent' \| 'bad', busy, busyLabel, error, extraAction: { label, onClick } })` | Every confirmation: never `window.confirm`. Red (`tone: 'bad'`) only for deleting |
| `./shared/JoinStrip` | default `JoinStrip({ code, compact, actions, note })` | The 64 px joining strip on the live and homework pages, or the 40 px line during questions; pass your Present and Share buttons as `actions` |
| `./shared/ShareJoin` | default `ShareJoin({ code, title, due, size, variant })` | The Share button and its menu: Copy invite, Copy link, Copy QR image (where the browser can), Download QR (PNG), More… (where there's a share sheet) |
| `./shared/PresentJoin` | default `PresentJoin({ open, onClose, code, here, children, controls, onMain })` | Present: full screen (a full window where the browser refuses), dark in both themes. Pass "24 of 28 here" as `here`, the running question as `children`, your main button and timer as `controls`, and what Space or → does as `onMain`. **Inside it, menus and tooltips need `disablePortal`,** because full screen shows only Present's own frame |
| `../../utils/dates` (`src/utils/dates.js`) | `formatDate(value, { year: 'always' \| 'auto', weekday })`, `formatDateTime(value)`, `formatDay(value)`, `formatTime(value)`, `toDate(value)` | "14 Nov 2026"; on quiz pages `year: 'auto'` ("14 Nov" this year); "Fri 20 Nov, 17:00" for due dates; "Today", "Yesterday" or "3 Oct" for Last used. Missing dates give "" |

A Present button is a plain `Button` with `OpenInFullRounded` and `WORDS.present`; the page keeps `open` in its state and renders `PresentJoin` beside it.

## Rules for every lane
- **Build in your own folder,** and replace your stub file's content; keep its file name, because `QuizRoutes.jsx` imports it. Never edit `QuizRoutes.jsx`, `App.jsx` or `services/pages.js`: ask Lane 3 for a new address.
- **Your folder keeps its own** `words.js`, `queries.js` and `api.js` for what only your pages use. What every lane uses is in the shared files below: import it, don't copy it.
- **Every new file starts with the maps header:** 1–2 purpose lines, then `// Area: quizzes`. New files have at most 400 lines.
- **The look** is the teacher glass system (the `mst-design` skill) and `design.md`: tokens only, the words in §5, the sizes in §3.0 and §6.
- **At merge,** Lane 3 deletes the old page your page replaces, then runs `node scripts/check-sizes.mjs --update` and the maps.
