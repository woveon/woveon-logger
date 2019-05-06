

const expect      = require('chai').expect;
const performance = require('perf_hooks').performance;

const Logger      = require('../index');

let mtag            = require('path').basename(__filename).slice(0, -3);
let logger          = new Logger(`${mtag} Logger`, {debug : true, showName : true});
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;


/** Used to test intrumenting object methods. */
class A {

  /** */
  constructor(_a, _b) { this.a = _a; this.b = _b; }

  /** */
  aFunc() { /* console.log('aFunc hit'); */ return this.a; }

  /** */
  async bFunc() { return this.b; }

  /** */
  static cFunc() { return A.c; }

  /** */
  static async dFunc() { return A.d; }
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

A.c = 'c';
A.d = 'd';


describe(`${mtag}: profiling`, async function() {

  before(async function() {
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

});
