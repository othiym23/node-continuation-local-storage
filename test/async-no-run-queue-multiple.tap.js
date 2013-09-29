var test = require('tap').test
  , cls  = require('../context.js')
  ;

test("minimized test case that caused #6011 patch to fail", function (t) {
  t.plan(3);

  console.log('+');
  // when the flaw was in the patch, commenting out this line would fix things:
  setImmediate(function () { console.log('!'); });

  var n = cls.createNamespace("test");
  t.ok(!n.get('state'), "state should not yet be visible");

  n.run(function () {
    n.set('state', true);
    t.ok(n.get('state'), "state should be visible");

    setImmediate(function () {
      t.ok(n.get('state'), "state should be visible");
    });
  });
});
