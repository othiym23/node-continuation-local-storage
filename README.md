The domains mechanism is a useful tool for adding context to errors
raised in asynchronous call chains (or, if you like living dangerously /
tempting the wrath of @isaacs, to recover from errors without restarting
your services). It also almost serves the purposes of developers
who want to annotate async call chains with metadata or extra state
(examples: logging, tracing / profiling, generic instrumentation),
but due to the needs of error-handling, it doesn't quite generalize
enough to be truly useful in this regard. There are modules that allow
developers to do similar things when they have full control over their
stacks ([CrabDude/trycatch](https://github.com/CrabDude/trycatch) and
[Gozala/reducers](https://github.com/Gozala/reducers), among many
others), but none of these modules are a good fit for developers writing
tooling meant to be dropped transparently into user code.

See also [joyent/node#3733](https://github.com/joyent/issues/3733).

Here is a sketch at what the user-visible API might look like. My
original attempt at this used a slightly modified version of the domains
API with some special-purpose logic for dealing with nested contexts,
but allowing multiple distinct namespaces is actually simpler and trades
memory for execution time. It also makes it possible to special-case
behavior for specific namespaces (i.e. my hope would be that domains
would just become a specialized namespace, and `_tickDomainCallback`
and `_nextDomainTick` would be all that would be required to deal with
namespaces), although that isn't included here.

Here's an example of how the API might be used:

```javascript
var context = require('context');

// multiple contexts in use
var tracer = context.createNamespace('tracer');

function Trace(harvester) {
  this.harvester = harvester;
}

Trace.prototype.runHandler = function (callback) {
  var trace = tracer.createContext();

  trace.on('end', function () {
    var transaction = trace.get('transaction');
    this.harvester.emit('finished', transaction);
  };

  trace.run(callback);
};

Trace.prototype.annotateState = function (name, value) {
  var active = tracer.active;
  active.set(name, value);
};
```
