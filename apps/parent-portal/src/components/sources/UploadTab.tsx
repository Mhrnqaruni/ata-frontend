/**
 * UploadTab Component
 * Educational Note: Handles file uploads via drag-and-drop or file picker.
 * Manages its own drag state while upload logic is handled by parent.
 */

import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { UploadSimple, CircleNotch, Warning } from '@phosphor-icons/react';
import {
  MAX_IMAGE_SIZE,
  getAcceptedFileTypesForRuntime,
  getAllowedExtensionsForRuntime,
  getUploadSupportText,
} from '../../lib/api/sources';

interface UploadTabProps {
  onUpload: (files: FileList | File[]) => Promise<void>;
  uploading: boolean;
  isAtLimit: boolean;
  isParentWorkspace?: boolean;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  onUpload,
  uploading,
  isAtLimit,
  isParentWorkspace = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allowedExtensions = getAllowedExtensionsForRuntime(isParentWorkspace);
  const acceptedFileTypes = getAcceptedFileTypesForRuntime(isParentWorkspace);
  const allowedExtensionSet = new Set(Object.values(allowedExtensions).flat().map((ext) => ext.toLowerCase()));

  /**
   * Validate files before upload
   * Educational Note: Checks image file sizes against 5MB limit
   */
  const validateFiles = (files: FileList | File[]): string | null => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const extension = file.name.includes('.')
        ? `.${file.name.split('.').pop()?.toLowerCase()}`
        : '';

      if (!extension || !allowedExtensionSet.has(extension)) {
        return `File "${file.name}" is not supported in this workspace. ${getUploadSupportText(isParentWorkspace)}.`;
      }

      // Check image file size
      if (allowedExtensions.image.includes(extension) && file.size > MAX_IMAGE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return `Image "${file.name}" is too large (${sizeMB}MB). Maximum 5MB per image.`;
      }
    }

    return null;
  };

  /**
   * Handle file upload with validation
   */
  const handleUpload = (files: FileList | File[]) => {
    setValidationError(null);

    const error = validateFiles(files);
    if (error) {
      setValidationError(error);
      return;
    }

    onUpload(files);
  };

  /**
   * Handle drag events for the drop zone
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  /**
   * Handle file drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept={acceptedFileTypes}
      />

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <>
            <CircleNotch size={40} className="mx-auto mb-4 text-primary animate-spin" />
            <p className="text-sm font-medium mb-1">Uploading...</p>
          </>
        ) : (
          <>
            <UploadSimple size={40} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Upload sources</p>
            <p className="text-xs text-muted-foreground mb-4">
              Drag & drop or choose files to upload
            </p>
            <Button
              variant="soft"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAtLimit}
            >
              Choose Files
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          {getUploadSupportText(isParentWorkspace)}
        </p>
        <p className="text-xs text-muted-foreground">
          Images: max 5MB each
        </p>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive" className="mt-4">
          <Warning size={16} />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </>
  );
};
