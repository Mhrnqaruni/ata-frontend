// /src/pages/NotFound.jsx
// A missing page: a small glass card with a way home and a way back.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import ExploreOffOutlined from '@mui/icons-material/ExploreOffOutlined';
import EmptyState from '../components/common/EmptyState';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mst-notfound">
      <EmptyState
        action={
          <div className="mst-notfound-actions">
            <Button onClick={() => navigate('/')} variant="contained">Go to Home</Button>
            <Button onClick={() => navigate(-1)} variant="outlined">Back</Button>
          </div>
        }
        icon={<ExploreOffOutlined />}
        title="Page not found"
      >
        This page doesn't exist or has moved. Choose a page from the menu to carry on.
      </EmptyState>
    </div>
  );
}
