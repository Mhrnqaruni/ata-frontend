// /src/components/tools/ToolPageLayout.jsx
// The shared layout for the AI tools: a settings card (400px) beside the result card, which stays in view
// while the settings scroll.
import React from 'react';
import PageHeader from '../common/PageHeader';

const ToolPageLayout = ({ title, icon, settingsPanel, outputPanel, subtitle }) => (
  <div>
    <PageHeader
      breadcrumbs={[{ label: 'AI tools', to: '/tools' }, { label: title }]}
      leading={icon ? <span aria-hidden="true" className="mst-tile" data-ai="true" data-size="lg">{icon}</span> : null}
      subtitle={subtitle}
      title={title}
    />
    <div className="mst-tool-grid">
      <div className="mst-tool-settings-col" data-enter="">{settingsPanel}</div>
      <div className="mst-tool-output-col" data-enter="">{outputPanel}</div>
    </div>
  </div>
);

export default ToolPageLayout;
