// The settings as tiles (Phase 1.46 S5.3; SOT-13; design.md §3.5; DR-4): what pupils see, by mode, each tile with an
// outlined icon, a switch with On or Off beside it, and one line for its state; then More options, folded.
// Area: quizzes

import { useState } from 'react';
import { Switch } from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import GradeOutlined from '@mui/icons-material/GradeOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import BeforeAfter from './BeforeAfter';
import { modeOf } from './editorState';
import { SETTINGS } from './words';

// Each tile: its icon, whether it's on in the quiz's settings, and the settings it writes. The leaderboard writes the
// new key the pages read (missing means off) and today's key, so a rollback keeps the choice (Q5 (b), QA P3-13).
const TILES = {
  feedback: {
    Icon: CheckCircleOutlineRounded,
    isOn: (s) => s.show_correct_answer_during_cooldown ?? true,
    write: (on) => ({ show_correct_answer_during_cooldown: on }),
  },
  review: {
    Icon: VisibilityOutlined,
    isOn: (s) => s.show_result_feedback_to_students ?? true,
    write: (on) => ({ show_result_feedback_to_students: on }),
  },
  leaderboard: {
    Icon: EmojiEventsOutlined,
    isOn: (s) => s.leaderboard === 'top5',
    write: (on) => ({ leaderboard: on ? 'top5' : 'off', show_leaderboard_to_students: on }),
  },
  score: {
    Icon: GradeOutlined,
    isOn: (s) => s.show_final_score_to_students ?? true,
    write: (on) => ({ show_final_score_to_students: on }),
  },
  wrong: {
    Icon: FactCheckOutlined,
    isOn: (s) => s.show_answer_feedback ?? true,
    write: (on) => ({ show_answer_feedback: on }),
  },
};
const BY_MODE = { live: ['feedback', 'review', 'leaderboard'], self_paced: ['score', 'wrong'] };
export const tileWrites = (name, on) => TILES[name].write(on);

function SettingTile({ name, settings, onChange }) {
  const { Icon, isOn } = TILES[name];
  const words = SETTINGS.tiles[name];
  const on = isOn(settings);
  return (
    <label className="mst-qe-tile-setting" data-on={on ? 'true' : undefined}>
      <span className="mst-qe-tile-top">
        <span className="mst-tile mst-qe-tile-icon" aria-hidden="true">
          <Icon />
        </span>
        <span className="mst-qe-switch">
          <Switch checked={on} onChange={(event) => onChange(tileWrites(name, event.target.checked))} />
          <span aria-hidden="true">{on ? SETTINGS.on : SETTINGS.off}</span>
        </span>
      </span>
      <span className="mst-qe-tile-label">{words.label}</span>
      <span className="mst-qe-tile-line">{on ? words.on : words.off}</span>
    </label>
  );
}

// quiz: the editor's quiz; onSettings(patch) changes its settings; onPair(fields) its before-and-after link.
export default function SettingsTiles({ quiz, onSettings, onPair }) {
  const settings = quiz.settings || {};
  const [startOpen] = useState(quiz.quizPhase !== 'normal'); // open at first for a before-and-after quiz, then the teacher's
  return (
    <section className="mst-qe-settings" aria-labelledby="mst-qe-settings-title">
      <h2 className="mst-qe-settings-title" id="mst-qe-settings-title">
        {SETTINGS.heading}
      </h2>
      <div className="mst-qe-tiles">
        {BY_MODE[modeOf(settings)].map((name) => (
          <SettingTile key={name} name={name} settings={settings} onChange={onSettings} />
        ))}
      </div>
      <details className="mst-qe-more-options" open={startOpen || undefined}>
        <summary>
          <span className="mst-qe-more-title">{SETTINGS.more}</span>
          <span className="mst-qe-more-summary">· {SETTINGS.moreSummary}</span>
        </summary>
        <div className="mst-qe-more-body">
          {[
            ['shuffle_questions', SETTINGS.shuffleQuestions],
            ['shuffle_options', SETTINGS.shuffleAnswers],
          ].map(([key, label]) => (
            <label className="mst-qe-switch-row" key={key}>
              <span>{label}</span>
              <Switch
                checked={Boolean(settings[key])}
                onChange={(event) => onSettings({ [key]: event.target.checked })}
              />
            </label>
          ))}
          <BeforeAfter quiz={quiz} onPair={onPair} />
        </div>
      </details>
    </section>
  );
}
