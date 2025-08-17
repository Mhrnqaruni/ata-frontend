// /src/pages/Home.jsx

// --- Core React Imports ---
import React, { useState, useEffect } from 'react';

// --- MUI Component Imports ---
import { Box, Stack, Grid, CircularProgress, Alert, AlertTitle } from '@mui/material';

// --- Custom Component Imports ---
// This "smart" page imports the "dumb" presentational components it will orchestrate.
import GreetingBanner from '../components/home/GreetingBanner';
import InfoCard from '../components/home/InfoCard';
import NavCard from '../components/home/NavCard';

// --- Service & Icon Imports ---
import dashboardService from '../services/dashboardService';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';

/**
 * The Home Page component. Acts as a smart container to orchestrate the layout,
 * fetch summary data from the backend, and render the primary navigation and info cards.
 */
const Home = () => {
  // --- State Management ---
  // State to hold the summary data fetched from the API.
  const [summaryData, setSummaryData] = useState(null);
  // State to track the loading status of the API call.
  const [isLoading, setIsLoading] = useState(true);
  // State to hold any potential error message from the API call.
  const [error, setError] = useState(null);

  // --- Data Fetching Side Effect ---
  // The useEffect hook with an empty dependency array [] runs only once
  // when the component first mounts.
  useEffect(() => {
    // Define an async function to fetch the data.
    const fetchSummaryData = async () => {
      try {
        // We don't need to set isLoading(true) here as it's the default.
        const data = await dashboardService.getSummary();
        setSummaryData(data); // On success, store the data in state.
        setError(null); // Clear any previous errors.
      } catch (err) {
        // If the service layer throws an error, we catch it here.
        console.error("Failed to fetch dashboard summary:", err);
        setError(err.message); // Store the user-friendly error message.
      } finally {
        // This block runs regardless of success or failure.
        setIsLoading(false); // Stop showing the loading indicator.
      }
    };

    fetchSummaryData();
  }, []); // The empty array means this effect does not re-run on component updates.

  // --- Data Structures for Child Components ---
  // We transform the raw API data into the specific shape our components expect.
  const infoCardData = [
    {
      id: 'classes',
      title: 'Active Classes',
      value: summaryData?.classCount ?? 0, // Use optional chaining and nullish coalescing for safety.
      icon: <SchoolOutlined />,
    },
    {
      id: 'students',
      title: 'Total Students',
      value: summaryData?.studentCount ?? 0,
      icon: <PeopleAltOutlined />,
    },
  ];

  // This data is static for V1 but defined here for easy maintenance.
  const navCardData = [
    {
      id: 'classes', title: 'Your Classes', description: 'Manage rosters and track student performance.',
      icon: <SchoolOutlined />, path: '/classes', iconBgColor: '#E9E4F8', iconColor: '#5403FF',
    },
    {
      id: 'tools', title: 'AI Tools', description: 'Generate questions, slides, and other materials.',
      icon: <AutoAwesomeOutlined />, path: '/tools', iconBgColor: '#E0F2F1', iconColor: '#00796B',
    },
    {
        id: 'assessments', title: 'Assessments', description: 'Grade exams and provide automated feedback.',
        icon: <GradingOutlined />, path: '/assessments', iconBgColor: '#E3F2FD', iconColor: '#1E88E5',
    },
    {
        id: 'chatbot', title: 'Chatbot', description: 'Ask questions and get insights from your data.',
        icon: <SmartToyOutlined />, path: '/chat', iconBgColor: '#FFF8E1', iconColor: '#FFA000',
    }
  ];

  // --- Conditional Rendering for Loading and Error States ---
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        {error}
      </Alert>
    );
  }

  // --- Main Render Output on Success ---
  return (
    <Box>
      <GreetingBanner />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{ mb: 5 }}
      >
        {infoCardData.map((card) => (
          <InfoCard
            key={card.id}
            icon={card.icon}
            value={card.value}
            title={card.title}
          />
        ))}
      </Stack>

      <Grid container spacing={3}>
        {navCardData.map((card) => (
          <NavCard key={card.id} item={card} />
        ))}
      </Grid>
    </Box>
  );
};

export default Home;