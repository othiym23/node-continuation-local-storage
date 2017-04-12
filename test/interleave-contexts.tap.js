'use strict';

var cls  = require('../context.js')
  , test = require('tap').test
  ;

function cleanNamespace(name){
  if (cls.getNamespace(name)) cls.destroyNamespace(name);
  return cls.createNamespace(name);
}

test("interleaved contexts", function (t) {
  t.plan(4);

  t.test("interleaving with run", function (t) {
    t.plan(2);

    var ns = cleanNamespace('test');

    var ctx = ns.createContext();

    ns.enter(ctx);
    ns.run(function () {
      t.equal(ns._set.length, 2, "2 contexts in the active set");
      t.doesNotThrow(function () { ns.exit(ctx); });
    });
  });

  t.test("entering and exiting staggered", function (t) {
    t.plan(4);

    var ns = cleanNamespace('test');

    var ctx1 = ns.createContext();
    var ctx2 = ns.createContext();

    t.doesNotThrow(function () { ns.enter(ctx1); });
    t.doesNotThrow(function () { ns.enter(ctx2); });

    t.doesNotThrow(function () { ns.exit(ctx1); });
    t.doesNotThrow(function () { ns.exit(ctx2); });
  });

  t.test("creating, entering and exiting staggered", function (t) {
    t.plan(4);

    var ns = cleanNamespace('test');

    var ctx1 = ns.createContext();
    t.doesNotThrow(function () { ns.enter(ctx1); });

    var ctx2 = ns.createContext();
    t.doesNotThrow(function () { ns.enter(ctx2); });

    t.doesNotThrow(function () { ns.exit(ctx1); });
    t.doesNotThrow(function () { ns.exit(ctx2); });
  });

  t.test("interleave with process.nextTick()", function (t) {
    var ns = cleanNamespace('test');

    ns.run(function() {
      ns.set('value', 0);

      process.nextTick(function () {
        t.equal(ns.get('value'), 0, "context has changed");
        ns.set('value', 1);
        t.equal(ns.get('value'), 1, "context has changed");

        process.nextTick(function () {
          t.equal(ns.get('value'), 1, "context has changed");
          ns.set('value', 3);
          t.equal(ns.get('value'), 3, "context has changed");
        });
      });

      process.nextTick(function () {
        t.equal(ns.get('value'), 0, "context has changed");
        ns.set('value', 2);
        t.equal(ns.get('value'), 2, "context has changed");

        process.nextTick(function () {
          t.equal(ns.get('value'), 2, "context has changed");
          ns.set('value', 4);
          t.equal(ns.get('value'), 4, "context has changed");

          t.end();
        });
      });
    });
  });
});
