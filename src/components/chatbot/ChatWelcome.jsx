// /ata-frontend/src/components/chatbot/ChatWelcome.jsx
// The empty conversation: the assistant's star, one line on what to ask, and a suggestion to start with.
import React from 'react';
import { Button } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesome from '@mui/icons-material/AutoAwesome';

const ChatWelcome = ({ onSend, entityName }) => {
  const handleClick = () => {
    const prompt = entityName
      ? `Give me a comprehensive overview of ${entityName}.`
      : 'Give me a comprehensive overview of my teaching data.';
    onSend(prompt);
  };
  return (
    <div className="mst-chat-welcome">
      <span aria-hidden="true" className="mst-chat-star"><AutoAwesome /></span>
      <h2 className="mst-chat-welcome-title">
        {entityName ? `Ask about ${entityName}` : 'Ask about your classes, students and quizzes'}
      </h2>
      <p className="mst-chat-welcome-text">
        {entityName ? 'Or start with a full overview.' : 'Answers come from your own data in MySmartTeach.'}
      </p>
      <Button className="mst-ai" onClick={handleClick} startIcon={<InsightsIcon />} variant="contained">
        Give me a comprehensive overview
      </Button>
    </div>
  );
};

export default ChatWelcome;
