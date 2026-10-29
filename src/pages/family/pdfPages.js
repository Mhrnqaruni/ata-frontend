/**
 * A tiny PDF writer for printable reports: each page is one JPEG drawn full-page on A4.
 * No library needed; html-to-image (already in the app) turns each page element into a JPEG.
 */
import { toJpeg } from 'html-to-image';

const A4 = [595.28, 841.89]; // points

function dataUrlBytes(url) {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function jpegSize(bytes) {
  // Walk the JPEG markers to the first SOFn frame header to read width and height.
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1]; const len = (bytes[i + 2] << 8) + bytes[i + 3];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { h: (bytes[i + 5] << 8) + bytes[i + 6], w: (bytes[i + 7] << 8) + bytes[i + 8] };
    i += 2 + len;
  }
  throw new Error('Not a JPEG');
}

/** Build a PDF (Blob) from JPEG images, one per A4 page. */
export function jpegsToPdf(images) {
  const enc = new TextEncoder(); const parts = []; const offsets = []; let size = 0;
  const push = chunk => { const b = typeof chunk === 'string' ? enc.encode(chunk) : chunk; parts.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = images.length; const pageIds = images.map((_, k) => 3 + k * 3);
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${n} >>`));
  images.forEach((bytes, k) => {
    const page = 3 + k * 3, img = page + 1, content = page + 2; const { w, h } = jpegSize(bytes);
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Resources << /XObject << /Im${k} ${img} 0 R >> >> /Contents ${content} 0 R >>`));
    obj(img, () => { push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); push(bytes); push('\nendstream'); });
    const draw = `q ${A4[0]} 0 0 ${A4[1]} 0 0 cm /Im${k} Do Q`;
    obj(content, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
  });
  const xref = size; const count = 3 + n * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let k = 1; k < count; k += 1) push(`${String(offsets[k]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** Render page elements (each laid out at A4 proportions) to JPEGs and save them as one PDF file. */
export async function savePagesAsPdf(pageElements, fileName) {
  const images = [];
  for (const el of pageElements) {
    const url = await toJpeg(el, { quality: 0.92, pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false });
    images.push(dataUrlBytes(url));
  }
  const blob = jpegsToPdf(images);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  return blob.size;
}
