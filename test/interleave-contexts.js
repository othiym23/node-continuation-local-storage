'use strict';

var cls             = require('continuation-local-storage')
  , test            = require('tap').test
  ;

function cleanNamespace(name){
  if( cls.getNamespace(name) ) cls.destroyNamespace(name);
  return cls.createNamespace(name);
}

test("Can interleve context with run", function (t) {
  var ns = cleanNamespace('test');
  var ctx = ns.createContext();
  ns.enter(ctx);
  ns.run(function () {
    ns.exit(ctx);
  });
  t.end();
});

test("Can interleve contexts", function (t) {
  var ns = cleanNamespace('test');
  var ctx1 = ns.createContext();
  var ctx2 = ns.createContext();
  ns.enter(ctx1);
  ns.enter(ctx2);
  ns.exit(ctx1);
  ns.exit(ctx2);
  t.end();
});

test("Can interleve entered contexts", function (t) {
  var ns = cleanNamespace('test');
  var ctx1 = ns.createContext();
  ns.enter(ctx1);
  var ctx2 = ns.createContext();
  ns.enter(ctx2);
  ns.exit(ctx1);
  ns.exit(ctx2);
  t.end();
});
