# Shaked Endpoint Analyzer

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A backend API that performs deep health and security analysis on any HTTP endpoint. Send a URL, get back a comprehensive report covering network performance, security headers, TLS certificates, content inspection, and a scored breakdown.

> **This is the backend API.** Looking for the frontend?
> **[Shaked Endpoint Analyzer UI](https://github.com/ddex3/Shaked-Endpoint-Analyzer-UI)**

---

## What It Does

Shaked Endpoint Analyzer takes a single URL and returns a detailed JSON report with:

| Category | Metrics |
|---|---|
| **Network** | Reachability, HTTP status, response time, DNS lookup time, TLS handshake time, redirect chain, resolved IP, protocol version |
| **Headers** | Server, content-type, cache-control, and detection of 4 critical security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) |
| **TLS / SSL** | Certificate validity, issuer, expiration date, days until expiry, TLS version, fingerprint |
| **Content** | Response size, encoding, charset, body type detection (HTML, JSON, binary, etc.) |
| **Scores** | Performance (0-100), Security (0-100), Reliability (0-100), and a weighted Total score |

---

## Key Features

- **Single-request analysis** -- one POST, full report
- **Redirect tracking** -- follows up to 10 redirects with a complete chain log
- **SSRF protection** -- blocks private IPs, localhost, and reserved ranges
- **Graceful error handling** -- always returns structured JSON, even on DNS failures, timeouts, or invalid certificates
- **Scoring engine** -- weighted algorithm that grades performance, security, and reliability independently
- **Production-ready** -- Express 5, proper error middleware, graceful shutdown, port conflict detection

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Installation

```bash
git clone https://github.com/ddex3/Shaked-Endpoint-Analyzer.git
cd Shaked-Endpoint-Analyzer
npm install
```

### Running

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev

# Custom port
PORT=8080 npm start
```

The server starts on `http://localhost:3000` by default.

---

## Usage

### Analyze an endpoint

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.com"}'
```

### Response

```json
{
  "success": true,
  "url": "https://www.google.com",
  "analyzedAt": "2026-02-09T15:32:28.492Z",
  "network": {
    "reachable": true,
    "httpStatusCode": 200,
    "finalUrl": "https://www.google.com",
    "redirectCount": 0,
    "totalResponseTimeMs": 458.86,
    "dnsLookupTimeMs": 16.56,
    "tlsHandshakeTimeMs": 173.4,
    "protocol": "HTTP/1.1",
    "resolvedIp": "142.251.156.119"
  },
  "headers": {
    "server": "gws",
    "contentType": "text/html; charset=ISO-8859-1",
    "cacheControl": "private, max-age=0",
    "security": {
      "detected": { "x-frame-options": "SAMEORIGIN" },
      "missing": ["strict-transport-security", "content-security-policy", "x-content-type-options"]
    }
  },
  "tls": {
    "isHttps": true,
    "certificateValid": true,
    "certificateIssuer": "Google Trust Services - WR2",
    "certificateExpiration": "2026-04-13T08:39:04.000Z",
    "daysUntilExpiration": 62,
    "tlsVersion": "TLSv1.3"
  },
  "content": {
    "responseSize": 20472,
    "responseSizeFormatted": "19.99 KB",
    "encoding": "identity",
    "charset": "ISO-8859-1",
    "detectedBodyType": "html",
    "isBodyEmpty": false
  },
  "scores": {
    "performance": 77,
    "security": 60,
    "reliability": 100,
    "total": 79
  }
}
```

### Health check

```bash
curl http://localhost:3000/health
```

### Error responses

Invalid or missing URL:

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "not-a-url"}'
```

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid URL format"
  },
  "timestamp": "2026-02-09T15:21:06.622Z"
}
```

---

## Project Structure

```
src/
  server.js              # Express app entry point
  routes/
    analyze.js           # POST /analyze endpoint
  services/
    analyzer.js          # Orchestrates all analysis modules
    networkAnalyzer.js   # DNS, HTTP request, redirects, timing
    headersAnalyzer.js   # Response headers + security header audit
    tlsAnalyzer.js       # TLS certificate inspection
    contentAnalyzer.js   # Body type, size, encoding detection
    scoreCalculator.js   # Weighted scoring engine
  utils/
    constants.js         # Timeouts, thresholds, config values
    validators.js        # URL validation + SSRF protection
    helpers.js           # Shared utility functions
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Analyze a URL and return a full report |
| `GET` | `/health` | Service health check |

### POST /analyze

**Request body:**

```json
{
  "url": "https://example.com"
}
```

**Validation rules:**
- URL must be a string
- Must use `http://` or `https://` protocol
- Maximum 2048 characters
- Private/localhost addresses are blocked

---

## Scoring

Scores range from 0 to 100. The total is a weighted average:

| Component | Weight | Key Factors |
|-----------|--------|-------------|
| Performance | 30% | Response time, redirect count, HTTP status |
| Security | 35% | HTTPS, certificate validity, security headers present |
| Reliability | 35% | Server errors, DNS speed, certificate health |

---

## Configuration

All defaults are defined in [`src/utils/constants.js`](src/utils/constants.js):

| Constant | Default | Description |
|----------|---------|-------------|
| `REQUEST_TIMEOUT_MS` | `15000` | HTTP request timeout |
| `DNS_TIMEOUT_MS` | `5000` | DNS lookup timeout |
| `MAX_REDIRECTS` | `10` | Maximum redirects to follow |
| `MAX_RESPONSE_SIZE` | `10 MB` | Maximum response body size |

---

## Support

- **Issues:** [GitHub Issues](https://github.com/ddex3/Shaked-Endpoint-Analyzer/issues)
- **Frontend UI:** [Shaked Endpoint Analyzer UI](https://github.com/ddex3/Shaked-Endpoint-Analyzer-UI)

---

Built with ❤️ by **[@ddex3](https://github.com/ddex3)**

---

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
