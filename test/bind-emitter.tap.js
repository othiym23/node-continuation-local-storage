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
  t.plan(4);

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

  t.test("handler added but no listeners registered", function (t) {
    t.plan(3);

    var http = require('http')
      , n    = fresh('no_listener', this)
      ;

    // only fails on Node < 0.10
    var server = http.createServer(function (req, res) {
      n.bindEmitter(req);

      t.doesNotThrow(function () {
        req.emit('event');
      });

      res.writeHead(200, {"Content-Length" : 4});
      res.end('WORD');
    });
    server.listen(8080);

    http.get('http://localhost:8080/', function (res) {
      t.equal(res.statusCode, 200, "request came back OK");

      res.setEncoding('ascii');
      res.on('data', function (body) {
        t.equal(body, 'WORD');

        server.close();
      });
    });
  });
});
