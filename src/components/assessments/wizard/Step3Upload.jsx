import React from 'react';
import { Button } from '@mui/material';
import UploadDropzone, { formatBytes } from '../../common/UploadDropzone';
import usePageCounts from '../../../hooks/usePageCounts';
import { useSnackbar } from '../../../hooks/useSnackbar';

const SHEET_TYPES = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpeg', '.jpg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
};

// Step 3 (batch): one large drop area for every answer sheet, then the list of what will be sent.
const Step3Upload = ({ state, dispatch, disabled }) => {
    const files = state.answerSheetFiles;
    const pagesOf = usePageCounts(files);
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const { showSnackbar } = useSnackbar();
    const addFiles = (accepted) => {
        const duplicates = accepted.filter((nf) => files.some((ef) => ef.name === nf.name && ef.size === nf.size)).length;
        dispatch({ type: 'ADD_ANSWER_SHEETS', payload: accepted });
        if (duplicates) showSnackbar(`${duplicates} ${duplicates === 1 ? 'duplicate' : 'duplicates'} skipped`, 'info');
    };
    return (
        <div className="mst-upload-batch">
            <UploadDropzone
                accept={SHEET_TYPES}
                disabled={disabled}
                fileMeta={pagesOf}
                files={files}
                filesHeader={
                    <>
                        <span>{files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(totalBytes)}</span>
                        <Button
                            disabled={disabled}
                            onClick={() => files.forEach((file) => dispatch({ type: 'REMOVE_ANSWER_SHEET', payload: file.name }))}
                            size="small"
                            variant="text"
                        >
                            Remove all
                        </Button>
                    </>
                }
                hint="PDF or images (JPG, PNG, GIF, WEBP) · as many files as you like"
                multiple
                onDrop={addFiles}
                onRemove={(file) => dispatch({ type: 'REMOVE_ANSWER_SHEET', payload: file.name })}
                title="Drop answer sheets here"
            />
        </div>
    );
};

export default Step3Upload;
