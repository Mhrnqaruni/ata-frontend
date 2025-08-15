// /src/components/assessments/AssessmentCard.jsx (UPDATED WITH DELETE ACTION)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardActionArea, Typography, Grid, Menu, MenuItem, IconButton, Tooltip, ListItemIcon, Divider
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileCopyOutlined from '@mui/icons-material/FileCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline'; // Import the delete icon

import StatusChip from './StatusChip';
import CompletedStats from './CompletedStats';

const AssessmentCard = ({ job, onDelete }) => { // Accept the new onDelete prop
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const isMenuOpen = Boolean(anchorEl);

    const isClickable = ['Pending Review', 'Completed'].includes(job.status);

    const handleCardClick = () => {
        if (job.status === 'Pending Review') {
            navigate(`/assessments/${job.id}/review`);
        } else if (job.status === 'Completed') {
            navigate(`/assessments/${job.id}/results`);
        }
    };

    const handleMenuClick = (event) => {
        // Stop propagation is no longer needed as the button is outside the action area.
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleClone = () => {
        navigate(`/assessments/new?cloneFromJobId=${job.id}`);
        handleMenuClose();
    };

    // --- [THE FIX IS HERE: NEW DELETE HANDLER] ---
    const handleDelete = () => {
        onDelete(); // Call the prop passed down from the parent page
        handleMenuClose();
    };
    // --- [END OF FIX] ---
    
    const formattedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A';

    return (
        <Card sx={{ position: 'relative' }}>
            {/* The Options button is now available on more statuses */}
            {(job.status === 'Completed' || job.status === 'Failed') && (
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                    <Tooltip title="Assessment Options">
                        <IconButton onClick={handleMenuClick} aria-label="assessment options">
                            <MoreVertIcon />
                        </IconButton>
                    </Tooltip>
                    <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
                        <MenuItem onClick={handleClone}>
                            <ListItemIcon><FileCopyOutlined fontSize="small" /></ListItemIcon>
                            Clone Assessment
                        </MenuItem>
                        <Divider />
                        {/* --- [THE FIX IS HERE: NEW MENU ITEM] --- */}
                        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                            <ListItemIcon><DeleteOutline fontSize="small" color="error" /></ListItemIcon>
                            Delete Assessment
                        </MenuItem>
                        {/* --- [END OF FIX] --- */}
                    </Menu>
                </Box>
            )}
            
            <CardActionArea onClick={handleCardClick} disabled={!isClickable} sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <Typography variant="h3" gutterBottom>{job.assessmentName}</Typography>
                        <Typography color="text.secondary">For: {job.className}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Created on: {formattedDate}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <StatusChip status={job.status} progress={job.progress} />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {job.status === 'Completed' && (
                            <CompletedStats results={job.results} />
                        )}
                    </Grid>
                </Grid>
            </CardActionArea>
        </Card>
    );
};

export default AssessmentCard;