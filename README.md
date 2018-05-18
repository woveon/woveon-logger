# woveon-logger
> A simple logger with: color, file and line number reporting, both aspect and levels of logging, and other sugar in the syntax.

The main feature wanted was a logger that spewed a line and file in my source code. Additional feature were added to the logger over time.

## Example output

![Sample logger output (from mocha test)](img/sampleoutput.png?raw=true "Sample Logger Output")

Generated with code:

```
let logger1 = new Logger('logger1', {level : 'info'});
let logger2 = new Logger('logger2', {level : 'verbose', showName : true, debug: true});
logger1.info('general logging information');
logger1.set('showName', true).info('showing logger name');
logger1.warn('warning message, always shows file and line number');
logger1.error('error message, always shows file and line number');
logger1.set('debug', true).info('adding file and line numbers to regular output');
logger1.verbose('undisplayed verbose logging information');
logger2.verbose('verbose logging information');
logger2.aspect('aspect1', 'undisplayed aspect text');
logger1.setAspect('aspect1');
logger1.aspect('aspect1', 'displayed aspect text');
logger1.set('color', 'blue').info('a splash of color');
logger1.info('still colored');
logger1.set('color', false);
logger1.info('back to normal color');
logger1.with('color', 'magenta').info('a one-time splash of color');
logger1.info('back to default color');
```

## Features

* Prints line and file of the log message
* Named log channels (ex. Logger1, Logger2, etc.), levels of concern (info, warn, error, verbose) and cross-cutting tagged concerns (ex. lib, fetcher, backend, listener, etc.). 
* Expressive sugar syntax:
  * Colorized output
  * Supports h1,h2,h3 styled tags in log files.
  * One time use settings via 'with'.
  * 'throwError' to display the error message AND throw an exception with the same log message (I know right!).


## Usage

    let logger = new Logger('A');
    
    // standard usage
    logger.info('Info message log');
    logger.warn('Warning message. Shows up yellow and with debuggin file and line number.');
    logger.error('Error message. Red with debug spew.');
    logger.throwError('Error message. Red with debug spew AND throw an exception with this message');
    
    // Color and Headings
    logger.h1().info('Creates a newline above and wall of *.');
    logger.with('color', 'blue').info('Logs an info message in blue, but next messages are normal.');
    logger.set('color','blue'); // changes default color to blue
    
    // Tags
    logger.setLogTag('TagA',true);                              // creates the tag
    logger.log('TagA','Logs with the tag 'TagA' showing.');
    logger.setLogTag('TagA',false);                             // turns the tag off
    logger.log('TagA','Logs nothing, so can ignore all message related to this tag.');
    logger.setLogTag('TagA',{color: 'blue'});                   // all TagA messages will be blue.
 
    
