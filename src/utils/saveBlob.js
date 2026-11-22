// Saves a downloaded file (an axios response read as a blob) on the teacher's computer, named as the server says.
// Area: platform

// The file name in a Content-Disposition header, or null when there is none. A name with letters outside ASCII comes
// whole as filename*=UTF-8''… (percent-encoded, RFC 6266), so that is read first. The plain filename="a.pdf" or
// filename=a.pdf is the fallback: the only one for a plain name, and what is left when filename* can't be read.
export function filenameFrom(headers) {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  const whole = disposition?.match(/filename\*\s*=\s*UTF-8'[^']*'([^;\s]+)/i);
  if (whole) {
    try {
      return decodeURIComponent(whole[1]);
    } catch {
      // a badly encoded name falls through to the plain one
    }
  }
  const match = disposition?.match(/filename[^;=\n*]*=((['"]).*?\2|[^;\n]*)/);
  return match?.[1] ? match[1].replace(/['"]/g, '') : null;
}

// response: the axios response (responseType 'blob'); fallback: the file name to use when the server gives none.
export default function saveBlob(response, fallback) {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filenameFrom(response.headers) || fallback);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
