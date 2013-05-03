'use strict';

var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;

var namespaces = process.namespaces = Object.create(null);

function Context(namespace) {
  assert.ok(namespace, "Context must be associated with namespace!");
  EventEmitter.call(this);
  this.namespace = namespace;
  this.bag = Object.create(null);
}
util.inherits(Context, EventEmitter);

Context.prototype.enter = function () { this.namespace._enter(this); };
Context.prototype.exit = function () { return this.namespace._exit(this); };
// TODO: Context.prototype.add = function () {};
Context.prototype.end = function () { this.emit('end'); };
Context.prototype.set = function (key, value) { this.bag[key] = value; };
Context.prototype.get = function (key) { return this.bag[key]; };
Context.prototype.hasKey = function (key) { return key in this.bag; };

Context.prototype.bind = function (callback) {
  return function bound() {
    this.enter();
    callback.apply(this, arguments);
    this.exit();
    this.end();
  }.bind(this);
};

Context.prototype.run = function (callback) {
  return this.bind(callback)();
};

function Namespace (name) {
  assert.ok(name, "Namespace must be given a name!");
  namespaces[name] = this;

  this.name = name;

  // TODO: by default, contexts nest -- but domains won't
  this.nest = [];

  // every namespace has a default / "global" context
  this.nest.push(this.createContext());

  /* Even though contexts nest, preserve the ability to only interact with the
   * active context.
   *
   * FIXME: domains require different behavior to preserve distinction between
   * _makeCallback and _makeDomainCallback, for performance reasons.
   */
  Object.defineProperty(this, "active", {
    enumerable   : true,
    configurable : false,
    get          : function () { return this.nest[this.nest.length - 1]; }
  });
}

// "class" method
Namespace.get = function (name) { return namespaces[name]; };

Namespace.prototype.createContext = function () { return new Context(this); };
Namespace.prototype.set = function (key, value) { this.active.set(key, value); };

// fall through to enclosing context if value isn't found in this context
Namespace.prototype.get = function (key) {
  for (var i = this.nest.length; i > 0; i--) {
    if (this.nest[i - 1].hasKey(key)) return this.nest[i - 1].get(key);
  }
};

Namespace.prototype._enter = function (context) {
  assert.ok(context, "context must be provided for entering");
  this.nest.push(context);
};

// TODO: generalize nesting via configuration to handle domains
Namespace.prototype._exit = function (context) {
  assert.ok(context, "context must be provided for exiting");
  if (this.active === context &&
      // don't delete the default context
      context !== this.nest[0]) {
    return this.nest.pop();
  }
};

module.exports = {
  createNamespace : function (name) { return new Namespace(name); },
  getNamespace : function (name) { return Namespace.get(name); }
};
