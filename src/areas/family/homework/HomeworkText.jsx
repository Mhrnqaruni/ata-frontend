// The marked homework's text (design §5.5): simple maths as plain words and real maths typeset, and mark-scheme
// answers as headed bullet lists. Shared by the question cards and the PDF.
// Area: family

import MathText from '../MathText';
import { plainWords, structure, tidy } from './resultWords';

/** A line of the AI's text, with its simple maths as plain words. */
export function TidyText({ text }) {
  return <MathText text={tidy(text)} />;
}

/** An answer: one line as it is, or a mark scheme's heads and bullets. `plain` turns "a/b" into "a or b". */
export function Answer({ text, plain }) {
  const clean = plain ? plainWords(text) : tidy(text);
  const sections = structure(clean);
  if (sections.length === 1 && !sections[0].head && sections[0].items.length <= 1)
    return (
      <div className="fam-hw-text">
        <MathText text={clean} />
      </div>
    );
  return (
    <div className="fam-hw-text">
      {sections.map((section, i) => (
        <div key={i} className="fam-hw-sec">
          {section.head && <div className="fam-hw-sec-head">{section.head}</div>}
          {section.items.length > 1 ? (
            <ul>
              {section.items.map((item, j) => (
                <li key={j}>
                  <MathText text={item} />
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <MathText text={section.items[0] || ''} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
