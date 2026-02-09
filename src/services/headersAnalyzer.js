const { SECURITY_HEADERS } = require('../utils/constants');

function analyzeHeaders(headers) {
  if (!headers) {
    return {
      server: null,
      contentType: null,
      contentLength: null,
      cacheControl: null,
      security: {
        detected: {},
        missing: [...SECURITY_HEADERS],
      },
    };
  }

  const detected = {};
  const missing = [];

  for (const header of SECURITY_HEADERS) {
    if (headers[header]) {
      detected[header] = headers[header];
    } else {
      missing.push(header);
    }
  }

  return {
    server: headers['server'] || null,
    contentType: headers['content-type'] || null,
    contentLength: headers['content-length'] ? parseInt(headers['content-length'], 10) : null,
    cacheControl: headers['cache-control'] || null,
    poweredBy: headers['x-powered-by'] || null,
    security: {
      detected,
      missing,
    },
  };
}

module.exports = { analyzeHeaders };
