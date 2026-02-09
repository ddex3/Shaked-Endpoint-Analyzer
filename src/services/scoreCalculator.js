const { SECURITY_HEADERS, SCORE_WEIGHTS, PERFORMANCE_THRESHOLDS } = require('../utils/constants');
const { clamp } = require('../utils/helpers');

function calculatePerformanceScore(networkData) {
  if (!networkData.reachable) return 0;

  let score = 100;
  const responseTime = networkData.totalResponseTimeMs;

  if (responseTime <= PERFORMANCE_THRESHOLDS.excellent) {
    score = 100;
  } else if (responseTime <= PERFORMANCE_THRESHOLDS.good) {
    score = 90 - ((responseTime - PERFORMANCE_THRESHOLDS.excellent) / (PERFORMANCE_THRESHOLDS.good - PERFORMANCE_THRESHOLDS.excellent)) * 15;
  } else if (responseTime <= PERFORMANCE_THRESHOLDS.acceptable) {
    score = 75 - ((responseTime - PERFORMANCE_THRESHOLDS.good) / (PERFORMANCE_THRESHOLDS.acceptable - PERFORMANCE_THRESHOLDS.good)) * 25;
  } else if (responseTime <= PERFORMANCE_THRESHOLDS.slow) {
    score = 50 - ((responseTime - PERFORMANCE_THRESHOLDS.acceptable) / (PERFORMANCE_THRESHOLDS.slow - PERFORMANCE_THRESHOLDS.acceptable)) * 30;
  } else {
    score = Math.max(5, 20 - (responseTime - PERFORMANCE_THRESHOLDS.slow) / 500);
  }

  if (networkData.redirectCount > 3) {
    score -= (networkData.redirectCount - 3) * 5;
  }

  if (networkData.httpStatusCode >= 400) {
    score -= 20;
  }

  return clamp(Math.round(score), 0, 100);
}

function calculateSecurityScore(headersData, tlsData) {
  let score = 0;
  const maxScore = 100;

  if (tlsData.isHttps) {
    score += 30;
  }

  if (tlsData.certificateValid) {
    score += 15;
  }

  if (tlsData.daysUntilExpiration !== null && tlsData.daysUntilExpiration > 30) {
    score += 5;
  } else if (tlsData.daysUntilExpiration !== null && tlsData.daysUntilExpiration > 0) {
    score += 2;
  }

  const totalSecurityHeaders = SECURITY_HEADERS.length;
  const detectedCount = Object.keys(headersData.security.detected).length;
  const headerScore = (detectedCount / totalSecurityHeaders) * 40;
  score += headerScore;

  if (headersData.security.detected['strict-transport-security']) {
    score += 5;
  }

  if (headersData.security.detected['content-security-policy']) {
    score += 5;
  }

  return clamp(Math.round(score), 0, maxScore);
}

function calculateReliabilityScore(networkData, tlsData) {
  if (!networkData.reachable) return 0;

  let score = 100;

  const status = networkData.httpStatusCode;
  if (status >= 500) {
    score -= 50;
  } else if (status >= 400) {
    score -= 25;
  } else if (status >= 300 && status < 400) {
    score -= 5;
  }

  if (networkData.redirectCount > 5) {
    score -= 15;
  } else if (networkData.redirectCount > 2) {
    score -= 5;
  }

  if (networkData.dnsLookupTimeMs > 1000) {
    score -= 10;
  } else if (networkData.dnsLookupTimeMs > 500) {
    score -= 5;
  }

  if (tlsData.isHttps && !tlsData.certificateValid) {
    score -= 20;
  }

  if (tlsData.expired) {
    score -= 15;
  }

  if (tlsData.daysUntilExpiration !== null && tlsData.daysUntilExpiration < 7) {
    score -= 10;
  }

  return clamp(Math.round(score), 0, 100);
}

function calculateScores(networkData, headersData, tlsData) {
  const performance = calculatePerformanceScore(networkData);
  const security = calculateSecurityScore(headersData, tlsData);
  const reliability = calculateReliabilityScore(networkData, tlsData);

  const total = Math.round(
    performance * SCORE_WEIGHTS.performance +
    security * SCORE_WEIGHTS.security +
    reliability * SCORE_WEIGHTS.reliability
  );

  return {
    performance,
    security,
    reliability,
    total: clamp(total, 0, 100),
  };
}

module.exports = { calculateScores };
