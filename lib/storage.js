const fs = require('fs');
const path = require('path');
const os = require('os');

function getDataDir() {
  return path.join(os.homedir(), '.micro-journal');
}

function getLogFile() {
  return path.join(getDataDir(), 'data.json');
}

function ensureDataDir() {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
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
    ensureDataDir();
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing to log file:', error.message);
    return false;
  }
}

module.exports = {
  getLogFile,
  readLogs,
  writeLogs
};