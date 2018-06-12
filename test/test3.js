// Imported Code
const should = require('should');

// Actual Code
const Logger = require('../index');


let mtag   = require('path').basename(__filename).slice(0, -3);
let logger = null;

describe(`${mtag}: Env variable checks for aspects`, () => {

  before(function() {
    process.env.WOV_LOGGER_ASPECTS='';
  });

  it(`${mtag}: simple checks (1/2 showing)`, async () => {

    process.env.WOV_LOGGER_ASPECTS='';
    console.log(`'${process.env.WOV_LOGGER_ASPECTS}'`);
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true});
    logger.aspect('A', `This should not show: ${process.env.WOV_LOGGER_ASPECTS}`);

    process.env.WOV_LOGGER_ASPECTS='A';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true});
    logger.aspect('A', `This should     show: ${process.env.WOV_LOGGER_ASPECTS}`);

  });

  it(`${mtag}: false checks : (0/2 showing)`, async () => {

    process.env.WOV_LOGGER_ASPECTS='!A';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true});
    logger.aspect('A', `This should not show: ${process.env.WOV_LOGGER_ASPECTS}`);

    process.env.WOV_LOGGER_ASPECTS='!A';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true}, {'A' : true});
    logger.aspect('A', `This should not show: ${process.env.WOV_LOGGER_ASPECTS}`);
  });

  it(`${mtag}: override checks: (2/4 showing)`, async () => {
    process.env.WOV_LOGGER_ASPECTS='!A';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true}, {'A' : true});
    logger.aspect('A', `This should not show: ${process.env.WOV_LOGGER_ASPECTS}`);
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true}, {'A' : false});
    logger.aspect('A', `This should not show: ${process.env.WOV_LOGGER_ASPECTS}`);
    process.env.WOV_LOGGER_ASPECTS='A';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true}, {'A' : true});
    logger.aspect('A', `This should     show: ${process.env.WOV_LOGGER_ASPECTS}`);
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true}, {'A' : false});
    logger.aspect('A', `This should     show: ${process.env.WOV_LOGGER_ASPECTS}`);
  });

});


describe(`${mtag}: Env variable checks for aspects`, () => {

  it(`${mtag}: no env set`, async () => {

    delete process.env.WOV_LOGGER_OPS
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true, color : 'green'});
    logger.aspect('A', `This should be green: ${process.env.WOV_LOGGER_OPS}`);

    process.env.WOV_LOGGER_OPS='{}';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true, color : 'green'});
    logger.aspect('A', `This should be green: ${process.env.WOV_LOGGER_OPS}`);

    process.env.WOV_LOGGER_OPS='{"color" : "blue" }';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true, color : 'green'});
    logger.aspect('A', `This should be blue: ${process.env.WOV_LOGGER_OPS}`);

    process.env.WOV_LOGGER_OPS='{"debug" : "false" }';
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true, color : 'green'});
    logger.aspect('A', `This should be no debug: ${process.env.WOV_LOGGER_OPS}`);

    delete process.env.WOV_LOGGER_OPS
    logger = new Logger(`${mtag} Logger`, {debug : true, showName : true, color : 'green'});
    logger.aspect('A', `This should be green: ${process.env.WOV_LOGGER_OPS}`);
  });
});

