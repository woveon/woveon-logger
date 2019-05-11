

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


describe(`>Test(${mtag}): profiling`, async function() {

  before(async function() {
  });

  it('> types', async function() {
    /** */
    class A { };
    expect(Logger.typeof(undefined)).to.equal(Logger.ObjT.UNDEFINED);
    expect(Logger.typeof(null)).to.equal(Logger.ObjT.NULL);
    expect(Logger.typeof(true)).to.equal(Logger.ObjT.BOOL);
    expect(Logger.typeof('foo')).to.equal(Logger.ObjT.STRING);
    expect(Logger.typeof(Symbol())).to.equal(Logger.ObjT.SYMBOL);
    expect(Logger.typeof(1)).to.equal(Logger.ObjT.NUMBER);
    expect(Logger.typeof({})).to.equal(Logger.ObjT.OBJECT);
    expect(Logger.typeof(function() {})).to.equal(Logger.ObjT.FUNCTION);
    expect(Logger.typeof(A)).to.equal(Logger.ObjT.CLASS);
    expect(Logger.typeof(new A())).to.equal(Logger.ObjT.INSTANCE);
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

  it('> instrument a function', async function() {
    let f = function(_text) { console.log(_text); };
    let ff = Logger.pf(f);

    logger.info('pre:  ff: ', ff._wl);
    ff('a');
    logger.info('post: ff: ', ff._wl);
    expect(ff._wl.lastRun).to.not.be.null;
    expect(ff._wl.tCalls).to.equal(1);
    expect(ff._wl.tTime).to.not.equal(0);

    expect(Logger.pfLastRun(ff)).to.equal(ff._wl.lastRun);
    expect(Logger.pfTotalCalls(ff)).to.equal(ff._wl.tCalls);
    expect(Logger.pfTotalTime(ff)).to.equal(ff._wl.tTime);
    expect(Logger.pfAveTime(ff)).to.equal(ff._wl.tTime / ff._wl.tCalls);

    logger.info('          last run: ', Logger.pfLastRun(ff));
    logger.info('       total calls: ', Logger.pfTotalCalls(ff));
    logger.info('        total time: ', Logger.pfTotalTime(ff));
    logger.info(' ave time per call: ', Logger.pfAveTime(ff));
    Logger.pfReport(ff);
  });

  it('> cache test', async function() {
    let f = function(_text) { console.log(_text); };
    let ff = Logger.pf(f);
    let iterations = 10;

    for (let i=0; i<iterations; i++) {
      ff(`${i}`); logger.info('          last run: ', Logger.pfLastRun(ff));
    }
  });

  it('> instrument an async function', async function() {
    let f = async function(_text) { console.log(_text); };
    let ff  = Logger.pf(f);
    let ffa = Logger.pfa(f);

    ff('a');
    logger.info('post: ff: ', ff._wl);
    expect(ff._wl.lastRun).to.not.be.null;
    expect(ff._wl.tCalls).to.equal(1);
    expect(ff._wl.tTime).to.not.equal(0);

    await ffa('a');
    logger.info('post: ffa: ', ffa._wl);
    expect(ffa._wl.lastRun).to.not.be.null;
    expect(ffa._wl.tCalls).to.equal(1);
    expect(ffa._wl.tTime).to.not.equal(0);

  });

  it('> async Safe function', async function() {
    let f1 = function(_text) { console.log(_text); };
    let f2 = async function(_text) { console.log(_text); };
    let ff = null;

    ff = Logger.pfAsyncSafe(f1);
    expect(ff instanceof AsyncFunction).to.be.false;
    logger.info(' : ', ff instanceof AsyncFunction);
    ff('not async');
    await ff('not async');

    ff = Logger.pfAsyncSafe(f2);
    expect(ff instanceof AsyncFunction).to.be.true;
    logger.info(' : ', ff instanceof AsyncFunction);
    ff('async');
    await ff('async');
  });

  it('> class function', async function() {
    // create an object of a class
    let a = new A('a', 'b');

    // instrument an object's function
    a.aFunc = Logger.pf(a.aFunc);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(1);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(2);

    // instrument an object's async function
    a.bFunc = Logger.pfa(a.bFunc);
    expect(await a.bFunc()).to.equal('b');
    expect(a.bFunc instanceof AsyncFunction).to.be.true;
    expect(a.bFunc._wl.tCalls).to.equal(1);

    // instrument a class's static function
    A.cFunc = Logger.pf(A.cFunc);
    expect(A.cFunc._wl.tCalls).to.equal(0);
    expect(A.cFunc()).to.equal('c');
    expect(A.cFunc._wl.tCalls).to.equal(1);

    // instrument a class's async static function
    A.dFunc = Logger.pfa(A.dFunc);
    expect(A.dFunc._wl.tCalls).to.equal(0);
    expect(await A.dFunc()).to.equal('d');
    expect(A.dFunc._wl.tCalls).to.equal(1);

  });

  it('> instrument class object\'s methods', async function() {
    let a = new A('a', 'b');
    let b = {
      aFunc : function() { return 'a'; },
      bFunc : async function() { return 'b'; },
    };
    let ab = new B('aa', 'bb');

    // object with functions
    Logger.pfObj(b);
    expect(b.aFunc._wl.tCalls).to.equal(0);
    expect(b.bFunc._wl.tCalls).to.equal(0);
    expect(b.aFunc()).to.equal('a');
    expect(b.aFunc._wl.tCalls).to.equal(1);
    expect(await b.bFunc()).to.equal('b');
    expect(b.bFunc._wl.tCalls).to.equal(1);

    // replace object method
    a.aFunc = Logger.pf(a.aFunc);
    expect(a.aFunc._wl.tCalls).to.equal(0);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(1);

    // replace object method that has inheritance
    ab.aFunc = Logger.pf(ab.aFunc);
    expect(ab.aFunc._wl.tCalls).to.equal(0);
    // console.log('calling ab aFunc()');
    expect(ab.aFunc()).to.equal('Baa');
    expect(ab.aFunc._wl.tCalls).to.equal(1);

    // 'a' object should be unchanged after ab.aFunc called
    expect(a.aFunc._wl.tCalls).to.equal(1);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(2);

    // ab object should be unchanged after a.aFunc called
    expect(ab.aFunc._wl.tCalls).to.equal(1);

    /*
    Logger.pfClass(a);
    expect(a.aFunc._wl.tCalls).to.equal(0);
    expect(a.bFunc._wl.tCalls).to.equal(0);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(1);
    expect(await a.bFunc()).to.equal('b');
    expect(a.bFunc._wl.tCalls).to.equal(1);
    */

  });

  it('> instrument a class\'s function');
    /*
    A.aFunc = Logger.pf(A.aFunc);
    b = new A('a', 'b');
    expect(b.aFunc()).to.equal('a');
    expect(b.aFunc._wl.tCalls).to.equal(0);
    */

  it('> instrument a class\'s async function');


  it('> run multiple times', async function() {
    let f = function(_text) { console.log(_text); };
    let ff = Logger.pf(f);

    ff('a');
    ff('b');

    expect(ff._wl.tCalls).to.equal(2);
  });

  it('> performance impact', async function() {
    this.timeout(20000);
    let f = function(_text) { console.log(_text); };
    let ff = Logger.pf(f);
    let result = [];
    let cur = 0;
    let iterations = 500000;

    // regular function
    cur = performance.now();
    for (let i=0; i<iterations; i++) { f('a'); }
    result[0] = performance.now() - cur;

    // instrumented function
    cur = performance.now();
    for (let i=0; i<iterations; i++) { ff('b'); }
    result[1] = performance.now() - cur;

    logger.info(`regular function time : ${result[0].toFixed(2)} ms`);
    logger.info(`instrumented function time : ${result[1].toFixed(2)} ms `);
    logger.info(`overhead: ${((result[1] - result[0])/ result[0]).toFixed(2)} %`);
  });

  it('> performance impact on non-io', async function() {
    this.timeout(20000);
    let f = function(_i) { let i = _i+1; return i; };
    let ff = Logger.pf(f);
    let result = [];
    let cur = 0;
    let iterations = 500000;

    // regular function
    cur = performance.now();
    for (let i=0; i<iterations; i++) { f(1); }
    result[0] = performance.now() - cur;

    // instrumented function
    cur = performance.now();
    for (let i=0; i<iterations; i++) { ff(1); }
    result[1] = performance.now() - cur;

    logger.info(`regular function time : ${result[0].toFixed(2)} ms`);
    logger.info(`instrumented function time : ${result[1].toFixed(2)} ms `);
    logger.info(`overhead: ${((result[1] - result[0])/ result[0]).toFixed(2)} %`);
  });


  // reachability


  it('> code reachability: function', async function() {
    // logger.info('--- unnamed function');
    // try { Logger.pfCoverageReport(function() { return 'f'; }); } catch (e) {} // eslint-disable-line brace-style
    let e = function() { return 'e'; };

    logger.info('--- instance of e, ee function');
    try { Logger.pfCoverageReport(e); } catch (e) {} // eslint-disable-line brace-style

    logger.info('--- variable e function, instrument it');
    e = Logger.pfCoverage(e, 'e');
    logger.info('--- variable e function, instrumented');
    Logger._pfCoverageReport_f(e, 'e');
    logger.info('--- variable e function, called');
    expect( Logger.pfTotalCalls(e) ).to.equal(0);
    e();
    logger.info('--- variable e function, report after called');
    Logger._pfCoverageReport_f(e, 'e');
    expect( Logger.pfTotalCalls(e) ).to.equal(1);

    Logger.pfCoverageReport(e, 'full report on "e"');
  });

  it.only('> code reachability: class', async function() {
    logger.info('A.cFunc: ', A.cFunc);
    Logger.pfClass(A);
    logger.info('A.cFunc: ', A.cFunc);
    logger.info('A._wl: ', A._wl);
    let a = new A('a', 'b');
    let aa = new AA('a', 'b');

    logger.info('a.cFunc: ', a.cFunc);

    A.cFunc(); // hits static function A.cFunc
    AA.aaStaticFunc(); // hits static function of AA
    a.aFunc();
    Logger.pfCoverageReport(a);

    // static functions
    logger.info('A.cFunc: ', A.cFunc);
    expect(Logger.pfIs(A.cFunc)).to.equal(true);
    expect(Logger.pfIs(A.dFunc)).to.equal(true);
    logger.info('A.cFunc: ', A.cFunc, Logger.pfTotalCalls(A.cFunc));
    expect(Logger.pfTotalCalls(A.cFunc)).to.equal(1);
    expect(Logger.pfTotalCalls(A.dFunc)).to.equal(0);

    // non-static functions
    expect(Logger.pfIs(a.aFunc)).to.equal(true);
    expect(Logger.pfIs(a.bFunc)).to.equal(true);
    expect(Logger.pfTotalCalls(a.aFunc)).to.equal(1);
    expect(Logger.pfTotalCalls(a.bFunc)).to.equal(0);

    // AA has not been instrumented, so check then instrument
    expect(Logger.pfIs(AA.aaStaticFunc)).to.equal(false);
    Logger.pfClass(AA);
    expect(Logger.pfTotalCalls(A.cFunc)).to.equal(1);         // still 1, even though just did pfClass of AA (which has A has parent)
    expect(Logger.pfIs(AA.aaStaticFunc)).to.equal(true);
    expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(0); // 0 since first call was before it was instrumented
    AA.aaStaticFunc(); // hits static function of AA
    expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(1); // 1 since just called

    expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func
    A.cFunc();
    expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func

    // pfClass again should do nothing
    logger.info('AA.aaStaticFunc 1: ', AA.aaStaticFunc);
    Logger.pfClass(AA);
    logger.info('AA.aaStaticFunc 2: ', AA.aaStaticFunc);
    expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func
    expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(1);

  });


  it('> code reachability: object', async function() {

    // logger.info('-- class A'); Logger.spew(A);
    // logger.info('-- class AA'); Logger.spew(AA);
    logger.info('-- object a of class A');
    let a = new A('a', 'b');
    logger.info('-- object aa of class AA');
    let aa = new AA('a', 'b');

    logger.h2().info('-- covering a and aa');
    Logger.pfInstance(a);
    Logger.pfInstance(aa);

    logger.info('-- calling a.aFunc()');
    a.aFunc(); // hits A.aFunc
    a.bFunc(); // hits A.bFunc
    logger.info('-- calling aa.aFunc()');
    aa.aFunc(); // hits AA.aFunc, calling A.aFunc
    aa.bFunc(); // hits A.bFunc

    logger.h2().info('-- a Coverage Report');
    Logger.pfCoverageReport(a);
    Logger.pfCoverageReport(aa);

    expect(Logger.pfTotalCalls(a.aFunc)).to.equal(2);
    expect(Logger.pfTotalCalls(a.bFunc)).to.equal(2);

    expect(Logger.pfTotalCalls(aa.aFunc)).to.equal(1); // a.aFunc and aa.aFunc are different
    expect(Logger.pfTotalCalls(aa.bFunc)).to.equal(2); // aa.bFunc is same as a.bFunc

  });

  it('> code reachability: pseudo class');

  /*
  it('> manually descend', async function() {
    let aa = new AA('a', 'b');
    // logger.info('A.constructor: ', Object.getOwnPropertyNames(A.constructor));
    // logger.info('A.constructor.prototype: ', Object.getOwnPropertyNames(A.constructor.prototype));
    //
    logger.info('A:P ', Object.getOwnPropertyNames(A));
    logger.info('A.prototype:  ', A.prototype);
    logger.info('A.prototype.__proto__:  ', A.prototype.__proto__, A.prototype.__proto__ === Object.prototype);
    logger.info('A.prototype:P ', Object.getOwnPropertyNames(A.prototype));
    logger.info('A.__proto__:  ', A.__proto__);
    logger.info('A.__proto__:P ', Object.getOwnPropertyNames(A.__proto__));
    // logger.info('A.prototype.constructor (static):  ', A.prototype.constructor);
    // logger.info('A.prototype.constructor (static):P ', Object.getOwnPropertyNames(A.prototype.constructor));

    logger.h1();
    logger.info('AA: ', Object.getOwnPropertyNames(AA));
    logger.info('AA.constructor: ', AA.constructor);
    logger.info('AA.prototype.constructor: ', AA.prototype.constructor);
    logger.info('AA.prototype.__proto__.constructor: ', AA.prototype.__proto__.constructor);
    logger.info('AA.prototype:  ', AA.prototype, Object.getPrototypeOf(AA) == AA.prototype, Object.getPrototypeOf(AA) == AA.__proto__ );
    logger.info('AA.prototype.__proto__:  ', AA.prototype.__proto__);
    logger.info('AA.prototype:P ', Object.getOwnPropertyNames(AA.prototype));
    logger.info('AA.__proto__:P ', Object.getOwnPropertyNames(Object.getPrototypeOf(AA)));
    // logger.info('AA.prototype.prototype == A.prototype ? ', A.prototype == Object.getPrototypeOf(AA.prototype));
    logger.info('AA.prototype.__proto__: ', Object.getOwnPropertyNames(Object.getPrototypeOf(AA.prototype)));
    logger.info('AA.prototype.__proto__.__proto__: ', Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(AA.prototype))));

    logger.info('aa.prototype: ', aa.prototype);
    // logger.info('aa.prototype.__proto__: ', aa.prototype.__proto__);
    logger.h1();
    logger.info('A.__proto__: ', A.__proto__, A.__proto__ === Object);
    logger.info('AA.__proto__: ', AA.__proto__);
    logger.info('aa.__proto__: ', aa.__proto__);

    logger.info('AA.prototype.__proto__ === A.prototype : ', AA.prototype.__proto__ === A.prototype);
    logger.info('A.prototype.__proto__ === Object.prototype : ', A.prototype.__proto__ === Object.prototype);

    // object with functions
    let fff = {
      fffFunc : function() { return 1; },
    };

    // generating function
    let ff = function ff() { this.ffFunc = function() { return 1; }; return this; };
    let ffr = ff();

    // regular function
    let f = function f() { return 1; };
    logger.info('f.prototype: ', f.prototype);
    logger.info('f.__proto__: ', f.__proto__, f.__proto__ === Function.prototype);
    logger.info('f.prototype.prototype: ', f.prototype.prototype);
    logger.info('f.prototype.__proto__: ', f.prototype.__proto__);
    logger.info('f.__proto__.prototype: ', f.__proto__.prototype);
    logger.info('f.__proto__.__proto__: ', f.__proto__.__proto__, f.__proto__.__proto__ === Object.prototype);
    logger.info('f.__proto__.__proto__.__proto__: ', f.__proto__.__proto__.__proto__);

    logger.info('f instanceof Object',   f instanceof Object);
    logger.info('f instanceof Function', f instanceof Function);
    logger.info('aa instanceof Object',   aa instanceof Object);
    logger.info('aa instanceof Function', aa instanceof Function);
    logger.info('A instanceof Object',   A instanceof Object);
    logger.info('A instanceof Function', A instanceof Function);
    logger.info('AA instanceof Object',   AA instanceof Object);
    logger.info('AA instanceof Function', AA instanceof Function);
    logger.info('Object instanceof Function', Object instanceof Function);
    logger.info('Function instanceof Object', Function instanceof Object);

    logger.info('aa:P ', Object.getOwnPropertyNames(aa));
    logger.info('aa.__proto__:P ', Object.getOwnPropertyNames(aa.__proto__));
    logger.info('aa.__proto__.__proto__:P ', Object.getOwnPropertyNames(aa.__proto__.__proto__));

    logger.info('aa.constructor: ', aa.constructor);
    logger.info('A.constructor: ', A.constructor);
    logger.info('AA.constructor: ', AA.constructor);

    logger.info('aa.constructor.name : ', aa.constructor.name);
    logger.info('aa.name : ', aa.name);
    logger.info('A.name : ', A.name);
    logger.info('A.constructor.name : ', A.constructor.name, typeof A.constructor.name);
    logger.info('A.prototype.constructor.name : ', A.prototype.constructor.name);

    logger.info('f : ',   f.__proto__ !== undefined,   f.prototype !== undefined,   f.constructor !== undefined);
    logger.info('ff : ',  ff.__proto__ !== undefined,  ff.prototype !== undefined,  ff.constructor !== undefined);
    logger.info('ffr : ', ffr.__proto__ !== undefined, ffr.prototype !== undefined, ffr.constructor !== undefined);
    logger.info('fff : ', fff.__proto__ !== undefined, fff.prototype !== undefined, fff.constructor !== undefined);
    logger.info('aa : ',  aa.__proto__ !== undefined,  aa.prototype !== undefined,  aa.constructor !== undefined);
    logger.info('A : ',   A.__proto__ !== undefined,   A.prototype !== undefined,   A.constructor !== undefined);
    logger.info('AA : ',  AA.__proto__ !== undefined,  AA.prototype !== undefined,  AA.constructor !== undefined);

    // diff generated f, obj w/ function and instance
    logger.info('ffr : ', ffr.__proto__, ':', ffr.prototype, ':', ffr.constructor, ':', ffr.constructor.name, ':', ffr.constructor.prototype == Object.prototype );
    logger.info('fff : ', fff.__proto__, ':', fff.prototype, ':', fff.constructor, ':', fff.constructor.name, ':', fff.constructor.prototype == Object.prototype );
    logger.info('aa  : ', aa.__proto__, ':',  aa.prototype, ':',  aa.constructor,  ':', aa.constructor.name, ':', aa.constructor.prototype == Object.prototype );

    logger.h3().info('diff func, generating func, class : f, ff, A,AA');
    [['f', f], ['ff', ff], ['A', A], ['AA', AA]].forEach( function(v) {
      logger.info(`${v[0]} : `, v[1].toString().startsWith('class'));
      // logger.info(`${v[0]} : `, v[1].__proto__, ':', v[1].constructor, ':', v[1].constructor.name, v[1] );
    });

    [
      ['null', null],
      ['undefined', undefined],
      ['bool', true],
      ['int', 1],
      ['string', 'hi'],
      ['float', 1.1],
      ['symbol', Symbol()],
      ['f', f],
      ['ff', ff],
      ['ffr', ffr],
      ['fff', fff],
      ['aa', aa],
      ['A', A],
      ['AA', AA],
    ].forEach( function(v) {
      logger.info(`${v[0]} : ${typeof v[1]}`, Logger.typeof(v[1]));
    });


    exit(1);
    Logger._pfCoverage(aa, 'aa', 'object');
    Logger._pfCoverage(A, 'A', 'class');
    Logger._pfCoverage(AA, 'AA', 'class');
    Logger._pfCoverage(f, 'f', 'function');
    Logger._pfCoverage(ff, 'ff', 'generating function');
    Logger._pfCoverage(ffr, 'ffr', 'generated function');
    Logger._pfCoverage(fff, 'fff', 'objectwithfunctions');
    exit(1);

    // logger.info('AA.prototype.constructor (static):  ', AA.prototype.constructor);
    // logger.info('AA.prototype.constructor (static):P ', Object.getOwnPropertyNames(AA.prototype.constructor));
    // logger.info('AA.prototype.prototype: ', Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(AA))));

    // logger.info('AA.prototype.constructor.prototype: ', Object.getOwnPropertyNames(AA.prototype.constructor.prototype));
    // logger.info('AA.prototype.constructor.prototype.constructor (static): ', Object.getOwnPropertyNames(AA.prototype.constructor.prototype.constructor));
  });
  */


  it('> code reachability: class', async function() {
    logger.info('-- class A');
    Logger.spew(A);
    logger.info('-- class AA');
    Logger.spew(AA);

    logger.h2().info('-- covering A and AA');
    Logger.pfCoverageClass(A);
    Logger.pfCoverageClass(AA);

    logger.info('-- object a of class A');
    let a = new A('a', 'b');
    logger.info('-- object aa of class AA');
    let aa = new AA('a', 'b');

    logger.info('-- calling a.aFunc()');
    a.aFunc(); // hits A.aFunc
    a.bFunc(); // hits A.bFunc
    logger.info('-- calling aa.aFunc()');
    aa.aFunc(); // hits AA.aFunc, calling A.aFunc
    aa.bFunc(); // hits A.bFunc

    logger.h2().info('-- a Coverage Report');
    Logger.pfCoverageReport(a);
    Logger.pfCoverageReport(aa);

    expect(Logger.pfTotalCalls(a.aFunc)).to.equal(2);
    expect(Logger.pfTotalCalls(a.bFunc)).to.equal(2);

    expect(Logger.pfTotalCalls(aa.aFunc)).to.equal(1); // a.aFunc and aa.aFunc are different
    expect(Logger.pfTotalCalls(aa.bFunc)).to.equal(2); // aa.bFunc is same as a.bFunc

  });
  it('> code reachability all', async function() {


    Logger.pfCoverageClass(A);
    Logger.pfCoverageClass(B);
    Logger.pfCoverageObject(D);

    let a = new A('a', 'b');
    let a1= new A('a1', 'b1');
    let c = {cFunc : function() { return c; }, cval : 1};
    let d = new D();
    let e = function() { return 'e'; }

    Logger.pfCoverageObject(a, 'a');
    Logger.pfCoverageObject(c, 'c');
    Logger.pfCoverageObject(d, 'd');
    Logger.pfCoverageObject(e, 'e');

    a.aFunc();
    c.cFunc();
    e();

    Logger.pfCoverageReport(A);  // show for A
    Logger.pfCoverageReport(a, 'a');  // show for a, instance of A
    Logger.pfCoverageReport(a1); // show for a1 (never instrumented)

    Logger.pfCoverageReport(B);  // show for B

    Logger.pfCoverageReport(c, 'c');  // show for c (object with funcs)

    Logger.pfCoverageReport(D);  // show for D, generating function
    Logger.pfCoverageReport(d, 'd');  // show for d (generated object)

    Logger.pfCoverageReport(e);  // show for e (function)

    Logger.pfCoverageReport();   // show for all
  });

});
