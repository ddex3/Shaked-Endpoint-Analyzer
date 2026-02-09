const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns');
const { promisify } = require('util');
const { REQUEST_TIMEOUT_MS, MAX_REDIRECTS } = require('../utils/constants');

const dnsLookup = promisify(dns.lookup);

async function measureDnsLookup(hostname) {
  const start = process.hrtime.bigint();
  try {
    const result = await dnsLookup(hostname);
    const end = process.hrtime.bigint();
    return {
      resolvedIp: result.address,
      dnsLookupTimeMs: Number(end - start) / 1e6,
      dnsError: null,
    };
  } catch (err) {
    const end = process.hrtime.bigint();
    return {
      resolvedIp: null,
      dnsLookupTimeMs: Number(end - start) / 1e6,
      dnsError: err.code || err.message,
    };
  }
}

function performRequest(targetUrl) {
  return new Promise((resolve) => {
    const redirectChain = [];
    let currentUrl = targetUrl;
    let redirectCount = 0;
    let tlsHandshakeTimeMs = null;
    const overallStart = process.hrtime.bigint();

    function doRequest(url, remainingRedirects) {
      const reqParsed = new URL(url);
      const transport = reqParsed.protocol === 'https:' ? https : http;

      const options = {
        hostname: reqParsed.hostname,
        port: reqParsed.port || (reqParsed.protocol === 'https:' ? 443 : 80),
        path: reqParsed.pathname + reqParsed.search,
        method: 'GET',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Shaked-Endpoint-Analyzer/1.0',
          'Accept': '*/*',
          'Accept-Encoding': 'identity',
        },
        rejectUnauthorized: false,
      };

      const req = transport.request(options, (res) => {
        if (reqParsed.protocol === 'https:' && res.socket) {
          try {
            const tlsStart = res.socket._tlsConnectTime || null;
            if (res.socket.getProtocol) {
              res.tlsProtocol = res.socket.getProtocol();
            }
          } catch {}
        }

        const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);

        if (isRedirect && res.headers.location && remainingRedirects > 0) {
          let nextUrl;
          try {
            nextUrl = new URL(res.headers.location, url).toString();
          } catch {
            nextUrl = res.headers.location;
          }
          redirectChain.push({
            statusCode: res.statusCode,
            from: url,
            to: nextUrl,
          });
          redirectCount++;
          currentUrl = nextUrl;
          res.resume();
          doRequest(nextUrl, remainingRedirects - 1);
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const totalResponseTimeMs = Number(endTime - overallStart) / 1e6;

          resolve({
            success: true,
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
            finalUrl: currentUrl,
            redirectCount,
            redirectChain,
            totalResponseTimeMs,
            tlsHandshakeTimeMs,
            httpVersion: `HTTP/${res.httpVersion}`,
            tlsProtocol: res.tlsProtocol || null,
            socket: res.socket,
          });
        });

        res.on('error', (err) => {
          const endTime = process.hrtime.bigint();
          resolve({
            success: false,
            error: err.message,
            errorCode: err.code || 'RESPONSE_ERROR',
            totalResponseTimeMs: Number(endTime - overallStart) / 1e6,
          });
        });
      });

      req.on('socket', (socket) => {
        const tlsStart = process.hrtime.bigint();
        socket.on('secureConnect', () => {
          const tlsEnd = process.hrtime.bigint();
          tlsHandshakeTimeMs = Number(tlsEnd - tlsStart) / 1e6;
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('TIMEOUT'));
      });

      req.on('error', (err) => {
        const endTime = process.hrtime.bigint();
        let errorCode = 'CONNECTION_ERROR';
        if (err.message === 'TIMEOUT') errorCode = 'TIMEOUT';
        else if (err.code === 'ECONNREFUSED') errorCode = 'CONNECTION_REFUSED';
        else if (err.code === 'ECONNRESET') errorCode = 'CONNECTION_RESET';
        else if (err.code === 'ENOTFOUND') errorCode = 'DNS_ERROR';
        else if (err.code === 'CERT_HAS_EXPIRED') errorCode = 'CERTIFICATE_EXPIRED';
        else if (err.code === 'ERR_TLS_CERT_ALTNAME_INVALID') errorCode = 'CERTIFICATE_INVALID';
        else if (err.code) errorCode = err.code;

        resolve({
          success: false,
          error: err.message,
          errorCode,
          totalResponseTimeMs: Number(endTime - overallStart) / 1e6,
        });
      });

      req.end();
    }

    doRequest(currentUrl, MAX_REDIRECTS);
  });
}

async function analyzeNetwork(url) {
  const parsed = new URL(url);
  const dnsResult = await measureDnsLookup(parsed.hostname);

  if (dnsResult.dnsError) {
    return {
      reachable: false,
      httpStatusCode: null,
      finalUrl: url,
      redirectCount: 0,
      totalResponseTimeMs: dnsResult.dnsLookupTimeMs,
      dnsLookupTimeMs: dnsResult.dnsLookupTimeMs,
      tlsHandshakeTimeMs: null,
      protocol: null,
      resolvedIp: null,
      error: {
        code: 'DNS_ERROR',
        message: `DNS lookup failed: ${dnsResult.dnsError}`,
      },
      rawResponse: null,
    };
  }

  const result = await performRequest(url);

  if (!result.success) {
    return {
      reachable: false,
      httpStatusCode: null,
      finalUrl: url,
      redirectCount: 0,
      totalResponseTimeMs: result.totalResponseTimeMs + dnsResult.dnsLookupTimeMs,
      dnsLookupTimeMs: dnsResult.dnsLookupTimeMs,
      tlsHandshakeTimeMs: null,
      protocol: null,
      resolvedIp: dnsResult.resolvedIp,
      error: {
        code: result.errorCode,
        message: result.error,
      },
      rawResponse: null,
    };
  }

  return {
    reachable: true,
    httpStatusCode: result.statusCode,
    finalUrl: result.finalUrl,
    redirectCount: result.redirectCount,
    redirectChain: result.redirectChain,
    totalResponseTimeMs: Math.round((result.totalResponseTimeMs + dnsResult.dnsLookupTimeMs) * 100) / 100,
    dnsLookupTimeMs: Math.round(dnsResult.dnsLookupTimeMs * 100) / 100,
    tlsHandshakeTimeMs: result.tlsHandshakeTimeMs
      ? Math.round(result.tlsHandshakeTimeMs * 100) / 100
      : null,
    protocol: result.httpVersion,
    resolvedIp: dnsResult.resolvedIp,
    error: null,
    rawResponse: {
      headers: result.headers,
      body: result.body,
      socket: result.socket,
      tlsProtocol: result.tlsProtocol,
    },
  };
}

module.exports = { analyzeNetwork };
