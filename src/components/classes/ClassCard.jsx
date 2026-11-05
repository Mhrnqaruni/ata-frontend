// One class as a glass card on the Classes page: coloured initial, name and student count, linking to the class.
// Area: academics

import React from 'react';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import GlassLink from '../common/GlassLink';
import { classColor, initialOf } from '../common/classColor';

const ClassCard = ({ classData }) => {
  const count = Number(classData.studentCount) || 0;
  return (
    <GlassLink className="mst-class-card" to={`/classes/${classData.id}`}>
      <span aria-hidden="true" className="mst-class-mark" style={{ '--mark': classColor(classData.name) }}>
        {initialOf(classData.name)}
      </span>
      <span className="mst-class-name">{classData.name}</span>
      {classData.description ? <span className="mst-class-desc">{classData.description}</span> : null}
      <span className="mst-class-foot">
        <span className="mst-class-count">
          <PeopleAltOutlined aria-hidden="true" />
          {count} {count === 1 ? 'student' : 'students'}
        </span>
        <ArrowForwardRounded aria-hidden="true" className="mst-launch-arrow" />
      </span>
    </GlassLink>
  );
};

export default ClassCard;
