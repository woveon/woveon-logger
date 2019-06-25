

const expect      = require('chai').expect;
const performance = require('perf_hooks').performance;

const Logger      = require('../index');

let mtag            = require('path').basename(__filename).slice(0, -3);
let logger          = new Logger(`${mtag} Logger`, {debug : true, showName : true});
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;


/**
 * Returns these, so each test has a clear class.
 */
function genClass(_string) {
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

  let retval = null;

  if      ( _string == 'A' )  retval = A;
  else if ( _string == 'AA' ) retval = AA;
  else if ( _string == 'B' )  retval = B;
  else if ( _string == 'D' )  retval = D;

  return retval;
};


describe(`>Test(${mtag}): profiling`, async function() {

  before(async function() {
  });

  describe.only('> instrumentation of things', async function() {

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

    it('> instrument an async function', async function() {
      let f = async function(_text) { console.log(_text); };
      let ff  = Logger._pf_ff(f);
      let ffa = Logger._pf_fa(f);

      ff('a');
      // logger.info('post: ff: ', ff._wl);
      expect(ff._wl.lastRun).to.not.be.null;
      expect(ff._wl.tCalls).to.equal(1);
      expect(ff._wl.tTime).to.not.equal(0);

      await ffa('a');
      // logger.info('post: ffa: ', ffa._wl);
      expect(ffa._wl.lastRun).to.not.be.null;
      expect(ffa._wl.tCalls).to.equal(1);
      expect(ffa._wl.tTime).to.not.equal(0);

    });

    it('> async Safe function', async function() {
      let f1 = function(_text) { console.log(_text); };
      let f2 = async function(_text) { console.log(_text); };
      let ff = null;

      ff = Logger._pf_f(f1);
      expect(ff instanceof AsyncFunction).to.be.false;
      // logger.info(' : ', ff instanceof AsyncFunction);
      ff('not async');
      await ff('not async');

      ff = Logger._pf_f(f2);
      expect(ff instanceof AsyncFunction).to.be.true;
      // logger.info(' : ', ff instanceof AsyncFunction);
      ff('async');
      await ff('async');
    });

    it('> instrument an object', async function() {
      let o = {oFunc : function() { return 'o'; }};

      let oo = Logger._pf_object(o);
      expect(oo.oFunc).to.not.be.null;
      expect(Logger.pfTotalCalls(oo.oFunc)).to.equal(0);
      expect(Logger.pfTotalCalls(o.oFunc)).to.equal(0);  // NOTE: this updates o too, since we don't want to deal with deep copy

      expect(oo.oFunc()).to.equal('o');
      expect(Logger.pfTotalCalls(oo.oFunc)).to.equal(1);
      expect(Logger.pfTotalCalls(o.oFunc)).to.equal(1);  // NOTE: this updates o too, since we don't want to deal with deep copy

      // create new one, restarts
      oo = Logger._pf_object(o);
      expect(Logger.pfTotalCalls(oo.oFunc)).to.equal(0);

      Logger._pf_object(o);
      expect(Logger.pfTotalCalls(oo.oFunc)).to.equal(0);

    });

    it('> instrument an instance', async function() {
      let A = genClass('A');

      // create an instance of a class
      let a = new A('a', 'b');

      // instrument an instance's function
      a.aFunc = Logger.pf(a.aFunc);
      expect(a.aFunc()).to.equal('a');
      expect(a.aFunc._wl.tCalls).to.equal(1);
      expect(a.aFunc()).to.equal('a');
      expect(a.aFunc._wl.tCalls).to.equal(2);

      // instrument an instance's async function
      a.bFunc = Logger.pf(a.bFunc);
      expect(await a.bFunc()).to.equal('b');
      expect(a.bFunc instanceof AsyncFunction).to.be.true;
      expect(a.bFunc._wl.tCalls).to.equal(1);

      // instrument an instance
      a = new A('a', 'b');
      let ai = Logger.pf(a);
      expect( Logger.pfTotalCalls(a.aFunc) ).to.equal(0);
      expect( Logger.pfTotalCalls(ai.aFunc) ).to.equal(0);
      expect( ai.aFunc() ).to.equal('a');
      expect( Logger.pfTotalCalls(a.aFunc) ).to.equal(1);
      expect( Logger.pfTotalCalls(ai.aFunc) ).to.equal(1);
      Logger.pf(a);
      expect( Logger.pfTotalCalls(a.aFunc) ).to.equal(1);
      expect( Logger.pfTotalCalls(ai.aFunc) ).to.equal(1);

      // create a new one and resets a, but not last one
      a = new A('a', 'b');
      Logger.pf(a);
      expect( Logger.pfTotalCalls(a.aFunc) ).to.equal(0);
      expect( Logger.pfTotalCalls(ai.aFunc) ).to.equal(1);

    });

    it.only('> instrument a class', async function() {
      let A = genClass('A');
      let AA = genClass('AA');
      // logger.info('A.cFunc: ', A.cFunc);
      Logger._pf_class(A);
      // logger.info('A.cFunc: ', A.cFunc);
      // logger.info('A._wl: ', A._wl);
      let a = new A('a', 'b');
      let aa = new AA('a', 'b');

      logger.info('a.cFunc: ', a.cFunc);

      A.cFunc(); // hits static function A.cFunc
      AA.aaStaticFunc(); // hits static function of AA
      a.aFunc();
      Logger.pfReportCoverage(a);

      // static functions
      logger.info('A.cFunc: ', A.cFunc);
      expect(Logger.pfIs(A.cFunc)).to.equal(true);
      expect(Logger.pfIs(A.dFunc)).to.equal(true);
      // logger.info('A.cFunc: ', A.cFunc, Logger.pfTotalCalls(A.cFunc));
      expect(Logger.pfTotalCalls(A.cFunc)).to.equal(1);
      expect(Logger.pfTotalCalls(A.dFunc)).to.equal(0);

      // non-static functions
      expect(Logger.pfIs(a.aFunc)).to.equal(true);
      expect(Logger.pfIs(a.bFunc)).to.equal(true);
      expect(Logger.pfTotalCalls(a.aFunc)).to.equal(1);
      expect(Logger.pfTotalCalls(a.bFunc)).to.equal(0);

      // AA has not been instrumented, so check then instrument
      expect(Logger.pfIs(AA.aaStaticFunc)).to.equal(false);
      logger.h3().info('re-pf-ing AA');
      Logger.pf(AA);
      expect(Logger.pfTotalCalls(A.cFunc)).to.equal(1);         // still 1, even though just did pf of AA (which has A has parent)
      expect(Logger.pfIs(AA.aaStaticFunc)).to.equal(true);
      expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(0); // 0 since first call was before it was instrumented
      AA.aaStaticFunc(); // hits static function of AA
      expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(1); // 1 since just called

      logger.h3().info('fails b/c AA.cFunc not same as A.cFunc');
      logger.info('A.cFunc: ', A.cFunc);
      logger.info('AA.cFunc: ', AA.cFunc);
      expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func
      A.cFunc();
      expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func

      // pf again should do nothing
      // logger.info('AA.aaStaticFunc 1: ', AA.aaStaticFunc);
      Logger.pf(AA);
      // logger.info('AA.aaStaticFunc 2: ', AA.aaStaticFunc);
      expect(Logger.pfTotalCalls(AA.cFunc)).to.equal( Logger.pfTotalCalls(A.cFunc) ); // same func
      expect(Logger.pfTotalCalls(AA.aaStaticFunc)).to.equal(1);

    });

    it('> pfIs on all things', async function() {
      let A = genClass('A');
      let AA = genClass('AA');
      let a = new A('a', 'b');
      let aa = new AA('a', 'b');
      let o = {oFunc : function() { return 'o'; }};

      console.log(' a has _wl:', a.hasOwnProperty('_wl'));
      console.log(' a.aFunc has _wl:', a.aFunc.hasOwnProperty('_wl'));
      expect(Logger.pfIs(a)).to.be.false;
      expect(Logger.pfIs(a.aFunc)).to.be.false;
      expect(Logger.pfIs(a.bFunc)).to.be.false;
      expect(Logger.pfIs(A.cFunc)).to.be.false;
      expect(Logger.pfIs(aa)).to.be.false;
      expect(Logger.pfIs(A)).to.be.false;
      expect(Logger.pfIs(AA)).to.be.false;
      expect(Logger.pfIs(o)).to.be.false;

      Logger.pf(A);
      expect(Logger.pfIs(A)).to.be.true;
      expect(Logger.pfIs(AA)).to.be.false;
      Logger.pf(AA);
      expect(Logger.pfIs(A)).to.be.true;
      expect(Logger.pfIs(AA)).to.be.true;

      let ai = Logger.pf(a);
      Logger.pf(aa);
      Logger.pf(o);
      expect(Logger.pfIs(a)).to.be.true;
      expect(Logger.pfIs(ai)).to.be.true;
      expect(Logger.pfIs(a.aFunc)).to.be.true;
      expect(Logger.pfIs(a.bFunc)).to.be.true;
      expect(Logger.pfIs(A.cFunc)).to.be.true;
      expect(Logger.pfIs(aa)).to.be.true;
      expect(Logger.pfIs(A)).to.be.true;
      expect(Logger.pfIs(AA)).to.be.true;
      expect(Logger.pfIs(o)).to.be.true;

    });


  });


  describe('> performance and correctness tests', async function() {

    it('> cache test', async function() {
      let f = function(_text) { console.log(_text); };
      let ff = Logger.pf(f);
      let iterations = 10;

      for (let i=0; i<iterations; i++) {
        ff(`${i}`); logger.info('          last run: ', Logger.pfLastRun(ff));
      }
    });

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

  });

  /*
   * intermediate test in development... not correct
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
  */

  /* // test case used in development
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

    / *
    Logger.pfClass(a);
    expect(a.aFunc._wl.tCalls).to.equal(0);
    expect(a.bFunc._wl.tCalls).to.equal(0);
    expect(a.aFunc()).to.equal('a');
    expect(a.aFunc._wl.tCalls).to.equal(1);
    expect(await a.bFunc()).to.equal('b');
    expect(a.bFunc._wl.tCalls).to.equal(1);
    * /

  });
  */

  // ---------------------------------------------------------------------
  // reachability
  // ---------------------------------------------------------------------

  describe(`> Reachabiliy `, async function() {

    it('> code reachability: function', async function() {
      let e = function() { return 'e'; };

      logger.info('--- instance of e, ee function');
      try { Logger.pfReportCoverage(e); } catch (e) {} // eslint-disable-line brace-style

      logger.info('--- variable e function, instrument it');
      e = Logger.pfCoverage(e, 'e');
      logger.info('--- variable e function, instrumented');
      Logger._pfReportCoverage_f(e, 'e');
      logger.info('--- variable e function, called');
      expect( Logger.pfTotalCalls(e) ).to.equal(0);
      e();
      logger.info('--- variable e function, report after called');
      Logger._pfReportCoverage_f(e, 'e');
      expect( Logger.pfTotalCalls(e) ).to.equal(1);

      Logger.pfReportCoverage(e, 'full report on "e"');
    });

    it('> code reachability: object');



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
      Logger.pfReportCoverage(a);
      Logger.pfReportCoverage(aa);

      expect(Logger.pfTotalCalls(a.aFunc)).to.equal(2);
      expect(Logger.pfTotalCalls(a.bFunc)).to.equal(2);

      expect(Logger.pfTotalCalls(aa.aFunc)).to.equal(1); // a.aFunc and aa.aFunc are different
      expect(Logger.pfTotalCalls(aa.bFunc)).to.equal(2); // aa.bFunc is same as a.bFunc

    });

    it('> code reachability: pseudo class');

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
      Logger.pfReportCoverage(a);
      Logger.pfReportCoverage(aa);

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
      let e = function() { return 'e'; };

      Logger.pfCoverageObject(a, 'a');
      Logger.pfCoverageObject(c, 'c');
      Logger.pfCoverageObject(d, 'd');
      Logger.pfCoverageObject(e, 'e');

      a.aFunc();
      c.cFunc();
      e();

      Logger.pfReportCoverage(A);  // show for A
      Logger.pfReportCoverage(a, 'a');  // show for a, instance of A
      Logger.pfReportCoverage(a1); // show for a1 (never instrumented)

      Logger.pfReportCoverage(B);  // show for B

      Logger.pfReportCoverage(c, 'c');  // show for c (object with funcs)

      Logger.pfReportCoverage(D);  // show for D, generating function
      Logger.pfReportCoverage(d, 'd');  // show for d (generated object)

      Logger.pfReportCoverage(e);  // show for e (function)

      Logger.pfReportCoverage();   // show for all
    });

  });

});
