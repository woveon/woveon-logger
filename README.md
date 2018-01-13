# woveon-logger
> A simple logger with colorization and expressive syntax.

The main feature wanted was a logger that spewed a line and file in my source code. Additional feature were added to the logger over time, as well as making it more expressive in it's syntax.

## Example output

Looks better in color...


    [2018-01-13T11:38:23.969Z] [INFO--] [concern1] [             woveon-logger/test/test1:15] concern1: logger
    [2018-01-13T11:38:23.972Z] [INFO--] info1
    [2018-01-13T11:38:23.972Z] [WARN--] [             woveon-logger/test/test1:19] warn1
    [2018-01-13T11:38:23.972Z] [ERROR-] [             woveon-logger/test/test1:20] error1
    [2018-01-13T11:38:23.978Z] [h3----] [test1] [            woveon-logger/test/test1:103] -------------------------------------------------------
    [2018-01-13T11:38:23.979Z] [INFO--] [test1] [            woveon-logger/test/test1:103] Logged with 'h3' option

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
 
    
