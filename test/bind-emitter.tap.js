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
  t.plan(9);

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

  t.test("once handler registered in context", function (t) {
    t.plan(1);

    var n  = fresh('inOnce', this)
      , ee = new EventEmitter()
      ;

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);
      ee.once('event', function () {
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

  t.test("once handler registered out of context", function (t) {
    t.plan(1);

    var n  = fresh('outOnce', this)
      , ee = new EventEmitter()
      ;

    ee.once('event', function () {
      t.equal(n.get('value'), 'hello', "value still set in EE.");
    });

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);

      ee.emit('event');
    });
  });

  t.test("once handler registered out of context on Readable", function (t) {
    var Readable = require('stream').Readable;

    if (Readable) {
      t.plan(12);

      var n  = fresh('outOnceReadable', this)
        , re = new Readable()
        ;

      re._read = function () {};

      t.ok(n.name, "namespace has a name");
      t.equal(n.name, 'outOnceReadable', "namespace has a name");

      re.once('data', function (data) {
        t.equal(n.get('value'), 'hello', "value still set in EE");
        t.equal(data, 'blah', "emit still works");
      });

      n.run(function () {
        n.set('value', 'hello');

        t.notOk(re.emit.__wrapped, "emit is not wrapped");
        t.notOk(re.on.__wrapped, "on is not wrapped");
        t.notOk(re.addListener.__wrapped, "addListener is not wrapped");

        n.bindEmitter(re);

        t.ok(re.emit.__wrapped, "emit is wrapped");
        t.ok(re.on.__wrapped, "on is wrapped");
        t.ok(re.addListener.__wrapped, "addListener is wrapped");

        t.equal(typeof re._events.data, 'function', 'only the one data listener');
        t.notOk(re._events.data['context@outOnceReadable'], "context isn't on listener");

        re.emit('data', 'blah');
      });
    }
    else {
      t.comment("this test requires node 0.10+");
      t.end();
    }
  });

  t.test("emitter with newListener that removes handler", function (t) {
    t.plan(3);

    var n  = fresh('newListener', this)
      , ee = new EventEmitter()
      ;

    // add monkeypatching to ee
    n.bindEmitter(ee);

    function listen() {
      ee.on('data', function (chunk) {
        t.equal(chunk, 'chunk', 'listener still works');
      });
    }

    ee.on('newListener', function handler(event) {
      if (event !== 'data') return;

      this.removeListener('newListener', handler);
      t.notOk(this.listeners('newListener').length, 'newListener was removed');
      process.nextTick(listen);
    });

    ee.on('drain', function (chunk) {
      process.nextTick(function () {
        ee.emit('data', chunk);
      });
    });

    ee.on('data', function (chunk) {
      t.equal(chunk, 'chunk', 'got data event');
    });

    ee.emit('drain', 'chunk');
  });

  t.test("handler registered in context on Readable", function (t) {
    var Readable = require('stream').Readable;

    if (Readable) {
      t.plan(12);

      var n  = fresh('outOnReadable', this)
        , re = new Readable()
        ;

      re._read = function () {};

      t.ok(n.name, "namespace has a name");
      t.equal(n.name, 'outOnReadable', "namespace has a name");

      n.run(function () {
        n.set('value', 'hello');

        n.bindEmitter(re);

        t.ok(re.emit.__wrapped, "emit is wrapped");
        t.ok(re.on.__wrapped, "on is wrapped");
        t.ok(re.addListener.__wrapped, "addListener is wrapped");

        re.on('data', function (data) {
          t.equal(n.get('value'), 'hello', "value still set in EE");
          t.equal(data, 'blah', "emit still works");
        });
      });

      t.ok(re.emit.__wrapped, "emit is still wrapped");
      t.ok(re.on.__wrapped, "on is still wrapped");
      t.ok(re.addListener.__wrapped, "addListener is still wrapped");

      t.equal(typeof re._events.data, 'function', 'only the one data listener');
      t.ok(re._events.data['context@outOnReadable'], "context is bound to listener");

      re.emit('data', 'blah');
    }
    else {
      t.comment("this test requires node 0.10+");
      t.end();
    }
  });

  t.test("handler added but used entirely out of context", function (t) {
    t.plan(2);

    var n  = fresh('none', this)
      , ee = new EventEmitter()
      ;

    n.run(function () {
      n.set('value', 'hello');
      n.bindEmitter(ee);
    });

    ee.on('event', function () {
      t.ok(n, "n is set");
      t.notOk(n.get('value'), "value shouldn't be visible");
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
