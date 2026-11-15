// The quiz editor at /quizzes/new and /quizzes/:quizId/edit (Phase 1.46, SOT-11 to SOT-13): each address is one quiz,
// so the editor starts afresh for each; a new quiz's first save changes the address itself.
// Area: quizzes

import { useParams } from 'react-router-dom';
import QuizEditor from './QuizEditor';

export default function EditorPage() {
  const { quizId } = useParams();
  return <QuizEditor key={quizId ?? 'new'} quizId={quizId} />;
}
