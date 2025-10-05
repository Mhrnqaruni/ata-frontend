// /src/components/assessments/AssessmentCard.jsx (Corrected and Hardened)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardActionArea, Typography, Grid, Menu, MenuItem, IconButton, Tooltip, ListItemIcon
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FileCopyOutlined from '@mui/icons-material/FileCopyOutlined';

import StatusChip from './StatusChip';
import CompletedStats from './CompletedStats';

const AssessmentCard = ({ job }) => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const isMenuOpen = Boolean(anchorEl);

    const isClickable = ['Pending Review', 'Completed'].includes(job.status);

    const handleCardClick = () => {
        // Always land on the Results page first, regardless of status.
        navigate(`/assessments/${job.id}/results`);
    };

    const handleMenuClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleClone = () => {
        navigate(`/assessments/new?cloneFromJobId=${job.id}`);
        handleMenuClose();
    };
    
    // --- FIX: Create a formatted date string safely ---
    const formattedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A';

    return (
        <Card>
            <CardActionArea onClick={handleCardClick} disabled={!isClickable} sx={{ p: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <Typography variant="h3" gutterBottom>{job.assessmentName}</Typography>
                        <Typography color="text.secondary">For: {job.className}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {/* --- FIX: Use the safe, formatted date --- */}
                            Created on: {formattedDate}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <StatusChip status={job.status} progress={job.progress} />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {job.status === 'Completed' ? (
                            <CompletedStats results={job.results} />
                        ) : (
                            <Box sx={{ flexGrow: 1 }} />
                        )}
                        {job.status === 'Completed' && (
                            <Box sx={{ ml: 2, alignSelf: 'flex-start' }}>
                                <Tooltip title="Assessment Options">
                                    <IconButton onClick={handleMenuClick} aria-label="assessment options">
                                        <MoreVertIcon />
                                    </IconButton>
                                </Tooltip>
                                <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
                                    <MenuItem onClick={handleClone}>
                                        <ListItemIcon>
                                            <FileCopyOutlined fontSize="small" />
                                        </ListItemIcon>
                                        Clone Assessment
                                    </MenuItem>
                                </Menu>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </CardActionArea>
        </Card>
    );
};

export default AssessmentCard;