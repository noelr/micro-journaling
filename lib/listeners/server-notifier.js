const http = require('http');
const https = require('https');

function notifyServer(eventType, data) {
  const serverUrl = process.env.MJ_SERVER_URL || 'http://localhost:3000';
  const url = new URL('/api/notify', serverUrl);
  const payload = JSON.stringify({ eventType, data });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const protocol = url.protocol === 'https:' ? https : http;
  const req = protocol.request(options);

  // Fail silently - we don't care if server is not running
  req.on('error', () => {});
  req.on('response', () => {});

  req.write(payload);
  req.end();
}

function onCreateEntry(message, source, entry) {
  // Only notify after entry is created by storage handler
  if (entry) {
    notifyServer('entry:created', entry);
  }
  // Don't return anything - we're just notifying
}

function onTagEntry(entryId, statusTypes, result) {
  // Only notify after entry is tagged by storage handler
  if (result) {
    notifyServer('entry:tagged', result);
  }
  // Don't return anything - we're just notifying
}

module.exports = {
  onCreateEntry,
  onTagEntry
};
