var chai = require('chai');
chai.should();

var fuzzyioc = require('./');

describe('fuzzy ioc', function () {

  var ioc;

  beforeEach(function () {
    ioc = fuzzyioc()
  });

  describe('lookup', function () {

    it('uses "fuzzy" lookup to satisfy dependencies by what properties are used', function () {

      function UserRepo () {

        this.allUsers = function () {
          return ['alice', 'bob'];
        };
      }

      function UserService (repo) {

        this.findAllUsers = function () {
          return repo.allUsers();
        };
      }

      function UserController (service) {

        this.listUsers = function () {
          return service.findAllUsers();
        };
      }

      ioc.register(UserRepo);
      ioc.register(UserService);

      var userController = ioc(UserController);

      userController.listUsers().should.contain('alice', 'bob');
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

    var usagesByDependency;

    beforeEach(function () {
      usagesByDependency = ioc.parseUsages(SOURCE);
    });

    it('finds names of dependencies', function () {
      usagesByDependency.should.have.keys('argOne', 'argTwo');
    });

    it('finds accessed members of each dependency', function () {
      usagesByDependency.argOne.members.should.include('propOne');
      usagesByDependency.argOne.members.should.have.length(2);

      usagesByDependency.argTwo.members.should.include('propTwo');
      usagesByDependency.argTwo.members.should.have.length(1);
    });

    it('finds accessed methods of each dependency', function () {
      usagesByDependency.argOne.methods.should.include('funcOne');
      usagesByDependency.argOne.methods.should.have.length(1);

      usagesByDependency.argTwo.methods.should.include('funcTwo');
      usagesByDependency.argTwo.methods.should.have.length(2);
    });

    describe('nesting', function () {

      it('finds access of nested members of each dependency', function () {
        usagesByDependency.argOne.members.should.include('nestedProp');
      });

      it('finds access of nested methods of each dependency', function () {
        usagesByDependency.argTwo.methods.should.include('nestedFunc');
      });

      it('skips dependencies of nested method definitions', function () {
        usagesByDependency.should.not.have.keys('nestedArg');
      });
    });
  });

});
