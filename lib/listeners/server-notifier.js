const http = require('http');
const eventBus = require('../event-bus');

// CLI-only server notifier - sends HTTP notifications to server
function notifyServer(eventType, data) {
  const payload = JSON.stringify({ eventType, data });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/notify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const req = http.request(options);

  // Fail silently - we don't care if server is not running
  req.on('error', () => {});
  req.on('response', () => {});

  req.write(payload);
  req.end();
}

// Register CLI event listeners to notify server
eventBus.on('entry:created', (entry) => {
  notifyServer('entry:created', entry);
});

eventBus.on('entry:tagged', (data) => {
  notifyServer('entry:tagged', data);
});

eventBus.on('entry:untagged', (data) => {
  notifyServer('entry:untagged', data);
});

eventBus.on('entry:updated', (entry) => {
  notifyServer('entry:updated', entry);
});

module.exports = {
  notifyServer
};