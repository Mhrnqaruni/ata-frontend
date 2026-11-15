// The results header's context line (design.md §3.11): the run picker, "Run: 14 Nov · 8B ▾", newest first; a class
// filter when the run has more than one class; and an open run's state, with Open to go back to it.
// Area: quizzes

import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button, ListItemText, Menu, MenuItem } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import StatusDot from '../shared/StatusDot';
import { isOpen } from './figures';
import { RESULTS, runFacts, runTitle } from './words';

// A 32 px pill that opens its choices, like the list's filter chips (design.md §6); tinted once it's set.
function PickMenu({ label, value, set, items, chosen, onPick, mst }) {
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  const pick = (key) => {
    setAnchor(null);
    if (key !== chosen) onPick(key);
  };
  return (
    <>
      <Button
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        aria-haspopup="menu"
        className="quiz-results-pick"
        data-mst={mst}
        data-set={set ? 'true' : undefined}
        endIcon={<ExpandMoreRounded />}
        onClick={(event) => setAnchor(event.currentTarget)}
        variant="outlined"
      >
        {label}: {value}
      </Button>
      <Menu anchorEl={anchor} id={id} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
        {items.map((item) => (
          <MenuItem key={item.key} onClick={() => pick(item.key)} selected={item.key === chosen}>
            <ListItemText
              primary={item.primary}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              secondary={item.secondary}
              secondaryTypographyProps={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// The page a run is followed on: the live page, or the homework page.
const runPage = (run) => `/quizzes/${run.kind === 'live' ? 'sessions' : 'sp-sessions'}/${run.id}/host`;

// runs: the quiz's runs, newest first; run: the one shown; classId: the class filter, or null for every class.
export default function RunPicker({ runs, run, classId, onRun, onClass }) {
  const title = runTitle(run, runs);
  const chosenClass = run.classes?.find((item) => item.id === classId);
  return (
    <span className="quiz-results-context">
      {runs.length > 1 ? (
        <PickMenu
          chosen={run.id}
          items={runs.map((item) => ({ key: item.id, primary: runTitle(item, runs), secondary: runFacts(item) }))}
          label={RESULTS.run}
          mst="run-picker"
          onPick={onRun}
          value={title}
        />
      ) : (
        <span className="quiz-results-context-text">
          {RESULTS.run}: {title}
        </span>
      )}
      {run.classes?.length > 1 ? (
        <PickMenu
          chosen={classId ?? ''}
          items={[
            { key: '', primary: RESULTS.allClasses },
            ...run.classes.map((item) => ({ key: item.id, primary: item.name })),
          ]}
          label={RESULTS.classFilter}
          mst="class-filter"
          onPick={(key) => onClass(key || null)}
          set={Boolean(chosenClass)}
          value={chosenClass?.name ?? RESULTS.allClasses}
        />
      ) : null}
      {isOpen(run) ? (
        <span className="quiz-results-context-open">
          <StatusDot deadline={run.deadline} state={run.kind === 'live' ? 'live' : 'homework'} />
          <Button component={RouterLink} size="small" to={runPage(run)}>
            {RESULTS.open}
          </Button>
        </span>
      ) : null}
    </span>
  );
}
