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
    Processing: { label: "Processing", color: "secondary", icon: <RotateRightOutlined /> },
    Summarizing: { label: "Summarizing", color: "secondary", icon: <RotateRightOutlined /> },
    "Pending Review": { label: "Pending Review", color: "warning", icon: <RateReviewOutlined /> },
    Completed: { label: "Completed", color: "success", icon: <CheckCircleOutlineOutlined /> },
    Failed: { label: "Failed", color: "error", icon: <ErrorOutlineOutlined /> },
    Queued: { label: "Queued", color: "info", icon: <RotateRightOutlined /> },
};

const StatusChip = ({ status, progress }) => {
    const config = statusConfig[status] || { label: status, color: "default", icon: null };
    const progressPercent = progress ? (progress.total > 0 ? (progress.processed / progress.total) * 100 : 0) : 0;

    // A small enhancement to handle the new "Summarizing" status gracefully.
    const isProcessing = status === 'Processing' || status === 'Summarizing';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minHeight: '32px' }}>
            <Chip label={config.label} color={config.color} icon={config.icon} />
            {isProcessing && progress && (
                <Box sx={{ width: '100%', mt: 1 }}>
                    <LinearProgress variant="determinate" value={progressPercent} />
                    <Typography variant="caption" color="text.secondary">
                        {status === 'Summarizing' ? 'Finalizing results...' : `${progress.processed} / ${progress.total} graded`}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default StatusChip;