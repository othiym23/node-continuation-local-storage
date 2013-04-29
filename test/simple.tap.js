'use strict';

// stdlib
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;

// module under test
var context = require('../context');

// multiple contexts in use
var tracer = context.createNamespace('tracer');

function Trace(harvester) {
  this.harvester = harvester;
}

Trace.prototype.runHandler = function (callback) {
  var trace = tracer.createContext();

  trace.on('end', function () {
    var transaction = trace.get('transaction');
    this.harvester.emit('finished', transaction);
  }.bind(this));

  trace.run(callback);
};

function annotateTrace(name, value) {
  var active = tracer.active;
  active.set(name, value);
}

// run a trace
var harvester = new EventEmitter();
var trace = new Trace(harvester);

harvester.on('finished', function (transaction) {
  assert.ok(transaction, "transaction should have been passed in");
  assert.equal(transaction.status, 'ok', "transaction should have finished OK");
  assert.equal(Object.keys(process.namespaces).length, 1,
               "Should only have one namespace.");
  console.log("hey, everything worked!");
  console.log("process.namespaces: %j", process.namespaces);
});

trace.runHandler(function inScope() {
  annotateTrace('transaction', {status : 'ok'});
});
