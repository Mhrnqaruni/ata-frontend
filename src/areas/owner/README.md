# owner (frontend)

The owner's admin panel at `/owner` (Phase 1.44): the screens say "Admin", the code says "owner". It's look only: no page changes anything. Its routes sit outside the teacher `AuthProvider`, so an owner page never sends a teacher's token (design §3.0).

| Part | What it is |
| --- | --- |
| `ownerSession.js`, `ownerApi.js` | The owner token in `sessionStorage` (`mst.owner.*`), and the owner API's own axios client. A 401 ends the session and goes to the sign-in. Never use `services/api.js` here: it sends the teacher's token. |
| `ownerQueries.js` | One React Query hook per owner route, and `problemLink()` / `taskLink()`. |
| `OwnerGuard.jsx`, `shell/` | The guard, and the frame: the sidebar with the Admin mark, search ("/" focuses it), the sections and the account menu. |
| `sections.js` | The navigation, as one list. |
| `useRange.js` | The range in the address (`?range=7d`, `?from&to`); `linkTo()` keeps it on links between pages. |
| `format.js` | Design §5's numbers: tokens, cost, durations, UTC times and model names. |
| `components/` | The shared parts below. |
| `pages/` | One file per page. |

## The shared parts (design §3.13)
- **`RangeMenu`:** the range button for a page whose numbers have dates. Days are in UTC.
- **`StatTile`:** a stacked tile, as a link when it opens something; `changeOf()` words its change on the previous period.
- **`ChartCard`:** one series per day, days before "complete from" lighter.
- **`RankedList`:** names, bars, values and shares, with an "Other" row so the list adds up.
- **`OwnerTable`:** toolbar, three-state sort, header groups, a pinned name column, rows that open their page, and paging. **`TableSearch`** is its debounced search field.
- **`SectionBar`:** the jump bar on a page with sections.
- **`TextViewer`:** stored text exactly as kept, as plain text or pretty JSON, **never HTML or Markdown**.
- **`LogTimeline`:** a task's calls, each opening to its tokens, price, error and reply.
- **`Chips`:** outcomes, call outcomes, problem kinds, cost notes and tags, each filled with an icon.
- **`DataNote`:** "Records are complete from {date}…", shown when a page's range starts before it.
- **`PageState`:** loading, a failed load, and an empty range.

Colours come only from the theme's tokens; charts draw one series in `--mst-accent`, with no categorical palette and no animation.

## Adding to the panel (design §3.15)
Nothing new is drawn for a new feature: it reuses the parts above.
- **A new page:** one entry in `sections.js` (label, icon, group, path), its literal route in `App.jsx`, its page name in `services/pages.js`, and a page in `pages/` built from the parts, with a `PageHeader`. It shows the range only if its data has dates. Its route comes first, as the backend's README says ("Adding a panel section").
- **A new AI feature:** nothing here. It's one line in the backend's category registry, and then it shows up in Where the AI goes, the AI use filters and task titles, a user's By category list and Needs attention. A call without a category shows as "No category" under Data gaps.
- **A new kind of record users make:** nothing here either. It's one entry in the backend's `TEACHING` or `PARENT` list, and it becomes one more mini on the user page.
- **A new section on the user page:** one entry in the page's sections, from the backend's `sections`; the section bar picks it up.
