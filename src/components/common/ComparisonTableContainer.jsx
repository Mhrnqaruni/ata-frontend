import React from "react";
import { Box, TableContainer, Typography } from "@mui/material";

/** Wide analytic comparisons retain every column in one contained scroll region. */
const ComparisonTableContainer = React.forwardRef(
  function ComparisonTableContainer({ children, sx, ...props }, ref) {
    return (
      <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: "block", sm: "none" }, mb: 1 }}
        >
          Compare columns; swipe sideways if needed.
        </Typography>
        <TableContainer
          ref={ref}
          tabIndex={0}
          role="region"
          aria-label="Comparison table; scroll horizontally to read every column"
          {...props}
          sx={[
            {
              overflowX: "auto",
              maxWidth: "100%",
              "& .MuiTable-root": { minWidth: 640 },
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          {children}
        </TableContainer>
      </Box>
    );
  },
);
export default ComparisonTableContainer;
