#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLogFile() {
  return path.join(os.homedir(), '.micro-journal.json');
}

function readLogs() {
  const logFile = getLogFile();
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8').trim();
      return content ? JSON.parse(content) : [];
    }
    return [];
  } catch (error) {
    console.error('Error reading log file:', error.message);
    return [];
  }
}

function writeLogs(logs) {
  const logFile = getLogFile();
  try {
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing to log file:', error.message);
    process.exit(1);
  }
}

function addStatuses(entryId, statusTypes) {
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    console.error(`Entry with ID ${entryId} not found.`);
    process.exit(1);
  }

  if (!entry.statuses) {
    entry.statuses = [];
  }

  const addedStatuses = [];
  const skippedStatuses = [];

  statusTypes.forEach(statusType => {
    // Check if status already exists
    const existingStatus = entry.statuses.find(s => s.type === statusType);
    if (existingStatus) {
      skippedStatuses.push(statusType);
    } else {
      // Add new status with timestamp
      entry.statuses.push({
        type: statusType,
        timestamp: new Date().toISOString()
      });
      addedStatuses.push(statusType);
    }
  });

  if (addedStatuses.length > 0) {
    writeLogs(logs);
  }
}

function displayEntriesWithoutStatus() {
  const logs = readLogs();
  const entriesWithoutStatus = logs.filter(entry => !entry.statuses || entry.statuses.length === 0);

  if (entriesWithoutStatus.length === 0) {
    return;
  }

  entriesWithoutStatus.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();
    console.log(`${entry.id}. [${timeStr}] ${entry.message}`);
  });
}

function displayUsage() {
  console.log('Usage: mjr [entry_id] [status1] [status2] ...');
  console.log('Add one or more statuses to an existing journal entry');
}

const args = process.argv.slice(2);

if (args.length === 0) {
  displayEntriesWithoutStatus();
  console.log('');
  displayUsage();
  process.exit(0);
}

const [entryIdStr, ...statusTypes] = args;
const entryId = parseInt(entryIdStr, 10);

if (isNaN(entryId) || entryId <= 0) {
  console.error('Entry ID must be a positive number.');
  process.exit(1);
}

// Validate all status types (allow any string, no strict validation)
const validStatuses = statusTypes.filter(status => status.trim().length > 0);

if (validStatuses.length === 0) {
  console.error('At least one status must be provided.');
  process.exit(1);
}

addStatuses(entryId, validStatuses);
