// /src/components/tools/SourceInputBlock.jsx

import React, { useState, useMemo } from 'react';

// MUI Component Imports
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Stack,
  TextField,
  Autocomplete,
  CircularProgress,
} from '@mui/material';

// Custom Component Imports
import FileUploadZone from './FileUploadZone';

/**
 * A reusable, controlled component that provides the full 3-tab UI
 * for selecting a source material (Text, File, or Library).
 */
const SourceInputBlock = ({
  label,
  // State values from parent
  textValue,
  fileValue,
  librarySelection,
  // State setters from parent
  onTextChange,
  onFileChange,
  onLibraryChange,
  // Library data from parent
  libraryTree,
  libraryLoading,
  // General disabled state
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // When switching tabs, we must call the parent handlers to clear
    // the state of the other source types.
    onTextChange('');
    onFileChange(null);
    onLibraryChange('selected_level', null); // This will trigger the cascade reset
  };

  // Memoized options for the cascading library dropdowns
  const yearOptions = useMemo(() => librarySelection.selected_level?.children || [], [librarySelection.selected_level]);
  const subjectOptions = useMemo(() => librarySelection.selected_year?.children || [], [librarySelection.selected_year]);
  const bookOptions = useMemo(() => librarySelection.selected_subject?.children || [], [librarySelection.selected_subject]);
  const chapterOptions = useMemo(() => librarySelection.selected_book?.children || [], [librarySelection.selected_book]);

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Type Text" disabled={disabled} />
        <Tab label="Upload File" disabled={disabled} />
        <Tab label="From Library" disabled={disabled || libraryLoading} />
      </Tabs>
      <Box sx={{ pt: 2, minHeight: 290 }}>
        {activeTab === 0 && (
          <TextField
            label="Topic or Source Text"
            multiline
            rows={10}
            fullWidth
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
          />
        )}
        {activeTab === 1 && (
          <FileUploadZone
            file={fileValue}
            setFile={onFileChange}
            isLoading={disabled}
          />
        )}
        {activeTab === 2 && (
          libraryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Autocomplete
                options={libraryTree}
                getOptionLabel={(option) => option.name}
                value={librarySelection.selected_level}
                onChange={(e, val) => onLibraryChange('selected_level', val)}
                renderInput={(params) => <TextField {...params} label="Select Level" />}
                disabled={disabled}
              />
              <Autocomplete
                options={yearOptions}
                getOptionLabel={(option) => option.name}
                value={librarySelection.selected_year}
                onChange={(e, val) => onLibraryChange('selected_year', val)}
                disabled={!librarySelection.selected_level || disabled}
                renderInput={(params) => <TextField {...params} label="Select Year" />}
              />
              <Autocomplete
                options={subjectOptions}
                getOptionLabel={(option) => option.name}
                value={librarySelection.selected_subject}
                onChange={(e, val) => onLibraryChange('selected_subject', val)}
                disabled={!librarySelection.selected_year || disabled}
                renderInput={(params) => <TextField {...params} label="Select Subject" />}
              />
              <Autocomplete
                options={bookOptions}
                getOptionLabel={(option) => option.name}
                value={librarySelection.selected_book}
                onChange={(e, val) => onLibraryChange('selected_book', val)}
                disabled={!librarySelection.selected_subject || disabled}
                renderInput={(params) => <TextField {...params} label="Select Book" />}
              />
              <Autocomplete
                multiple
                options={chapterOptions}
                getOptionLabel={(option) => option.name}
                value={librarySelection.selected_chapters}
                onChange={(e, val) => onLibraryChange('selected_chapters', val)}
                disabled={!librarySelection.selected_book || disabled}
                renderInput={(params) => <TextField {...params} label="Select Chapters (up to 5)" />}
                limitTags={3}
              />
            </Stack>
          )
        )}
      </Box>
    </Box>
  );
};

export default SourceInputBlock;