import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

const CompletedStats = ({ results }) => {
    if (!results) return null;

    return (
        <Stack direction="row" spacing={4} alignItems="center">
            <Box>
                <Typography variant="h3">{results.classAverage}%</Typography>
                <Typography variant="body2" color="text.secondary">Class Average</Typography>
            </Box>
            <Box>
                <Typography variant="h3">#{results.hardestQuestion || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Hardest Question</Typography>
            </Box>
        </Stack>
    );
};

export default CompletedStats;