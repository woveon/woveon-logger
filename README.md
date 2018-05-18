# woveon-logger
> A simple logger with: color, file and line number reporting, both aspect and levels of logging, and other sugar in the syntax.

The main feature wanted was a logger that spewed a line and file in my source code. Additional features were added to the logger over time.

## Sample output

I inlined the javascript that generated this output.

![Sample logger output (from mocha test)](img/sampleoutput.png?raw=true#asddd "Sample Logger Output")


## Features

* Prints line and file of the log message
* Named log channels (ex. Logger1, Logger2, etc.), levels of concern (info, warn, error, verbose) and cross-cutting tagged concerns (ex. lib, fetcher, backend, listener, etc.). 
* Expressive sugar syntax:
  * Colorized output
  * Supports h1,h2,h3 styled tags in log files. `logger.h1().info('text after a header 1 breaker`
  * One time use settings via 'with'.
  * styling of different log levels and aspects (which are not lost when toggled off)
  * `throwError` to display the error message AND throw an exception with the same log message (I know right!).
  * `logDeprecated` to warn when someone is using an out dated command
