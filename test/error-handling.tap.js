'use strict';

var test   = require('tap').test
  , cls    = require('../context.js')
  , domain = require('domain')
  ;

test("continuation-local storage glue with a throw in the continuation chain",
     function (t) {
  var namespace = cls.createNamespace('test');
  namespace.run(function () {
    var d = domain.create();
    namespace.set('outer', true);

    d.on('error', function (blerg) {
      t.equal(blerg.message, "explicitly nonlocal exit", "got the expected exception");
      t.notOk(namespace.get('outer'), "outer context should have been exited by throw");
      t.notOk(namespace.get('inner'), "inner context should have been exited by throw");
      t.equal(namespace._stack.length, 0, "should be back to global state");

      t.end();
    });

    // tap is only trying to help
    process.nextTick(d.bind(function () {
      t.ok(namespace.get('outer'), "outer mutation worked");
      t.notOk(namespace.get('inner'), "inner mutation hasn't happened yet");

      namespace.run(function () {
        namespace.set('inner', true);
        throw new Error("explicitly nonlocal exit");
      });
    }));
  });
});
