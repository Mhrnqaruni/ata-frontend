// Details, step 1 (Phase 1.46 S5.1; SOT-11; design.md §3.2): one card of at most 720 px with the title (and a
// description on request), the classes, the tags, and how pupils take it, a two-choice switch.
// Area: quizzes

import { useId, useState } from 'react';
import { Button, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import HomeWorkOutlined from '@mui/icons-material/HomeWorkOutlined';
import ClassField from './ClassField';
import { modeOf } from './editorState';
import TagField from './TagField';
import { DETAILS, STEPS } from './words';

const MODES = [
  { value: 'live', Icon: BoltOutlined, label: DETAILS.live, hint: DETAILS.liveHint, line: DETAILS.liveLine },
  {
    value: 'self_paced',
    Icon: HomeWorkOutlined,
    label: DETAILS.homework,
    hint: DETAILS.homeworkHint,
    line: DETAILS.homeworkLine,
  },
];
const hasAudience = (audience) => Boolean(audience?.class_ids?.length || audience?.tag_ids?.length);

// titleMissing: Next was pressed with no title, so the field says so.
export default function DetailsCard({ quiz, dispatch, tags, titleMissing }) {
  const titleId = useId();
  const howId = useId();
  const [describing, setDescribing] = useState(Boolean(quiz.description));
  const pair = quiz.quizPhase === 'post';
  const mode = MODES.find((each) => each.value === modeOf(quiz.settings)) ?? MODES[0];
  const noTitle = titleMissing && !quiz.title.trim();
  const set = (fields) => dispatch({ type: 'set', fields });

  return (
    <section className="mst-qe-details" aria-label={STEPS[0]}>
      <div className="mst-qe-field">
        <div className="mst-qe-label-row">
          <label className="mst-qe-label" htmlFor={titleId}>
            {DETAILS.title}
          </label>
          {describing ? null : (
            <Button size="small" startIcon={<AddRounded />} onClick={() => setDescribing(true)}>
              {DETAILS.addDescription}
            </Button>
          )}
        </div>
        <TextField
          id={titleId}
          fullWidth
          autoFocus={!quiz.id}
          value={quiz.title}
          placeholder={DETAILS.titlePlaceholder}
          error={noTitle}
          helperText={noTitle ? DETAILS.titleMissing : undefined}
          inputProps={{ maxLength: 200 }}
          onChange={(event) => set({ title: event.target.value })}
        />
        {describing ? (
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            autoFocus={!quiz.description}
            value={quiz.description}
            placeholder={DETAILS.descriptionPlaceholder}
            inputProps={{ 'aria-label': DETAILS.description, maxLength: 5000 }}
            onChange={(event) => set({ description: event.target.value })}
            sx={{ mt: 1 }}
          />
        ) : null}
      </div>

      <ClassField
        audience={quiz.audience}
        locked={pair}
        keepOne={Boolean(quiz.id) && hasAudience(quiz.serverAudience)}
        onChange={(audience) => set({ audience })}
      />

      <TagField {...tags} />

      <div className="mst-qe-field">
        <div className="mst-qe-label" id={howId}>
          {DETAILS.how}
        </div>
        <ToggleButtonGroup
          exclusive
          aria-labelledby={howId}
          className="mst-qe-how"
          value={mode.value}
          disabled={pair}
          onChange={(_, value) => value && dispatch({ type: 'settings', patch: { mode: value } })}
        >
          {MODES.map(({ value, Icon, label, hint }) => (
            <ToggleButton key={value} value={value}>
              <Icon fontSize="small" aria-hidden="true" />
              <span className="mst-qe-how-label">{label}</span>
              <span className="mst-qe-how-hint">· {hint}</span>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <p className="mst-qe-help">{mode.line}</p>
      </div>
    </section>
  );
}
