const { formatBytes, detectBodyType, extractCharset } = require('../utils/helpers');

function analyzeContent(headers, body) {
  if (!body) {
    return {
      responseSize: 0,
      responseSizeFormatted: '0 B',
      encoding: null,
      charset: null,
      detectedBodyType: 'empty',
      isBodyEmpty: true,
    };
  }

  const contentType = headers ? headers['content-type'] : null;
  const contentEncoding = headers ? headers['content-encoding'] : null;
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const size = bodyBuffer.length;
  const charset = extractCharset(contentType);
  const bodyType = detectBodyType(contentType, bodyBuffer);

  return {
    responseSize: size,
    responseSizeFormatted: formatBytes(size),
    encoding: contentEncoding || 'identity',
    charset: charset || 'utf-8',
    detectedBodyType: bodyType,
    isBodyEmpty: size === 0,
    contentType: contentType || null,
  };
}

module.exports = { analyzeContent };
