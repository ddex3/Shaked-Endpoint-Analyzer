function isValidUrl(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum length of 2048 characters' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
  }

  if (!parsed.hostname || parsed.hostname.length === 0) {
    return { valid: false, error: 'URL must include a valid hostname' };
  }

  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./,
  ];

  if (parsed.hostname === 'localhost' || privateRanges.some((r) => r.test(parsed.hostname))) {
    return { valid: false, error: 'URLs pointing to private or localhost addresses are not allowed' };
  }

  return { valid: true, url: trimmed };
}

module.exports = { isValidUrl };
