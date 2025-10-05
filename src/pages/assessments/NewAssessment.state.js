// /src/pages/assessments/NewAssessmentV2.state.js

// This helper creates a blank V2 question object for the review UI.
export const initialQuestionV2 = () => ({
  id: `q_${Math.random().toString(36).substr(2, 9)}`,
  text: '',
  rubric: '',
  maxScore: 10,
  answer: '',
});

// This is the initial state for our new V2 wizard.
export const initialState = {
  assessmentName: '',
  classId: '',
  // --- [NEW STATE FIELDS] ---
  questionFile: null,
  answerKeyFile: null,
  scoringMethod: 'per_question', // 'per_question' or 'total_score'
  // --- [END NEW STATE FIELDS] ---
  config: null, // Will hold the AI-parsed V2 config object
  answerSheetFiles: [],
  status: 'setup', // 'setup', 'parsing', 'reviewing', 'submitting'
  error: null,
};

// This reducer function manages all state transitions for the V2 wizard.
export function wizardReducer(state, action) {
  switch (action.type) {
    // --- [NEW ACTIONS] ---
    case 'SET_QUESTION_FILE':
      return { ...state, questionFile: action.payload, config: null, error: null }; // Reset config on new file
    case 'SET_ANSWER_KEY_FILE':
      return { ...state, answerKeyFile: action.payload, config: null, error: null };
    // --- [END NEW ACTIONS] ---

    case 'UPDATE_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'START_PARSING':
      return { ...state, status: 'parsing', error: null, config: null };
    case 'PARSE_SUCCESS':
      // When parsing succeeds, we populate the config and move to the 'reviewing' state.
      return { ...state, status: 'reviewing', config: action.payload };
    case 'PARSE_FAILURE':
      return { ...state, status: 'setup', error: action.payload, questionFile: null, answerKeyFile: null };
    case 'START_SUBMITTING':
      return { ...state, status: 'submitting', error: null };
    case 'SUBMIT_FAILURE':
      return { ...state, status: 'reviewing', error: action.payload };
    
    // Actions for managing the student answer sheets
    case 'ADD_ANSWER_SHEETS':
      const newFiles = action.payload.filter(nf => !state.answerSheetFiles.some(ef => ef.name === nf.name && ef.size === nf.size));
      return { ...state, answerSheetFiles: [...state.answerSheetFiles, ...newFiles] };
    case 'REMOVE_ANSWER_SHEET':
      return { ...state, answerSheetFiles: state.answerSheetFiles.filter(f => f.name !== action.payload) };
    
    // --- New V2-specific actions for editing the config ---
    case 'UPDATE_CONFIG_FIELD': {
        const { field, value } = action.payload;
        if (!state.config) return state;
        return { ...state, config: { ...state.config, [field]: value } };
    }
    case 'UPDATE_SECTION_FIELD': {
      if (!state.config) return state;
      const { sectionId, field, value } = action.payload;
      const newSections = state.config.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s);
      return { ...state, config: { ...state.config, sections: newSections } };
    }
    case 'UPDATE_QUESTION_FIELD': {
      if (!state.config) return state;
      const { sectionId, questionId, field, value } = action.payload;
      const newSections = state.config.sections.map(s => {
        if (s.id !== sectionId) return s;
        const newQuestions = s.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q);
        return { ...s, questions: newQuestions };
      });
      return { ...state, config: { ...state.config, sections: newSections } };
    }
    case 'ADD_QUESTION': {
        if (!state.config) return state;
        const { sectionId } = action.payload;
        const newSections = state.config.sections.map(s => {
            if (s.id !== sectionId) return s;
            return { ...s, questions: [...s.questions, initialQuestionV2()] };
        });
        return { ...state, config: { ...state.config, sections: newSections } };
    }
    case 'REMOVE_QUESTION': {
        if (!state.config) return state;
        const { sectionId, questionId } = action.payload;
        const newSections = state.config.sections.map(s => {
            if (s.id !== sectionId) return s;
            if (s.questions.length <= 1) return s; // Prevent removing the last question
            const newQuestions = s.questions.filter(q => q.id !== questionId);
            return { ...s, questions: newQuestions };
        });
        return { ...state, config: { ...state.config, sections: newSections } };
    }
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}