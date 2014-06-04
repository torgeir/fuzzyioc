// var traceur = require('traceur');
// module.exports = traceur.require(__dirname + '/fuzzyioc.js');
var sweetjs = require('sweet.js');

var macros = [
  "fat"
];

var addMacrosFolder = function (macro) { return "./macros/" + macro; }
macros.map(addMacrosFolder)
      .forEach(sweetjs.loadMacro.bind(sweetjs));

module.exports = require('./fuzzyioc.sjs');
