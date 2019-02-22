const Logger = require('../index.js');


Logger.g().h2().info('Header h2 above');
Logger.g().h2('a').info('No header');
Logger.g().setAspect('a');
Logger.g().h2('a').info('Header "a" above');
Logger.g().setAspect('a', false);
Logger.g().h2('a').info('No Header');
Logger.g().h2().info('Header h2 above');
