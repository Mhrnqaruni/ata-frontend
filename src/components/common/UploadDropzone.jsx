// /src/components/common/UploadDropzone.jsx
// One upload surface for the whole app: a glass drop area (drag, click or keyboard) and, under it, the chosen files
// as rows that can be removed. Files are only staged here; the page decides when they are sent.

import React from "react";
import { useDropzone } from "react-dropzone";
import { IconButton, Tooltip } from "@mui/material";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import PictureAsPdfOutlined from "@mui/icons-material/PictureAsPdfOutlined";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";

export const formatBytes = (bytes = 0) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const kindOf = (file) => {
  const name = (file?.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return { icon: <PictureAsPdfOutlined />, label: "PDF", tone: "pdf" };
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(name)) return { icon: <ImageOutlined />, label: "Image", tone: "image" };
  if (/\.(csv|xlsx?|xls)$/.test(name)) return { icon: <TableChartOutlined />, label: "Sheet", tone: "sheet" };
  return { icon: <DescriptionOutlined />, label: "Document", tone: "doc" };
};

export function UploadFileRow({ file, onRemove, disabled, meta, order, onMove, first, last }) {
  const kind = kindOf(file);
  return (
    <li className="mst-file" data-tone={kind.tone}>
      <span aria-hidden="true" className="mst-file-icon">{kind.icon}</span>
      <span className="mst-file-text">
        <span className="mst-file-name" title={file.name}>{order ? `${order}. ` : ""}{file.name}</span>
        <span className="mst-file-meta">
          {kind.label} · {formatBytes(file.size)}
          {meta ? ` · ${meta}` : ""}
        </span>
      </span>
      <span className="mst-file-state">
        <CheckCircleRounded aria-hidden="true" />
        Ready
      </span>
      {onMove && <span className="mst-file-order">
        <IconButton size="small" disabled={disabled || first} aria-label={`Move ${file.name} up`} onClick={() => onMove(-1)}>↑</IconButton>
        <IconButton size="small" disabled={disabled || last} aria-label={`Move ${file.name} down`} onClick={() => onMove(1)}>↓</IconButton>
      </span>}
      {onRemove ? (
        <Tooltip title="Remove">
          <span>
            <IconButton aria-label={`Remove ${file.name}`} className="mst-file-remove" disabled={disabled} onClick={() => onRemove(file)} size="small">
              <CloseRounded />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </li>
  );
}

/**
 * @param {object} props
 * @param {string} props.title - what to drop ("Drop the question paper")
 * @param {string} props.hint - accepted types and limits, in plain words
 * @param {object} props.accept - react-dropzone accept map
 * @param {boolean} [props.multiple]
 * @param {(files: File[]) => void} props.onDrop
 * @param {File[]} [props.files] - staged files to list under the drop area
 * @param {(file: File) => void} [props.onRemove]
 * @param {boolean} [props.disabled]
 * @param {"large"|"compact"} [props.size]
 * @param {string} [props.label] - a short heading above the area (e.g. "Question paper")
 */
export default function UploadDropzone({ title, hint, accept, multiple = false, onDrop, files = [], onRemove, disabled = false, size = "large", label, fileMeta, filesHeader, onMove, onDropRejected }) {
  const { getRootProps, getInputProps, isDragActive, isDragReject, open } = useDropzone({
    accept,
    disabled,
    multiple,
    noClick: true,
    onDropRejected,
    onDrop: (accepted) => accepted.length && onDrop(accepted),
  });
  const hasFiles = files.length > 0;
  return (
    <div className="mst-upload" data-size={size}>
      {label ? <div className="mst-upload-label">{label}</div> : null}
      <div
        {...getRootProps({
          className: "mst-drop",
          "data-active": isDragActive ? "true" : undefined,
          "data-reject": isDragReject ? "true" : undefined,
          "data-filled": hasFiles ? "true" : undefined,
          "data-disabled": disabled ? "true" : undefined,
          onClick: disabled ? undefined : open,
          onKeyDown: (event) => {
            if (!disabled && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              open();
            }
          },
          role: "button",
          tabIndex: disabled ? -1 : 0,
          "aria-label": `${title}. ${hint}`,
        })}
      >
        <input {...getInputProps()} />
        <span aria-hidden="true" className="mst-drop-orb">
          <CloudUploadOutlined />
        </span>
        <span className="mst-drop-title">{isDragActive ? (isDragReject ? "That file type isn't accepted" : "Release to add") : title}</span>
        <span className="mst-drop-hint">{hint}</span>
        {/* looks like a button; the whole area is the one control (no nested buttons) */}
        {size === "large" ? <span aria-hidden="true" className="mst-drop-browse">Browse files</span> : null}
      </div>
      {hasFiles ? (
        <div className="mst-files">
          {filesHeader ? <div className="mst-files-head">{filesHeader}</div> : null}
          <ul aria-label="Selected files" className="mst-files-list">
            {files.map((file, index) => (
              <UploadFileRow disabled={disabled} file={file} key={`${file.name}-${file.size}-${file.lastModified}`} meta={fileMeta?.(file)} onRemove={onRemove} order={onMove ? index + 1 : undefined}
                onMove={onMove ? direction => onMove(index, direction) : undefined} first={index === 0} last={index === files.length - 1} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
