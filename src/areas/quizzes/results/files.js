// Saving a downloaded file on the teacher's computer: its name from the server's Content-Disposition (or a fallback),
// then a link click, as the app's other downloads do.
// Area: quizzes

// The file name the server gave (filename="…" or filename*=UTF-8''…), or the fallback.
export function fileNameOf(headers, fallback) {
  const given = headers?.['content-disposition'] || '';
  const encoded = given.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // a badly encoded name falls through to the plain one
    }
  }
  const plain = given.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallback;
}

// Saves the data as a file with this name.
export function saveBlob(data, fileName) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
