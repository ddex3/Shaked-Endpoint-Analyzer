const tls = require('tls');
const { URL } = require('url');
const { daysBetween } = require('../utils/helpers');
const { REQUEST_TIMEOUT_MS } = require('../utils/constants');

function getTlsCertificate(hostname, port) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        rejectUnauthorized: false,
        servername: hostname,
        timeout: REQUEST_TIMEOUT_MS,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(false);
          const authorized = socket.authorized;
          const protocol = socket.getProtocol();
          socket.destroy();

          if (!cert || Object.keys(cert).length === 0) {
            resolve({ available: false, error: 'No certificate returned' });
            return;
          }

          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiration = daysBetween(validTo, now);

          resolve({
            available: true,
            valid: authorized,
            issuer: cert.issuer
              ? [cert.issuer.O, cert.issuer.CN].filter(Boolean).join(' - ')
              : null,
            subject: cert.subject ? cert.subject.CN : null,
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            daysUntilExpiration,
            expired: daysUntilExpiration <= 0,
            serialNumber: cert.serialNumber || null,
            fingerprint: cert.fingerprint256 || cert.fingerprint || null,
            tlsVersion: protocol,
            subjectAltNames: cert.subjectaltname || null,
          });
        } catch (err) {
          socket.destroy();
          resolve({ available: false, error: err.message });
        }
      }
    );

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ available: false, error: 'TLS connection timed out' });
    });

    socket.on('error', (err) => {
      resolve({ available: false, error: err.message });
    });
  });
}

async function analyzeTls(url) {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';

  if (!isHttps) {
    return {
      isHttps: false,
      certificateValid: null,
      certificateIssuer: null,
      certificateExpiration: null,
      daysUntilExpiration: null,
      tlsVersion: null,
      details: null,
    };
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : 443;
  const certInfo = await getTlsCertificate(parsed.hostname, port);

  if (!certInfo.available) {
    return {
      isHttps: true,
      certificateValid: false,
      certificateIssuer: null,
      certificateExpiration: null,
      daysUntilExpiration: null,
      tlsVersion: null,
      error: certInfo.error,
    };
  }

  return {
    isHttps: true,
    certificateValid: certInfo.valid,
    certificateIssuer: certInfo.issuer,
    certificateSubject: certInfo.subject,
    certificateExpiration: certInfo.validTo,
    certificateValidFrom: certInfo.validFrom,
    daysUntilExpiration: certInfo.daysUntilExpiration,
    expired: certInfo.expired,
    tlsVersion: certInfo.tlsVersion,
    serialNumber: certInfo.serialNumber,
    fingerprint: certInfo.fingerprint,
  };
}

module.exports = { analyzeTls };
