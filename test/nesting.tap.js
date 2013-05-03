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
