// Share (design.md §3.9; SOT-8): a labelled button whose menu copies the invite, the link or the QR image, downloads
// the QR code as a PNG, or opens the device's share sheet. Each copy says "Copied ✓" in place for 2 s.
// Area: quizzes

import { useRef, useState } from 'react';
import { Box, Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import IosShareRounded from '@mui/icons-material/IosShareRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import { QRCodeCanvas } from 'qrcode.react';
import { QR_COLOURS } from './JoinQr';
import { cleanCode, inviteText, joinLink, qrFileName } from './joining';
import { copyText, srOnly, useCopy } from './useCopy';
import { WORDS } from '../words';

// Copy QR image needs the async clipboard with images; More… needs a share sheet. Each shows only where it works.
const canCopyImage = () => typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);
const canShare = () => typeof navigator.share === 'function';

// code: the run's join code; title: the quiz's title, for the invite; due: homework's due date, which the invite adds.
// size and variant are the Share button's, as on the page's other header buttons.
export default function ShareJoin({ code, title, due, size = 'medium', variant = 'outlined' }) {
  const [anchor, setAnchor] = useState(null);
  const [done, copy] = useCopy();
  const said = done ? (done.ok ? WORDS.copied : WORDS.notCopied) : '';
  const canvas = useRef(null);
  const shown = cleanCode(code);
  const close = () => setAnchor(null);
  // The QR code as a PNG, from the hidden 512 px canvas below.
  const png = () =>
    new Promise((resolve, reject) =>
      canvas.current.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No QR image'))), 'image/png')
    );
  const download = async () => {
    close();
    const url = URL.createObjectURL(await png());
    const link = Object.assign(document.createElement('a'), { href: url, download: qrFileName(shown) });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const share = () => {
    close();
    // Cancelling the share sheet rejects; that's the teacher's choice, not an error.
    navigator.share({ title, text: inviteText({ title, code: shown, due }), url: joinLink(shown) }).catch(() => {});
  };
  const items = [
    {
      key: 'invite',
      icon: <ContentCopyRounded />,
      words: WORDS.copyInvite,
      run: () => copy('invite', () => copyText(inviteText({ title, code: shown, due }))),
    },
    {
      key: 'link',
      icon: <LinkRounded />,
      words: WORDS.copyLink,
      run: () => copy('link', () => copyText(joinLink(shown))),
    },
    canCopyImage() && {
      key: 'qr',
      icon: <QrCode2Rounded />,
      words: WORDS.copyQr,
      // The image goes in as a promise, inside the click, as Safari needs.
      run: () => copy('qr', () => navigator.clipboard.write([new ClipboardItem({ 'image/png': png() })])),
    },
    { key: 'download', icon: <DownloadRounded />, words: WORDS.downloadQr, run: download },
    canShare() && { key: 'more', icon: <MoreHorizRounded />, words: WORDS.moreShare, run: share },
  ].filter(Boolean);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        startIcon={<IosShareRounded />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        {WORDS.share}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {items.map((item) => (
          <MenuItem key={item.key} onClick={item.run} data-share={item.key}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={done?.key === item.key ? said : item.words} />
          </MenuItem>
        ))}
      </Menu>
      <Box component="span" role="status" sx={srOnly}>
        {said}
      </Box>
      <QRCodeCanvas ref={canvas} value={joinLink(shown)} size={512} marginSize={4} {...QR_COLOURS} hidden />
    </>
  );
}
