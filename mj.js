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

function displayLastEntries() {
  const logs = readLogs();

  logs.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString();
    const statusStr = entry.statuses && entry.statuses.length > 0
      ? `[${entry.statuses.map(s => s.type).join(', ')}] `
      : '';
    console.log(`${entry.id}. [${timeStr}] ${statusStr}${entry.message}`);
  });

  console.log('\nUsage: mj <message>');
}

function logMessage(message) {
  const logFile = getLogFile();

  try {
    const logs = readLogs();
    const nextId = logs.length > 0 ? Math.max(...logs.map(l => l.id || 0)) + 1 : 1;

    const logEntry = {
      id: nextId,
      timestamp: new Date().toISOString(),
      message: message,
      statuses: [],
      source: {
        app: "cli",
        pwd: process.cwd()
      }
    };

    logs.push(logEntry);

    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing to log file:', error.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const message = args.join(' ');

if (message.trim() === '') {
  displayLastEntries();
  process.exit(0);
}

logMessage(message);
