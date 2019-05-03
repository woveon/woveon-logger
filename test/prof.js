

const expect      = require('chai').expect;
const performance = require('perf_hooks').performance;

const Logger      = require('../index');

let mtag          = require('path').basename(__filename).slice(0, -3);
let logger        = new Logger(`${mtag} Logger`, {debug : true, showName : true});

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
