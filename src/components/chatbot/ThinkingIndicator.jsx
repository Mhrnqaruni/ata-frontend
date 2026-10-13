// /ata-frontend/src/components/chatbot/ThinkingIndicator.jsx
// While the assistant works: its star, three soft dots and a short line that changes every 3 seconds.
import React, { useEffect, useState } from 'react';
import AutoAwesome from '@mui/icons-material/AutoAwesome';

const PHRASES = [
  'Reading your data…',
  'Looking for trends…',
  'Finding the key points…',
  'Checking performance patterns…',
  'Writing the answer…'
];

const ThinkingIndicator = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % PHRASES.length), 3000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="mst-msg" data-role="bot" role="status">
      <span aria-hidden="true" className="mst-msg-avatar"><AutoAwesome /></span>
      <div className="mst-thinking">
        <span aria-hidden="true" className="mst-thinking-dots"><span /><span /><span /></span>
        <span>{PHRASES[index]}</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
