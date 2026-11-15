// The questions step's header actions (design.md §3.4, §10): Preview, Import with AI, Add question and ⋯ More, once the
// quiz has a question (Phase 1.47 §3.11); below 1100 px, Preview and Add question become icon buttons.
// Area: quizzes

import { useState } from 'react';
import { Button, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import GradeOutlined from '@mui/icons-material/GradeOutlined';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import PhoneIphoneOutlined from '@mui/icons-material/PhoneIphoneOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import { QUESTIONS } from './words';

// A labelled button from 1100 px, an icon button with its name as a tooltip below.
function Action({ wide, label, icon, onClick, disabled, tip }) {
  if (wide)
    return (
      <Tooltip title={tip ?? ''}>
        <span>
          <Button variant="outlined" startIcon={icon} onClick={onClick} disabled={disabled}>
            {label}
          </Button>
        </span>
      </Tooltip>
    );
  return (
    <Tooltip title={tip ?? label}>
      <span>
        <IconButton aria-label={label} onClick={onClick} disabled={disabled} className="mst-qe-icon-action">
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function QuestionActions({ wide, live, full, onPreview, onImport, onAdd, more }) {
  const [menu, setMenu] = useState(null);
  const pick = (action) => () => {
    setMenu(null);
    action();
  };
  const items = [
    { label: QUESTIONS.exportCsv, icon: <FileDownloadOutlined fontSize="small" />, action: more.exportCsv },
    live ? { label: QUESTIONS.everyTime, icon: <TimerOutlined fontSize="small" />, action: more.everyTime } : null,
    { label: QUESTIONS.everyScore, icon: <GradeOutlined fontSize="small" />, action: more.everyScore },
    { label: QUESTIONS.openAll, icon: <UnfoldMoreRounded fontSize="small" />, action: more.openAll },
    { label: QUESTIONS.closeAll, icon: <UnfoldLessRounded fontSize="small" />, action: more.closeAll },
  ].filter(Boolean);
  return (
    <>
      <Action wide={wide} label={QUESTIONS.preview} icon={<PhoneIphoneOutlined />} onClick={onPreview} />
      <Button
        className="mst-qe-ai-outline"
        variant="outlined"
        startIcon={<AutoAwesomeRounded />}
        onClick={onImport}
        disabled={full}
      >
        {QUESTIONS.importWithAI}
      </Button>
      <Action
        wide={wide}
        label={QUESTIONS.addQuestion}
        icon={<AddRounded />}
        onClick={onAdd}
        disabled={full}
        tip={full ? QUESTIONS.full : undefined}
      />
      <Tooltip title={QUESTIONS.more}>
        <IconButton aria-label={QUESTIONS.more} aria-haspopup="menu" onClick={(event) => setMenu(event.currentTarget)}>
          <MoreHorizRounded />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {items.map((item) => (
          <MenuItem key={item.label} onClick={pick(item.action)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
