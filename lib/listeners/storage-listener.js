const eventBus = require('../event-bus');
const { readLogs, writeLogs } = require('../storage');

function handleEntryCreate(data) {
  const { message, source } = data;
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
    eventBus.emit('entry:created', logEntry);
  } else {
    eventBus.emit('entry:error', { error: 'Failed to save entry' });
  }
}

function handleEntryUpdate(data) {
  const { entryId, updates } = data;
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    eventBus.emit('entry:error', { error: `Entry with ID ${entryId} not found` });
    return;
  }

  Object.assign(entry, updates);

  if (writeLogs(logs)) {
    eventBus.emit('entry:updated', entry);
  } else {
    eventBus.emit('entry:error', { error: 'Failed to update entry' });
  }
}

function handleStatusAdd(data) {
  const { entryId, statusTypes } = data;
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    eventBus.emit('entry:error', { error: `Entry with ID ${entryId} not found` });
    return;
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
    if (writeLogs(logs)) {
      eventBus.emit('entry:tagged', { entry, addedStatuses, skippedStatuses });
    } else {
      eventBus.emit('entry:error', { error: 'Failed to save entry' });
    }
  } else {
    eventBus.emit('entry:tagged', { entry, addedStatuses, skippedStatuses });
  }
}

function handleStatusRemove(data) {
  const { entryId, statusType } = data;
  const logs = readLogs();
  const entry = logs.find(log => log.id === entryId);

  if (!entry) {
    eventBus.emit('entry:error', { error: `Entry with ID ${entryId} not found` });
    return;
  }

  if (!entry.statuses || entry.statuses.length === 0) {
    eventBus.emit('entry:untagged', { entry, removed: false });
    return;
  }

  const initialLength = entry.statuses.length;
  entry.statuses = entry.statuses.filter(s => s.type !== statusType);

  if (entry.statuses.length < initialLength) {
    if (writeLogs(logs)) {
      eventBus.emit('entry:untagged', { entry, removedTag: statusType, removed: true });
    } else {
      eventBus.emit('entry:error', { error: 'Failed to save entry' });
    }
  } else {
    eventBus.emit('entry:untagged', { entry, removed: false });
  }
}

eventBus.on('entry:create', handleEntryCreate);
eventBus.on('entry:update', handleEntryUpdate);
eventBus.on('status:add', handleStatusAdd);
eventBus.on('status:remove', handleStatusRemove);

module.exports = {
  handleEntryCreate,
  handleEntryUpdate,
  handleStatusAdd,
  handleStatusRemove
};