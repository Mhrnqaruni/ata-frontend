// Shows one finished family activity full screen: quiz practice, flashcards, mind map, story or homework check.
// `advanced` is the frame's Advanced disclosure (Phase 1.38 design §6.4), placed at the end of each view's content.
// Area: family

import { Alert, Button, Typography } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import MathText from './MathText';
import { forChild } from './familyWords';
import FamilyMindMap from './FamilyMindMap';
import FamilyHomework from './FamilyHomework';
import Flashcards from './results/Flashcards';
import Quiz from './results/QuizResult';
import { NextStep, Prose } from './results/resultParts';

/** One activity, full screen. Quiz practice is parent-recorded; generated work is not completion. */
export default function FamilyResult({
  activity,
  childName,
  onRecord,
  busy,
  attempts = [],
  draftKey,
  saveError,
  onAsk,
  onMakeQuiz,
  onNewVersion,
  onProgress = () => {},
  onExplain,
  onHeaderAction,
  childId,
  sourceFiles = [],
  advanced = null,
}) {
  const result = activity.result;
  if (!result) return null;
  if (activity.kind === 'quiz' && result.questions?.length > 0)
    return (
      <Quiz
        activity={activity}
        result={result}
        childName={childName}
        onRecord={onRecord}
        busy={busy}
        attempts={attempts}
        draftKey={draftKey}
        saveError={saveError}
        onAsk={onAsk}
        onNewVersion={onNewVersion}
        onProgress={onProgress}
        advanced={advanced}
      />
    );
  if (activity.kind === 'check' && !result.needsInformation && result.checks?.length)
    return (
      <FamilyHomework
        activity={activity}
        result={result}
        childName={childName}
        childId={childId}
        sourceFiles={sourceFiles}
        busy={busy}
        onExplain={onExplain || ((text) => onAsk?.(text))}
        onMakeQuiz={onMakeQuiz}
        onHeaderAction={onHeaderAction}
      />
    );
  if (activity.kind === 'mindmap' && !result.needsInformation && result.mindmap?.length)
    return (
      <>
        {/* The map fills the page, so its Advanced stays above it until row 8 gives the map its side panel. */}
        {advanced}
        <div className="fam-mm-wrap">
          <FamilyMindMap
            title={result.title || activity.title}
            overview={result.explanation}
            branches={result.mindmap}
            nextStep={forChild(result.nextStep, childName)}
            childName={childName}
            onAsk={onAsk}
          />
        </div>
        <footer className="fam-viewer-foot" data-wide="true" data-layout="result">
          <span className="fam-grow" />
          <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>
            Make a mind map
          </Button>
          <Button variant="contained" disabled={busy} onClick={onMakeQuiz} startIcon={<AutoAwesomeRounded />}>
            Practise with a quiz
          </Button>
        </footer>
      </>
    );
  const tip = result.nextStep ? (
    <NextStep text={forChild(result.nextStep, childName)} onAsk={() => onAsk?.(activity.title)} />
  ) : null;
  if (activity.kind === 'flashcards' && !result.needsInformation && result.cards?.length)
    return (
      <Flashcards
        activity={activity}
        cards={result.cards}
        childName={childName}
        end={tip}
        advanced={advanced}
        onProgress={onProgress}
        onQuiz={onMakeQuiz}
        onNewVersion={onNewVersion}
        busy={busy}
      />
    );
  if (activity.kind === 'story' && !result.needsInformation && result.story?.length)
    return (
      <Story
        activity={activity}
        sections={result.story}
        end={tip}
        advanced={advanced}
        onQuiz={onMakeQuiz}
        onNewVersion={onNewVersion}
        busy={busy}
      />
    );
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-read">
          {result.needsInformation && <Alert severity="warning">{result.message}</Alert>}
          {activity.kind === 'mindmap' && (
            <MindMap title={result.title} branches={result.mindmap || []} onAsk={onAsk} />
          )}
          {activity.kind === 'check' && !result.needsInformation && (
            <>
              <WorkCheck checks={result.checks || []} childName={childName} />
              {tip}
            </>
          )}
          {result.references?.length > 0 && (
            <Typography className="fam-small">
              From{' '}
              {result.references
                .map((ref) => `${sourceFiles[ref.fileNumber - 1]?.name || `file ${ref.fileNumber}`}, page ${ref.page}`)
                .join(' · ')}
            </Typography>
          )}
          {advanced}
        </div>
      </div>
      <footer className="fam-viewer-foot" data-layout="result">
        <span className="fam-grow" />
        {activity.kind !== 'check' && (
          <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>
            {{ flashcards: 'Make flashcards', mindmap: 'Make a mind map', story: 'Make a story' }[activity.kind] ||
              'Make a new one'}
          </Button>
        )}
        {!result.needsInformation && (
          <Button variant="contained" disabled={busy} onClick={onMakeQuiz} startIcon={<AutoAwesomeRounded />}>
            Practise with a quiz
          </Button>
        )}
      </footer>
    </>
  );
}

