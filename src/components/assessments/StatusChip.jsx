// /src/components/assessments/StatusChip.jsx

import React from 'react';
// --- [THE FIX] ---
// We have added 'Typography' to the import list from '@mui/material'.
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import RotateRightOutlined from '@mui/icons-material/RotateRightOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';

const statusConfig = {
    // Job Statuses
    Processing: { label: "Processing", color: "secondary", icon: <RotateRightOutlined /> },
    Summarizing: { label: "Summarizing", color: "secondary", icon: <RotateRightOutlined /> },
    "Pending Review": { label: "Pending Review", color: "warning", icon: <RateReviewOutlined /> },
    Completed: { label: "Completed", color: "success", icon: <CheckCircleOutlineOutlined /> },
    Failed: { label: "Failed", color: "error", icon: <ErrorOutlineOutlined /> },
    Queued: { label: "Queued", color: "info", icon: <RotateRightOutlined /> },

    // Student Statuses (from ResultsTable)
    AI_GRADED: { label: "AI Graded", color: "info" },
    PENDING_REVIEW: { label: "Pending Review", color: "warning" },
    TEACHER_GRADED: { label: "Teacher Graded", color: "success" },
    ABSENT: { label: "Absent", color: "default" },
};

const StatusChip = ({ status, progress, remainingSeconds = 0 }) => {
    const config = statusConfig[status] || { label: status, color: "default", icon: null };
    const progressPercent = progress ? (progress.total > 0 ? (progress.processed / progress.total) * 100 : 0) : 0;

    // A small enhancement to handle the new "Summarizing" status gracefully.
    const isProcessing = status === 'Processing' || status === 'Summarizing';

    // Format remaining time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '32px' }}>
            <Chip label={config.label} color={config.color} icon={config.icon} />
            {isProcessing && progress && (
                <Box sx={{ width: '100%', mt: 1 }}>
                    <LinearProgress variant="determinate" value={progressPercent} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography variant="caption" color="text.secondary">
                            {status === 'Summarizing' ? 'Finalizing results...' : `${progress.processed} / ${progress.total} graded`}
                        </Typography>
                        {remainingSeconds > 0 && status === 'Processing' && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                ~{formatTime(remainingSeconds)}
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default StatusChip;