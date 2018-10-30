const Logger = require('../index.js');


Logger.g().info('Hello');
Logger.g().warn('Hello');
Logger.g().error('Hello');
Logger.g().verbose('Hello');
Logger.g().trace('Hello');
Logger.g().debug('Hello');
Logger.g().silly('Hello');

try {
  Logger.g().throwError(new Error('catch me'));
}
catch (e) { Logger.g().info('...caught: ', e.message); }


Logger.g().aspect('A', 'Hello A - quiet');
Logger.g().setAspect('A');
Logger.g().aspect('A', 'Hello A - display');
