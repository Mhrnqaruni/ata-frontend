import React, { useState } from 'react';
import { Alert, Button, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import OverallGauge from './OverallGauge';
import PerformanceChart from './PerformanceChart';
import usePerformance from './usePerformance';

export default function PerformancePanel({ assessments, loadError }) {
  const [view, setView] = useState('average');
  const state = usePerformance(assessments);
  const navigate = useNavigate();
  const failed = loadError || state.error;
  return <section className="mst-g1 mst-rim home-performance" aria-labelledby="performance-title">
    <div className="home-performance-head">
      <div><h2 id="performance-title" className="mst-card-title">Student performance</h2><p className="home-muted">All students · All assessments</p></div>
      <div className="home-view-switch" role="group" aria-label="Chart view">
        <button type="button" aria-pressed={view === 'average'} onClick={() => setView('average')}><SpeedOutlined /><span>Average</span></button>
        <button type="button" aria-pressed={view === 'trend'} onClick={() => setView('trend')}><ShowChartOutlined /><span>Trend</span></button>
      </div>
    </div>
    {state.refreshError && <Alert severity="warning" action={<Button onClick={() => state.retry()}>Retry</Button>}>Could not refresh grades. Showing the last loaded values.</Alert>}
    <div className="home-performance-body">
      {failed ? <div className="home-performance-message" role="status">Unable to load grades. Refresh to try again.</div>
        : state.loading ? <Skeleton variant="rounded" height={166} aria-label="Loading grades" />
        : !state.latest ? <div className="home-performance-message">Your students’ grades will appear after the first graded assessment.</div>
        : view === 'average' ? <OverallGauge value={state.latest.average} />
        : state.items.length ? <>
          <div className="home-trend-summary"><span className="home-figure">{state.latest.average.toFixed(1)}<span>%</span></span><span className="home-muted">Current grades by assessment date</span></div>
          <PerformanceChart items={state.items.slice(-6)} onInspect={item => navigate(`/assessments/${item.id}/results`)} />
        </> : <div className="home-performance-message">Assessment dates are unavailable for this trend.</div>}
    </div>
    {!failed && !state.loading && state.latest && <p className="home-overall-note" title="Each student's mean graded percentage is weighted equally. Absent and pending results are excluded; zero grades are included. The trend uses current grades, not historical snapshots.">{state.latest.graded} students with graded results</p>}
  </section>;
}
