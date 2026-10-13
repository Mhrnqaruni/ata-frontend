import React from "react";
import { Box, Typography, Alert } from "@mui/material";

// Existing public-report route is not implemented by this demo. Do not imply a report loaded.
export default function PublicReportView() {
  return (
    <Box
      component="main"
      sx={{ maxWidth: 680, mx: "auto", p: { xs: 2, sm: 4 }, mt: 6 }}
    >
      <Typography component="h1" variant="h1" sx={{ mb: 3 }}>
        Shared report
      </Typography>
      <Alert severity="info">
        Shared report viewing is not available in this version. Ask your teacher
        for the report file.
      </Alert>
    </Box>
  );
}
