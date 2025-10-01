const { readLogs, writeLogs } = require('../storage');

function onCreateEntry(message, source) {
  const logs = readLogs();
  const nextId = `${Date.now()}-${source.app}`;

  const logEntry = {
    id: nextId,
    timestamp: new Date().toISOString(),
    message: message,
    statuses: [],
    source: source
  };

  logs.push(logEntry);

  if (writeLogs(logs)) {
    return logEntry;
  } else {
    throw new Error('Failed to save entry');
  }
}

function onTagEntry(entryId, statusTypes) {
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    throw new Error(`Entry with ID ${entryId} not found`);
  }

  if (!entry.statuses) {
    entry.statuses = [];
  }

  const addedStatuses = [];
  const skippedStatuses = [];

  statusTypes.forEach(statusType => {
    const existingStatus = entry.statuses.find(s => s.type === statusType);
    if (existingStatus) {
      skippedStatuses.push(statusType);
    } else {
      entry.statuses.push({
        type: statusType,
        timestamp: new Date().toISOString()
      });
      addedStatuses.push(statusType);
    }
  });

  if (addedStatuses.length > 0) {
    if (!writeLogs(logs)) {
      throw new Error('Failed to save entry');
    }
  }

  return { entry, addedStatuses, skippedStatuses };
}

module.exports = {
  onCreateEntry,
  onTagEntry
};