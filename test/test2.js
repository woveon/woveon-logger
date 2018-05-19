
// Imported Code
const should            = require('should');

// Actual Code
const Logger            = require('../index');


let mtag = require('path').basename(__filename).slice(0, -3);
let logger = new Logger(`${mtag} Logger`, {debug : true, showName : true});


function f1(a, b, c) {
  console.log('--- f1 ---');
  console.log(`f1 arg a: ${a}`);
  console.log(`f1 arg b: ${b}`);
  console.log(`f1 arg c: ${c}`);
}

let f2 = (a, b, c) => {
  console.log('--- f2 ---');
  console.log(`f2 arg a: ${a}`);
  console.log(`f2 arg b: ${b}`);
  console.log(`f2 arg c: ${c}`);
};

/**
 */
class A {

  /**
   * @param {*} a1 -
   * @param {*} b1 -
   */
  constructor(a1, b1) {
    this.Aa1 = a1;
    this.Ab1 = b1;

    this.f4 = logger.wrapAFunc(async (a) => {
      console.log('f4:', a);
      this.Ab1 = a;
    });

  }

  /**
   * @param {*} a -
   * @param {*} b -
   */
  async f3(a, b) {
    if ( a ==2 ) {
      console.log('pausing for 90ms');
      await new Promise( (resolve) => setTimeout(resolve, 90));
    }
    console.log('--- f3 ---');
    console.log('A.f3 called');
    console.log(`A.f3 arg a: ${a}`);
    console.log(`A.f3 arg b: ${b}`);
//    console.log(`A's this : `, this);
    console.log(`A.Aa1 : ${this.Aa1}`);
    console.log(`A.Ab1 : ${this.Ab1}`);
    this.Aa1 = a;
    this.Ab1 = b;
  }

}

describe(`${mtag}: Wrap function`, () => {

  it(`${mtag}: wrap function`, async () => {
    logger.info(`${mtag}: logger`);

    funcs = {};

    funcs.f1 = logger.wrapFunc(f1,   'wrapped function f1');
    funcs.f1(1, 2, 3);
    funcs.f1(1, 2);
    funcs.f1(1, 2, 3, 4);

    funcs.f2 = logger.wrapFunc(f2,   'wrapped arrow function f2');
    funcs.f2(4, 5, 6);

    funcs.f1a = logger.wrapAFunc(f1,   'wrapped function f1 async');
    await funcs.f1a(1, 2, 3);

    funcs.f2a = logger.wrapAFunc(f2,   'wrapped arrow function f2 async');
    await funcs.f2a(4, 5, 6);


    let a = new A('y', 'z');
    a.f3 = logger.wrapMethod(a, a.f3, 'wrapped class A\'s method function f3');
    a.f3(7, 8, 9);
    // console.log(' a\'s data sohuld be changed:', a.Aa1, a.Ab1);
    should.equal(a.Aa1, 7);
    should.equal(a.Ab1, 8);
    // console('calling a second time');
    a.f3(8, 9);
    should.equal(a.Aa1, 8);
    should.equal(a.Ab1, 9);

    a.f3a = logger.wrapAMethod(a, a.f3, 'wrapped class A\'s async method function f3');
    await a.f3a(1, 2, 3);
    should.equal(a.Aa1, 1);
    should.equal(a.Ab1, 2);

    let m = a.f3a(2, 3, 4);
    should.equal(a.Aa1, 1);
    should.equal(a.Ab1, 2);
    console.log('abcde');
    await m;
    await new Promise( (resolve) => {console.log('pause 100ms'); setTimeout(resolve, 100);});
    console.log('fghij');
    should.equal(a.Aa1, 2);
    should.equal(a.Ab1, 3);

    // pause
    // await new Promise( (resolve) => setTimeout(resolve, 100));


    await a.f4(6);
    should.equal(a.Ab1, 6);

  });

});


