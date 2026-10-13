// /src/components/assessments/CompletedStats.jsx
import React from 'react';

// Two small figures on a finished assessment's card.
const CompletedStats = ({ results }) => {
    if (!results) return null;
    return (
        <div className="mst-minis">
            <div className="mst-mini"><span className="mst-mini-value">{results.classAverage}%</span><span className="mst-mini-label">Class average</span></div>
            <div className="mst-mini"><span className="mst-mini-value">Q{results.hardestQuestion}</span><span className="mst-mini-label">Hardest question</span></div>
        </div>
    );
};

export default CompletedStats;
