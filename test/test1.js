
// Imported Code
const should            = require('should');

// Actual Code
const Logger            = require('../index');


let mtag = require('path').basename(__filename).slice(0,-3);
let logger = new Logger(mtag,{debug: true, showName: true});

describe(`${mtag}: Logger code testing`, () => {

  it(`${mtag}: logger`, () => {
    logger.info(`${mtag}: logger`);

    let logger1 = new Logger('Test1', {});
    logger1.info('info1');
    logger1.warn('warn1');
    logger1.error('error1');
  });

  it(`${mtag}: logger 2`, () => {
    logger.info(`${mtag}: logger 2`);

    let logger1 = new Logger('Test1', {showName: true});
    let logger2 = new Logger('Test2', {showName: true});
    logger1.info('info1');
    logger1.info('info1', 'info1a');
    logger1.error('error1');
    logger2.info('info2');
    logger2.error('error2');
  });

  it('logger log levels', () => {
    logger.info('logger log levels');

    let logger1 = new Logger('test', {level: 'info', outputTo: 'string'});
    logger1.info('foo').should.not.be.null();
    should.equal(logger1.verbose('bar'), null);
  });

  it('logger logTags', () => {
    logger.info('logger logTags');

    let logger1 = new Logger('test', {outputTo: 'string'});
    let logger2 = new Logger('spew', {showName: true});

    console.log('A1: creating tag as false, so no output');
    logger1.setLogTag('A', false);
    logger2.setLogTag('A', false);
    logger2.log('A', 'A1');
    should.equal(logger1.log('A', 'A1'), null);
    console.log( ' : ', Object.keys(logger1.logtags).length);
    Object.keys(logger1.logtags).length.should.be.equal(1);
    logger1.logtags['A'].forceLog.should.be.false();

    console.log('A2: Setting tag true, so output');
    logger1.setLogTag('A', true);
    logger2.setLogTag('A', true);
    logger2.log('A', 'A2');
    should.notEqual(logger1.log('A', 'A2'), null);
    logger1.logtags['A'].forceLog.should.be.true();

    console.log('A3: Setting tag with color, so output in blue');
    logger1.setLogTag('A', { color: 'blue' });
    logger2.setLogTag('A', { color: 'blue' });
    logger2.log('A', 'A3');
    should.notEqual(logger1.log('A', 'A3'), null);
    logger1.logtags['A'].forceLog.should.be.true();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A4: Setting tag false again, so no output');
    logger1.setLogTag('A', false);
    logger2.setLogTag('A', false);
    logger2.log('A', 'A4');
    should.equal(logger1.log('A', 'A4'), null);
    Object.keys(logger1.logtags).length.should.be.equal(1);
    logger1.logtags['A'].forceLog.should.be.false();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A5: Setting tag true, so output, retaining blue');
    logger1.setLogTag('A', true);
    logger2.setLogTag('A', true);
    logger2.log('A', 'A5');
    should.notEqual(logger1.log('A', 'A5'), null);
    logger1.logtags['A'].forceLog.should.be.true();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A6: Setting tag {}, so overwrite settings, output');
    logger1.setLogTag('A', {});
    logger2.setLogTag('A', {});
    logger2.log('A', 'A6');
    should.notEqual(logger1.log('A', 'A6'), null);
    Object.keys(logger1.logtags).length.should.be.equal(1);
    Object.keys(logger1.logtags['A']).length.should.be.equal(1);
    logger1.logtags['A'].forceLog.should.be.true();
    should.equal(logger1.logtags['A'].color,null);
  });


  it(`${mtag}: logger tempOptions using 'with'`, function() {
    logger.h3().info(this.test.title);

    let logger1 = new Logger('test');

    logger1.info('Shold be normal');
    logger1.with('color', 'blue').info('Should be temp blue');
    logger1.info('Shold be normal');
    logger1.set('color', 'red').info('Should be perm red');
    logger1.info('Should be red still');
    logger1.with({color: null}).info('Should be temp normal');
    logger1.info('Should be red still');
    logger1.set('color', null).info('Should be normal');

  });


  it(`${mtag}: logger throw Errors`, function() {
    logger.h3().info(this.test.title);

    let logger1 = new Logger('test');
    let emsg = 'An error message';
    try {
      logger1.throwError(emsg);

    } catch (err) {
      err.message.endsWith(emsg).should.equal(true);
    };
  });


});


