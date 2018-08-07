

const sprintf = require('sprintf-js').sprintf;
const colors  = require('colors/safe');
const esArgs  = require('es-arguments');

if ( typeof __line === 'undefined' ) {
  Object.defineProperty(global, '__line', {
    get : () => {return __stack[1].getLineNumber();},
  });
}

if ( typeof __stack === 'undefined' ) {
Object.defineProperty(global, '__stack', {
  get : (...theArgs) => {
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
      forceLog        : false,   // if true, logs despite any level settings. used for tags
      level           : 'info',
      debug           : false,
      debugOnError    : true,
      timeSinceStart  : false,
      add_to_stacklvl : 0,       // debug shows in one stackframe above... useful for debugging function spew
      lblCharLen      : 7,
      dbCharLen       : 40,
      showName        : false,
      trimTo          : process.cwd(), // 'src',
      outputTo        : 'console', // or 'string'
      color           : false,     // sets color, overriding 'colors'
      colors          : {'default' : 'none', 'error' : 'red', 'warn' : 'yellow', 'info' : 'green'},
    };
    this.tempOptions = {};

    this.logLevels = {
      error   : 0,
      warn    : 1,
      info    : 2,
      verbose : 3,
      trace   : 4,
      debug   : 5,
      silly   : 6,
    };

    // et logtags (i.e. aspects)
    this.logtags = {};
    for (let tag in _logtags ) {
      if ( _logtags.hasOwnProperty(tag) ) {
        this.setAspect(tag, _logtags[tag]);
      }
    }
    this.setAspect('deprecated', _logtags['deprecated']); // deprecated are on by default
    this.readEnvAspects(); // call after, so this overrides

    let envOps = this.readEnvOps();
    this.options = Object.assign({}, this.defaultOptions, _options, envOps);
    this.private = {
      starttime : Date.now(),
    };
  };


  /**
   * Read WOV_LOGGER_OPS env variable and overrite all current options.
   * @return {object} - parsed result of WOV_LOGGER_OPS
   */
  readEnvOps() {
    let env = process.env.WOV_LOGGER_OPS;
    let retval = {};
    try {
      if ( env != null ) {
        let allops = JSON.parse(env);
        if ( allops[this.name] != null ) {retval = allops[this.name];}
      }
    } catch (err) {
      console.log('WARNING: woveon-logger: WOV_LOGGER_OPS env variable not valid JSON: Not incorporating WOV_LOGGER_OPS.');
    }
    return retval;
  }


  /**
   * Parse the WOV_LOGGER_ASEPCTS env variable and assign them as aspects.
   */
  readEnvAspects() {
    if ( process.env.WOV_LOGGER_ASPECTS != null ) {
      let aspects = process.env.WOV_LOGGER_ASPECTS.split(/\s+/);
      for (let i=0; i<aspects.length; i++) {
        let a = aspects[i];
        if ( a == '' ) break;
        let aval = true;
        if ( a[0] == '!' ) {aval = false; a = a.substr(1);}
        this.setAspect(a, aval);
      }
    }
  }


  /**
   * Standard logging messages.
   * @param {*} theArgs - array of variables to print
   * @return {*} - string if outputTo is true, null otherwise
   */
  info(...theArgs)    {return this._log('INFO',    {}, theArgs);};
  warn(...theArgs)    {return this._log('WARN',    {debug : true}, theArgs);};
  error(...theArgs)   {return this._log('ERROR',   {debug : true}, theArgs);};
  verbose(...theArgs) {return this._log('VERBOSE', {}, theArgs);};
  trace(...theArgs)   {return this._log('TRACE',   {}, theArgs);};
  debug(...theArgs)   {return this._log('DEBUG',   {}, theArgs);};
  silly(...theArgs)   {return this._log('SILLY',   {}, theArgs);};


  /**
   * Throw an actual Error, not just show as error.
   * @param {*} theArgs - array of variables to print
   */
  throwError(...theArgs) {
    let retval = this.with({outputTo : 'string', forceLog : true, debug : true})
      ._log('ERROR', {}, theArgs);
    throw new Error(retval);
  }

  /**
   * Takes an error, prints it, and creates another with the given text.
   * @param {Error} _err - error object to display before throwing a new error
   * @param {*} theArgs - array of variables to print
   */
  rethrowError(_err, ...theArgs) {
    let retval = this.with({outputTo : 'string', forceLog : true, debug : true})
      ._log('ERROR', {}, theArgs);
    console.log(_err);
    throw new Error(retval);
  }


  /**
   * User defined tags that can log when their values are defined and true.
   * ```
   *  logger.setAspect('A',false);
   *  logger.log('A','A1');          // no output
   *  logger.setAspect('A',true);
   *  logger.log('A','A2');          // output
   * ```
   * @param {string} _tag
   * @param {*} theArgs
   * @return {bool} true on success
   */
  log(_tag, ...theArgs) {
    this.logDeprecated('woveon-logger: method .log should be replaced with .aspect');
    if ( this.logtags[_tag] != null ) {
      return this._log(_tag, this.logtags[_tag], theArgs );
    }
  }

  /**
   * Same as log above. The idea is to think of an aspect (as in
   * Aspect Oriented Programming, a cross-cutting concern) to log.
   *
   * @param {string} _tag
   * @param {*} theArgs
   * @return {bool} true on success
   */
  aspect(_tag, ...theArgs) {
    if ( this.logtags[_tag] != null ) {
      return this._log(_tag, this.logtags[_tag], theArgs );
    }
  }


  /**
   * Returns true if aspect is set.
   * @param {string} _tag - The aspect name.
   * @return {bool} - true if aspect is set
   */
  testAspect(_tag) {
    // if ( this.logtags[_tag] == null ) return false;
    if ( this.logCheck(_tag, this.logtags[_tag]) == true) return true;
    return false;
  }


  /**
   * Call to add a tag to log directly to, or turn off.
   * NOTE: because this saves forceLog as false, instead of deleting tag, it retains settings between tag toggles
   * @param {string} _tag
   * @param {*} _val - options for the logger or false to turn off (and retain values)
   */
  setAspect(_tag, _val = {}) {
    if ( _val == false ) {
      if ( this.logtags[_tag] == null ) this.logtags[_tag] = {};
      this.logtags[_tag].forceLog = false;
    } else {
      let tagops = null;
      if ( typeof _val == 'object' ) {
        tagops = Object.assign({forceLog : true}, _val); // note that forceLog can be undone
      } else if ( _val == true ) {
        tagops = this.logtags[_tag] || {}; // grab existing entry if it exists
        tagops.forceLog = true;
      } else {
        throw new Error(`Unknown logger tag(${_tag}) value: ${_val}.`);
      }
      this.logtags[_tag] = tagops;
    }
  }
  /** phase out */
  setLogTag(_tag, _val = {}) {this.logDeprecated('woveon-logger: method setLogTag should use setAspect'); this.setAspect(_tag, _val);}


  /**
   * Call to show dissaproval for this method.
   * @param {strings} theArgs - msgs to print after main message.
   * @return {object} this
   */
  logDeprecated(...theArgs) {return this.with('debug', true).aspect('deprecated', `DEPRECATED: should avoid this call.`, theArgs);}

  /**
   * Helper function to set an option.
   * @param {string} _key
   * @param {*} _val
   * @param {bool} _throw - if true, throws exception on bad key
   * @return {this} -
   */
  set(_key, _val, _throw = true) {
    if ( _key in this.defaultOptions ) {
      this.options[_key] = _val;
    } else if ( _throw == true ) {
      throw new Error(`Logger trying to set unknown option '${_key}'.`);
    }
    return this;
  }


  /**
   * Set the level of logging to _val.
   * NOTE: Equivalent to "this.set('level',_val)".
   *
   * @param {*} _val
   * @param {bool} _throw - if true, throws exception on bad key
   * @return {this} -
   */
  lvl(_val, _throw = true) {return this.set('level', _val, _throw);}


  /**
   * Temp option, used on next loggging.
   * @param {*} _key
   * @param {*} _val
   * @param {bool} _throw
   * @return {this}
   */
  with(_key, _val, _throw = true) {
    let newtemp = null;
    if ( typeof _key == 'object' ) newtemp = _key;
    else {newtemp = {}; newtemp[_key] = _val;}
    this.tempOptions = Object.assign({}, this.tempOptions, newtemp); // newtemp overwrite
    console.log(`tempOptions ${JSON.stringify(newtemp)} : ${JSON.stringify(this.tempOptions)} from ${_key}, ${_val}.`);
    return this;
  }


  /**
   * Deterine if this should log.
   * @param {*} _lbl
   * @param {*} _ops
   * @return {bool} true if log, false if not
   */
  logCheck(_lbl, _ops) {
    if ( _ops == null ) return false;

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
    let calloptions = Object.assign({}, this.options, this.tempOptions, _options);
    // console.log('add_to_stacklvl 1: ', calloptions, this.tempOptions);
    this.tempOptions = {};

    if ( this.logCheck(_lbl, calloptions) == false ) return retval;

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
      // console.log('add_to_stacklvl 2: ', stacklvl, calloptions.add_to_stacklvl, this.tempOptions);
      if ( calloptions.add_to_stacklvl ) stacklvl += calloptions.add_to_stacklvl;
      let fn = __stack[stacklvl].getFileName();
      let ln = __stack[stacklvl].getLineNumber();
      let p = this.trimpath(fn, calloptions.trimTo) + ':' + ln;
      let len = calloptions.dbCharLen;
      if (p.length > len) {
        db = ` [${p.slice(-len + 0)}]`;
      } else db = ' [' + sprintf('%-' + len + 's', p) + ']';
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
   * Print the stack.
   * @param {string} _text - output after 'Stack Trace', to markup about the stack
   */
  printStack(_text) {

    let calloptions = Object.assign({}, this.options, this.tempOptions);
    this.tempOptions = {};

//    try { throw new Error();} catch (e) { console.log(e); }
    // console.log('stack: ', JSON.stringify(__stack, null, '  '));
    let stacklvl = 2;
    for (; stacklvl < (__stack.length - 1); stacklvl++) {
      if (__stack[stacklvl].getFileName() != __filename) break;
    }
    if ( calloptions.add_to_stacklvl ) stacklvl += calloptions.add_to_stacklvl;

    let db = [`Stack Trace: ${_text}\n`];
    for (; stacklvl < (__stack.length ); stacklvl++) {
      let fn = __stack[stacklvl].getFileName();
      let ln = __stack[stacklvl].getLineNumber();
      let p = this.trimpath(fn, calloptions.trimTo) + ':' + ln;
//      let len = calloptions.dbCharLen;
//      console.log(' : ', fn, ln, p, len);
      db.push(`  --- ${p}\n`);
//      if (p.length > len) {
//        db.push(` [${p.slice(-len + 1)}]`);
//      } else db.push(' [' + sprintf('%' + len + 's', p) + ']');
    }
    this.with({forceLog : true, debug : true, color : 'blue'})._log('STACK', {}, db);

  };

  /**
   * Get the function that colors text based upon a label. 'none' or null does nothing.
   * @param {*} _lbl
   * @param {object} _color - Selected color
   * @param {object} _colors - Color options
   * @return {function}
   */
  getColorizer(_lbl, _color, _colors) {
    let retval = null;
    let colorstring = _color || _colors[_lbl.toLowerCase()];
    if ( colorstring == null ) {colorstring = _colors.default;}
    if ( colorstring == 'none' ) {
      retval = (_str) => {return _str;};
    } else {

      let cs = colorstring.split(' ');
      if ( cs.length == 1 ) retval = colors[colorstring];
      else {
        // console.log('creating compound: ', cs);
        retval = function(_str) {
          let cscs = cs;
          // console.log('....applying colors ', cscs);
          let retval = _str;
          for (let i=0; i<cscs.length; i++) {
            retval = colors[cscs[i]](retval);
            // console.log(retval);
          };
          return retval;
        };
      }
    }
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
    if (padLeft) return (pad + str).slice(-pad.length);
    else return (str + pad).substring(0, pad.length);
  }


  /**
   * Trims a full directory path to something manageable.
   * @param {*} _fnfile -
   * @param {string} _trimto - how far back ot go
   * @param {*} _dotit
   * @return {string} - shorted filepath
   */
  trimpath(_fnfile, _trimto, _dotit = false) {
    let c = Math.min(_fnfile.length, _trimto.length);
    let br = 0;
    for (let i=0; i<c; i++) {if ( _fnfile[i] == '/' ) br = i+1; if ( _fnfile[i] != _trimto[i] ) break;}
    let retval = _fnfile.substring(br);
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
   * @param {string} _aspect - aspect to use to determine if logging
   * @return {Logger}
   */
  h1(_aspect = null) {
    if ( _aspect ) {
      this._log(_aspect, this.logtags[_aspect], ['']);
      this._log(_aspect, this.logtags[_aspect], ['']);
      this._log(_aspect, this.logtags[_aspect], ['*********************************************************************']);
    } else {
      this._log('h1', {forceLog : true, color : 'inverse'}, ['']);
      this._log('h1', {forceLog : true, color : 'inverse'}, ['']);
      this._log('h1', {forceLog : true, color : 'inverse'}, ['*********************************************************************']);
    }

    return this;

  }

  /**
   * Heading with space, line of '=', in blue.
   * @param {string} _aspect - aspect to use to determine if logging
   * @return {Logger}
   */
  h2(_aspect = null) {
    if ( _aspect ) {
      this._log(_aspect, this.logtags[_aspect], ['']);
      this._log(_aspect, this.logtags[_aspect], ['=====================================================================']);
    } else {
      this._log(_aspect || 'h2', {forceLog : true, color : 'inverse'}, ['']);
      this._log(_aspect || 'h2', {forceLog : true, color : 'inverse'}, ['=====================================================================']);
    }
    return this;
  }

  /**
   * Heading with line of '-', in blue.
   * @param {string} _aspect - aspect to use to determine if logging
   * @return {Logger}
   */
  h3(_aspect = null) {
    if ( _aspect ) {
      this._log(_aspect, this.logtags[_aspect], ['']);
      this._log(_aspect, this.logtags[_aspect], ['-------------------------------------------------------']);
    } else {
      this._log(_aspect || 'h3', {forceLog : true, color : 'inverse'}, ['']);
      this._log(_aspect || 'h3', {forceLog : true, color : 'inverse'}, ['-------------------------------------------------------']);
    }
    return this;
  }


  /**
   * Wrap an existing function in a logging message, that prints its parameters.
   * @param {func} _func - The function/arrowfunc or method to be wrapped.
   * @return {func}
   */
  wrapFunc(_func, ...initArgs)             {return this._wrapFunc(null, _func, false, initArgs);}
  wrapAFunc(_func, ...initArgs)            {return this._wrapFunc(null, _func, true,  initArgs);}
  wrapBoundFunc(_obj, _func, ...initArgs)  {return this._wrapFunc(_obj, _func, false, initArgs);}
  wrapABoundFunc(_obj, _func, ...initArgs) {return this._wrapFunc(_obj, _func, true,  initArgs);}
  wrapMethod(_obj, _meth, ...initArgs)     {return this._wrapFunc(_obj, _meth, false, initArgs);}
  wrapAMethod(_obj, _meth, ...initArgs)    {return this._wrapFunc(_obj, _meth, true,  initArgs);}

  /**
    * Don't use this. Created as temporary function for my own code.
    * @param {string} _text - message to print
    * @param {object} _args - list of arguments (unused)
    * @param {function} _func -
    * @return {func}
    */
  wrap(_text, _args, _func) {
    this.logDeprecated('Do not use this wrap function. Use the wrapFunc or whatever as this has unused args:', _text);
    return this._wrapFunc(null, _func, true, _text);
  }

  /**
   * Master function for wrapping functions.
   * @param {object} _binding - an object or class to bind the function to
   * @param {function} _func - the function
   * @param {bool} _isAsync - return an async function or not
   * @return {function} - returns a function that may be async and/or bound
   */
  _wrapFunc(_binding, _func, _isAsync, ...initArgs) {
    let l = this;
    let ismethod = false;
    let retval = null;

    let eargs=null;
    try {
      eargs = esArgs(_func);
    } catch (e) {
      let s = _func.toString();
      let firstword = s.substr(0, s.indexOf(' '));
      if ( firstword == 'async' ) {
        s = 'async function ' + s.substr(s.indexOf(' ')); // add async function to removed 'async' of function
      } else {
        s = 'function ' + s; // just add function
      }
      // console.log('trying agin with h: ', s);
      try {
        eargs = esArgs(s);
        ismethod = true;
      } catch (e) {console.log(e);}
    }

    if ( ! _isAsync ) {
      retval = function(...args) {
        let rr = null;
        l.info('function ', initArgs);
        let pn = Math.max(args.length, eargs.length);
        for (let i=0; i<pn; i++ ) {l.info(`  ${eargs[i]} = ${args[i]}`);}
        if ( ! ismethod ) rr = _func(...args);
        else {rr = _func.bind(_binding)(...args);}
        return rr;
      };
    } else {
      retval = async function(...args) {
        let rr = null;
        l.info('function ', initArgs);
        let pn = Math.max(args.length, eargs.length);
        for (let i=0; i<pn; i++ ) {l.info(`  ${eargs[i]} = ${args[i]}`);}
        if ( ! ismethod ) rr = await _func(...args);
        else {rr = await _func.bind(_binding)(...args);}
        return rr;
      };
    }

    return retval;
  }

};

