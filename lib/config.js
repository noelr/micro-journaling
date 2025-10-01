const fs = require('fs');
const path = require('path');
const os = require('os');

function getConfigDir() {
  return path.join(os.homedir(), '.micro-journal');
}

function getConfigFile() {
  return path.join(getConfigDir(), 'config.json');
}

function readConfig() {
  const configFile = getConfigFile();
  try {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf8').trim();
      return content ? JSON.parse(content) : {};
    }
    return {};
  } catch (error) {
    console.error('Error reading config file:', error.message);
    return {};
  }
}

function getDeviceName() {
  const config = readConfig();
  return config.device || os.hostname();
}

module.exports = {
  getDeviceName,
  readConfig
};
