var _ = require('lodash');
var astw = require('astw');

module.exports = function () {

  var typesByProperty = { members: {}, methods: {} };

  /**
   * Fuzzy ioc container.
   *
   * Satisfies dependencies for types by "fuzzy" matching against registered types. If a registered type has the members and/or methods called on a dependency of Type, the registered type will be injected as the dependency.
   */
  function fuzzyioc (Type) {
    var usages = fuzzyioc.parseUsages(Type);
    var satisfyingTypesPerDependency = satisfyUsages(usages);

    var dependencyNames = extractDependencyNamesFor(Type);
    var dependencyTypes = _.map(dependencyNames, name => satisfyingTypesPerDependency[name][0]);
    var dependencyInstances = _.map(dependencyTypes, Dependency => fuzzyioc(Dependency));

    return newInstance(Type, dependencyInstances);
  }

  /**
   * Registers a Type.
   */
  fuzzyioc.register = Type => {

    var properties = parseProperties(Type);

    // index types by members
    _.each(properties.members, member => {
      var members = typesByProperty.members[member] = (typesByProperty.members[member] || []);
      members.push(Type);
    });

    // index types by methods
    _.each(properties.methods, method => {
      var methods = typesByProperty.methods[method] = (typesByProperty.methods[method] || []);
      methods.push(Type);
    });
  };


  /**
   * Finds member access and method calls (usages) for a given Type.
   */
  fuzzyioc.parseUsages = Type => {

    var dependencies = {};

    function initDependency (dep) {
      dependencies[dep] = {
        members: [],
        methods: [] // TODO: record number of arguments in each function
      };
    }

    _.map(extractDependencyNamesFor(Type), initDependency);

    _.each(parseNodes(Type), node => {

      if (node.type == "MemberExpression") {
        var parent = node.parent;
        var object = node.object;

        var isObjectIdentifier = (object.type == 'Identifier');
        if (isObjectIdentifier) {

          var name = object.name;
          var hasDependencyToName = (name in dependencies);
          if (!hasDependencyToName) {
            return;
          }

          var propertyOrFunctionName = node.property.name;
          var isParentCallExpression = (parent.type == 'CallExpression');
          if (isParentCallExpression) {
            dependencies[name].methods.push(propertyOrFunctionName);
          }
          else {
            dependencies[name].members.push(propertyOrFunctionName);
          }
        }
      }
    });

    return dependencies;
  };


  /**
   * Provides the types that satisfy the usage of each dependency. Throws `Error` if no registered type match the usages.
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

  return fuzzyioc;
};

/**
  * Extracts members and methods available on a Type.
  */
function parseProperties (Type) {

  var members = [],
      methods = [];

  walkAst(Type, node => {

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
  * Looks up a dependencies (arguments) of a FunctionDeclaration or a FunctionExpression
  */
function extractDependencyNamesFor (Type) {
  var nodes = parseNodes(Type);

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
function parseNodes (stringOrType) {
  var nodes = [];
  walkAst(stringOrType, node => nodes.push(node));
  return nodes.reverse();
};


/**
 * Walks the ast of a function or source string
 */
function walkAst(stringOrType, fn) {
  var sourceString = asSourceString(stringOrType);
  return astw(sourceString)(fn);
}


/**
 * String representation of a function
 */
function asSourceString (input) {
  return (typeof input == 'function')
    ? input.toString()
    : input;
}


/**
 * Returns a new instance of `Klass` with `args` applied.
 */
function newInstance (Klass, args) {
  function F () {}
  F.prototype = Klass;
  var instance = new F();
  Klass.apply(instance, args);
  return instance;
}
