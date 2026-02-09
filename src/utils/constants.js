const REQUEST_TIMEOUT_MS = 15000;
const DNS_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 10;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
];

const SCORE_WEIGHTS = {
  performance: 0.3,
  security: 0.35,
  reliability: 0.35,
};

const PERFORMANCE_THRESHOLDS = {
  excellent: 200,
  good: 500,
  acceptable: 1000,
  slow: 3000,
};

module.exports = {
  REQUEST_TIMEOUT_MS,
  DNS_TIMEOUT_MS,
  MAX_REDIRECTS,
  MAX_RESPONSE_SIZE,
  SECURITY_HEADERS,
  SCORE_WEIGHTS,
  PERFORMANCE_THRESHOLDS,
};