function MindMap({ title, branches, onAsk }) {
  return (
    <section className="fam-map">
      <div className="fam-map-centre">{title}</div>
      <div className="fam-map-grid">
        {branches.map((branch) => (
          <article key={branch.id} className="fam-branch">
            <Typography component="h3" className="fam-branch-title">
              {branch.label}
            </Typography>
            <Prose text={branch.explanation} />
            {branch.children.length > 0 && (
              <ul>
                {branch.children.map((label, i) => (
                  <li key={i}>
                    <MathText text={label} />
                  </li>
                ))}
              </ul>
            )}
            {onAsk && (
              <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={() => onAsk(branch.label)}>
                Ask about this
              </Button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

// The story (design §6.8): one reading card, with the intro line and then every part, read together. The title
// is only in the top bar, so the card never repeats it.
function Story({ sections, end, advanced, onQuiz, onNewVersion, busy }) {
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-col fam-stack">
          <article className="mst-g1 mst-rim fam-story-card">
            <p className="fam-story-intro">Read it together.</p>
            {sections.map((section, i) => (
              <div key={i} className="fam-story-part">
                <Prose text={section.text} />
              </div>
            ))}
          </article>
          {end}
          {advanced}
        </div>
      </div>
      <footer className="fam-viewer-foot" data-col="680">
        <span className="fam-grow" />
        <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>
          Make a story
        </Button>
        <Button variant="contained" disabled={busy} onClick={onQuiz} startIcon={<AutoAwesomeRounded />}>
          Practise with a quiz
        </Button>
      </footer>
    </>
  );
}

const judgement = { correct: ['ok', 'Right'], needs_work: ['warm', 'Not quite'], uncertain: ['neutral', 'To check'] };
function WorkCheck({ checks, childName }) {
  const right = checks.filter((check) => check.judgement === 'correct').length;
  return (
    <section className="fam-check">
      <Typography className="fam-small">A guide from AI, not a final mark.</Typography>
      {checks.length > 0 && (
        <div className="fam-check-chips">
          <span className="fam-status" data-tone="ok">
            {right} right
          </span>
          {checks.filter((c) => c.judgement === 'needs_work').length > 0 && (
            <span className="fam-status" data-tone="warm">
              {checks.filter((c) => c.judgement === 'needs_work').length} not quite
            </span>
          )}
          {checks.filter((c) => !['correct', 'needs_work'].includes(c.judgement)).length > 0 && (
            <span className="fam-status">
              {checks.filter((c) => !['correct', 'needs_work'].includes(c.judgement)).length} to check
            </span>
          )}
        </div>
      )}
      {checks.map((check) => {
        const [tone, label] = judgement[check.judgement] || judgement.uncertain;
        return (
          <article key={check.label} className="fam-check-card" data-tone={tone}>
            <header>
              <Typography component="h3" className="fam-branch-title">
                {check.label}
              </Typography>
              <span className="fam-status" data-tone={tone}>
                {label}
              </span>
            </header>
            {check.question && <Prose text={check.question} />}
            {check.judgement === 'correct' ? (
              <Typography className="fam-check-right">
                {childName} wrote{' '}
                <b>
                  <MathText text={check.studentAnswer} />
                </b>{' '}
                ✓
              </Typography>
            ) : (
              <div className="fam-check-pair">
                <div>
                  <Typography className="fam-small">{childName} wrote</Typography>
                  <Prose text={check.studentAnswer} />
                </div>
                <div>
                  <Typography className="fam-small">Right answer</Typography>
                  <Prose text={check.expectedAnswer} />
                </div>
              </div>
            )}
            <Prose text={check.feedback} />
          </article>
        );
      })}
    </section>
  );
}
