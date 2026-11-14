// The import part's Files view (Phase 1.42, design §3.4): the drop area, then each file with its reading state,
// "Read it again" on a read that failed just now, and Remove, which also takes the file's students out of the list.
// Area: academics

import { Button, IconButton, Tooltip } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import UploadDropzone, { formatBytes, kindOf } from '../common/UploadDropzone';
import { ROSTER_ACCEPT, plural, reasonWords } from './rosterImport';

function FilePill({ entry }) {
  if (entry.state === 'waiting' || entry.state === 'reading') {
    return (
      <span className="mst-file-state" data-state="reading">
        <span aria-hidden="true" className="mst-dot" data-pulse="true" />
        Reading
      </span>
    );
  }
  if (!entry.reason) {
    return (
      <span className="mst-file-state">
        <CheckCircleRounded aria-hidden="true" />
        {plural(entry.rows.length, 'student')}
      </span>
    );
  }
  const words = reasonWords(entry.reason, entry.file.name);
  return (
    <span className="mst-file-state" data-state={words.tone}>
      {words.tone === 'bad' ? <ErrorOutlineRounded aria-hidden="true" /> : null}
      {words.pill}
    </span>
  );
}

function FileRow({ entry, onRemove, onReadAgain }) {
  const kind = kindOf(entry.file);
  const words = entry.reason ? reasonWords(entry.reason, entry.file.name) : null;
  return (
    <li className="mst-file" data-again={words?.again ? 'true' : undefined} data-tone={kind.tone}>
      <span aria-hidden="true" className="mst-file-icon">
        {kind.icon}
      </span>
      <span className="mst-file-text">
        <span className="mst-file-name" title={entry.file.name}>
          {entry.file.name}
        </span>
        <span className="mst-file-meta">{words ? words.line : `${kind.label} · ${formatBytes(entry.file.size)}`}</span>
      </span>
      {words?.again ? (
        <Button className="mst-roster-again" data-mst="roster-read-again" onClick={onReadAgain} size="small">
          Read it again
        </Button>
      ) : null}
      <FilePill entry={entry} />
      <Tooltip title="Remove">
        <IconButton
          aria-label={`Remove ${entry.file.name}`}
          className="mst-file-remove"
          onClick={onRemove}
          size="small"
        >
          <CloseRounded />
        </IconButton>
      </Tooltip>
    </li>
  );
}

/**
 * @param {object} props
 * @param {object} props.roster - useRosterImport's answer
 * @param {React.ReactNode} [props.label]
 * @param {string} props.readingHint
 */
export default function RosterFiles({ roster, label, readingHint }) {
  const { files, busy } = roster;
  const sent = files.filter((entry) => !entry.local).length;
  const done = sent - files.filter((entry) => entry.state === 'waiting' || entry.state === 'reading').length;
  return (
    <>
      <UploadDropzone
        accept={ROSTER_ACCEPT}
        browseLabel="Choose files"
        hint="CSV, Excel, Word, PDF or photos, even handwritten · up to 10 files"
        label={label}
        multiple
        onDrop={(accepted) => roster.addFiles(accepted)}
        onDropRejected={(rejections) =>
          roster.addFiles(
            [],
            rejections.map((item) => item.file)
          )
        }
        size="compact"
        title="Drop class lists here"
      />
      {files.length ? (
        <div className="mst-files mst-roster-files">
          <div className="mst-files-head">
            <span>{busy ? `Reading files… ${done} of ${sent} done` : plural(files.length, 'file')}</span>
            {!busy && roster.hasList ? (
              <Button
                className="mst-inline-btn"
                data-mst="roster-back"
                onClick={() => roster.setView('list')}
                size="small"
              >
                Back to the list
              </Button>
            ) : null}
          </div>
          {busy ? <div aria-hidden="true" className="mst-ai-bar mst-roster-bar" /> : null}
          <ul aria-label="Class list files" className="mst-files-list">
            {files.map((entry) => (
              <FileRow
                entry={entry}
                key={entry.key}
                onReadAgain={() => roster.readAgain(entry.key)}
                onRemove={() => roster.dropFile(entry.key)}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {busy ? (
        <p className="mst-roster-hint" role="status">
          {readingHint}
        </p>
      ) : null}
    </>
  );
}
