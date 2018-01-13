# woveon-logger
> A simple logger with colorization and expressive syntax.

The main feature wanted was a logger that spewed a line and file in my source code. Additional feature were added to the logger over time, as well as making it more expressive in it's syntax.

## Example output

Looks better in color...

[2018-01-13T11:38:23.969Z] [INFO--] [test1] [             woveon-logger/test/test1:15] test1: logger
[2018-01-13T11:38:23.972Z] [INFO--] info1
[2018-01-13T11:38:23.972Z] [WARN--] [             woveon-logger/test/test1:19] warn1
[2018-01-13T11:38:23.972Z] [ERROR-] [             woveon-logger/test/test1:20] error1

## Features

* Prints line and file of the log message
* Named log channels (ex. Logger1, Logger2, etc.), levels of concern (info, warn, error, verbose) and cross-cutting tagged concerns (ex. lib, fetcher, backend, listener, etc.). 
* Expressive sugar syntax:
  * Colorized output
  * Supports h1,h2,h3 styled tags in log files.
  * One time use settings via 'with'.
  * 'throwError' to display the error message AND throw an exception with the same log message (I know right!).

