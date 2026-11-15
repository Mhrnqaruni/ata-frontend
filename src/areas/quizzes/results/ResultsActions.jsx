// The results header's actions (design.md §3.8): one Download button with its menu (each pupil's report as PDFs or
// Word files, or the spreadsheet) and "Ask AI about these results" in the AI style, which opens the assistant.
// Area: quizzes

import { Suspense, lazy, useId, useState } from 'react';
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import { hasReport } from './figures';
import { RESULTS } from './words';

// The assistant loads on first use: it's large, and most visits never open it.
const FloatingChatWindow = lazy(() => import('../../../components/chatbot/FloatingChatWindow'));

// A 16 px spinner in the text's colour, its arc always visible (design.md §3.8).
const spinner = <CircularProgress aria-hidden="true" color="inherit" disableShrink size={16} thickness={5} />;

// reports: how many reports the run's ZIP holds, for "Preparing 28 PDFs…"; 0 turns the report items off.
function DownloadMenu({ downloads, reports }) {
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  const busy = downloads.busy;
  // A ZIP takes a while, so the menu stays open and its item says it's preparing; the menu closes once it's saved.
  const zip = async (format) => {
    await downloads.reports(format);
    setAnchor(null);
  };
  const items = [
    {
      key: 'pdf',
      icon: <PictureAsPdfOutlined />,
      primary: RESULTS.eachReportPdf,
      secondary: RESULTS.eachReportPdfHint,
      action: () => zip('pdf'),
      off: !reports,
    },
    {
      key: 'docx',
      icon: <DescriptionOutlined />,
      primary: RESULTS.eachReportWord,
      secondary: RESULTS.eachReportWordHint,
      action: () => zip('docx'),
      off: !reports,
    },
    {
      key: 'spreadsheet',
      icon: <TableChartOutlined />,
      primary: RESULTS.spreadsheet,
      secondary: RESULTS.spreadsheetHint,
      action: () => {
        setAnchor(null);
        downloads.spreadsheet();
      },
    },
  ];
  return (
    <>
      <Button
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        aria-haspopup="menu"
        data-mst="results-download"
        disabled={Boolean(busy) && !anchor}
        endIcon={<ExpandMoreRounded />}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={busy ? spinner : <DownloadRounded />}
        variant="outlined"
      >
        {busy ? RESULTS.preparingShort : RESULTS.download}
      </Button>
      <Menu anchorEl={anchor} id={id} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
        {items.map((item) => {
          const making = busy === item.key;
          return (
            <MenuItem
              aria-busy={making ? 'true' : undefined}
              data-mst={`results-download-${item.key}`}
              disabled={item.off || (Boolean(busy) && !making)}
              key={item.key}
              onClick={making ? undefined : item.action}
            >
              <ListItemIcon>{making ? spinner : item.icon}</ListItemIcon>
              <ListItemText
                primary={item.primary}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                secondary={making ? RESULTS.preparing(reports, item.key) : item.secondary}
                secondaryTypographyProps={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

// title: the quiz's; run and summary: the run shown; downloads: the page's useDownloads.
export default function ResultsActions({ title, run, summary, downloads }) {
  const [chat, setChat] = useState(false);
  const [opened, setOpened] = useState(false); // kept once opened, so closing doesn't lose the conversation
  // The ZIP holds the whole run, whatever the class filter shows: its class pupils who finished, and the walk-ins.
  const finishers =
    (run.kind === 'homework' ? run.handed_in : run.took_part) || summary.pupils.filter(hasReport).length;
  const reports = finishers + summary.not_on_class_list.filter(hasReport).length;
  return (
    <>
      <DownloadMenu downloads={downloads} reports={reports} />
      <Button
        className="quiz-results-ai"
        data-mst="ask-ai"
        onClick={() => {
          setOpened(true);
          setChat(true);
        }}
        startIcon={<AutoAwesomeRounded />}
        variant="outlined"
      >
        {RESULTS.askAi}
      </Button>
      {opened ? (
        <Suspense fallback={null}>
          <FloatingChatWindow
            key={run.id}
            entityId={run.id}
            entityName={title}
            entityType={run.kind === 'live' ? 'quiz_session' : 'quiz_sp_session'}
            onClose={() => setChat(false)}
            open={chat}
            pageContext={run.kind === 'live' ? 'quiz_session' : 'quiz_sp_session'}
          />
        </Suspense>
      ) : null}
    </>
  );
}
