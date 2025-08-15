// /src/pages/tools/SlideGenerator.jsx

import React, { useState, useEffect, useMemo } from 'react';

// MUI Component Imports
import {
  Card, CardContent, CardHeader, Divider, Box, Button, Stack, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, CardActions,
  Typography, Tabs, Tab, Autocomplete, Switch, FormControlLabel
} from '@mui/material';

// Custom Component Imports
import ToolPageLayout from '../../components/tools/ToolPageLayout';
import OutputPanel from '../../components/tools/OutputPanel';
import FileUploadZone from '../../components/tools/FileUploadZone';

// MUI Icon Imports
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';

// Service Imports
import toolService from '../../services/toolService';
import libraryService from '../../services/libraryService';
import historyService from '../../services/historyService';

// Custom Hook Imports
import { useSnackbar } from '../../hooks/useSnackbar';

// --- Sub-Component: The specialized SettingsPanel for the Slide Generator ---
const SettingsPanel = ({
    formState, setFormState, onSubmit, isLoading, libraryTree, libraryLoading
}) => {
    const [activeTab, setActiveTab] = useState(0);

    // Generic handler for form inputs, including text, select, and switches/checkboxes
    const handleInputChange = (event) => {
        const { name, value, checked, type } = event.target;
        setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    // Handler for the cascading dropdowns in the Library tab
    const handleLibraryChange = (field, value) => {
        const newState = { ...formState, [field]: value };
        
        // When a parent dropdown changes, reset all children to prevent invalid state
        if (field === 'selected_level') {
            newState.selected_year = null;
            newState.selected_subject = null;
            newState.selected_book = null;
            newState.selected_chapters = [];
            // Auto-update the main Grade Level dropdown for convenience
            if (value) { newState.grade_level = value.name; }
        }
        if (field === 'selected_year') {
            newState.selected_subject = null;
            newState.selected_book = null;
            newState.selected_chapters = [];
        }
        if (field === 'selected_subject') {
            newState.selected_book = null;
            newState.selected_chapters = [];
        }
        if (field === 'selected_book') {
            newState.selected_chapters = [];
        }
        setFormState(newState);
    };

    // Memoized selectors to optimize performance of the cascading dropdowns
    const yearOptions = useMemo(() => formState.selected_level?.children || [], [formState.selected_level]);
    const subjectOptions = useMemo(() => formState.selected_year?.children || [], [formState.selected_year]);
    const bookOptions = useMemo(() => formState.selected_subject?.children || [], [formState.selected_subject]);
    const chapterOptions = useMemo(() => formState.selected_book?.children || [], [formState.selected_book]);

    // Handler for switching between source material tabs
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        // Clear state from other tabs to ensure only one source type is used
        setFormState(prev => ({ 
            ...prev, 
            source_text: '', 
            source_file: null, 
            selected_level: null, 
            selected_year: null, 
            selected_subject: null, 
            selected_book: null, 
            selected_chapters: [], 
        }));
    };
    
    // Callback for the FileUploadZone component to update state
    const setFile = (file) => setFormState(prev => ({...prev, source_file: file}));

    // Form is valid if at least one source material has been provided
    const isFormValid = (formState.source_text.trim().length > 10 || formState.source_file !== null || formState.selected_chapters.length > 0);

    return (
        <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <form onSubmit={onSubmit}>
                <CardHeader avatar={<TuneOutlined color="primary" />} title="Settings" titleTypographyProps={{ variant: 'h3' }} />
                <Divider />
                <CardContent>
                    <Stack spacing={3}>
                        {/* --- SLIDE-SPECIFIC SETTINGS --- */}
                        <FormControl fullWidth disabled={isLoading || activeTab === 2}>
                            <InputLabel id="grade-level-label">Grade Level</InputLabel>
                            <Select name="grade_level" value={formState.grade_level} label="Grade Level" onChange={handleInputChange}>
                                <MenuItem value="Primary School">Primary School</MenuItem>
                                <MenuItem value="Secondary School">Secondary School</MenuItem>
                                <MenuItem value="Years 10 & 11 (GCSE)">Years 10 & 11 (GCSE)</MenuItem>
                                <MenuItem value="Sixth Form - College">Sixth Form - College</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            name="num_slides"
                            type="number"
                            label="Number of Slides (3-20)"
                            value={formState.num_slides}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            InputProps={{ inputProps: { min: 3, max: 20 } }}
                        />

                        <FormControl fullWidth disabled={isLoading}>
                            <InputLabel id="slide-style-label">Slide Style</InputLabel>
                            <Select name="slide_style" value={formState.slide_style} label="Slide Style" onChange={handleInputChange}>
                                <MenuItem value="informative">Informative</MenuItem>
                                <MenuItem value="engaging">Engaging</MenuItem>
                                <MenuItem value="professional">Professional</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={<Switch checked={formState.include_speaker_notes} onChange={handleInputChange} name="include_speaker_notes" />}
                            label="Include Speaker Notes"
                            disabled={isLoading}
                        />
                        {/* --- END SLIDE-SPECIFIC SETTINGS --- */}

                        <Box>
                            <Typography variant="overline" color="text.secondary">Source Material</Typography>
                            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tab label="Type Text" disabled={isLoading} />
                                <Tab label="Upload File" disabled={isLoading} />
                                <Tab label="From Library" disabled={isLoading || libraryLoading} />
                            </Tabs>
                            {/* --- CORRECTED AND COMPLETED TAB CONTENT --- */}
                            <Box sx={{ pt: 2, minHeight: 290 }}>
                                {activeTab === 0 && <TextField name="source_text" label="Topic or Source Text" multiline rows={10} fullWidth value={formState.source_text} onChange={handleInputChange} disabled={isLoading} />}
                                {activeTab === 1 && <FileUploadZone file={formState.source_file} setFile={setFile} isLoading={isLoading} />}
                                {activeTab === 2 && (
                                    libraryLoading ? <Box sx={{display: 'flex', justifyContent: 'center', pt: 4}}><CircularProgress /></Box> :
                                    <Stack spacing={2}>
                                        <Autocomplete options={libraryTree} getOptionLabel={(option) => option.name} value={formState.selected_level} onChange={(e, val) => handleLibraryChange('selected_level', val)} renderInput={(params) => <TextField {...params} label="Select Level" />} />
                                        <Autocomplete options={yearOptions} getOptionLabel={(option) => option.name} value={formState.selected_year} onChange={(e, val) => handleLibraryChange('selected_year', val)} disabled={!formState.selected_level} renderInput={(params) => <TextField {...params} label="Select Year" />} />
                                        <Autocomplete options={subjectOptions} getOptionLabel={(option) => option.name} value={formState.selected_subject} onChange={(e, val) => handleLibraryChange('selected_subject', val)} disabled={!formState.selected_year} renderInput={(params) => <TextField {...params} label="Select Subject" />} />
                                        <Autocomplete options={bookOptions} getOptionLabel={(option) => option.name} value={formState.selected_book} onChange={(e, val) => handleLibraryChange('selected_book', val)} disabled={!formState.selected_subject} renderInput={(params) => <TextField {...params} label="Select Book" />} />
                                        <Autocomplete multiple options={chapterOptions} getOptionLabel={(option) => option.name} value={formState.selected_chapters} onChange={(e, val) => handleLibraryChange('selected_chapters', val)} disabled={!formState.selected_book} renderInput={(params) => <TextField {...params} label="Select Chapters (up to 5)" />} limitTags={3} />
                                    </Stack>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 2, justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" disabled={!isFormValid || isLoading} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}>
                        {isLoading ? 'Generating...' : 'Generate Slides'}
                    </Button>
                </CardActions>
            </form>
        </Card>
    );
};

// --- Main Page Component ---
const SlideGenerator = () => {
  const { showSnackbar } = useSnackbar();

  // State for the fetched library data
  const [libraryTree, setLibraryTree] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  
  // Effect to fetch the library tree data once on component mount
  useEffect(() => {
    libraryService.getTree()
      .then(data => setLibraryTree(data))
      .catch(err => {
        console.error("Failed to load library tree", err);
        showSnackbar("Could not load curriculum library.", "error");
      })
      .finally(() => setLibraryLoading(false));
  }, [showSnackbar]);

  // The complete form state, specific to the Slide Generator
  const [formState, setFormState] = useState({
    grade_level: 'Years 10 & 11 (GCSE)',
    source_text: '',
    source_file: null,
    num_slides: 7,
    slide_style: 'informative',
    include_speaker_notes: true,
    selected_level: null,
    selected_year: null,
    selected_subject: null,
    selected_book: null,
    selected_chapters: [],
  });

  // State for the API call and output
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);

  // State for the save action
  const [isSaving, setIsSaving] = useState(false);
  const [lastUsedSettings, setLastUsedSettings] = useState(null);
  const [savedGenerationId, setSavedGenerationId] = useState(null);

  // Handler for the main "Generate" button submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setSavedGenerationId(null); // Reset save status on new generation

    // Snapshot the settings being used for this specific generation
    const settingsForApi = {
      grade_level: formState.grade_level,
      source_text: formState.source_text,
      selected_chapter_paths: formState.selected_chapters.map(c => c.path),
      num_slides: Number(formState.num_slides),
      slide_style: formState.slide_style,
      include_speaker_notes: formState.include_speaker_notes,
    };
    // Remember these settings so the "Save" button knows what to save
    setLastUsedSettings(settingsForApi);

    try {
      const requestPayload = {
        tool_id: 'slide-generator', // CRITICAL: Identifies which tool backend to use
        settings: settingsForApi,
      };
      const response = await toolService.generateContent(requestPayload, formState.source_file);
      setGeneratedContent(response.content);
    } catch (err) {
      console.error("Failed to generate slides:", err);
      const errorMessage = err.message || "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      showSnackbar(errorMessage, "error"); // Use snackbar for user feedback
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for the "Save" button in the output panel
  const handleSave = async () => {
    // Guard against trying to save nothing or saving multiple times
    if (!generatedContent || !lastUsedSettings) {
        showSnackbar("There is no content to save.", 'warning');
        return;
    }
    if (savedGenerationId) {
        showSnackbar("This generation has already been saved.", 'info');
        return;
    }

    setIsSaving(true);
    try {
        const payload = {
            tool_id: 'slide-generator', // CRITICAL: Associates the save with the correct tool
            settings: lastUsedSettings,
            generated_content: generatedContent,
        };
        const savedRecord = await historyService.saveGeneration(payload);
        setSavedGenerationId(savedRecord.id); // Store ID to prevent re-saving
        showSnackbar('Generation saved successfully!', 'success');
    } catch (err) {
        showSnackbar(err.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  // Handler for the OutputPanel's "Clear" button
  const handleClear = () => {
    setGeneratedContent(null);
    setError(null);
    setLastUsedSettings(null);
    setSavedGenerationId(null); // Also reset the saved status
  };

  return (
    <ToolPageLayout
      title="Slide Generator"
      icon={<SlideshowOutlined />}
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
          isSaved={!!savedGenerationId} // Pass derived saved status
        />
      }
    />
  );
};

export default SlideGenerator;