// What a family answer or activity used, in one closed disclosure, "Advanced · sources and coverage" (design §5.5,
// §6.4), with buttons that open the PDF pages. Advanced is the disclosure itself, for any page's own sources.
// Area: family

import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FamilySource from './FamilySource';
import './evidence.css';

/** The one Advanced disclosure (design §6.4): closed, at the end of the content, holding `children`. */
export function Advanced({ children }) {
  return (
    <details className="fam-advanced">
      <summary>
        Advanced · sources and coverage
        <ExpandMoreRounded className="fam-advanced-chev" aria-hidden />
      </summary>
      <div className="fam-advanced-body">{children}</div>
    </details>
  );
}

/**
 * Evidence lives outside specialised viewers, preserving their progress and interaction. `scope` keeps each reader's
 * address its own when the same answer shows twice, in the chat and in the viewer.
 */
export default function FamilyEvidence({ childId, activity, scope = 'chat' }) {
  // A homework check lists the pages it marked in its own Advanced, at its end (FamilyHomework, design §5.5).
  if (activity?.kind === 'check') return null;
  const evidence = activity?.evidence;
  const references = evidence?.pages || activity?.result?.references || [];
  if ((!evidence || evidence.outcome === 'general') && !references.length && activity?.basis !== 'conversation')
    return null;
  const files = activity?.sourceFiles || [];
  const used = [...new Set(references.map((item) => item.fileNumber))];
  return (
    <Advanced>
      <p className="fam-advanced-line">
        {activity?.basis === 'conversation'
          ? 'Based on this chat’s saved context, not newly retrieved document pages.'
          : evidence?.outcome === 'general'
            ? 'General help; no document pages used.'
            : references.length
              ? 'Based on these selected pages, not the entire book.'
              : 'No supporting passage was found in the selected materials.'}
      </p>
      {used.map((number) => {
        const file = files[number - 1];
        if (!file?.materialId) return null;
        const pages = [
          ...new Set(references.filter((item) => item.fileNumber === number).map((item) => item.page)),
        ].sort((a, b) => a - b);
        return (
          <div key={number} className="fam-advanced-file">
            <span className="fam-advanced-line">PDF pages {pages.join(', ')}</span>
            <FamilySource
              childId={childId}
              source={{
                id: file.materialId,
                title: file.name,
                files: [file],
                purpose: 'learning',
              }}
              page={pages[0]}
              label={file.name}
              dialog={`read-${scope}-${activity.id}-${number}`}
            />
          </div>
        );
      })}
    </Advanced>
  );
}
