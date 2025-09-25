const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emit(event, data) {
    super.emit(event, data);
    return this;
  }

  on(event, listener) {
    super.on(event, listener);
    return this;
  }

  off(event, listener) {
    super.removeListener(event, listener);
    return this;
  }

  once(event, listener) {
    super.once(event, listener);
    return this;
  }
}

const eventBus = new EventBus();

module.exports = eventBus;