'use strict';

var tap = require('tap');
var test = tap.test;

var context = require('../context.js');

test("namespace management", function (t) {
  t.plan(3);

  t.throws(function () { context.createNamespace(); }, "should require a name");

  var namespace = context.createNamespace('test');
  t.ok(namespace, "should get back a namespace on creation");

  t.equal(context.getNamespace('test'), namespace, "should fetch namespace");
});
