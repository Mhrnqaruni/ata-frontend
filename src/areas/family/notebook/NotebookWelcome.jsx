// A new chat's welcome (Phase 1.38 design §4.6), in teacher's ChatWelcome look: the AI tile, the question, one sentence
// on what the AI assistant does, and, once a material is ticked, three ideas that fill the box. Nothing old shows.
// Area: family

import { Button } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChecklistRounded from '@mui/icons-material/ChecklistRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';

const IDEA_ICONS = { explain: LightbulbOutlined, help: HelpOutlineRounded, next: ChecklistRounded };

/** `ideas` are notebookWords' chatIdeas; `narrow` is under 1200 px, where Materials is a tab. */
export default function NotebookWelcome({ name, ideas, narrow, onIdea }) {
  return (
    <div className="mst-chat-welcome fam-nb-welcome">
      <span className="mst-chat-star" aria-hidden>
        <AutoAwesomeRounded />
      </span>
      <h2 className="mst-chat-welcome-title">What would you like help with?</h2>
      <p className="mst-chat-welcome-text">
        Ask anything about what {name} is learning. The AI assistant answers you, the parent, using the materials you
        tick {narrow ? 'in Materials' : 'on the right'}.
      </p>
      {ideas.length > 0 && (
        <div className="fam-nb-ideas" role="group" aria-label="Ideas">
          {ideas.map(({ id, text }) => {
            const Icon = IDEA_ICONS[id];
            return (
              <Button
                key={id}
                variant="outlined"
                className="fam-nb-idea"
                startIcon={<Icon />}
                onClick={() => onIdea(text)}
                data-mst={`family-chat-idea-${id}`}
              >
                {text}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
