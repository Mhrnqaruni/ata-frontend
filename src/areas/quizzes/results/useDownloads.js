// The results page's downloads (design.md §3.8): every pupil's report in one ZIP, as PDFs or Word files (C6), and the
// spreadsheet, each saying in the app's pop-up message how it went. Only one runs at a time.
// Area: quizzes

import { useState } from 'react';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { formatDate } from '../../../utils/dates';
import * as results from './api';
import { csvName, resultsCsv, saveCsv } from './spreadsheet';
import { RESULTS } from './words';

export default function useDownloads(run, { title, summary } = {}) {
  const { showSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(null); // what's being made: 'pdf', 'docx' or 'spreadsheet'

  async function attempt(what, work, done, failed) {
    if (busy) return;
    setBusy(what);
    try {
      await work();
      if (done) showSnackbar(done, 'success');
    } catch {
      showSnackbar(failed, 'error');
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    // Every finished pupil's report, in one ZIP of PDFs ('pdf') or Word files ('docx'). It takes a while: missing AI
    // comments are written first, so the menu shows that it's preparing them.
    reports: (format) =>
      attempt(
        format,
        () => results.downloadAllReports(run.kind, run.id, format),
        RESULTS.reportsDone,
        format === 'pdf' ? RESULTS.pdfsFailed : RESULTS.reportsFailed
      ),
    // The spreadsheet: the server's for a live run; for homework, the pupils shown, made here.
    spreadsheet: () =>
      attempt(
        'spreadsheet',
        async () => {
          if (run.kind === 'live') return results.downloadLiveSpreadsheet(run.id);
          const day = formatDate(run.started_at ?? run.ended_at, { year: 'always' });
          return saveCsv(resultsCsv(summary), csvName(title, day));
        },
        null,
        RESULTS.spreadsheetFailed
      ),
  };
}
