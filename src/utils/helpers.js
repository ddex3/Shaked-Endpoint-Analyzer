function safeGet(obj, path, fallback = null) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : fallback), obj);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function daysBetween(dateA, dateB) {
  const msPerDay = 86400000;
  return Math.floor((dateA - dateB) / msPerDay);
}

function detectBodyType(contentType, body) {
  if (!contentType) {
    if (!body || body.length === 0) return 'empty';
    return 'unknown';
  }

  const ct = contentType.toLowerCase();
  if (ct.includes('application/json')) return 'json';
  if (ct.includes('text/html')) return 'html';
  if (ct.includes('text/xml') || ct.includes('application/xml')) return 'xml';
  if (ct.includes('text/plain')) return 'text';
  if (ct.includes('text/css')) return 'css';
  if (ct.includes('application/javascript') || ct.includes('text/javascript')) return 'javascript';
  if (ct.includes('image/')) return 'image';
  if (ct.includes('video/')) return 'video';
  if (ct.includes('audio/')) return 'audio';
  if (ct.includes('application/pdf')) return 'pdf';
  if (ct.includes('application/octet-stream')) return 'binary';
  return 'other';
}

function extractCharset(contentType) {
  if (!contentType) return null;
  const match = contentType.match(/charset=([^\s;]+)/i);
  return match ? match[1].replace(/['"]/g, '') : null;
}

function buildErrorResponse(url, errorType, message) {
  return {
    success: false,
    url,
    error: {
      type: errorType,
      message,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  safeGet,
  formatBytes,
  clamp,
  daysBetween,
  detectBodyType,
  extractCharset,
  buildErrorResponse,
};
