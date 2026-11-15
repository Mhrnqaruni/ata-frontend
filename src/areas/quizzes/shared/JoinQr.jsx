// The join QR code (SOT-8): the short link /join/<code>, dark on a white tile with its quiet margin in both themes,
// so a phone camera reads it from the teacher's screen or off a projector.
// Area: quizzes

import { QRCodeSVG } from 'qrcode.react';
import { light } from '../../../theme/tokens';
import { joinLink } from './joining';

// The light theme's solid and ink in both themes: a QR code needs dark modules on light paper to scan.
export const QR_COLOURS = { bgColor: light.solid, fgColor: light.ink };

export default function JoinQr({ code, size, title, style }) {
  return (
    <QRCodeSVG
      value={joinLink(code)}
      size={size}
      level="M"
      marginSize={2}
      title={title}
      {...QR_COLOURS}
      style={{ display: 'block', borderRadius: Math.max(4, size / 24), ...style }}
    />
  );
}
