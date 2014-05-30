var chai = require('chai');
chai.should();

var fuzzyioc = require('./');

describe('fuzzy ioc', function () {

  var ioc;

  beforeEach(function () {
    ioc = fuzzyioc()
  });

  describe('lookup', function () {

    it('looks up dependencies by what properties are used', function () {

      function Messages () {
        this.keys = { 'service.loading': 'Loading new data..' };
        this.lookup = function (key) {
          return this.keys[key];
        };
      }

      function Service (something) {
        this.loadingMessage = something.lookup('service.loading');
      }

      ioc.register(Messages);

      var serviceInstance = ioc(Service);

      serviceInstance.loadingMessage.should.equal('Loading new data..');
    });
  });

  describe('register', function () {

    it('registers types', function () {
      function Type () { }
      ioc.register(Type);
      ioc.types().should.contain(Type);
    });
  });

  describe('parser', function () {

    var SOURCE = function Source (argOne, argTwo) {

      var local = argOne.propOne;
      var localCall = argOne.funcOne();

      this.member = argTwo.propTwo;
      console.log(argTwo.funcTwo());

      this.func = function (nestedArg) {
        var nestedLocal = argOne.nestedProp;
        this.setFuncNested = argTwo.nestedFunc();
      };
    };

    var dependencies;
    beforeEach(function () {
      dependencies = ioc.parseUsages(SOURCE);
    });

    it('finds names of dependencies', function () {
      dependencies.should.have.keys('argOne', 'argTwo');
    });

    it('finds accessed properties of each dependency', function () {
      dependencies.argOne.properties.should.contain('propOne');
      dependencies.argTwo.properties.should.contain('propTwo');
    });

    it('finds accessed functions of each dependency', function () {
      dependencies.argOne.functions.should.contain('funcOne');
      dependencies.argTwo.functions.should.contain('funcTwo');
    });

    it('finds access of nested properties of each dependency', function () {
      dependencies.argOne.properties.should.contain('nestedProp');
    });

    it('finds access of nested function calls of each dependency', function () {
      dependencies.argTwo.functions.should.contain('nestedFunc');
    });

    it('skips dependencies of nested function definitions', function () {
      dependencies.should.not.have.keys('nestedArg');
    });

    it('skips function calls when looking up properties', function () {
      dependencies.argTwo.properties.should.not.contain('funcTwo');
    });

    it('skips properties when looking up function calls', function () {
      dependencies.argOne.functions.should.not.contain('propOne');
    });
  });

});
