'use strict';
var test = require('tap').test;

if (!process.addAsyncListener) {


test("overwriting startup.processNextTick", function (t) {
  t.plan(2);

  t.doesNotThrow(function () { require('../context.js'); });

  t.ok(process.nextTick.__wrapped, "should wrap process.nextTick()");
});

test("overwriting domain helpers", function (t) {
  // domain helpers were only in 0.10.x
  if (!(process._nextDomainTick ||
        process._tickDomainCallback)) {
    return t.end();
  }

  t.plan(2);

  t.ok(process._nextDomainTick.__wrapped,
       "should wrap process._nextDomainTick()");
  t.ok(process._tickDomainCallback.__wrapped,
       "should wrap process._tickDomainCallback()");
});

test("overwriting timers", function (t) {
  t.plan(6);

  t.ok(setTimeout.__wrapped, "should wrap setTimeout()");
  t.ok(setInterval.__wrapped, "should wrap setInterval()");

  t.ok(global.setTimeout.__wrapped, "should also wrap global setTimeout()");
  t.ok(global.setInterval.__wrapped, "should also wrap global setInterval()");

  var timers = require('timers');
  t.ok(timers.setTimeout.__wrapped, "should wrap setTimeout()");
  t.ok(timers.setInterval.__wrapped, "should wrap setInterval()");

  /* It would be nice to test that monkeypatching preserves the status quo
   * ante, but assert thinks setTimeout !== global.setTimeout (why?) and both of
   * those are a wrapper around NativeModule.require("timers").setTimeout,
   * presumably to try to prevent the kind of "fun" I'm having here.
   */
});

test("overwriting setImmediate", function (t) {
  // setTimeout's a johnny-come-lately
  if (!global.setImmediate) return t.end();

  t.plan(3);

  t.ok(setImmediate.__wrapped, "should wrap setImmediate()");
  t.ok(global.setImmediate.__wrapped, "should also wrap global setImmediate()");
  t.ok(require('timers').setImmediate.__wrapped, "should wrap setImmediate()");

  /* It would be nice to test that monkeypatching preserves the status quo
   * ante, but assert thinks setTimeout !== global.setTimeout (why?) and both of
   * those are a wrapper around NativeModule.require("timers").setTimeout,
   * presumably to try to prevent the kind of "fun" I'm having here.
   */

});


}
