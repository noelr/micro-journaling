const { readLogs } = require('./storage');
const storageListener = require('./listeners/storage-listener');
const serverNotifier = require('./listeners/server-notifier');

// Handler registry
const handlers = [];

function registerHandler(handler) {
  handlers.push(handler);
}

function createEntry(message, source = { app: 'api' }) {
  let entry = null;

  // Call all handlers in sequence
  for (const handler of handlers) {
    if (handler.onCreateEntry) {
      const result = handler.onCreateEntry(message, source, entry);
      // First handler that returns an entry sets it
      if (result && !entry) {
        entry = result;
      }
    }
  }

  if (!entry) {
    throw new Error('No storage handler registered');
  }

  return entry;
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
  let result = null;

  // Call all handlers in sequence
  for (const handler of handlers) {
    if (handler.onTagEntry) {
      const handlerResult = handler.onTagEntry(entryId, statusTypes, result);
      // First handler that returns a result sets it
      if (handlerResult && !result) {
        result = handlerResult;
      }
    }
  }

  if (!result) {
    throw new Error('No storage handler registered');
  }

  return result;
}

// Register default handlers
registerHandler(storageListener);
registerHandler(serverNotifier);

module.exports = {
  createEntry,
  listEntries,
  getEntry,
  addStatuses,
  registerHandler
};