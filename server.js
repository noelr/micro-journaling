#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { createEntry, listEntries, getEntry, addStatuses } = require('./lib/journal');
const { getDeviceName } = require('./lib/config');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// SSE Client Management
const sseClients = new Set();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files in production
if (NODE_ENV === 'production') {
  const webDistPath = path.join(__dirname, 'web', 'dist');
  app.use(express.static(webDistPath));
}

// SSE Broadcasting Function
function broadcastSSE(eventType, data) {
  const message = `data: ${JSON.stringify({ type: eventType, data })}\n\n`;

  sseClients.forEach(client => {
    if (!client.res.finished) {
      client.res.write(message);
    }
  });
}

app.post('/api/entries', (req, res) => {
  try {
    const { message, source } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const entry = createEntry(message, source || { app: 'api', device: getDeviceName() });

    // Broadcast to SSE clients
    broadcastSSE('entry:created', entry);

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/entries', (req, res) => {
  try {
    const entries = listEntries();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/entries/:id', (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);

    if (isNaN(entryId) || entryId <= 0) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    const entry = getEntry(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/review', (req, res) => {
  try {
    const entries = listEntries({ unreviewed: true });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/entries/:id/tags', (req, res) => {
  try {
    const entryId = req.params.id;
    const { tags } = req.body;

    if (!entryId || entryId.trim() === '') {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const result = addStatuses(entryId, tags);

    // Broadcast to SSE clients
    broadcastSSE('entry:tagged', result);

    res.json({
      entry: result.entry,
      added: result.addedStatuses,
      skipped: result.skippedStatuses
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Remove tag endpoint temporarily disabled - only createEntry and tagEntry supported
// app.delete('/api/entries/:id/tags/:tag', (req, res) => {
//   res.status(501).json({ error: 'Remove tag functionality not implemented' });
// });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Notification endpoint for CLI to server communication
app.post('/api/notify', (req, res) => {
  try {
    const { eventType, data } = req.body;

    if (!eventType || !data) {
      return res.status(400).json({ error: 'eventType and data are required' });
    }

    // Broadcast directly to SSE clients
    broadcastSSE(eventType, data);

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write('data: {"type": "connected"}\n\n');

  const heartbeat = setInterval(() => {
    if (!res.finished) {
      res.write('data: {"type": "heartbeat"}\n\n');
    }
  }, 30000);

  const client = { res, heartbeat };
  sseClients.add(client);

  res.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
});

// Serve index.html for all non-API routes in production (SPA fallback)
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Micro Journal API server running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log('\nAPI Endpoints:');
  console.log('  POST   /api/entries              - Create new entry');
  console.log('  GET    /api/entries              - List all entries');
  console.log('  GET    /api/entries/:id          - Get specific entry');
  console.log('  GET    /api/review               - Get unreviewed entries');
  console.log('  POST   /api/entries/:id/tags     - Add tags to entry');
  console.log('  DELETE /api/entries/:id/tags/:tag - Remove tag from entry');
  console.log('  GET    /api/health               - Health check');
  console.log('  POST   /api/notify               - CLI notification endpoint');
  console.log('  GET    /api/events               - SSE endpoint for real-time updates');
});
