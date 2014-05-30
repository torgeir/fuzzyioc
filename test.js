var chai = require('chai');
chai.should();

var fuzzyioc = require('./');

describe('fuzzy ioc', function () {

  var SRC = function (argOne, argTwo) {
    var one = argOne.propOne;
    var two = argTwo.propTwo;

    var resultOne = argOne.funcOne();
    console.log(argTwo.funcTwo());
  };

  it('finds names of dependencies', function () {
    var result = fuzzyioc(SRC);
    result.should.have.keys('argOne', 'argTwo');
  });

  it('finds accessed properties of dependency', function () {
    var result = fuzzyioc(SRC);
    result.argOne.properties.should.contain('propOne');
    result.argTwo.properties.should.contain('propTwo');
  });

});
