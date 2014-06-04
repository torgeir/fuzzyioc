var sweetjs = require('sweet.js');

var macros = [
  "fat",
  "short-circuit"
];

var addMacrosFolder = function (macro) { return "./macros/" + macro; }
macros.map(addMacrosFolder)
      .forEach(sweetjs.loadMacro.bind(sweetjs));

module.exports = require('./fuzzyioc.sjs');
