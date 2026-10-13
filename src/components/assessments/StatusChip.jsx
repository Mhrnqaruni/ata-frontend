// /src/components/assessments/StatusChip.jsx
// Status as a tonal chip. Work in progress shows a pulsing dot, and (with progress) the AI bar underneath.
import React from 'react';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';

const dot = <span aria-hidden="true" className="mst-dot mst-chip-dot" data-pulse="true" />;

const statusConfig = {
    // Job statuses
    Processing: { label: "Processing", color: "primary", icon: dot, busy: true },
    Summarizing: { label: "Summarising", color: "primary", icon: dot, busy: true },
    "Pending Review": { label: "Pending review", color: "warning", icon: <RateReviewOutlined /> },
    Completed: { label: "Completed", color: "success", icon: <CheckCircleOutlineOutlined /> },
    Failed: { label: "Failed", color: "error", icon: <ErrorOutlineOutlined /> },
    Queued: { label: "Queued", color: "default", icon: dot },
    // Student statuses (results table)
    AI_GRADED: { label: "AI graded", color: "primary", icon: <AutoAwesomeRounded className="mst-ai-glyph" /> },
    PENDING_REVIEW: { label: "Pending review", color: "warning", icon: <RateReviewOutlined /> },
    TEACHER_GRADED: { label: "Teacher graded", color: "success", icon: <HowToRegOutlined /> },
    ABSENT: { label: "Absent", color: "default" },
};

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const StatusChip = ({ status, progress, remainingSeconds = 0 }) => {
    const config = statusConfig[status] || { label: status, color: "default", icon: null };
    const progressPercent = progress && progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
    const isProcessing = status === 'Processing' || status === 'Summarizing';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
            <Chip className="mst-status" color={config.color} icon={config.icon || undefined} label={config.label} size="small" />
            {isProcessing && progress && (
                <Box sx={{ width: '100%', minWidth: 160 }}>
                    <LinearProgress aria-label="Grading progress" value={progressPercent} variant="determinate" />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75, gap: 1 }}>
                        <Typography color="text.secondary" variant="caption">
                            {status === 'Summarizing' ? 'Finishing the results…' : `${progress.processed} of ${progress.total} graded`}
                        </Typography>
                        {remainingSeconds > 0 && status === 'Processing' && (
                            <Typography color="text.secondary" variant="caption">about {formatTime(remainingSeconds)} left</Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default StatusChip;
