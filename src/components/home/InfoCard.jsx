// A stat tile: tinted icon, large number, label. Used on class details, quiz results and assessment results.
// Area: analytics

import React from 'react';

export default function InfoCard({ icon, value, title, tone }) {
  return (
    <div className="mst-g1 mst-rim mst-stat" data-enter="" data-tone={tone}>
      <span aria-hidden="true" className="mst-stat-icon">
        {icon}
      </span>
      <span className="mst-stat-text">
        <span className="mst-stat-value">{value}</span>
        <span className="mst-stat-label">{title}</span>
      </span>
    </div>
  );
}
