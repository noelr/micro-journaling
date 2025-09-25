const { readLogs } = require('./storage');
const eventBus = require('./event-bus');
require('./listeners/storage-listener');

// Keep journalEvents for backward compatibility
const journalEvents = eventBus;

function createEntry(message, source = { app: 'api' }) {
  let result = null;
  let error = null;

  const handleCreated = (entry) => {
    result = entry;
  };

  const handleError = (data) => {
    error = new Error(data.error);
  };

  eventBus.once('entry:created', handleCreated);
  eventBus.once('entry:error', handleError);

  // Emit and process synchronously
  eventBus.emit('entry:create', { message, source });

  // Clean up listeners
  eventBus.off('entry:created', handleCreated);
  eventBus.off('entry:error', handleError);

  if (error) throw error;
  if (!result) throw new Error('Failed to create entry');

  return result;
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
  let error = null;

  const handleTagged = (data) => {
    result = {
      entry: data.entry,
      addedStatuses: data.addedStatuses,
      skippedStatuses: data.skippedStatuses
    };
  };

  const handleError = (data) => {
    error = new Error(data.error);
  };

  eventBus.once('entry:tagged', handleTagged);
  eventBus.once('entry:error', handleError);

  eventBus.emit('status:add', { entryId, statusTypes });

  eventBus.off('entry:tagged', handleTagged);
  eventBus.off('entry:error', handleError);

  if (error) throw error;
  if (!result) throw new Error('Failed to add statuses');

  return result;
}

function removeStatus(entryId, statusType) {
  let result = null;
  let error = null;

  const handleUntagged = (data) => {
    result = {
      entry: data.entry,
      removed: data.removed || false
    };
  };

  const handleError = (data) => {
    error = new Error(data.error);
  };

  eventBus.once('entry:untagged', handleUntagged);
  eventBus.once('entry:error', handleError);

  eventBus.emit('status:remove', { entryId, statusType });

  eventBus.off('entry:untagged', handleUntagged);
  eventBus.off('entry:error', handleError);

  if (error) throw error;
  if (!result) throw new Error('Failed to remove status');

  return result;
}

module.exports = {
  createEntry,
  listEntries,
  getEntry,
  addStatuses,
  removeStatus,
  journalEvents
};