#!/usr/bin/env node

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createEntry, listEntries, getEntry, addStatuses, removeStatus, journalEvents } = require('./lib/journal');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/entries', (req, res) => {
  try {
    const { message, source } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const entry = createEntry(message, source || { app: 'api', ip: req.ip });
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

app.delete('/api/entries/:id/tags/:tag', (req, res) => {
  try {
    const entryId = req.params.id;
    const tag = req.params.tag;

    if (!entryId || entryId.trim() === '') {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    if (!tag || tag.trim() === '') {
      return res.status(400).json({ error: 'Tag is required' });
    }

    const result = removeStatus(entryId, tag);
    res.json({
      entry: result.entry,
      removed: result.removed
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection message
  res.write('data: {"type": "connected"}\n\n');

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type": "heartbeat"}\n\n');
  }, 30000);

  // Event handlers
  const handleEntryCreated = (entry) => {
    res.write(`data: ${JSON.stringify({ type: 'entry:created', data: entry })}\n\n`);
  };

  const handleEntryTagged = ({ entry, addedStatuses }) => {
    res.write(`data: ${JSON.stringify({ type: 'entry:tagged', data: { entry, addedStatuses } })}\n\n`);
  };

  const handleEntryUntagged = ({ entry, removedTag }) => {
    res.write(`data: ${JSON.stringify({ type: 'entry:untagged', data: { entry, removedTag } })}\n\n`);
  };

  // Register event listeners
  journalEvents.on('entry:created', handleEntryCreated);
  journalEvents.on('entry:tagged', handleEntryTagged);
  journalEvents.on('entry:untagged', handleEntryUntagged);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    journalEvents.off('entry:created', handleEntryCreated);
    journalEvents.off('entry:tagged', handleEntryTagged);
    journalEvents.off('entry:untagged', handleEntryUntagged);
  });
});

app.listen(PORT, () => {
  console.log(`Micro Journal API server running on http://localhost:${PORT}`);
  console.log('\nAPI Endpoints:');
  console.log('  POST   /api/entries              - Create new entry');
  console.log('  GET    /api/entries              - List all entries');
  console.log('  GET    /api/entries/:id          - Get specific entry');
  console.log('  GET    /api/review               - Get unreviewed entries');
  console.log('  POST   /api/entries/:id/tags     - Add tags to entry');
  console.log('  DELETE /api/entries/:id/tags/:tag - Remove tag from entry');
  console.log('  GET    /api/health               - Health check');
  console.log('  GET    /api/events               - SSE endpoint for real-time updates');
});
