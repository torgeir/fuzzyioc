# fuzzyioc

A "fuzzy" matching ioc container.

## The vision

As suggested by @rinojohnsen;

An ioc container should "fuzzy" match dependencies to inject based on what members and method calls are used on the dependencies of a function.

## Installation

`npm install fuzzyioc`

## Run tests

`npm test`

## Usage

```js
var fuzzyioc = require('fuzzyioc');

var ioc = fuzzyioc();
ioc.register(Messages);

var view = ioc(View);
view.msg // "Yeah!"

function View (msgs) {
  this.msg = msgs.getMessageByKey("some.message.key");
}

function Messages () {
  var keys = { "some.message.key": "Yeah!" };

  this.getMessageByKey = function (key) {
    return keys[key];
  };
}
```

## Todo

- Record number of parameters to function calls of dependencies. Use this to better match agains registered types.
- Follow assignments to `this` inside a function, so that a we can track usage (of `this.something`) along the prototype as well
- Track usage on the prototype
- Support singletons


