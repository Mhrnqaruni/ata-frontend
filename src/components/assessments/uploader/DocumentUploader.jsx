import React from 'react';
import UploadDropzone from '../../common/UploadDropzone';

const DOC_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
};

// One document for the "Define" step (the question paper or its answer key).
const DocumentUploader = ({ onFileSelect, selectedFile, title, disabled, fileMeta }) => (
  <UploadDropzone
    accept={DOC_TYPES}
    disabled={disabled}
    fileMeta={fileMeta}
    files={selectedFile ? [selectedFile] : []}
    hint="PDF, Word, PNG or JPG"
    label={title}
    onDrop={(files) => onFileSelect(files[0])}
    onRemove={() => onFileSelect(null)}
    size="compact"
    title={selectedFile ? 'Drop a different file to replace it' : `Drop the ${title.toLowerCase()} here`}
  />
);

export default DocumentUploader;
