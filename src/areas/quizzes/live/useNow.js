// The device's time, refreshed every 250 ms while a clock runs, so each whole second turns over on time for the
// teacher's and the pupils' countdowns. It stops when nothing is counting.
// Area: quizzes

import { useEffect, useState } from 'react';

export function useNow(running, everyMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [running, everyMs]);
  return now;
}
