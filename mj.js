#!/usr/bin/env node

const { listEntries } = require('./lib/journal');
const http = require('http');

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

  const data = JSON.stringify({ message, source });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/entries',
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
      if (res.statusCode === 201) {
        // Success - entry created
      } else {
        console.error('Error creating entry:', responseData);
        process.exit(1);
      }
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

const args = process.argv.slice(2);
const message = args.join(' ');

if (message.trim() === '') {
  displayLastEntries();
  process.exit(0);
}

logMessage(message);
