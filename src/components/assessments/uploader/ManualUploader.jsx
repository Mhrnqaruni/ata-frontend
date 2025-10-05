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
} from '@mui/material';
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

  const handleOutsiderClick = () => {
    const outsiderName = prompt("Please enter the name for this outsider student:", "Unknown Student");
    if (outsiderName && onAddOutsider) {
      onAddOutsider(outsiderName);
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

  const renderUploadAction = (type, entityId) => {
    const numFiles = stagedFiles[entityId]?.length || 0;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {numFiles > 0 && <Chip label={`${numFiles} file(s)`} color="primary" size="small" />}
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => handleUploadClick(type, entityId)}
          disabled={disabled}
        >
          {numFiles > 0 ? 'Add More' : 'Upload'}
        </Button>
      </Box>
    );
  };

  if (isLoading) return <CircularProgress />;
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
      <Typography variant="h6" gutterBottom>Student Roster</Typography>
      <Paper>
        <List>
          {students.map((student, index) => (
            <React.Fragment key={student.id}>
              <ListItem secondaryAction={renderUploadAction('student', student.id)}>
                <ListItemText primary={student.name} secondary={`ID: ${student.studentId}`} />
              </ListItem>
              {index < students.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Divider sx={{ my: 2 }}><Typography variant="overline">Or</Typography></Divider>

      <Button
        variant="contained"
        color="secondary"
        startIcon={<AddIcon />}
        onClick={handleOutsiderClick}
        disabled={disabled}
      >
        Add Outsider Submission
      </Button>

      {outsiders.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>Outsider Submissions</Typography>
          <Paper>
            <List>
              {outsiders.map((outsider, index) => (
                <React.Fragment key={outsider.id}>
                  <ListItem secondaryAction={renderUploadAction('outsider', outsider.id)}>
                    <ListItemText primary={outsider.name} secondary={`Temp ID: ${outsider.id}`} />
                  </ListItem>
                  {index < outsiders.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default ManualUploader;