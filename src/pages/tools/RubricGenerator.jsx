// /src/pages/tools/RubricGenerator.jsx

import React, { useState, useEffect, useMemo } from 'react';

// MUI Component Imports
import {
  Card, CardContent, CardHeader, Divider, Box, Button, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, CardActions,
  Typography, Chip
} from '@mui/material';

// Custom Component Imports
import ToolPageLayout from '../../components/tools/ToolPageLayout';
import OutputPanel from '../../components/tools/OutputPanel';
import SourceInputBlock from '../../components/tools/SourceInputBlock'; // <<< Using our new reusable component

// MUI Icon Imports
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';

// Service Imports
import toolService from '../../services/toolService';
import libraryService from '../../services/libraryService';
import historyService from '../../services/historyService';

// Custom Hook Imports
import { useSnackbar } from '../../hooks/useSnackbar';

// --- Sub-Component: A specialized input for managing a list of Chips ---
const ChipInput = ({ label, items, setItems, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue && !items.includes(inputValue)) {
      setItems([...items, inputValue]);
      setInputValue('');
    }
  };

  const handleDelete = (itemToDelete) => {
    setItems(items.filter((item) => item !== itemToDelete));
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission
      handleAdd();
    }
  };

  return (
    <Box>
        <Typography variant="overline" color="text.secondary">{label}</Typography>
        <Stack direction="row" spacing={1}>
            <TextField
                fullWidth
                size="small"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type and press Enter to add...`}
                disabled={disabled}
            />
            <Button variant="outlined" onClick={handleAdd} disabled={disabled}>Add</Button>
        </Stack>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, minHeight: '40px' }}>
            {items.map((item) => (
                <Chip
                    key={item}
                    label={item}
                    onDelete={() => handleDelete(item)}
                    disabled={disabled}
                />
            ))}
        </Box>
    </Box>
  );
};


// --- Sub-Component: The specialized SettingsPanel for the Rubric Generator ---
const SettingsPanel = ({
    formState, setFormState, onSubmit, isLoading, libraryTree, libraryLoading
}) => {
    
    // --- Handlers for the Dual Source Input Blocks ---
    const handleAssignmentText = (value) => setFormState(prev => ({...prev, assignment_text: value}));
    const handleAssignmentFile = (file) => setFormState(prev => ({...prev, assignment_file: file}));
    const handleAssignmentLibrary = (field, value) => {
        const newState = { ...formState, assignment_library: {...formState.assignment_library, [field]: value }};
        // Reset child dropdowns on parent change
        if (field === 'selected_level') { newState.assignment_library.selected_year = null; /* etc. */ }
        setFormState(newState);
    };
    
    // For the second source block, we need separate handlers
    const handleGuidanceText = (value) => setFormState(prev => ({...prev, guidance_text: value}));
    // Note: In V1, we will not implement file/library for the guidance source to simplify the UI and backend logic.
    // This can be added later by creating guidance_file and guidance_library state.

    // --- Handlers for Chip Inputs ---
    const setCriteria = (newCriteria) => setFormState(prev => ({ ...prev, criteria: newCriteria }));
    const setLevels = (newLevels) => setFormState(prev => ({ ...prev, levels: newLevels }));

    // Form is valid if the primary source is provided and there are criteria/levels.
    const isFormValid = (formState.assignment_text.trim().length > 10 || formState.assignment_file !== null || formState.assignment_library.selected_chapters.length > 0) && formState.criteria.length > 1 && formState.levels.length > 1;

    return (
        <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <form onSubmit={onSubmit}>
                <CardHeader avatar={<TuneOutlined color="primary" />} title="Settings" titleTypographyProps={{ variant: 'h3' }} />
                <Divider />
                <CardContent>
                    <Stack spacing={4}>
                        <FormControl fullWidth disabled={isLoading}>
                            <InputLabel>Grade Level</InputLabel>
                            <Select name="grade_level" value={formState.grade_level} label="Grade Level" onChange={(e) => setFormState({...formState, grade_level: e.target.value})}>
                                <MenuItem value="Primary School">Primary School</MenuItem>
                                <MenuItem value="Secondary School">Secondary School</MenuItem>
                                <MenuItem value="Years 10 & 11 (GCSE)">Years 10 & 11 (GCSE)</MenuItem>
                                <MenuItem value="Sixth Form - College">Sixth Form - College</MenuItem>
                            </Select>
                        </FormControl>
                        
                        {/* --- Render the first SourceInputBlock for the Assignment Context --- */}
                        <SourceInputBlock
                            label="Assignment Context (The 'What' to Grade)"
                            textValue={formState.assignment_text}
                            fileValue={formState.assignment_file}
                            librarySelection={formState.assignment_library}
                            onTextChange={handleAssignmentText}
                            onFileChange={handleAssignmentFile}
                            onLibraryChange={handleAssignmentLibrary}
                            libraryTree={libraryTree}
                            libraryLoading={libraryLoading}
                            disabled={isLoading}
                        />

                        {/* --- Render a simplified input for the Rubric Guidance --- */}
                        <Box>
                            <Typography variant="overline" color="text.secondary">
                                Optional: Rubric Guidance (The 'How' to Grade)
                            </Typography>
                            <TextField
                                label="Paste a sample rubric or grading notes here"
                                multiline
                                rows={6}
                                fullWidth
                                value={formState.guidance_text}
                                onChange={(e) => handleGuidanceText(e.target.value)}
                                disabled={isLoading}
                            />
                        </Box>

                        {/* --- Render Chip Inputs for Criteria and Levels --- */}
                        <ChipInput label="Criteria (Rows)" items={formState.criteria} setItems={setCriteria} disabled={isLoading} />
                        <ChipInput label="Performance Levels (Columns)" items={formState.levels} setItems={setLevels} disabled={isLoading} />
                        
                    </Stack>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 2, justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" disabled={!isFormValid || isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                        {isLoading ? 'Generating...' : 'Generate Rubric'}
                    </Button>
                </CardActions>
            </form>
        </Card>
    );
};


// --- The Main Page Component ---
const RubricGenerator = () => {
  const { showSnackbar } = useSnackbar();

  // --- State for Library Data ---
  const [libraryTree, setLibraryTree] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  useEffect(() => {
    libraryService.getTree().then(data => setLibraryTree(data)).catch(err => {
        showSnackbar("Could not load curriculum library.", "error");
    }).finally(() => setLibraryLoading(false));
  }, [showSnackbar]);

  // --- The Comprehensive Form State for this Tool ---
  const [formState, setFormState] = useState({
    grade_level: 'Years 10 & 11 (GCSE)',
    // State for the primary (Assignment) source
    assignment_text: '',
    assignment_file: null,
    assignment_library: {
      selected_level: null, selected_year: null, selected_subject: null,
      selected_book: null, selected_chapters: [],
    },
    // State for the secondary (Guidance) source
    guidance_text: '',
    // State for rubric structure
    criteria: ['Thesis Statement', 'Evidence and Analysis', 'Organization'],
    levels: ['Exemplary', 'Proficient', 'Developing', 'Needs Improvement'],
  });

  // State for API calls and output
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  
  // State for save/history logic
  const [isSaving, setIsSaving] = useState(false);
  const [lastUsedSettings, setLastUsedSettings] = useState(null);
  const [savedGenerationId, setSavedGenerationId] = useState(null);

  // --- Submit Handler ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setSavedGenerationId(null);

    // Assemble the settings object that matches the Pydantic model
    const settingsForApi = {
      grade_level: formState.grade_level,
      assignment_text: formState.assignment_text,
      assignment_chapter_paths: formState.assignment_library.selected_chapters.map(c => c.path),
      guidance_text: formState.guidance_text,
      criteria: formState.criteria,
      levels: formState.levels,
    };
    setLastUsedSettings(settingsForApi);

    try {
      const requestPayload = {
        tool_id: 'rubric-generator', // <<< CRITICAL CHANGE
        settings: settingsForApi,
      };
      
      // The assignment_file is the primary file for this tool
      const response = await toolService.generateContent(requestPayload, formState.assignment_file);
      setGeneratedContent(response.content);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Save Handler (identical pattern) ---
  const handleSave = async () => {
    if (!generatedContent || !lastUsedSettings) return;
    if (savedGenerationId) {
        showSnackbar("This generation has already been saved.", 'info');
        return;
    }
    setIsSaving(true);
    try {
        const payload = {
            tool_id: 'rubric-generator', // <<< CRITICAL CHANGE
            settings: lastUsedSettings,
            generated_content: generatedContent,
        };
        const savedRecord = await historyService.saveGeneration(payload);
        setSavedGenerationId(savedRecord.id);
        showSnackbar('Generation saved successfully!', 'success');
    } catch (err) {
        showSnackbar(err.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };
  
  // --- Clear Handler (identical pattern) ---
  const handleClear = () => {
    setGeneratedContent(null);
    setError(null);
    setLastUsedSettings(null);
    setSavedGenerationId(null);
  };

  return (
    <ToolPageLayout
      title="Rubric Generator"
      icon={<RuleOutlined />}
      settingsPanel={
        <SettingsPanel
          formState={formState}
          setFormState={setFormState}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          libraryTree={libraryTree}
          libraryLoading={libraryLoading}
        />
      }
      outputPanel={
        <OutputPanel
          isLoading={isLoading}
          error={error}
          generatedContent={generatedContent}
          onClear={handleClear}
          onSave={handleSave}
          isSaving={isSaving}
          isSaved={!!savedGenerationId}
        />
      }
    />
  );
};

export default RubricGenerator;