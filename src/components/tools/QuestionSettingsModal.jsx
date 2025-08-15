// /src/components/tools/QuestionSettingsModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Checkbox, Divider,
  FormControl, InputLabel, Select, MenuItem, TextField, Grid, Paper, Box
} from '@mui/material'; // CORRECTED: Grid, Paper, and Box are now imported.
import CloseOutlined from '@mui/icons-material/CloseOutlined';

// The canonical list of all available question types.
const ALL_QUESTION_TYPES = [
    { id: 'mcq', label: 'Multiple-choice questions', defaultCount: 5, enabled: true },
    { id: 'true-false', label: 'True/False questions', defaultCount: 5, enabled: true },
    { id: 'matching', label: 'Matching questions', defaultCount: 5, enabled: true },
    { id: 'short-answer', label: 'Short-answer questions', defaultCount: 5, enabled: true },
    { id: 'fill-in-the-blank', label: 'Fill-in-the-blank (Cloze) questions', defaultCount: 5, enabled: true },
    { id: 'essay', label: 'Essay/Long-answer questions', defaultCount: 1, enabled: true },
    { id: 'oral', label: 'Oral questions/Viva voce', defaultCount: 3, enabled: false },
    { id: 'numerical', label: 'Computational/Numerical problems', defaultCount: 5, enabled: false },
    { id: 'diagram-labeling', label: 'Diagram-labeling/Construction tasks', defaultCount: 1, enabled: false },
    { id: 'image-graph', label: 'Image/Graph-based questions', defaultCount: 3, enabled: false },
    { id: 'lab-practical', label: 'Laboratory practicals/Skill demonstrations', defaultCount: 1, enabled: false },
    { id: 'project', label: 'Project/Coursework assessments', defaultCount: 1, enabled: false },
    { id: 'presentation', label: 'Presentations/Performances', defaultCount: 1, enabled: false },
];

const QuestionSettingsModal = ({ open, onClose, onSave, initialConfigs }) => {
  const [selectedConfigs, setSelectedConfigs] = useState(initialConfigs);

  useEffect(() => {
    if (open) {
      setSelectedConfigs(initialConfigs);
    }
  }, [open, initialConfigs]);

  const handleToggleType = (type) => {
    const currentIndex = selectedConfigs.findIndex(c => c.type === type.id);
    const newSelectedConfigs = [...selectedConfigs];

    if (currentIndex === -1) {
      if (selectedConfigs.length < 5) {
        newSelectedConfigs.push({
          type: type.id,
          label: type.label,
          count: type.defaultCount,
          difficulty: 'medium',
        });
      }
    } else {
      newSelectedConfigs.splice(currentIndex, 1);
    }
    setSelectedConfigs(newSelectedConfigs);
  };
  
  const handleConfigChange = (typeId, field, value) => {
      setSelectedConfigs(prev => prev.map(config => 
          config.type === typeId ? { ...config, [field]: value } : config
      ));
  };
  
  const handleSave = () => {
    onSave(selectedConfigs);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Configure Question Settings
        <IconButton aria-label="close" onClick={onClose}><CloseOutlined /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h4" gutterBottom>Question Types</Typography>
            <Typography color="text.secondary" sx={{mb: 2}}>Select 1 to 5 types.</Typography>
            <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: '60vh', overflowY: 'auto' }}>
              {ALL_QUESTION_TYPES.map((type) => {
                const isSelected = selectedConfigs.some(c => c.type === type.id);
                return (
                  <ListItemButton 
                    key={type.id} 
                    role={undefined} 
                    onClick={() => handleToggleType(type)} 
                    dense 
                    disabled={!type.enabled || (!isSelected && selectedConfigs.length >= 5)}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                        disabled={!type.enabled || (!isSelected && selectedConfigs.length >= 5)}
                      />
                    </ListItemIcon>
                    <ListItemText primary={type.label} secondary={!type.enabled ? 'Coming soon' : ''} />
                  </ListItemButton>
                );
              })}
            </List>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Typography variant="h4" gutterBottom>Your Selections</Typography>
            <Typography color="text.secondary" sx={{mb: 2}}>
                Adjust the count and difficulty for each selected question type.
            </Typography>
            <Stack spacing={3} sx={{maxHeight: '60vh', overflowY: 'auto', p: 0.5}}>
                {selectedConfigs.length > 0 ? (
                    selectedConfigs.map(config => (
                        <Paper key={config.type} variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h5" gutterBottom>{config.label}</Typography>
                            <Stack direction="row" spacing={2} sx={{mt: 2}}>
                                <TextField
                                    label="Number of Questions"
                                    type="number"
                                    name="count"
                                    value={config.count}
                                    // IMPROVEMENT: Robustly handle empty input before parseInt
                                    onChange={(e) => handleConfigChange(config.type, 'count', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    InputProps={{ inputProps: { min: 1, max: 20 } }}
                                    sx={{width: '50%'}}
                                />
                                <FormControl fullWidth sx={{width: '50%'}}>
                                    <InputLabel>Difficulty</InputLabel>
                                    <Select
                                        name="difficulty"
                                        value={config.difficulty}
                                        label="Difficulty"
                                        onChange={(e) => handleConfigChange(config.type, 'difficulty', e.target.value)}
                                    >
                                        <MenuItem value="very easy">Very Easy</MenuItem>
                                        <MenuItem value="easy">Easy</MenuItem>
                                        <MenuItem value="medium">Medium</MenuItem>
                                        <MenuItem value="hard">Hard</MenuItem>
                                        <MenuItem value="very hard">Very Hard</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Paper>
                    ))
                ) : (
                    <Box sx={{textAlign: 'center', p: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1}}>
                        <Typography color="text.secondary">Select a question type from the left to begin.</Typography>
                    </Box>
                )}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={selectedConfigs.length === 0}
        >
            Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionSettingsModal;