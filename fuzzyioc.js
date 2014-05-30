var _ = require('lodash');
var astw = require('astw');
var deparse = require('escodegen').generate;

/*
MemberExpression
  object.type = 'Identifier'
  object.name = 'arg'
  les property

CallExpressions
*/

module.exports = input => {

  var sourceString = (typeof input == 'function')
    ? input.toString()
    : input;

  var nodes = [];

  var walk = astw(sourceString);
  walk(node => nodes.push(node));

  var deps = {};

  function initDependency (dep) {
    deps[dep] = {
      properties: [], // variable
      functions: []   // { name, args }
    };
  }

  var reversedNodes = nodes.reverse();

  _.each(reversedNodes, node => {

    switch (node.type) {
      case 'FunctionExpression':
        _.map(node.params, param => initDependency(param.name));
      break;
    }
  });

  _.each(reversedNodes, node => {
    // console.log(node);

    switch (node.type) {

      case 'MemberExpression':
        var object = node.object;

        if (object.type == 'Identifier') {
          var name = object.name;
          if (name in deps) {
            deps[name].properties.push(node.property.name);
          }
        }

        // var parent = node.parent;
        // if (parent.type == 'CallExpression') {
        //   parent.arguments
        // }
      break;
    }
  });

  return deps;

  // nodes.reverse().forEach(function (node) {
  //   var parent = node.parent;
  //   if (parent) console.log(parent.type)
  //   console.log('->', node.type);
  //   console.log('===');
  //   console.log(deparse(node));
  //   console.log('===');
  //   console.log();
  //   // var src = deparse(node);
  //   // console.log(node.type + ' :: ' + JSON.stringify(src));
  // });
}
