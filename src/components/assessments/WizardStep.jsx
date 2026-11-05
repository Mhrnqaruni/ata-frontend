// The heading block of a wizard step: its title, a one-line hint and the step's content.
// Area: assessments

import React from 'react';

// A wizard step's heading: its name and one line on what to do here.
const WizardStep = ({ title, description, children }) => (
  <section className="mst-step-section">
    <h2 className="mst-step-title">{title}</h2>
    {description ? <p className="mst-step-desc">{description}</p> : null}
    <div className="mst-step-body">{children}</div>
  </section>
);

export default WizardStep;
