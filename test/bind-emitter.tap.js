'use strict';

var test         = require('tap').test
  , EventEmitter = require('events').EventEmitter
  , cls          = require('../context.js')
  ;

function fresh(name, context) {
  context.tearDown(function () {
    cls.destroyNamespace(name);
  });
  return cls.createNamespace(name);
}

test("event emitters bound to CLS context", function (t) {
  t.plan(3);

  t.test("handler registered in context", function (t) {
    t.plan(1);

    var n  = fresh('in', this)
      , ee = new EventEmitter()
      ;

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);
      ee.on('event', function () {
        t.equal(n.get('value'), 'hello', "value still set in EE.");
      });
    });

    ee.emit('event');
  });

  t.test("handler registered out of context", function (t) {
    t.plan(1);

    var n  = fresh('out', this)
      , ee = new EventEmitter()
      ;

    ee.on('event', function () {
      t.equal(n.get('value'), 'hello', "value still set in EE.");
    });

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);

      ee.emit('event');
    });
  });

  t.test("handler added but used entirely out of context", function (t) {
    t.plan(1);

    var n  = fresh('none', this)
      , ee = new EventEmitter()
      ;

    ee.on('event', function () {
      t.notOk(n.get('value'), "value shouldn't be visible");
    });

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);
    });

    ee.emit('event');
  });
});
