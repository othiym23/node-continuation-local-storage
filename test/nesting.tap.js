'use strict';

var tap = require('tap');
var test = tap.test;

var context = require('../context.js');

test("nested contexts on a single namespace", function (t) {
  t.plan(7);

  var namespace = context.createNamespace("namespace");
  var toplevel = namespace.createContext();
  namespace.set("value", 1);

  t.equal(namespace.get("value"), 1,
          "namespaces have associated data even without contexts.");
  toplevel.on('end', function () {
    t.equal(namespace.get("value"), 1,
            "namespace retains its outermost value.");
  });

  toplevel.run(function () {
    t.equal(namespace.get("value"), 1, "lookup will check enclosing context");
    namespace.set("value", 2);
    t.equal(namespace.get("value"), 2, "setting works on top-level context");
    var nested = namespace.createContext();

    nested.on('end', function () {
      t.equal(namespace.get("value"), 2,
              "should revert to value set in top-level context");
    });

    nested.run(function () {
    t.equal(namespace.get("value"), 2, "lookup will check enclosing context");
      namespace.set("value", 3);
      t.equal(namespace.get("value"), 3,
              "setting works on nested context");
    });
  });
});

test("the example from the docs", function (t) {
  var writer = context.createNamespace('writer');
  writer.set('value', 0);

  function requestHandler() {
    var outer = writer.createContext();
    t.equal(writer.get('value'), 0, "outer hasn't been entered yet");
    outer.run(function () {
      t.equal(writer.active, outer, "writer.active == outer");

      writer.set('value', 1);
      t.equal(outer.get('value'), 1, "outer is active");
      t.equal(writer.get('value'), 1, "writer.active == outer");

      var inner = writer.createContext();

      process.nextTick(function () {
        // FIXME: once this is in core, 'value' should be 1 because
        // outer is still active
        // FIXME: t.equal(writer.active, outer, "writer.active == outer");
        t.equal(writer.get('value'), 0, "inner hasn't been entered yet");
        inner.run(function () {
          t.equal(writer.active, inner, "writer.active == inner");

          writer.set('value', 2);
          t.equal(outer.get('value'), 1, "outer is unchanged");
          t.equal(inner.get('value'), 2, "inner is active");
          t.equal(writer.get('value'), 2, "writer.active == inner");
        });
      });
    });

    setTimeout(function () {
      t.equal(writer.get('value'), 0, "writer.active == global");
      t.end();
    }, 100);
  }

  requestHandler();
});
