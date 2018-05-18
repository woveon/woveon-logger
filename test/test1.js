
// Imported Code
const should            = require('should');

// Actual Code
const Logger            = require('../index');


let mtag = require('path').basename(__filename).slice(0, -3);
let logger = new Logger(`${mtag} Logger`, {debug : true, showName : true});

describe(`${mtag}: Logger code testing`, () => {

  it(`${mtag}: logger`, async () => {
    logger.info(`${mtag}: logger`);


    console.log("// let logger1 = new Logger('logger1', {level : 'info'});");
    let logger1 = new Logger('logger1', {level : 'info'});
    console.log("// let logger2 = new Logger('logger2', {level : 'verbose', showName : true, debug: true});");
    let logger2 = new Logger('logger2', {level : 'verbose', showName : true, debug: true});
    console.log("// logger1.info('general logging information');");
    logger1.info('general logging information');
    console.log("// logger1.set('showName', true).info('showing logger name');");
    logger1.set('showName', true).info('showing logger name');
    console.log("// logger1.warn('warning message, always shows file and line number');");
    logger1.warn('warning message, always shows file and line number');
    console.log("// logger1.error('error message, always shows file and line number');");
    logger1.error('error message, always shows file and line number');
    console.log("// logger1.set('debug', true).info('adding file and line numbers to regular output');");
    logger1.set('debug', true).info('adding file and line numbers to regular output');
    console.log("// logger1.verbose('undisplayed verbose logging information');");
    logger1.verbose('undisplayed verbose logging information');
    console.log("// logger2.verbose('verbose logging information');");
    logger2.verbose('verbose logging information');
    console.log("// logger2.aspect('aspect1', 'undisplayed aspect text');");
    logger2.aspect('aspect1', 'undisplayed aspect text');
    console.log("// logger1.setAspect('aspect1');");
    logger1.setAspect('aspect1');
    console.log("// logger1.aspect('aspect1', 'displayed aspect text');");
    logger1.aspect('aspect1', 'displayed aspect text');
    console.log("// logger1.set('color', 'blue').info('a splash of color');");
    logger1.set('color', 'blue').info('a splash of color');
    console.log("// logger1.info('still colored');");
    logger1.info('still colored');
    console.log("// logger1.set('color', false);");
    logger1.set('color', false);
    console.log("// logger1.info('back to normal color');");
    logger1.info('back to normal color');
    console.log("// logger1.with('color', 'magenta').info('a one-time splash of color');");
    logger1.with('color', 'magenta').info('a one-time splash of color');
    console.log("// logger1.info('back to default color');");
    logger1.info('back to default color');

    // logger1.h1().h2().h3().info('after headers');
  });

  it(`${mtag}: logger 2`, async () => {
    logger.info(`${mtag}: logger 2`);

    let logger1 = new Logger('Logger1', {showName : true});
    let logger2 = new Logger('Logger2', {showName : true});
    logger1.info('info1');
    logger1.info('info1', 'info1a');
    logger1.error('error1');
    logger2.info('info2');
    logger2.error('error2');
  });

  it('logger log levels', async () => {
    logger.info('logger log levels');

    let logger1 = new Logger('Logger1', {level : 'info', outputTo : 'string'});
    logger1.info('foo').should.not.be.null();
    should.equal(logger1.verbose('bar'), null);
  });

  it('logger logTags', async () => {
    logger.info('logger logTags');

    let logger1 = new Logger('Logger1', {outputTo : 'string'});
    let logger2 = new Logger('Logger2', {showName : true});

    console.log('A1: creating tag as false, so no output');
    logger1.setAspect('A', false);
    logger2.setAspect('A', false);
    logger2.aspect('A', 'A1');
    should.equal(logger1.aspect('A', 'A1'), null);
    console.log(`logger1 logtag: length: ${Object.keys(logger1.logtags).length} `, Object.keys(logger1.logtags));
    Object.keys(logger1.logtags).length.should.be.equal(2); // 'A' and 'deprecated'
    logger1.logtags['A'].forceLog.should.be.false();

    console.log('A2: Setting tag true, so output');
    logger1.setAspect('A', true);
    logger2.setAspect('A', true);
    logger2.aspect('A', 'A2');
    should.notEqual(logger1.aspect('A', 'A2'), null);
    logger1.logtags['A'].forceLog.should.be.true();

    console.log('A3: Setting tag with color, so output in blue');
    logger1.setAspect('A', {color : 'blue'});
    logger2.setAspect('A', {color : 'blue'});
    logger2.aspect('A', 'A3');
    should.notEqual(logger1.aspect('A', 'A3'), null);
    logger1.logtags['A'].forceLog.should.be.true();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A4: Setting tag false again, so no output');
    logger1.setAspect('A', false);
    logger2.setAspect('A', false);
    logger2.aspect('A', 'A4');
    should.equal(logger1.aspect('A', 'A4'), null);
    Object.keys(logger1.logtags).length.should.be.equal(2);
    logger1.logtags['A'].forceLog.should.be.false();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A5: Setting tag true, so output, retaining blue');
    logger1.setAspect('A', true);
    logger2.setAspect('A', true);
    logger2.aspect('A', 'A5');
    should.notEqual(logger1.aspect('A', 'A5'), null);
    logger1.logtags['A'].forceLog.should.be.true();
    logger1.logtags['A'].color.should.be.equal('blue');

    console.log('A6: Setting tag {}, so overwrite settings, output');
    logger1.setAspect('A', {});
    logger2.setAspect('A', {});
    logger2.aspect('A', 'A6');
    should.notEqual(logger1.aspect('A', 'A6'), null);
    Object.keys(logger1.logtags).length.should.be.equal(2);
    Object.keys(logger1.logtags['A']).length.should.be.equal(1);
    logger1.logtags['A'].forceLog.should.be.true();
    should.equal(logger1.logtags['A'].color, null);
  });


  it(`${mtag}: logger tempOptions using 'with'`, async function() {
    logger.h3().info(this.test.title);

    let logger1 = new Logger('Logger1');

    logger1.info('Shold be normal');
    logger1.with('color', 'blue').info('Should be temp blue');
    logger1.info('Shold be normal');
    logger1.set('color', 'red').info('Should be perm red');
    logger1.info('Should be red still');
    logger1.with({color : null}).info('Should be temp normal');
    logger1.info('Should be red still');
    logger1.set('color', null).info('Should be normal');

  });


  it(`${mtag}: logger throw Errors`, async function() {
    logger.h3().info(this.test.title);

    let logger1 = new Logger('Logger1');
    let emsg = 'An error message';
    try {
      logger1.throwError(emsg);

    } catch (err) {
      err.message.endsWith(emsg).should.equal(true);
    };
  });


});


