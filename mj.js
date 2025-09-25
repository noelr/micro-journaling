#!/usr/bin/env node

const { listEntries, createEntry } = require('./lib/journal');
require('./lib/listeners/server-notifier');

function displayLastEntries() {
  const logs = listEntries();

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
  const source = {
    app: "cli",
    pwd: process.cwd()
  };

  try {
    createEntry(message, source);
    // Success - entry created
  } catch (error) {
    console.error('Error creating entry:', error.message);
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
