// Drop zone for the one source file (PDF, Word, PNG or JPG) an AI tool generates from, built on UploadDropzone.
// Area: ai_tools

import React from 'react';
import UploadDropzone from '../common/UploadDropzone';

const TOOL_TYPES = {
  'image/jpeg': [],
  'image/png': [],
  'application/pdf': [],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const FileUploadZone = ({ file, setFile, isLoading }) => (
  <UploadDropzone
    accept={TOOL_TYPES}
    disabled={isLoading}
    files={file ? [file] : []}
    hint="PDF, Word, PNG or JPG"
    onDrop={(files) => setFile(files[0])}
    onRemove={() => setFile(null)}
    size="compact"
    title={file ? 'Drop a different file' : 'Drop a source file'}
  />
);

export default FileUploadZone;
