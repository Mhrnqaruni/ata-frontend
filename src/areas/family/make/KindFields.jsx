// The make window's choices for each kind (Phase 1.38 design §6.3): one or two segmented controls with today's
// defaults, then More options, closed, holding the rest of today's values (type, style, size, tone, focus, name, tag).
// Area: family

import { Button, Collapse, IconButton, TextField } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ListRounded from '@mui/icons-material/ListRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import ThumbsUpDownRounded from '@mui/icons-material/ThumbsUpDownRounded';
import ChoiceCards from '../../../components/common/ChoiceCards';
import { levelWords } from '../familyWords';
import { Segmented } from './MakeFields';
import { moreLine } from './makeWords';

const COUNTS = [
  ['3', '3'],
  ['5', '5'],
  ['10', '10'],
];
const QUIZ_TYPES = [
  { value: 'mcq', label: 'Multiple choice', description: 'Pick from 4 answers', icon: <ListRounded /> },
  { value: 'boolean', label: 'True or false', description: 'Is it true or not?', icon: <ThumbsUpDownRounded /> },
];

/**
 * `fields` and `set` are this opening's choices; `settings` and `choose` the kind's own, which stay while the page is
 * open. `count` is the number asked for. `longBook` makes the focus required, so it then shows outside More options.
 */
export default function KindFields({ kind, fields, set, settings, choose, count, longBook }) {
  const focus = (
    <TextField
      label={longBook ? 'Topic, chapter or page range' : 'Anything to focus on? (optional)'}
      required={longBook}
      placeholder="For example: tenths and hundredths"
      value={fields.focus}
      onChange={(e) => set({ focus: e.target.value })}
      inputProps={{ maxLength: 300 }}
      fullWidth
    />
  );
  return (
    <>
      {kind === 'quiz' && (
        <>
          <Segmented
            id="fam-count"
            label="How many questions?"
            value={fields.count}
            onChange={(v) => set({ count: v })}
            options={COUNTS}
          />
          <Segmented
            id="fam-level"
            label="How hard?"
            value={fields.difficulty}
            onChange={(difficulty) => set({ difficulty })}
            options={levelWords}
          />
        </>
      )}
      {kind === 'flashcards' && (
        <div>
          <Segmented
            id="fam-count"
            label="How many cards?"
            value={fields.countOther ? 'other' : fields.count}
            onChange={(v) => set(v === 'other' ? { countOther: true } : { countOther: false, count: v })}
            options={[...COUNTS, ['other', 'Other']]}
          />
          {fields.countOther && (
            <div className="fam-stepper" role="group" aria-label="Number of cards">
              <IconButton
                aria-label="One fewer"
                disabled={count <= 1}
                onClick={() => set({ count: String(Math.max(1, (count || 5) - 1)) })}
              >
                <RemoveRounded />
              </IconButton>
              <span className="fam-stepper-n" aria-live="polite">
                {count || 5}
              </span>
              <IconButton
                aria-label="One more"
                disabled={count >= 10}
                onClick={() => set({ count: String(Math.min(10, (count || 5) + 1)) })}
              >
                <AddRounded />
              </IconButton>
            </div>
          )}
        </div>
      )}
      {kind === 'story' && (
        <Segmented
          id="fam-length"
          label="How long?"
          value={settings.storyLength}
          onChange={(storyLength) => choose({ storyLength })}
          options={[
            ['short', 'Short'],
            ['standard', 'Standard'],
          ]}
        />
      )}
      {longBook && focus}
      <div>
        <Button
          className="fam-mk-more"
          onClick={() => set({ moreOptions: !fields.moreOptions })}
          aria-expanded={fields.moreOptions}
          aria-controls="fam-mk-more"
          startIcon={<ExpandMoreRounded className="fam-chev" data-open={fields.moreOptions} />}
        >
          {moreLine(kind)}
        </Button>
        <Collapse in={fields.moreOptions}>
          <div id="fam-mk-more" className="fam-form fam-mk-more-body">
            {kind === 'quiz' && (
              <ChoiceCards
                name="fam-quiz-type"
                legend="Question type"
                value={settings.quizType}
                onChange={(quizType) => choose({ quizType })}
                options={QUIZ_TYPES}
              />
            )}
            {kind === 'flashcards' && (
              <Segmented
                id="fam-style"
                label="Card style"
                value={settings.cardStyle}
                onChange={(cardStyle) => choose({ cardStyle })}
                options={[
                  ['question_answer', 'Q & A'],
                  ['definitions', 'Words'],
                  ['worked_examples', 'Examples'],
                ]}
              />
            )}
            {kind === 'mindmap' && (
              <Segmented
                id="fam-size"
                label="How big?"
                value={String(settings.mapDepth)}
                onChange={(v) => choose({ mapDepth: Number(v), mapBreadth: Number(v) + 1 })}
                options={[
                  ['2', 'Small'],
                  ['3', 'Medium'],
                  ['4', 'Big'],
                ]}
              />
            )}
            {kind === 'story' && (
              <>
                <Segmented
                  id="fam-tone"
                  label="Tone"
                  value={settings.storyTone}
                  onChange={(storyTone) => choose({ storyTone })}
                  options={[
                    ['calm', 'Calm'],
                    ['playful', 'Playful'],
                    ['adventure', 'Adventure'],
                  ]}
                />
                <TextField
                  label="Theme (optional)"
                  placeholder="For example: space pirates"
                  value={settings.storyTheme}
                  onChange={(e) => choose({ storyTheme: e.target.value })}
                  inputProps={{ maxLength: 100 }}
                  fullWidth
                />
              </>
            )}
            {!longBook && focus}
            <TextField
              label="Name (optional)"
              placeholder="MySmartTeach names it for you"
              value={fields.title}
              onChange={(e) => set({ title: e.target.value })}
              inputProps={{ maxLength: 160 }}
              fullWidth
            />
            <TextField
              label="Tag (optional)"
              placeholder="For example: homework"
              value={fields.tag}
              onChange={(e) => set({ tag: e.target.value })}
              inputProps={{ maxLength: 30 }}
              fullWidth
            />
          </div>
        </Collapse>
      </div>
    </>
  );
}
