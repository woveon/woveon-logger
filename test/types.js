

const expect      = require('chai').expect;
const performance = require('perf_hooks').performance;

const Logger      = require('../index');

let mtag            = require('path').basename(__filename).slice(0, -3);
let logger          = new Logger(`${mtag} Logger`, {debug : true, showName : true});
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;


/** Used to test intrumenting object methods. */
class A {

  /** */
  constructor(_a, _b) { this.a = _a; this.b = _b; this.val = 1; }

  /** */
  aFunc() { /* console.log('aFunc hit'); */ return this.a; }

  /** */
  async bFunc() { return this.b; }

  /** */
  static cFunc() {
    console.log('A.cFunc');
    return A.c; }

  /** */
  static async dFunc() { return A.d; }
};

class AA extends A {
  /** */
  constructor(a, b) { super(a,b); }

  static sa() { return this.val; }

  a() { return this.val; }

  aFunc() { return super.aFunc(); }

  static aaStaticFunc() { return 1; }

};

class B extends A {
  constructor(_a, _b) { super(_a, _b); }
  aFunc() {
    // console.log(`B.aFunc has a of ${this.a}.`);
    let r = super.aFunc();
    // console.log(`super.aFunc returned ${r}.`);
    let retval= `B${r}`;
    return retval;
  }
}

let D = function() {
  this.dFunc = function() { return 'd'; };
  Logger.g().info('D name : ', this.name);
  Logger.g().info('D constructor: ', this.constructor);
  return this;
};

A.c = 'c';
A.d = 'd';


describe(`>Test(${mtag}): types`, async function() {

  it('> types', async function() {
    let a = new A('a', 'b');

    /*
    console.log('aFunc: ', Logger.typeof(a.aFunc, true));
    console.log('bFunc: ', Logger.typeof(a.bFunc, true));
    console.log('cFunc: ', Logger.typeof(A.cFunc, true));
    console.log('a 1: ', a.aFunc.prototype);
    console.log('a 2: ', a.aFunc.__proto__);
    console.log('a 3: ', a.aFunc.constructor);
    console.log('a 4: ', a.aFunc.this);
    console.log('b 1: ', a.bFunc.prototype);
    console.log('b 2: ', a.bFunc.__proto__);
    console.log('b 3: ', a.bFunc.constructor);
    console.log('c 1: ', A.cFunc.prototype);
    console.log('c 2: ', A.cFunc.__proto__);
    console.log('c 3: ', A.cFunc.constructor);
    console.log('c 4: ', A.cFunc.this);
    */

    expect(Logger.typeof(undefined)).to.equal(Logger.ObjT.UNDEFINED);
    expect(Logger.typeof(null)).to.equal(Logger.ObjT.NULL);
    expect(Logger.typeof(true)).to.equal(Logger.ObjT.BOOL);
    expect(Logger.typeof('foo')).to.equal(Logger.ObjT.STRING);
    expect(Logger.typeof(Symbol())).to.equal(Logger.ObjT.SYMBOL);
    expect(Logger.typeof(1)).to.equal(Logger.ObjT.NUMBER);
    expect(Logger.typeof({})).to.equal(Logger.ObjT.OBJECT);
    expect(Logger.typeof(function() {})).to.equal(Logger.ObjT.FUNCTION);

    expect(Logger.typeof(a.aFunc)).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(a.aFunc, true)).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(a.bFunc)).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(a.bFunc, true)).to.equal(Logger.ObjT.ASYNCFUNCTION);
    expect(Logger.typeof(A.cFunc)).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(A.cFunc, true)).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(A)).to.equal(Logger.ObjT.CLASS);
    expect(Logger.typeof(new A())).to.equal(Logger.ObjT.INSTANCE);

    expect( Logger.isfasync(a.aFunc) ).to.be.false;
    expect( Logger.isfasync(a.bFunc) ).to.be.true;
  });

  it('> helper inheritance functions', async function() {
    let aa = new AA('aa', 'bb');
    let a  = new A('a', 'b');

    expect( Logger.getClass(aa) ).to.equal(AA);
    expect( Logger.getClass(a)  ).to.equal(A);

    try {
      Logger.getParentClass(a);
      throw Error(1);
    }
    catch (e) {
      if ( e.message == 1 ) throw Error('should have thrown error inside getParentClass, not after');
    }

    expect( Logger.getParentClass(AA) ).to.equal(A);
    expect( Logger.getParentClass(A) ).to.equal(A.__proto__);

    expect( Logger.getParentClass(Logger.getClass(aa)) ).to.equal(A);
    expect( Logger.getParentClass(Logger.getClass(a)) ).to.equal(A.__proto__);

    // parent of an instance
    expect(a.aFunc()).to.equal('a');
    expect(aa.aFunc()).to.equal('aa');
  });

});

