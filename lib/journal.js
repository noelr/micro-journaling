const { readLogs, writeLogs } = require('./storage');
const { EventEmitter } = require('events');

// Create a singleton event emitter for journal events
class JournalEvents extends EventEmitter {}
const journalEvents = new JournalEvents();

function createEntry(message, source = { app: 'api' }) {
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
    // Emit event for new entry
    journalEvents.emit('entry:created', logEntry);
    return logEntry;
  }
  throw new Error('Failed to save entry');
}

function listEntries(filter = {}) {
  const logs = readLogs();

  // Sort logs by ID to ensure consistent ordering
  // IDs are timestamp-based strings (e.g., "1234567890123-app")
  logs.sort((a, b) => a.id.localeCompare(b.id));

  if (filter.unreviewed) {
    return logs.filter(entry => !entry.statuses || entry.statuses.length === 0);
  }

  if (filter.withStatus && filter.withStatus.length > 0) {
    return logs.filter(entry =>
      entry.statuses &&
      entry.statuses.some(s => filter.withStatus.includes(s.type))
    );
  }

  if (filter.withoutStatus && filter.withoutStatus.length > 0) {
    return logs.filter(entry =>
      !entry.statuses ||
      !entry.statuses.some(s => filter.withoutStatus.includes(s.type))
    );
  }

  return logs;
}

function getEntry(entryId) {
  const logs = readLogs();
  return logs.find(log => log.id === entryId);
}

function addStatuses(entryId, statusTypes) {
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
    // Emit event for tags added
    journalEvents.emit('entry:tagged', { entry, addedStatuses });
  }

  return {
    entry,
    addedStatuses,
    skippedStatuses
  };
}

function removeStatus(entryId, statusType) {
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    throw new Error(`Entry with ID ${entryId} not found`);
  }

  if (!entry.statuses || entry.statuses.length === 0) {
    return { entry, removed: false };
  }

  const initialLength = entry.statuses.length;
  entry.statuses = entry.statuses.filter(s => s.type !== statusType);

  if (entry.statuses.length < initialLength) {
    if (!writeLogs(logs)) {
      throw new Error('Failed to save entry');
    }
    // Emit event for tag removed
    journalEvents.emit('entry:untagged', { entry, removedTag: statusType });
    return { entry, removed: true };
  }

  return { entry, removed: false };
}

module.exports = {
  createEntry,
  listEntries,
  getEntry,
  addStatuses,
  removeStatus,
  journalEvents
};