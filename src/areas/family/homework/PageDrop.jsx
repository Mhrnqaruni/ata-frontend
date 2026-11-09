// The upload window's one surface (design §5.4): teacher's drop area (its mst-drop classes) with a camera tile, what to
// add, the limits, Take a photo and Choose photos, then the pages added as thumbnails, each with its Remove button.
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, useMediaQuery } from '@mui/material';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import { UploadFileRow } from '../../../components/common/UploadDropzone';
import './homework.css';

/**
 * Teacher's UploadDropzone has one button and no camera, so its look is rebuilt here with its classes. `words` are
 * the use's (uploadWords.js). `onAdd(files)` takes picked or dropped files, and `onRemove(index)` drops one. `thumbs`
 * shows the pages as thumbnails of the real photos (homework); otherwise they're teacher's file rows, with their names.
 */
export default function PageDrop({ words, files, onAdd, onRemove, thumbs = false, disabled = false }) {
  const camera = useRef(null);
  const chooser = useRef(null);
  const [over, setOver] = useState(false);
  // Take a photo only where there's a camera to open (design §10.2: a tester feared the webcam), and the drag line
  // only where a mouse can drag.
  const touch = useMediaQuery('(pointer: coarse)');
  const pick = (event) => {
    onAdd(Array.from(event.target.files || []));
    event.target.value = ''; // so a removed file can be picked again
  };
  return (
    <div className="mst-upload fam-drop">
      <div
        className="mst-drop"
        data-active={over ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!disabled) onAdd(Array.from(event.dataTransfer.files || []));
        }}
      >
        <span className="mst-tile fam-drop-tile" aria-hidden>
          <PhotoCameraOutlined />
        </span>
        <span className="mst-drop-title">{words.drop}</span>
        <span className="mst-drop-hint">
          {words.hint}
          {!touch && <span className="fam-drop-fine">{words.drag}</span>}
        </span>
        <span className="fam-drop-buttons">
          {/* On phones the camera opens straight away, through the input's capture. */}
          {touch && (
            <Button
              variant="outlined"
              startIcon={<PhotoCameraOutlined />}
              disabled={disabled}
              onClick={() => camera.current?.click()}
              data-mst="family-upload-photo"
            >
              Take a photo
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<AddPhotoAlternateOutlined />}
            disabled={disabled}
            onClick={() => chooser.current?.click()}
            data-mst="family-upload-choose"
          >
            {words.choose}
          </Button>
        </span>
        <input ref={camera} hidden type="file" accept="image/jpeg,image/png" capture="environment" onChange={pick} />
        <input ref={chooser} hidden type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={pick} />
      </div>
      {files.length > 0 &&
        (thumbs ? (
          <ul className="fam-thumbs" aria-label="Pages added">
            {files.map((file, index) => (
              <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="fam-thumb">
                <Thumb file={file} />
                <span className="fam-sr">
                  Page {index + 1}: {file.name}
                </span>
                <IconButton
                  className="fam-thumb-remove"
                  aria-label={`Remove page ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                >
                  <CloseRounded />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mst-files">
            <ul aria-label="Selected files" className="mst-files-list">
              {files.map((file, index) => (
                <UploadFileRow
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  file={file}
                  disabled={disabled}
                  onRemove={() => onRemove(index)}
                />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

// A page's 64×84 thumbnail: the real photo, or a PDF's mark.
function Thumb({ file }) {
  const photo = Boolean(file.type?.startsWith('image/'));
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!photo || typeof URL.createObjectURL !== 'function') return undefined;
    const address = URL.createObjectURL(file);
    setUrl(address);
    return () => URL.revokeObjectURL(address);
  }, [file, photo]);
  if (photo) return url ? <img className="fam-thumb-img" src={url} alt="" /> : <span className="fam-thumb-img" />;
  return (
    <span className="fam-thumb-img fam-thumb-doc" aria-hidden>
      <PictureAsPdfOutlined />
      PDF
    </span>
  );
}
