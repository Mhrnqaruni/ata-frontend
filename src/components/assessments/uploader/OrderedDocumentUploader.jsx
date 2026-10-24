import React, { useState } from 'react';
import { Alert } from '@mui/material';
import UploadDropzone from '../../common/UploadDropzone';

const TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
};

// Order here is the order sent to the reader. Adding files never replaces earlier pages.
export default function OrderedDocumentUploader({ files, onChange, title, disabled, fileMeta }) {
  const [error, setError] = useState('');
  const add = incoming => {
    const next = [...files];
    incoming.forEach(file => {
      if (!next.some(old => old.name === file.name && old.size === file.size && old.lastModified === file.lastModified)) next.push(file);
    });
    if (next.length > 20) return setError('Use at most 20 files in this group.');
    if (next.some(file => !file.size)) return setError('Empty files cannot be read. Choose a non-empty file.');
    if (next.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) return setError('Use files totalling 20 MB or less.');
    setError('');
    onChange(next);
  };
  const move = (index, direction) => {
    const file = files[index];
    onChange(current => {
      const position = current.indexOf(file);
      const target = position + direction;
      if (position < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  };
  return <div className="mst-ordered-upload">
    <UploadDropzone accept={TYPES} multiple disabled={disabled} files={files} fileMeta={fileMeta}
      label={title} title={files.length ? 'Add more pages or files' : `Add ${title.toLowerCase()} files`}
      hint="PDF, Word, PNG or JPG · up to 20 files · 20 MB combined with the other group"
      filesHeader="Reading order — use the arrows to reorder files" size="compact"
      onDrop={add} onMove={move}
      onDropRejected={() => setError('Some files were not added. Use PDF, DOCX, PNG or JPG.')}
      onRemove={file => { setError(''); onChange(current => current.filter(item => item !== file)); }} />
    {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
  </div>;
}
