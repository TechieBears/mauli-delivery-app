// iOS App Transport Security blocks plain http:// image loads, but the backend
// serves uploaded documents over http://. The same files are also available
// over https://, so upgrade remote http URLs to https for <Image> rendering.
// Local URIs (file://, content://, ph://, data:) are returned untouched.
export const toHttpsUrl = uri => {
  if (typeof uri !== 'string') return uri;
  if (uri.startsWith('http://')) return 'https://' + uri.slice('http://'.length);
  return uri;
};

// True when the URL points at a PDF (used to decide between an <Image> and a
// PDF viewer). Ignores any query string so signed/S3 URLs still match.
export const isPdfUrl = uri => {
  if (typeof uri !== 'string') return false;
  return /\.pdf(\?|#|$)/i.test(uri);
};
