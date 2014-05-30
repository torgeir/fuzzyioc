var fuzzyioc = require('./');

var ioc = fuzzyioc();
ioc.register(Messages);

var view = ioc(View);
console.log(view.msg) // "Yeah!"

function View (msgs) {
  this.msg = msgs.getMessageByKey("some.message.key");
}

function Messages () {
  var keys = { "some.message.key": "Yeah!" };

  this.getMessageByKey = function (key) {
    return keys[key];
  };
}
