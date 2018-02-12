

const sprintf = require('sprintf-js').sprintf;
const colors  = require('colors/safe');

if ( __line == undefined ) {
	Object.defineProperty(global, '__line', {get: () => {return __stack[1].getLineNumber();}});
}

if ( __stack == undefined ) {
Object.defineProperty(global, '__stack', {
  get: (...theArgs) => {
    let orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => {return stack;};
    let err = new Error;
    Error.captureStackTrace(err, theArgs.callee);
    let stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  },
});
}


module.exports = class Logger {
  /**
   * A custom logger.
   * @param {string} _name
   * @param {object} _options
   * @param {object} _logtags
   */
  constructor(_name, _options= {}, _logtags = {}) {
    this.name = _name;
    this.defaultOptions = {
      forceLog       : false,   // if true, logs despite any level settings. used for tags
      level          : 'info',
      debug          : false,
      debugOnError   : true,
      timeSinceStart : false,
      lblCharLen     : 7,
      dbCharLen      : 40,
      showName       : false,
      trimTo         : 'src',
      outputTo       : 'console', // or 'string'
      color          : false,     // sets color, overriding 'colors'
      colors         : {'default': 'none', 'error': 'red', 'warn': 'yellow', 'info': 'green'},
    };
    this.tempOptions = {};

    this.logLevels = {
      error   : 0,
      warn    : 1,
      info    : 2,
      verbose : 3,
      debug   : 4,
      silly   : 5,
    };

    // set logtags
    this.logtags = {};
    for (let tag in _logtags ) {
      if ( _logtags.hasOwnProperty(tag) ) {
        this.setLogTag(tag, _logtags[tag]);
      }
    }

    this.options = Object.assign({}, this.defaultOptions, _options);
//    console.log('Logger options ', this.options);
    this.private = {
      starttime: Date.now(),
    };
    //console.log('options', this.options);
  };


  /**
   * Standard logging messages.
   * @param {*} theArgs - array of variables to print
   * @return {*} - string if outputTo is true, null otherwise
   */
  info(...theArgs)    {return this._log('INFO', {}, theArgs);};
  warn(...theArgs)    {return this._log('WARN', {debug: true}, theArgs);};
  error(...theArgs)   {return this._log('ERROR', {debug: true}, theArgs);};
  verbose(...theArgs) {return this._log('VERBOSE', {}, theArgs);};


  /**
   * Throw an actual Error, not just show as error.
   * @param {*} theArgs - array of variables to print
   */
  throwError(...theArgs) {
    let retval = this.with({outputTo: 'string', forceLog: true, debug: true})
      ._log('ERROR', {}, theArgs);
    throw new Error(retval);
  }


  /**
   * User defined tags that can log when their values are defined and true.
   * ```
   *  logger.setLogTag('A',false);
   *  logger.log('A','A1');          // no output
   *  logger.setLogTag('A',true);
   *  logger.log('A','A2');          // output
   * ```
   * @param {string} _tag
   * @param {*} theArgs
   * @return {bool} true on success
   */
  log(_tag, ...theArgs) {
    // console.log(`***log : ${_tag}, ${JSON.stringify(this.logtags[_tag])}`);
    if ( this.logtags[_tag] != null ) {
      return this._log(_tag, this.logtags[_tag], theArgs );
    }
  }

  /**
   * Call to add a tag to log directly to, or turn off.
   * @param {string} _tag
   * @param {*} _val - options for the logger or false to turn off (and retain values)
   */
  setLogTag(_tag, _val = {}) {
    if ( _val == false ) {
      if ( this.logtags[_tag] == null ) this.logtags[_tag] = {};
      this.logtags[_tag].forceLog = false;
    } else {
      let tagops = null;
      if ( typeof _val == 'object' ) {
        tagops = Object.assign({forceLog: true}, _val); // note that forceLog can be undone
      }
      else if ( _val == true ) {
        tagops = this.logtags[_tag] || {}; // grab existing entry if it exists
        tagops.forceLog = true;
      } else { throw new Error(`Unknown logger tag(${_tag}) value: ${_val}.`); }
      this.logtags[_tag] = tagops;
    }
  }


  /**
   * Helper function to set an option.
   * @param {string} _key
   * @param {*} _val
   * @param {bool} _throw - if true, throws exception on bad key
   * @return {this} 
   */
  set(_key, _val, _throw = true) {
    if ( _key in this.defaultOptions ) {
      this.options[_key] = _val;
    } else if ( _throw == true ) {
      throw new Error(`Logger trying to set unknown option '${_key}'.`); }
    return this;
  }


  /**
   * Temp option, used on next loggging.
   * @param {*} _key
   * @param {*} _val
   * @param {bool} _throw
   * @return {this}
   */
  with(_key, _val, _throw = true) {
    let newtemp = null;
    if ( typeof _key == 'object' )  { newtemp = _key; }
    else { newtemp = {}; newtemp[_key] = _val; }
    this.tempOptions = Object.assign({},this.tempOptions,newtemp); // newtemp overwrite
//    console.log(`tempOptions ${JSON.stringify(newtemp)} : ${JSON.stringify(this.tempOptions)} from ${_key}, ${_val}.`);
    return this;
  }


  /**
   * Deterine if this should log.
   * @param {*} _lbl
   * @param {*} _ops
   * @return {bool} true if log, false if not
   */
  logCheck(_lbl, _ops) {
    let retval = _ops.forceLog;
    if ( retval == false) {
      let curlevel = this.logLevels[_ops.level];
      let asklevel = this.logLevels[_lbl.toLowerCase()];
      //    console.log(`logcheck: ${asklevel} <= ${curlevel} `);
      if (asklevel <= curlevel) retval = true;
    }
    return retval;
  }

  /**
   * Internal logging function that does all the work.
   * @param {*} _lbl
   * @param {object} _options - options specific to this log call
   * @param {*} _args
   * @return {*}
   */
  _log(_lbl, _options, _args) {
    let retval = null;

    // compiled options for this logger call
 //   console.log(' _log temp       : ', JSON.stringify(this.tempOptions));
    let calloptions = Object.assign({},this.options,this.tempOptions, _options);
    this.tempOptions = {};

    if ( this.logCheck(_lbl, calloptions) == false ) return retval;

//    console.log(' _log defaults   : ', JSON.stringify(this.options));
//    console.log(' _log called with: ', JSON.stringify(_options));
//    console.log(' _log using      : ', JSON.stringify(calloptions));

    let ts = null;
    // timestamped information (debug is since start)
    if ( calloptions.timeSinceStart == true ) {
        ts = sprintf('%8.3f', (Date.now() - this.private.starttime)/1000.0);
    } else {ts = new Date().toISOString();}

    // debugging tracing information
    let db = '';
    if ( calloptions.debug == true ) {
      let stacklvl = 2;
      for (; stacklvl < (__stack.length - 1); stacklvl++) {
        if (__stack[stacklvl].getFileName() != __filename) break;
      }
//      console.log('stacklvl ',stacklvl);
      let fn = __stack[stacklvl].getFileName();
//        let fun = __stack[stacklvl].getFunctionName();
      let ln = __stack[stacklvl].getLineNumber();
      let p = this.trimpath(fn, calloptions.trimTo) + ':' + ln;
      let len = calloptions.dbCharLen;
      if (p.length > len) {
        db = ` [${p.slice(-len + 1)}]`;
      } else db = ' [' + sprintf('%' + len + 's', p) + ']';
    }

    // The name of this logger
    let showname = '';
    if ( calloptions.showName ) {showname = ` [${this.name}]`;}

    // For each arg, add to a new line
    let colorizer = this.getColorizer(_lbl, calloptions.color, calloptions.colors);
    [].splice.call(_args, 0, 0,
      colorizer(
        `[${ts}] [${this.pad(Array(calloptions.lblCharLen).join('-'), _lbl, false)}]`+
        `${showname}${db}`)
    );

    switch (calloptions.outputTo) {
      case 'string':
        retval = _args.join(' ');
//        console.log('string: ', retval);
        break;
      case 'console':
        console.log.apply(this, _args);
        break;
      default:
        throw new Error(`Logger has unknown outputTo option of ${calloptions.outputTo}.`);
        break;
    }

    return retval;
  };


  /**
   * Get teh function that colors text based upon a label. 'none' or null does nothing.
   * @param {*} _lbl
   * @param {object} _colors - Color options
   * @return {function}
   */
  getColorizer(_lbl, _color, _colors) {
    let retval = null;
    let color = _color || _colors[_lbl.toLowerCase()];
    if ( color == null ) {color = _colors.default;}
    if ( color == 'none' ) {
      retval = (_str) => {return _str;};
    } else {retval = colors[color];}
    return retval;
  }

  /**
   * A dadded string, left or right aligned.
   * http://stackoverflow.com/questions/2686855/is-there-a-javascript-function-that-can-pad-a-string-to-get-to-a-determined-leng
   * @param {*} pad
   * @param {*} str
   * @param {*} padLeft
   * @return {string}
   */
  pad(pad, str, padLeft) {
    if (typeof str === 'undefined') return pad;
    if (padLeft) { return (pad + str).slice(-pad.length); }
    else { return (str + pad).substring(0, pad.length); }
  }


  /**
   * Trims a full directory path to something manageable.
   * @param {*} _fn
   * @param {string} _trimto - how far back ot go
   * @param {*} _dotit
   * @return {string} - shorted filepath
   */
  trimpath(_fn, _trimto, _dotit = false) {
    let retval = _fn.substring(_fn.indexOf(_trimto) + (_trimto.length+1)); // get everything after 'lib'
    retval = retval.replace(/\.[^/.]+$/, '');             // remove file extension
    if (_dotit) retval = retval.replace(/\//g, '.');      // turn slashes to dots
    return retval;
  };


  // ---------------------------------------------------------------------
  //  _   _                _
  // | | | | ___  __ _  __| | ___ _ __ ___
  // | |_| |/ _ \/ _` |/ _` |/ _ \ '__/ __|
  // |  _  |  __/ (_| | (_| |  __/ |  \__ \
  // |_| |_|\___|\__,_|\__,_|\___|_|  |___/
  // ---------------------------------------------------------------------
  //   Sometimes it's nice to add spacing. Returns self so can be chained.
  //
  //   ex. logger.h1().info('A New Hope');
  //       logger.info('It is a period of civil war. Rebel spaceships, ...');
  //
  //         ] <previous text>
  //   <blue>]
  //   <blue>] ************************************************
  //   <blue>] A New Hope
  //   <blue>] It is a period of civil war. Rebel spaceships, ...
  //
  // NOTE: Headers are not returned as strings.
  // ---------------------------------------------------------------------


  /**
   * Heading with space, line of '*', in blue.
   * @return {Logger}
   */
  h1() {

    console.log('\n\n\n');
    this._log('h1', {forceLog: true, color: 'blue'},
        ['*******************************************************']);
    this.with({color: 'blue'});
    return this;
  }

  /**
   * Heading with space, line of '=', in blue.
   * @return {Logger}
   */
  h2() {
    console.log('\n\n');
    this._log('h2', {forceLog: true, color: 'blue'},
        ['=======================================================']);
    this.with({color: 'blue'});
    return this;
  }

  /**
   * Heading with line of '-', in blue.
   * @return {Logger}
   */
  h3() {
    console.log('\n');
    this._log('h3', {forceLog: true, color: 'blue'}, 
        ['-------------------------------------------------------']);
    this.with({color: 'blue'});
    return this;
  }


};

