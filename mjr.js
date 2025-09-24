#!/usr/bin/env node

const { listEntries } = require('./lib/journal');
const http = require('http');

function applyStatuses(entryId, statusTypes) {
  const data = JSON.stringify({ tags: statusTypes });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/entries/${entryId}/tags`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        const error = JSON.parse(responseData);
        console.error('Error adding tags:', error.error || responseData);
        process.exit(1);
      }
      // Success - tags added
    });
  });

  req.on('error', (error) => {
    console.error('Error connecting to server:', error.message);
    console.error('Make sure the server is running (npm start)');
    process.exit(1);
  });

  req.write(data);
  req.end();
}

function displayEntriesWithoutStatus() {
  const entriesWithoutStatus = listEntries({ unreviewed: true });

  if (entriesWithoutStatus.length === 0) {
    return [];
  }

  entriesWithoutStatus.forEach((entry, index) => {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();
    console.log(`${index + 1}. [${timeStr}] ${entry.message}`);
  });

  return entriesWithoutStatus;
}

function displayUsage() {
  console.log('Usage: mjr [entry_number] [status1] [status2] ...');
  console.log('Add one or more statuses to an existing journal entry');
}

const args = process.argv.slice(2);

if (args.length === 0) {
  displayEntriesWithoutStatus();
  console.log('');
  displayUsage();
  process.exit(0);
}

const [entryNumberStr, ...statusTypes] = args;
const entryNumber = parseInt(entryNumberStr, 10);

if (isNaN(entryNumber) || entryNumber <= 0) {
  console.error('Entry number must be a positive number.');
  process.exit(1);
}

// Get the list of entries without status to map number to actual ID
const entriesWithoutStatus = listEntries({ unreviewed: true });

if (entryNumber > entriesWithoutStatus.length) {
  console.error(`Entry number ${entryNumber} not found. There are only ${entriesWithoutStatus.length} entries.`);
  process.exit(1);
}

// Map the display number to the actual entry ID
const actualEntry = entriesWithoutStatus[entryNumber - 1];
const entryId = actualEntry.id;

// Validate all status types (allow any string, no strict validation)
const validStatuses = statusTypes.filter(status => status.trim().length > 0);

if (validStatuses.length === 0) {
  console.error('At least one status must be provided.');
  process.exit(1);
}

applyStatuses(entryId, validStatuses);
