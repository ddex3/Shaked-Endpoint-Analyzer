const { analyzeNetwork } = require('./networkAnalyzer');
const { analyzeHeaders } = require('./headersAnalyzer');
const { analyzeTls } = require('./tlsAnalyzer');
const { analyzeContent } = require('./contentAnalyzer');
const { calculateScores } = require('./scoreCalculator');
const { buildErrorResponse } = require('../utils/helpers');

async function analyzeEndpoint(url) {
  const timestamp = new Date().toISOString();

  let networkData;
  try {
    networkData = await analyzeNetwork(url);
  } catch (err) {
    return buildErrorResponse(url, 'NETWORK_ANALYSIS_FAILED', err.message);
  }

  if (!networkData.reachable) {
    const headersData = analyzeHeaders(null);
    const tlsData = {
      isHttps: url.startsWith('https'),
      certificateValid: null,
      certificateIssuer: null,
      certificateExpiration: null,
      daysUntilExpiration: null,
      tlsVersion: null,
    };
    const contentData = {
      responseSize: 0,
      responseSizeFormatted: '0 B',
      encoding: null,
      charset: null,
      detectedBodyType: 'empty',
      isBodyEmpty: true,
    };

    const scores = calculateScores(networkData, headersData, tlsData);

    return {
      success: false,
      url,
      analyzedAt: timestamp,
      network: {
        reachable: false,
        httpStatusCode: null,
        finalUrl: url,
        redirectCount: 0,
        totalResponseTimeMs: networkData.totalResponseTimeMs,
        dnsLookupTimeMs: networkData.dnsLookupTimeMs,
        tlsHandshakeTimeMs: null,
        protocol: null,
        resolvedIp: networkData.resolvedIp,
      },
      error: networkData.error,
      headers: headersData,
      tls: tlsData,
      content: contentData,
      scores,
    };
  }

  const rawHeaders = networkData.rawResponse.headers;
  const rawBody = networkData.rawResponse.body;

  const [headersData, tlsData] = await Promise.all([
    Promise.resolve(analyzeHeaders(rawHeaders)),
    analyzeTls(networkData.finalUrl),
  ]);

  const contentData = analyzeContent(rawHeaders, rawBody);

  const scores = calculateScores(networkData, headersData, tlsData);

  return {
    success: true,
    url,
    analyzedAt: timestamp,
    network: {
      reachable: networkData.reachable,
      httpStatusCode: networkData.httpStatusCode,
      finalUrl: networkData.finalUrl,
      redirectCount: networkData.redirectCount,
      redirectChain: networkData.redirectChain.length > 0 ? networkData.redirectChain : undefined,
      totalResponseTimeMs: networkData.totalResponseTimeMs,
      dnsLookupTimeMs: networkData.dnsLookupTimeMs,
      tlsHandshakeTimeMs: networkData.tlsHandshakeTimeMs,
      protocol: networkData.protocol,
      resolvedIp: networkData.resolvedIp,
    },
    headers: headersData,
    tls: tlsData,
    content: {
      responseSize: contentData.responseSize,
      responseSizeFormatted: contentData.responseSizeFormatted,
      encoding: contentData.encoding,
      charset: contentData.charset,
      detectedBodyType: contentData.detectedBodyType,
      isBodyEmpty: contentData.isBodyEmpty,
    },
    scores,
  };
}

module.exports = { analyzeEndpoint };
