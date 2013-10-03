'use strict';

var assert = require('assert');
var wrap   = require('shimmer').wrap;

// load polyfill if native support is unavailable
if (!process.addAsyncListener) require('async-listener');

var namespaces;

function Namespace (name) {
  this.name   = name;
  // every namespace has a default / "global" context
  this.active = Object.create(null);
  this._stack = [];
  this.id     = null;
}

Namespace.prototype.set = function (key, value) {
  this.active[key] = value;
  return value;
};

Namespace.prototype.get = function (key) {
  return this.active[key];
};

Namespace.prototype.createContext = function () {
  return Object.create(this.active);
};

Namespace.prototype.run = function (fn) {
  var context = this.createContext();
  this.enter(context);
  try {
    fn(context);
    return context;
  }
  finally {
    this.exit(context);
  }
};

Namespace.prototype.bind = function (fn, context) {
  if (!context) context = this.active;
  var self = this;
  return function () {
    self.enter(context);
    try {
      return fn.apply(this, arguments);
    }
    finally {
      self.exit(context);
    }
  };
};

Namespace.prototype.enter = function (context) {
  assert.ok(context, "context must be provided for entering");

  this._stack.push(this.active);
  this.active = context;
};

Namespace.prototype.exit = function (context) {
  assert.ok(context, "context must be provided for exiting");

  // Fast path for most exits that are at the top of the stack
  if (this.active === context) {
    assert.ok(this._stack.length, "can't remove top context");
    this.active = this._stack.pop();
    return;
  }

  // Fast search in the stack using lastIndexOf
  var index = this._stack.lastIndexOf(context);

  assert.ok(index >= 0, "context not currently entered; can't exit");
  assert.ok(index,      "can't remove top context");

  this.active = this._stack[index - 1];
  this._stack.length = index - 1;
};

Namespace.prototype.bindEmitter = function (source) {
  assert.ok(source.on && source.addListener && source.emit, "can only bind real EEs");

  var namespace = this;
  var contextName = 'context@' + this.name;

  /**
   * Attach a context to a listener, and make sure that this hook stays
   * attached to the emitter forevermore.
   */
  function capturer(on) {
    return function captured(event, listener) {
      listener[contextName] = namespace.active;
      try {
        return on.call(this, event, listener);
      }
      finally {
        // old-style streaming overwrites .on and .addListener, so rewrap
        if (!this.on.__wrapped) wrap(this, 'on', capturer);
        if (!this.addListener.__wrapped) wrap(this, 'addListener', capturer);
      }
    };
  }

  /**
   * Evaluate listeners within the CLS contexts in which they were originally
   * captured.
   */
  function puncher(emit) {
    // find all the handlers with attached contexts
    function prepare(handlers) {
      var replacements = [];
      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var context = handler[contextName];

        if (context) handler = namespace.bind(handler, context);

        replacements[i] = handler;
      }

      return replacements;
    }

    return function punched(event) {
      if (!this._events || !this._events[event]) return emit.apply(this, arguments);

      // wrap
      var events = this._events[event];
      if (typeof events === 'function' && events[contextName]) {
        this._events[event] = namespace.bind(events, events[contextName]);
      }
      else if (events.length) {
        this._events[event] = prepare(events);
      }

      try {
        // apply
        return emit.apply(this, arguments);
      }
      finally {
        // reset
        this._events[event] = events;
      }
    };
  }

  wrap(source, 'addListener', capturer);
  wrap(source, 'on',          capturer);
  wrap(source, 'emit',        puncher);
};

function get(name) {
  return namespaces[name];
}

function create(name) {
  assert.ok(name, "namespace must be given a name!");

  var namespace = new Namespace(name);
  namespace.id = process.addAsyncListener(
    function () {
      return namespace.active;
    },
    {
      before : function (context, domain) { namespace.enter(domain); },
      after  : function (context, domain) { namespace.exit(domain); }
    }
  );

  namespaces[name] = namespace;
  return namespace;
}

function destroy(name) {
  var namespace = get(name);

  assert.ok(namespace,    "can't delete nonexistent namespace!");
  assert.ok(namespace.id, "don't assign to process.namespaces directly!");

  process.removeAsyncListener(namespace.id);
  namespaces[name] = null;
}

function reset() {
  // must unregister async listeners
  if (namespaces) {
    Object.keys(namespaces).forEach(function (name) {
      destroy(name);
    });
  }
  namespaces = process.namespaces = Object.create(null);
}
reset(); // call immediately to set up

module.exports = {
  getNamespace     : get,
  createNamespace  : create,
  destroyNamespace : destroy,
  reset            : reset
};
