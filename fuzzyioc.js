var _ = require('lodash');
var astw = require('astw');

module.exports = function () {

  var types = [];

  var typesByProperty = { members: {}, methods: {} };

  /**
   * Fuzzy ioc container. Satisfies dependencies for types by ducktyping against registered types.
   */
  function fuzzyioc (Type) {
    var usages = fuzzyioc.parseUsages(Type);
    var satisfiersPerDependency = satisfyUsages(usages);

    var nodes = lookupNodes(Type);
    var dependencyNames = findDependencies(nodes, Type);

    var dependencies = _.map(dependencyNames, dependency => satisfiersPerDependency[dependency][0]);
    var dependencyInstances = _.map(dependencies, Dependency => fuzzyioc(Dependency));

    return newInstance(Type, dependencyInstances);
  }

  /**
   * Returns types registered with fuzzyioc.
   */
  fuzzyioc.types = () => types.slice();

  /**
   * Registers a Type in fuzzyioc. Indexes types by members and methods available on the Type.
   */
  fuzzyioc.register = Type => {
    types.push(Type);

    var properties = parseProperties(Type);

    // index members
    _.each(properties.members, member => {
      var members = typesByProperty.members[member] = (typesByProperty.members[member] || []);
      members.push(Type);
    });

    // index methods
    _.each(properties.methods, method => {
      var methods = typesByProperty.methods[method] = (typesByProperty.methods[method] || []);
      methods.push(Type);
    });
  };


  /**
   * Finds member accesses and method calls for a given Type
   */
  fuzzyioc.parseUsages = Type => {

    var dependencies = {};
    function initDependency (dep) {
      dependencies[dep] = {
        members: [], // variable
        methods: []   // { name, args }
      };
    }

    var nodes = lookupNodes(Type);

    _.map(findDependencies(nodes, Type), initDependency);

    _.each(nodes, node => {

      switch (node.type) {

        case 'MemberExpression':
          var parent = node.parent;
          var object = node.object;

          var isIdentifier = (object.type == 'Identifier');

          if (isIdentifier) {

            var isParentFunctionCall = (parent.type == 'CallExpression');

            if (!isParentFunctionCall) {
              var name = object.name;
              if (name in dependencies) {
                dependencies[name].members.push(node.property.name);
              }
            }
            else if (isParentFunctionCall) {
              var name = object.name;
              if (name in dependencies) {
                dependencies[name].methods.push(node.property.name);
              }
            }
          }
        break;
      }
    });

    return dependencies;
  };



  /**
   * Extracts members and methods available on a Type.
   */
  function parseProperties (Type) {

    var members = [],
        methods = [];

    var sourceString = asSourceString(Type);
    var walk = astw(sourceString);

    walk(node => {

      var object = node.object;
      var parent = node.parent;

      if (node.type == 'MemberExpression') {

        var isThisExpression = (object.type == 'ThisExpression');
        var isParentAssignmentExpression = (parent && parent.type == 'AssignmentExpression');

        if (isThisExpression && isParentAssignmentExpression) {

          var isParentRightAssignmentExpressionFunction =
            (node.parent.right.type == 'FunctionExpression');

          var name = node.property.name;
          if (isParentRightAssignmentExpressionFunction) {
            methods.push(name);
          }
          else {
            members.push(name);
          }
        }
      }
    });

    return { members, methods };
  };

  /**
   * Provides types that satisfy the usage of each dependency.
   */
  function satisfyUsages (usages) {

    var satisfiersPerDependency = {};
    _.each(Object.keys(usages), dependency => {
      satisfiersPerDependency[dependency] = [];
    });

    for (var dependency in usages) {
      var satisfierForDependency = satisfiersPerDependency[dependency];

      var methods = usages[dependency].methods;
      var members = usages[dependency].members;

      var methodSatisfiers = _.flatten(_.map(methods, method => {
        return typesByProperty.methods[method];
      }));

      var memberSatisfiers = _.flatten(_.map(members, member => {
        return typesByProperty.members[member];
      }));

      // find dependencies that satifisfy both methods and members
      if (methods.length && members.length) {
        _.each(methodSatisfiers, methodSatisfier => {
          if (memberSatisfiers.indexOf(methodSatisfier) != -1) {
            satisfierForDependency.push(methodSatisfier);
          }
        });
      }
      // find dependencies that satisfy methods
      else if (methods.length) {
        _.each(methodSatisfiers, methodSatisfier => satisfierForDependency.push(methodSatisfier));
      }
      // find dependencies that satisfy members
      else if (members.length) {
        _.each(memberSatisfiers, memberSatisfier => satisfierForDependency.push(memberSatisfier));
      }

      if (!satisfierForDependency.length) {
        throw new Error('fuzzyioc: No registered types satisify the usage of your type' +
                       'Methods called: ' + JSON.stringify(methods) + "\n" +
                       'Members accessed: ' + JSON.stringify(members) + "\n");
      }
    }

    return satisfiersPerDependency;
  };


  /**
   * Looks up a dependencies (arguments) of a FunctionDeclaration or a FunctionExpression
   */
  function findDependencies (nodes, Type) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      switch (node.type) {

        // falltrough
        case 'FunctionDeclaration':
        case 'FunctionExpression':
          return _.map(node.params, param => param.name);
      }
    }

    throw new Error("fuzzyioc: no function expression or declaration takes dependencies for the type " + Type);
  };

  /**
   * Parses type or string to an ast
   */
  function lookupNodes (stringOrType) {
    var sourceString = asSourceString(stringOrType);

    var walk = astw(sourceString);

    var nodes = [];
    walk(node => nodes.push(node));
    return nodes.reverse();
  };

  return fuzzyioc;

};

function asSourceString (input) {
  return (typeof input == 'function')
    ? input.toString()
    : input;
}

function newInstance (Klass, args) {
  function F () {}
  F.prototype = Klass;
  var instance = new F();
  Klass.apply(instance, args);
  return instance;
}
