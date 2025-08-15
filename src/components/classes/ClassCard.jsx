// /src/components/classes/ClassCard.jsx

// --- Core React & Router Imports ---
import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Grid, Card, CardActionArea, Typography, Box } from '@mui/material';

// --- Icon Imports ---
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';

/**
 * A presentational card component that displays summary information for a single class
 * and navigates to the class details page on click.
 *
 * @param {object} props
 * @param {object} props.classData - The data object for the class to display.
 */
const ClassCard = ({ classData }) => {
  const navigate = useNavigate();

  // The handler for when the user clicks anywhere on the card's interactive area.
  const handleCardClick = () => {
    navigate(`/classes/${classData.id}`);
  };

  return (
    // This component defines its own responsive grid behavior.
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <Card
        sx={{
          minHeight: 200,
          position: 'relative', // Establishes a positioning context for the background icon.
          overflow: 'hidden',   // Prevents the large icon from overflowing the card's rounded corners.
        }}
      >
        <CardActionArea
          onClick={handleCardClick}
          sx={{
            height: '100%',
            p: 3, // 24px padding.
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between', // Pushes content to the top and bottom.
            alignItems: 'flex-start', // Aligns content to the left.
          }}
        >
          {/* --- Top Content: The Class Name --- */}
          <Box>
            <Typography variant="h3">{classData.name}</Typography>
          </Box>

          {/* --- Bottom Content: The Student Count --- */}
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', zIndex: 1 }}>
            <PeopleAltOutlined sx={{ fontSize: '1rem', mr: 1 }} />
            <Typography variant="body1" component="span">
              {classData.studentCount} Students
            </Typography>
          </Box>
        </CardActionArea>

        {/* --- Decorative Background Icon --- */}
        {/* This icon sits behind the content to add visual flair without clutter. */}
        <SchoolOutlined
          sx={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            fontSize: 96,
            color: 'action.hover', // Uses a very light, theme-aware gray.
            zIndex: 0, // Ensures it is behind the text content.
            transform: 'rotate(-15deg)', // Adds a slight rotation for style.
          }}
        />
      </Card>
    </Grid>
  );
};

export default ClassCard;