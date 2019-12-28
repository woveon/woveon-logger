[![Total alerts](https://img.shields.io/lgtm/alerts/g/woveon/woveon-logger.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/woveon/woveon-logger/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/woveon/woveon-logger.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/woveon/woveon-logger/context:javascript)


# woveon-logger
> A logging toolkit with: color, file and line number reporting, both aspect and levels of logging, and other sugar in the syntax."


[NPM Location](https://www.npmjs.com/package/woveon-logger)

## Woveon is an enterprise conversation management software. Using AI and machine learning, it helps businesses take control of their conversations - to provide exceptional customer experience, audit for compliance, and maximize revenue.

## Sample output

I inlined the javascript that generated this output.

![Sample logger output (from mocha test)](img/sampleoutput.png?raw=true#asddd "Sample Logger Output")


## Features

* Debug mode: Prints line and file of the log message
* Named log channels (ex. Logger1, Logger2, etc.), levels of concern (info, warn, error, verbose) and aspect-oriented (i.e. cross-cutting through your project).
* Environment variables override options and aspects (quick reconfig, great for us container and microservice people).
* Expressive sugar syntax:
  * Colorized output
  * Supports h1,h2,h3 styled tags in log files. `logger.h1().info('text after a header 1 breaker')`
  * One time use settings via 'with'.
  * styling of different log levels and aspects (which are not lost when toggled off)
  * `throwError` to display the error message AND throw an exception with the same log message (I know right!).
  * `logDeprecated` to warn when someone is using an out dated command
  
### Calls, and Things to Know

- **instantiation**: `const Logger = require('woveon-logger');`

- **typical call**: `logger.info('foo')` or `logger.verbose('foo')` or `logger.error('foo')`

- **change log level**: error, warn, info, verbose, trace, debug, silly
  - ex. `logger.lvl('error')` or `logger.lvl('verbose')`

- **aspect-oriented logging**: 
  - turn aspect on: `logger.setAspect('foo');` or off: `logger.setAspect('foo', false)`
  - log when aspect set: `logger.aspect('foo', 'my logging message');`

- **throw Error**: logs the message and throws an error with that message: `logger.throwError('foo')`

- **with and set**: changes logging options for a one time call (with) or permanently (set)
  - `logger.with('color', 'blue').info('prints this blue')`

- **headers**: add spacing and dividers to your log files, to make them more human readable: h1(), h2(), h3()
  - `logger.h1().info('Important message!')` 
  
### Options

These options can be set at start `new Logger('mylogger', {level: 'verbose', debug: true})`, at run time `logger.set('color', 'blue')`, or at run time for use in only the next call `logger.with('color', 'blue')`.

  - level (default: 'info'): logging level... if at or lower, print message
  - debug (default: false): whether to print line and file information
  - debugOnError (default: true): whether to print line and file information for error and warnings
  - timeSinceStart (default: false): prints zulu time when false, time since start of execution if true
  - lblCharLen (default: 7): how many fixed characters to provide to displaying the label
  - dbCharLen (default: 40): how many fixed characters to provide to display the debug file and line number
  - showName (default: false): whether to show the logger name
  - trimTo (default: 'src'): how far back to trim displaying file names
  - outputTo (default: 'console'): can be set to 'string' to return the string instead of print it to console.
  - color (default: false): sets color, overriding 'colors'
  - colors (default: {'default' : 'none', 'error' : 'red', 'warn' : 'yellow', 'info' : 'green'}): can define default colors per log level
  
### Environment Variables

WOV\_LOGGER\_OPS - JSON format to overwrite logger options, by name. ex. export WOV\_LOGGER\_OPS='{"logger1" : {"color" : "blue"}, {"logger2" : {"color" : "green"}}'

WOV\_LOGGER\_ASPECTS - Space separated aspects to turn on (and with '!', turn off). ex. export WOV\_LOGGER\_ASPECTS='ASP1 ASP2 !ASP3'


