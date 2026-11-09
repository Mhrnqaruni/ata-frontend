// Parent mode's maths text: the shared MathTextDisplay, with the numbers kept as written (familyMath.js), so a story's
// "2.350 cm" stays "2.350 cm". Every family screen that shows maths uses this, never the shared one directly.
// Area: family

import MathTextDisplay from '../../components/common/MathTextDisplay';
import { keepDigits } from './familyMath';

export default function MathText({ text, ...props }) {
  return <MathTextDisplay text={keepDigits(text)} {...props} />;
}
