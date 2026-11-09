// "Make practice for Sam" (Phase 1.38 design §4.8–4.9): one heading, where making starts from, one sentence and four
// tiles, 2 by 2 in the panel and one per row on the Make tab, each opening its make dialog with that source chosen.
// Area: family

import { useId } from 'react';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import SubdirectoryArrowRightRounded from '@mui/icons-material/SubdirectoryArrowRightRounded';
import { kindIcon } from './kinds';
import { MAKE_TILES, sourceLine } from './notebookWords';

/** `source` is notebookWords' makeSource, `ticked` how many materials the chat uses; `rows` lays one tile per row. */
export default function MakePanel({ name, source, ticked, onMake, disabled, rows = false }) {
  const heading = useId();
  return (
    <section className="fam-nb-sec fam-nb-make" aria-labelledby={heading} data-rows={rows || undefined}>
      <h2 id={heading} className="fam-nb-h2">
        Make practice for {name}
      </h2>
      <p className="fam-nb-from">
        <SubdirectoryArrowRightRounded aria-hidden />
        {sourceLine(source, ticked)}
      </p>
      <p className="fam-nb-lead">It takes about a minute, and shows up here in the chat and in Activities.</p>
      <div className="fam-nb-tiles">
        {MAKE_TILES.map(([kind, label, line]) => {
          const Icon = kindIcon(kind);
          return (
            <button
              key={kind}
              type="button"
              className="fam-nb-tile"
              disabled={disabled}
              onClick={() => onMake(kind)}
              data-mst={`family-make-menu-${kind}`}
            >
              <span className="mst-tile" data-size="sm" aria-hidden>
                <Icon />
              </span>
              <span className="fam-nb-tile-name">{label}</span>
              <span className="fam-nb-tile-line">{line}</span>
              {rows && <ChevronRightRounded className="fam-nb-tile-chev" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
