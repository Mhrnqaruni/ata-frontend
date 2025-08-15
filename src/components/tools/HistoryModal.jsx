import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, List, Accordion,
  AccordionSummary, AccordionDetails, TextField, MenuItem, Select, InputLabel,
  FormControl, CircularProgress, Stack, Divider, Button, Alert, Tooltip
} from '@mui/material';

// Import Icons
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import QuestionAnswerOutlined from '@mui/icons-material/QuestionAnswerOutlined';
import SlideshowOutlined from '@mui/icons-material/SlideshowOutlined';
import RuleOutlined from '@mui/icons-material/RuleOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';

// Import Services and Hooks
import historyService from '../../services/historyService';
import { useDebounce } from '../../hooks/useDebounce';
import { useSnackbar } from '../../hooks/useSnackbar';
import ConfirmationModal from '../common/ConfirmationModal';

// Helper to get an icon based on the tool ID from the API
const getToolIcon = (toolId) => {
  switch (toolId) {
    case 'question-generator': return <QuestionAnswerOutlined fontSize="small" />;
    case 'slide-generator': return <SlideshowOutlined fontSize="small" />;
    case 'rubric-generator': return <RuleOutlined fontSize="small" />;
    default: return <AutoAwesomeOutlined fontSize="small" />;
  }
};

const HistoryModal = ({ open, onClose }) => {
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTool, setFilterTool] = useState('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // State for Delete Confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Reset error on new fetch
    try {
      const params = {
        search: debouncedSearchTerm || undefined,
        tool_id: filterTool === 'all' ? undefined : filterTool,
      };
      const data = await historyService.getHistory(params);
      setItems(data.results);
    } catch (err) {
      setError('Failed to load generation history.');
      showSnackbar('Failed to load generation history.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, filterTool, showSnackbar]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    showSnackbar('Copied to clipboard!', 'success');
  };

  // Handlers for Delete Flow
  const openDeleteConfirm = (item) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setItemToDelete(null);
    setIsConfirmOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await historyService.deleteGeneration(itemToDelete.id);
      // Optimistic UI update: remove the item from local state
      setItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
      showSnackbar('History item deleted successfully.', 'success');
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete item.', 'error');
    } finally {
      closeDeleteConfirm();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
          Generation History
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseOutlined />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          {/* Filter and Search UI */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.disabled' }} /> }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Tool</InputLabel>
              <Select value={filterTool} label="Filter by Tool" onChange={(e) => setFilterTool(e.target.value)}>
                <MenuItem value="all">All Tools</MenuItem>
                <MenuItem value="question-generator">Question Generator</MenuItem>
                <MenuItem value="slide-generator">Slide Generator</MenuItem>
                <MenuItem value="rubric-generator">Rubric Generator</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Content Display */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : items.length === 0 ? (
            <Typography sx={{ textAlign: 'center', mt: 4 }}>No history found for the selected filters.</Typography>
          ) : (
            <Box sx={{ maxHeight: '60vh', overflowY: 'auto', pr: 1 }}>
              <List>
                {items.map((item) => (
                  <Accordion key={item.id} sx={{ mb: 1, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        {getToolIcon(item.tool_id)}
                        <Typography variant="body1" sx={{ fontWeight: 500 }} noWrap>
                          {item.title || 'Untitled Generation'}
                        </Typography>
                      </Stack>
                      <Typography color="text.secondary" sx={{ flexShrink: 0, ml: 2, display: { xs: 'none', sm: 'block' } }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyOutlined />}
                          onClick={() => handleCopy(item.generated_content)}
                        >
                          Copy
                        </Button>
                        <Tooltip title="Delete this item">
                          <IconButton color="error" onClick={() => openDeleteConfirm(item)}>
                            <DeleteOutlineOutlined />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Divider />
                      <Box sx={{ mt: 2, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                        {item.generated_content}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={isConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete History Item"
        description={`Are you sure you want to permanently delete the item titled "${itemToDelete?.title || 'this item'}"? This action cannot be undone.`}
      />
    </>
  );
};

export default HistoryModal;