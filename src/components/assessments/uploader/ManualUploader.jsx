import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Divider,
  Paper,
  Chip,
  Skeleton,
  TextField,
} from '@mui/material';
import { initialsOf } from '../../classes/StudentTable';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import classService from '../../../services/classService';

const ManualUploader = ({ classId, onFilesStaged, onAddOutsider, stagedFiles = {}, outsiders = [], disabled = false }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const currentUploadTarget = useRef(null); // { type: 'student' | 'outsider', id: string }

  useEffect(() => {
    if (!classId) {
      setError('No class selected. Please go back to the setup step.');
      setIsLoading(false);
      return;
    }
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const fetchedClass = await classService.getClassById(classId);
        setStudents(fetchedClass.students || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load student roster.');
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [classId]);

  const handleUploadClick = (type, id) => {
    currentUploadTarget.current = { type, id };
    fileInputRef.current.click();
  };

  const [outsiderName, setOutsiderName] = useState('');
  const addOutsider = (event) => {
    event.preventDefault();
    const name = outsiderName.trim();
    if (name && onAddOutsider) {
      onAddOutsider(name);
      setOutsiderName('');
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0 || !currentUploadTarget.current) return;

    const { type, id } = currentUploadTarget.current;

    if (onFilesStaged) {
      onFilesStaged({
        entityType: type,
        entityId: id,
        files: files,
      });
    }

    // Reset file input to allow uploading the same file again
    event.target.value = null;
    currentUploadTarget.current = null;
  };

  const renderRow = (type, entity, secondary) => {
    const files = stagedFiles[entity.id] || [];
    return (
      <li className="mst-manual-row" key={entity.id}>
        <span aria-hidden="true" className="mst-avatar">{initialsOf(entity.name)}</span>
        <span className="mst-manual-text">
          <span className="mst-manual-name">{entity.name}</span>
          <span className="mst-manual-meta">{secondary}</span>
        </span>
        <span className="mst-manual-files">
          {files.length > 0 ? <Chip color="success" label={`${files.length} ${files.length === 1 ? 'page' : 'pages'} added`} size="small" /> : null}
        </span>
        <Button disabled={disabled} onClick={() => handleUploadClick(type, entity.id)} size="small" startIcon={<UploadFileIcon />} variant="outlined">
          {files.length > 0 ? 'Add more' : 'Add pages'}
        </Button>
      </li>
    );
  };

  if (isLoading) return <Box sx={{ display: 'grid', gap: 1 }}>{[0, 1, 2].map((i) => <Skeleton height={56} key={i} variant="rounded" />)}</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
        disabled={disabled}
      />
      <div className="mst-files">
        <div className="mst-files-head"><span>Class roster · {students.length} {students.length === 1 ? 'student' : 'students'}</span></div>
        <ul className="mst-files-list" aria-label="Students in this class">
          {students.map((student) => renderRow('student', student, `ID ${student.studentId}`))}
          {outsiders.map((outsider) => renderRow('outsider', outsider, 'Not in this class'))}
        </ul>
      </div>
      <form className="mst-inline-add" onSubmit={addOutsider}>
        <TextField
          disabled={disabled}
          label="Add a student who isn't in this class"
          onChange={(e) => setOutsiderName(e.target.value)}
          placeholder="Their full name"
          size="small"
          value={outsiderName}
        />
        <Button disabled={disabled || !outsiderName.trim()} startIcon={<AddIcon />} type="submit" variant="outlined">Add</Button>
      </form>
    </Box>
  );
};

export default ManualUploader;
