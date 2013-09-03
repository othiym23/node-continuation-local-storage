'use strict';

var assert = require('assert');

// load polyfill if native support is unavailable
if (!process.addAsyncListener) require('async-listener');

var namespaces = process.namespaces = Object.create(null);

function Namespace (name) {
  assert.ok(name, "Namespace must be given a name!");
  namespaces[name] = this;

  this.name = name;

  this._stack = [];

  // every namespace has a default / "global" context
  this.active = Object.create(null);
}

function resetNamespaces() { 
  namespaces = Object.create(null); 
};

function getNamespace(name) { return namespaces[name]; }

// "class" method
Namespace.get = getNamespace;

Namespace.prototype.set = function (key, value) {
  this.active[key] = value;
  return value;
};

Namespace.prototype.get = function (key) {
  return this.active[key];
};

Namespace.prototype.createContext = function () {
  var context = Object.create(this.active);
  return context;
};

Namespace.prototype.run = function (fn) {
  var context = this.createContext();
  this.enter(context);
  try {
    fn(context);
  }
  finally {
    this.exit(context);
  }
  return context;
};

Namespace.prototype.bind = function (fn, context) {
  if (!context) context = this.active;
  var self = this;
  return function () {
    self.enter(context);
    var result = fn.apply(this, arguments);
    self.exit(context);
    return result;
  };
};

Namespace.prototype.enter = function (context) {
  assert.ok(context, "context must be provided for entering");
  this._stack.push(this.active);
  this.active = context;
};

// TODO: generalize nesting via configuration to handle domains
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
  assert.ok(index, "can't remove top context");
  this.active = this._stack[index - 1];
  this._stack.length = index - 1;
};

module.exports = {
  createNamespace : function (name) {
    var namespace = new Namespace(name);
    process.addAsyncListener(
      function () {
        return namespace.active;
      },
      {
        before: function (context) {
          namespace.enter(context);
        },
        after: function (context) {
          namespace.exit(context);
        }
      }
    );
    return namespace;
  },
  getNamespace : getNamespace,
  resetNamespaces: resetNamespaces
};
