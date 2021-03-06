

const sprintf = require('sprintf-js').sprintf;
const colors  = require('colors/safe');
const rArgs   = require('reflect-args').getArgs;
const performance = require('perf_hooks').performance;
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const pkgUp   = require('pkg-up');
const path    = require('path');

if ( typeof projRoot === 'undefined' ) {
  global.projRoot = path.dirname(pkgUp.sync());
}

if ( typeof __line === 'undefined' ) {
  Object.defineProperty(global, '__line', {
    get : () => { return __stack[1].getLineNumber(); },
  });
}

if ( typeof __stack === 'undefined' ) {
  Object.defineProperty(global, '__stack', {
    get : (...theArgs) => {
      let orig = Error.prepareStackTrace;
      Error.prepareStackTrace = (_, stack) => { return stack; };
      let err = new Error;
      Error.captureStackTrace(err, theArgs.callee);
      let stack = err.stack;
      Error.prepareStackTrace = orig;
      return stack;
    },
  });
}

if ( typeof __fileloc === 'undefined' ) {
  Object.defineProperty(global, '__fileloc', {
    get : () => {
      // let root = require.main.filename; // sh.pwd();
      let fn = __stack[2].getFileName();
      /*
      console.log('fn: ', fn);
      console.log('NODE_PAHT: ', process.env.NODE_PATH);
      console.log('projRoot: ', projRoot);
      console.log('__dirname: ', __dirname);
      console.log('req main path: ', require.main.path);
      console.log('req: ', require.main);
      console.log('line: ', __stack[2].getLineNumber());
      */

      let relfn = fn;
      if ( fn.startsWith(projRoot) ) relfn = `${fn.substring(projRoot.length+1)}`;


      /*
      let st = fn.split('/');
      console.log('st : ', st);
      let relfn = [(st[st.length-2]||''), st[st.length-1]].join('/');
      console.log('relfn: ', relfn);
      */
      return `${relfn}:${__stack[2].getLineNumber()}`;
    },
  });
}


/**
 */
class Logger {

  /**
   * A custom logger.
   * @param {string} _name
   * @param {object} _options
   * @param {object} _logtags
   */
  constructor(_name, _options= {}, _logtags = {}) {
    this.name = _name;
    this.errors = null;
    this.defaultOptions = {
      forceLog        : false,   // if true, logs despite any level settings. used for tags
      level           : 'info',
      debug           : false,
      debugOnError    : true,
      debugOnWarn     : true,
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
      doom    : 0,
      fatal   : 1,
      error   : 2,
      warn    : 3,
      info    : 4,
      verbose : 5,
      trace   : 6,
      debug   : 7,
      silly   : 8,
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
   * Standard logging messages.
   * @param {*} theArgs - array of variables to print
   * @return {*} - string if outputTo is true, null otherwise
   */
  silly(...theArgs)   { return this._log('SILLY',   {}, theArgs); }; // don't use this
  trace(...theArgs)   { return this._log('TRACE',   {}, theArgs); }; // debug a very targeted section because raw data is showing
  debug(...theArgs)   { return this._log('DEBUG',   {}, theArgs); }; // spew lots of state information for debugging
  verbose(...theArgs) { return this._log('VERBOSE', {}, theArgs); }; // good if you are analyzing code
  info(...theArgs)    { return this._log('INFO',    {}, theArgs); }; // things good to know
  warn(...theArgs)    { return this._log('WARN',    {}, theArgs); }; // probably should fix/monitor something in future
  error(...theArgs)   { return this._log('ERROR',   {}, theArgs); }; // something failed and you need to fix in future; recovering
  fatal(...theArgs)   { return this._log('FATAL',   {}, theArgs); }; // pick up the phone and call the engineer
  doom(...theArgs)    { return this._log('DOOM',    {}, theArgs); }; // pick up the phone and call the engineer and CEO


  /**
   * Aspect level debuggin. Same as log above, but the idea is to think of an aspect (as in
   * Aspect Oriented Programming, a cross-cutting concern) to log. If that aspect is
   * activated, then log this message.
   *
   * Aspects can be space separated so logger.aspect('A B', 'hi') will trigger on 'A' or 'B'. It only prints
   * once though, and uses the first matching aspect's options (but will show full 'A B' label.
   *
   * @param {string} _tag
   * @param {*} theArgs
   * @return {bool} true on success
   */
  aspect(_tag, ...theArgs) {
    let tags = _tag.split(' ');
    for (let i=0; i<tags.length; i++) {
      if ( this.logtags[tags[i]] != null ) {
        return this._log(_tag, this.logtags[tags[i]], theArgs );
      }
    }
  }


  /**
   * Call to control aspect activation on or off.
   * NOTE: because this saves forceLog as false, instead of deleting tag, it retains settings between tag toggles
   *
   * @param {string} _tag
   * @param {*} _val - options for the logger or false to turn off (and retain values)
   */
  setAspect(_tag, _val = {}) {
    if ( _val == false ) {
      if ( this.logtags[_tag] == null ) this.logtags[_tag] = {};
      this.logtags[_tag].forceLog = false;
    }
    else {
      let tagops = null;
      if ( typeof _val == 'object' ) {
        tagops = Object.assign({forceLog : true}, _val); // note that forceLog can be undone
      }
      else if ( _val == true ) {
        tagops = this.logtags[_tag] || {}; // grab existing entry if it exists
        tagops.forceLog = true;
      }
      else { throw new Error(`Unknown logger tag(${_tag}) value: ${_val}.`); }
      this.logtags[_tag] = tagops;
    }
  }


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
   * Generates an error message 
   */
  /*
  genError(_errorName, ...theArgs) {
    let ename = _errorName.toUpperCase();
    let e = this.errors[ename];
    if ( e == null ) this.throwError(`unknown error type of '${_errorName}/${ename}'.`);

    let retval = this.with({outputTo : 'string', forceLog : true, debug : true})
      ._log('ERROR', {}, `${ename} (${e.code}) : ${e.text}\n`, theArgs);
    return retval;
  }
  */

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
   * Prints the aspects to the console.
   */
  displayAspects() { console.log(this.logtags); }


  /**
   * Returns a copy of the aspects.
   * @return {object} - copy of this.logtags
   */
  getAspects() { return Object.assign({}, this.logtags); }


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
        if ( allops[this.name] != null ) { retval = allops[this.name]; }
      }
    }
    catch (err) {
      console.log('WARNING: woveon-logger: WOV_LOGGER_OPS env variable not valid JSON: Not incorporating WOV_LOGGER_OPS.');
    }
    return retval;
  }


  /**
   * Parse the WOV_LOGGER_ASEPCTS/WOV_LA env variables and assign them as aspects.
   */
  readEnvAspects() {
    let aspects = [];
    if ( process.env.WOV_LOGGER_ASPECTS != null ) {
      aspects = aspects.concat(process.env.WOV_LOGGER_ASPECTS.split(/\s+/));
    }
    if ( process.env.WOV_LA != null ) {
      aspects = aspects.concat(process.env.WOV_LA.split(/\s+/));
    }

    for (let i=0; i<aspects.length; i++) {
      let a = aspects[i];
      if ( a == '' ) continue;
      let aval = true;
      if ( a[0] == '!' ) { aval = false; a = a.substr(1); }
      this.setAspect(a, aval);
    }
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
   * Runs the function _f if aspect is true.
   *
   * @param {string}   _aspect - The aspect name.
   * @param {function} _f      - The function to call, with this logger being passed in.
   * @return {?}               - returns the function return value, false if aspect fails
   */
  async onAspect(_aspect, _f) {
    if ( this.logCheck(_aspect, this.logtags[_aspect]) == true) { return _f(this); }
    return false;
  }


  /**
   * Returns the ordinal for a number: i.e. for 1, 2, 3, 'st', 'nd', 'rd'
   * from: https://stackoverflow.com/a/31615643/2664702
   * @param {int} _n  - a number
   * @return {String} - ordinal
   */
  indexOrdinal(_n) { return this.ord(_n); }
  ord(_n) {
    let s=['th', 'st', 'nd', 'rd'];
    let v=_n%100;
    return _n+(s[(v-20)%10]||s[v]||s[0]);
  }


  /** phase out */
  setLogTag(_tag, _val = {}) { this.logDeprecated('woveon-logger: method setLogTag should use setAspect'); this.setAspect(_tag, _val); }


  /**
   * Call to show dissaproval for this method.
   * @param {strings} theArgs - msgs to print after main message.
   * @return {object} this
   */
  logDeprecated(...theArgs) {
    let retval = this.with({'debug' : true, 'add_to_stacklvl' : 1}).aspect('deprecated', `DEPRECATED: should avoid this call.`, theArgs);
    this.printStack();
    return retval;
  }


  /**
   * Helper function to set an option.
   * @param {string} _key
   * @param {*} _val
   * @param {bool} _throw - if true, throws exception on bad key
   * @return {this} -
   */
  set(_key, _val, _throw = true) {
    if ( _key in this.defaultOptions ) { this.options[_key] = _val; }
    else if ( _throw == true ) {
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
  lvl(_val, _throw = true) { return this.set('level', _val, _throw); }


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
    else { newtemp = {}; newtemp[_key] = _val; }
    this.tempOptions = Object.assign({}, this.tempOptions, newtemp); // newtemp overwrite
    // console.log(`tempOptions ${JSON.stringify(newtemp)} : ${JSON.stringify(this.tempOptions)} from ${_key}, ${_val}.`);
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

    // add in checks to force debug
    if ( _lbl == 'ERROR' && calloptions.debugOnError == true ) calloptions.debug = true;
    if ( _lbl == 'WARN' && calloptions.debugOnWarn == true ) calloptions.debug = true;

    let ts = null;
    // timestamped information (debug is since start)
    if ( calloptions.timeSinceStart == true ) {
        ts = sprintf('%8.3f', (Date.now() - this.private.starttime)/1000.0);
    }
    else { ts = new Date().toISOString(); }

    // debugging tracing information
    let db = '';
    if ( calloptions.debug == true ) {
      let stacklvl = 2;
      for (; stacklvl < (__stack.length - 1); stacklvl++) {
        if (__stack[stacklvl].getFileName() != __filename) break;
      }
      // console.log('add_to_stacklvl 2: ', stacklvl, calloptions.add_to_stacklvl, this.tempOptions);
      if ( calloptions.add_to_stacklvl ) stacklvl += calloptions.add_to_stacklvl;
      while ( __stack[stacklvl] == undefined && stacklvl > 0) stacklvl--;  // don't go so high up you run out of stack!
      let fn = __stack[stacklvl].getFileName();
      let ln = __stack[stacklvl].getLineNumber();
      let p = this.trimpath(fn, calloptions.trimTo) + ':' + ln;
      let len = calloptions.dbCharLen;
      if (p.length > len) {
        db = ` [${p.slice(-len + 0)}]`;
      }
      else { db = ' [' + sprintf('%-' + len + 's', p) + ']'; }
    }

    // The name of this logger
    let showname = '';
    if ( calloptions.showName ) { showname = ` [${this.name}]`; }

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
        retval = this;
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
    if ( colorstring == null ) { colorstring = _colors.default; }
    if ( colorstring == 'none' ) { retval = (_str) => { return _str; }; }
    else {

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
    let retval = _fnfile;
    if ( _fnfile != null && _trimto != null ) {
      let c = Math.min(_fnfile.length, _trimto.length);
      let br = 0;
      for (let i=0; i<c; i++) {
        if ( _fnfile[i] == '/' ) br = i+1;
        if ( _fnfile[i] != _trimto[i] ) break;
      }
      retval = _fnfile.substring(br);
    }
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
    }
    else {
      let c = 'inverse';
      if ( this.options.color != null )  c = this.options.color;
      this._log('h1', {forceLog : true, color : c}, ['']);
      this._log('h1', {forceLog : true, color : c}, ['']);
      this._log('h1', {forceLog : true, color : c}, ['*********************************************************************']);
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
    }
    else {
      let c = 'inverse';
      if ( this.options.color != null )  c = this.options.color;
      this._log(_aspect || 'h2', {forceLog : true, color : c}, ['']);
      this._log(_aspect || 'h2', {forceLog : true, color : c}, ['=====================================================================']);
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
    }
    else {
      let c = 'inverse';
      if ( this.options.color != null )  c = this.options.color;
      this._log(_aspect || 'h3', {forceLog : true, color : c}, ['']);
      this._log(_aspect || 'h3', {forceLog : true, color : c}, ['-------------------------------------------------------']);
    }
    return this;
  }

  /**
   * Heading with line of '- -', inversed color
   * @param {string} _aspect - aspect to use to determine if logging
   * @return {Logger}
   */
  h4(_aspect = null) {
    if ( _aspect ) {
      this._log(_aspect, this.logtags[_aspect], ['']);
      this._log(_aspect, this.logtags[_aspect], ['- - - - - - - - - - - - - - - - - - - - - - - - - - - -']);
    }
    else {
      let c = 'inverse';
      if ( this.options.color != null )  c = this.options.color;
      this._log(_aspect || 'h4', {forceLog : true, color : c}, ['']);
      this._log(_aspect || 'h4', {forceLog : true, color : c}, ['- - - - - - - - - - - - - - - - - - - - - - - - - - - -']);
    }
    return this;
  }


  /**
   * Wrap an existing function in a logging message, that prints its parameters.
   * @param {func} _func - The function/arrowfunc or method to be wrapped.
   * @return {func}
   */
  wrapFunc(_func, ...initArgs)             { return this._wrapFunc(null, _func, false, initArgs); }
  wrapAFunc(_func, ...initArgs)            { return this._wrapFunc(null, _func, true,  initArgs); }
  wrapBoundFunc(_obj, _func, ...initArgs)  { return this._wrapFunc(_obj, _func, false, initArgs); }
  wrapABoundFunc(_obj, _func, ...initArgs) { return this._wrapFunc(_obj, _func, true,  initArgs); }
  wrapMethod(_obj, _meth, ...initArgs)     { return this._wrapFunc(_obj, _meth, false, initArgs); }
  wrapAMethod(_obj, _meth, ...initArgs)    { return this._wrapFunc(_obj, _meth, true,  initArgs); }

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
    let funcname = _func.name;

    l.aspect('wrapfunc.init', 'func: ', _func);

    // let eargs=null;
    let gargs = null;
    try {
      gargs = Array.from(rArgs(_func)); // .entries();
    }
    catch (e) {
      let s = _func.toString();
      let firstword = s.substr(0, s.indexOf(' '));
      while (firstword.indexOf('(') == -1) { // != 'function' && firstword != null ) {
        s = s.substr(s.indexOf(' ')).trimLeft();
        l.aspect('wrapfunc.init', 'removing first word: ', firstword, s);
        firstword = s.substr(0, s.indexOf(' '));
        l.aspect('wrapfunc.init', `  next first word: '${firstword}'`);
      }
      s = 'function ' + s; // add 'function' on it as rArgs has issues parsing
      /*
      if ( firstword == 'async' ) { s = 'async function ' + s.substr(s.indexOf(' ')); } // add async function to removed 'async' of function
      else { s = 'function ' + s; } // just add function
      */
      // console.log('trying agin with h: ', s);
      try {
        gargs = rArgs(s);
        ismethod = true;
      }
      catch (e) { console.log(e); }
    }

    if ( ! _isAsync ) {
      retval = function(...args) {
        let rr = null;
        l.aspect('wrapfunc', 'args : ', args);
        l.aspect('wrapfunc', 'gargs: ', gargs);
        let pn = Math.max(args.length, gargs.length);
        let argstring = '';
        for (let i=0; i<pn; i++ ) {
          let p = (args[i] === undefined)? gargs[i][1]: args[i];
          if ( argstring != '' ) argstring += ', ';
          argstring += `${p}`;
        }
        l.info(`${initArgs}: function ${funcname}(${argstring})`);
        if ( ! ismethod ) { rr = _func(...args); }
        else { rr = _func.bind(_binding)(...args); }
        return rr;
      };
    }
    else {
      retval = async function(...args) {
        let rr = null;
        l.aspect('wrapfunc', 'args : ', args);
        l.aspect('wrapfunc', 'gargs: ', gargs);
        let pn = Math.max(args.length, gargs.length);
        let argstring = '';
        for (let i=0; i<pn; i++ ) {
          // console.log(`g ${i} `, gargs[i]);
          let p = (args[i] === undefined)? (gargs[i]?gargs[i][1]:gargs[i]): args[i];
          if ( argstring != '' ) argstring += ', ';
          argstring += `${p}`;
        }
        l.info(`${initArgs}: async function ${funcname}(${argstring})`);
        if ( ! ismethod ) rr = await _func(...args);
        else { rr = await _func.bind(_binding)(...args); }
        return rr;
      };
    }

    return retval;
  }


  /*
  static gInfo(...args) {
    if ( Logger._glogger == null ) { Logger._GenGLogger(); }
    Logger._glogger.info.apply(Logger._glogger, args);
  }

  static gAspect(...args) {
    if ( Logger._glogger == null ) { Logger._GenGLogger(); }
    Logger._glogger.aspect.apply(Logger._glogger, args);
  }
  static gSetAspect(...args) {
    if ( Logger._glogger == null ) { Logger._GenGLogger(); }
    Logger._glogger.setAspect.apply(Logger._glogger, args);
  }
  */


  /**
   * This returns (creates as needed) a global logger. This is handy when you don't really care, you just want
   * to display a message:  `Logger.g().info('hello world');`
   *
   * The global logger runs in debug mode and grabs the global env settings.
   *   NOTE: if you use setApect or change settings, those remain for all other global calls!
   *
   * @return {Logger} - the global logger is returned, created if needed
   */
  static g() {
    if ( Logger._glogger == null ) { Logger._glogger = new Logger('', {debug : true}, {}); }
    return Logger._glogger;
  }


  // ---------------------------------------------------------------------
  // Typing and class utility functions
  // ---------------------------------------------------------------------

  /**
   * Determines the type of a _thing. More useful than typeof since it
   * includes classes and instances.
   * @param {*} _thing - the thing to figure out what it is.
   * @param {bool} _detailed - if true, functions are specified as ASYNC or STATIC, otherwise just returns them as FUNCTION
   * @return {Symbol} - the determined type.
   */
  static typeof(_thing, _detailed = false) {
    let retval = null;
    if ( _thing === null ) retval = Logger.ObjT.NULL;
    else if ( _thing === undefined ) retval = Logger.ObjT.UNDEFINED;
    else if ( typeof _thing == 'boolean' ) retval = Logger.ObjT.BOOL;
    else if ( typeof _thing == 'number' ) retval = Logger.ObjT.NUMBER;
    else if ( typeof _thing == 'string' ) retval = Logger.ObjT.STRING;
    else if ( typeof _thing == 'symbol' ) retval = Logger.ObjT.SYMBOL;
    else if ( _thing.prototype == null ) {
      if      ( _thing.constructor.prototype === Object.prototype) retval = Logger.ObjT.OBJECT;
      else if ( _thing.constructor.prototype === Function.prototype) retval = Logger.ObjT.FUNCTION;
      else if ( _thing.constructor.prototype === AsyncFunction.prototype) {
        if ( ! _detailed ) retval = Logger.ObjT.FUNCTION; else retval = Logger.ObjT.ASYNCFUNCTION;
      }
      else retval = Logger.ObjT.INSTANCE;
    }
    else {
      if ( _thing.toString().startsWith('class') == true ) retval = Logger.ObjT.CLASS;
      else retval = Logger.ObjT.FUNCTION;
    }

    return retval;
  }

  /**
   * Type of function.
   * async, static, regular
   * @param {function} _f - a function that may be async
   * @return {bool}
   */
  static isfasync(_f) { return ((_f instanceof AsyncFunction) === true); }

  /**
   * Get class of the instance object.
   * @param {instance} _instance - instance object, created from a class that is to be returned
   * @return {class}
   */
  static getClass(_instance) { return _instance.constructor; }

  /**
   * Get parent class of the passed in class. Like super().
   * @param {class} _class -
   * @return {class}
   */
  static getParentClass(_class)   {
    if ( Logger.typeof(_class) == Logger.ObjT.CLASS ) return Object.getPrototypeOf(_class);
    else throw Error('Called Woveon-Logger.getParentClass on non-class: ', _class);
  }



  // ---------------------------------------------------------------------
  // Performance / Profiling
  // 
  // DO NOT USE YET
  // ---------------------------------------------------------------------

  /**
   * Instrument the thing for performance profiling.
   * @param {*} _thing - function, instance, object or class
   * @return {*} - the thing, instrumented
   */
  static pf(_thing) {
    let retval = null;

    switch ( Logger.typeof(_thing) ) {
      case 'FUNCTION':
        retval = Logger._pf_f(_thing);
        break;
      case 'OBJECT':
        retval = Logger._pf_object(_thing);
        break;
      case 'INSTANCE':
        retval = Logger._pf_instance(_thing);
        break;
      case 'CLASS':
        retval = Logger._pf_class(_thing);
        break;
      default:
        Logger.g().throwError(`Can't instrument thing of type '${Logger.typeof(_thing)}'.`);
        break;
    };

    return retval;
  }

  static _pf_f(_f)  { return Logger.__pf_f(_f,  (_f instanceof AsyncFunction) === true); }
  static _pf_ff(_f) { return Logger.__pf_f(_f, false); }
  static _pf_fa(_f) { return Logger.__pf_f(_f, true); }

  /**
   * Internal function for profiling, that decorates this function to capture performance and timing.
   * NOTE: successive calls reset the history
   * @param {function} _f - the function to instrument
   * @param {boolean} _async - handle async/non-async functions differently
   * @return {function} - the instrumented function.
   */
  static __pf_f(_f, _async) {
    let retval = _f;
    // console.log(`---- _pf_f init called`);

    // instrument function if it has not yet been
    if (retval._wl == undefined ) {

      if ( _async == false ) {
        retval = function() {

          // console.log(`---- _pf_f function called`);
          // per call
          let cur = performance.now();
          let ret = _f.apply(this, arguments); // eslint-disable-line prefer-rest-params
          let post = performance.now();

          // update
          let runtime = post-cur;
          retval._wl.tCalls++;
          retval._wl.tTime += runtime;
          retval._wl.lastRun = runtime;
          return ret;
        };
        Object.defineProperty(retval, 'name', {value : _f.name});
      }
      else {
        retval = async function() {

          // console.log(`---- _pf_f async function called`);
          // per call
          let cur = performance.now();
          let ret = _f.apply(this, arguments); // eslint-disable-line prefer-rest-params
          let post = performance.now();

          // update
          let runtime = post-cur;
          retval._wl.tCalls++;
          retval._wl.tTime += runtime;
          retval._wl.lastRun = runtime;
          return ret;
        };
        Object.defineProperty(retval, 'name', {value : _f.name});
      }
    }

    // reset/init function
    Logger.pfReset(retval);
    return retval;
  }

  /**
   * Inits/resets the counters on the function.
   * @param {function} _f - the function to reset
   */
  static pfReset(_f) {
    _f._wl = {
      lastRun : null,
      tCalls  : 0,
      tTime   : 0,
    };
  }

  /**
   * Call on all "Own" functions of an object. This instruments the object, but returns it
   * as well. 
   * NOTE: this modifies the object.
   * @param {object} _o - an object (not class, instance of class or function)
   * @return {object} - the same object instrumented
   */
  static _pf_object(_o) {
    let doinit = true;

    if ( Logger.pfIs(_o) ) doinit = false;

    if ( _o.constructor.name != Object.name) throw Error('Can not call on object created from class');

    for (let k in _o ) {
      if ( _o.hasOwnProperty(k) ) {
        console.log(`  - check _pf_object ${k}`);
        if ( (_o[k] instanceof Function) === true ) { // eslint-disable-line
          console.log(`    - instrumenting ${k}`);
          if ( doinit ) _o[k] = Logger._pf_f(_o[k]);          // eslint-disable-line
          else Logger.pfReset(_o[k]);
        }
      }
    }

    // mark object as being pfed
    _o._wl = true;

    return _o;
  }


  static _pf_class(_cl) {
    console.log(`_pf_class: ${_cl.name} ${Logger.typeof(_cl)}.`);
    let thing = _cl;
    let cflag = null;
    let props = null;

    // if already run, skip
    if ( Logger.pfIs(thing) ) return ; // thing.hasOwnProperty('_wl') == true ) return;

    do {
      cflag = false;

      // static members of class 
      props = Object.getOwnPropertyNames(thing);
      console.log('props from __proto__ (static): ', props);
      for (let k in props) {
        let prop = props[k];
        console.log(`  - check ${prop} : `, Logger.pfIs(prop));
        if ( prop != 'constructor' && thing.hasOwnProperty(prop) && (!Logger.pfIs(thing[prop])) ) {
          if ( (thing[prop] instanceof Function) === true ) {
            console.log(`    - instrumenting ${prop}`, thing.__proto__[prop]);//, Logger.pfIs(thing.__proto__[prop]));
            // Object.defineProperty(thing, k, {value : Logger._pf_f(thing[prop])});
            thing[prop] = Logger._pf_f(thing[prop]);
          }
        }
      }

      // non-static members of class
      props = Object.getOwnPropertyNames(thing.prototype);
      console.log('props from prototype (non-static) :', Object.getOwnPropertyNames(thing.prototype));
      for (let k in props) {
        let prop = props[k];
        console.log(`  - check ${prop}`);
        if ( prop != 'constructor' && thing.prototype.hasOwnProperty(prop) && (!Logger.pfIs(prop)) ) {
          if ( (thing.prototype[prop] instanceof Function) === true ) {
            console.log(`    - instrumenting ${prop}`, Logger.pfIs(thing.prototype[prop]));
            thing.prototype[prop] = Logger._pf_f(thing.prototype[prop]);
          }
        }
      }

      // mark class as being pfed
      thing._wl = true;

      thing = Logger.getParentClass(thing);
      console.log('thing wl is ', thing._wl, Logger.pfIs(thing));
      if ( thing !== Function.prototype && thing._wl == undefined) {
        cflag = true;
        console.log('going to ', thing.name, Object.getOwnPropertyNames(thing));
      }
      else {
        console.log('stopping');
      }
    } while (cflag == true);
  }

  static _pf_instance(_thing) {
    let retval = _thing;
    // console.log(`pfThing : ${Logger.typeof(_thing)}.`);

    // if already run, skip
    if ( retval.hasOwnProperty('_wl') == true ) return;

    let thing = _thing;
    let cflag = null;


    do {
      cflag = false;

      // on self
      let props = Object.getOwnPropertyNames(thing);
      //      console.log('props: ', props);
      for (let k in props) { // eslint-disable-line 
        let prop = props[k]; // eslint-disable-line security/detect-object-injection
        //       console.log(`  - check ${prop}`);
        if ( prop != 'constructor' && prop != 'arguments' && thing.hasOwnProperty(prop) ) {
          if ( (thing[prop] instanceof Function) === true ) {  // eslint-disable-line security/detect-object-injection
            //          console.log(`    - instrumenting ${prop}`);
            _thing[prop] = Logger._pf_f(_thing[prop]); // eslint-disable-line
          }
        }
      }

      thing = thing.__proto__;
      if ( thing !== Object.prototype && thing !== Function.prototype) {
        cflag = true;
        //     console.log('going to ', thing, Object.getOwnPropertyNames(thing));
      }
    } while (cflag);

    // mark instance as being pfed
    _thing._wl = true;

    return retval;
  };

  /**
  */
  static pfReport(_f, _l = null) {
    let logger = _l; if ( logger == null ) logger = Logger.g();
    logger.info(' performance report on function : ', _f.name);
    logger.info('       total calls: ', Logger.pfTotalCalls(_f));
    logger.info('        total time: ', Logger.pfTotalTime(_f));
    logger.info(' ave time per call: ', Logger.pfAveTime(_f));
  }
  /**
  */
  static pfReportLast(_f, _l = null) {
    let logger = _l; if ( logger == null ) logger = Logger.g();
    logger.info('          last run: ', Logger.pfLastRun(_f));
  }


  static pfLastRun(_f)    { return _f._wl.lastRun; }
  static pfTotalCalls(_f) { return _f._wl.tCalls; }
  static pfTotalTime(_f)  { return _f._wl.tTime; }
  static pfAveTime(_f)    { return _f._wl.tTime / _f._wl.tCalls; }
  static pfIs(_thing)     { if ( _thing.hasOwnProperty('_wl') ) return true; return false; }


  static pfReportCoverage(_thing, _msg) {
    let ty = Logger.typeof(_thing);

    Logger.g().info(`Woveon-Logger: Coverage Report of ${ty}: ${_msg}`);

    switch (ty) {
      case 'FUNCTION':
        Logger._pfCoverageReport_f(_thing, 'function');
        break;
      case 'INSTANCE':
        Logger._pfCoverageReport_instance(_thing, 'instance');
        break;
      default:
        Logger.g().error(`Unknown type of _thing ${ty} to report coverage on`);
    };
  }

  static _pfCoverageReport_f(_f, _t) {
    Logger.g().info(`  : ${_t} : ${_f._wl.tCalls} ${_f._wl.tTime}`);
  }

  static _pfCoverageReport_class(_cl, _t) {
    Logger.g().info(`  : ${_cl} : ${_cl._wl.tCalls} ${_cl._wl.tTime}`);
  }


  static _pfCoverageReport_instance(_o, _t) {
    Logger.g().info(`pfCoverageReport instance of class ${_o.constructor.name}`);
    // recurse through prototypes
    let obj = _o;
    let passnum = 1;
    do {
      console.log(`>pass ${passnum} `, obj);

      if ( obj.constructor.name != 'Object' ) {
        Object.getOwnPropertyNames(obj)
          .forEach( (prop) => {
            // Logger.g().info(`  - found '${prop}'`);

            let val = null;

            try {
              val = _o[prop]; // eslint-disable-line security/detect-object-injection
            }
            catch (e) { throw Error(`unabled ot get property '${prop}'... is it a getter?`); }

            if ( val != null && prop !== 'constructor' && typeof val === 'function'  ) {
              // Logger.g().info(`    - '${prop}' is a fuction to test instrumentation`);
              if ( Logger.pfIs(val) ) { Logger._pfCoverageReport_f(val, prop); }
            }

          });
        // Logger.g().info('...try to descend');
      }
      passnum++;
    } while (obj = Object.getPrototypeOf(obj));
  }

  /*
  static _pfCoverageReport_object(_o, _t) {
    Logger.g().info(`pfCoverageReport object of class ${_o.constructor.name}`);


    for (let k in _o ) {
      let v = _o[k];
      Logger.g().info(`  - property ${k} : ${_o.hasOwnProperty(k)} ${typeof v}`);
      if ( _o.hasOwnProperty(k) ) {
        // silently skip over non-instrumented functions
        if ( (typeof v ) == 'function' ) {
          Logger.g().info(`  - function ${k} : is pfed ${Logger.pfIs(v)}`);
          if ( Logger.pfIs(v) ) { Logger._pfCoverageReport_f(v, k); }
        }
      }
    }

    for (let k in _o.constructor ) {
      Logger.g().info('k : ', k, _o.constructor[k]);
      let v = _o.constructor[k];
      Logger.g().info(`  - constructor property ${k} : ${_o.hasOwnProperty(k)} ${_o.constructor.hasOwnProperty(k)} ${typeof v}`, v, k);
      if ( _o.constructor.hasOwnProperty(k) ) {
        // silently skip over non-instrumented functions
        if ( (typeof v ) == 'function' ) {
          Logger.g().info(`  - function ${k} : is pfed ${Logger.pfIs(v)}`);
          if ( Logger.pfIs(v) ) { Logger._pfCoverageReport_f(v, k); }
        }
      }
    }

  }
  */


        /**
         * Spew a bunch of stuff about _t.
         * @param {*} _t -
         */
        static spew(_t) {
          console.log('thing.name: ', _t.name);
          console.log('thing getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t));
          for (let k in Object.getOwnPropertyNames(_t) ) {
            console.log(`  - ${k} - ${_t.hasOwnProperty(k)}`);
          }
          console.log('thing.constructor: ', _t.constructor);
          if ( _t.constructor ) {
            console.log('thing.constructor.name: ', _t.constructor.name);
            for (let k in _t.constructor) { let v = _t.constructor[k]; console.log(`  thing.constructor[${k}]: `, v); }
            if ( _t.constructor.prototype ) {
              console.log('thing.constructor.prototype getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t.constructor.prototype));
            }
          }
          console.log('thing.constructor getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t.constructor));
          console.log('thing.prototype: ', _t.prototype);
          if ( _t.prototype ) {
            console.log('thing.prototype.name: ', _t.prototype.name);
            console.log('thing.prototype.aFunc: ', _t.prototype.aFunc);
            for (let k in _t.prototype) { let v = _t.prototype[k]; console.log(`  thing.prototype[${k}]: `, v); }
            console.log('thing.prototype getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t.prototype));

            console.log('thing.prototype.constructor: ', _t.prototype.constructor);
            console.log('typeof thing.prototype.constructor: ', typeof _t.prototype.constructor);
            for (let k in _t.prototype.constructor) { let v = _t.prototype.constructor[k]; console.log(`  thing.prototype.constructor[${k}]: `, v); }
            console.log('thing.prototype.constructor getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t.prototype.constructor));

            console.log('thing.prototype.constructor.prototype: ', _t.prototype.constructor.prototype);
            for (let k in _t.prototype.constructor.prototype) { let v = _t.prototype.constructor[k].prototype; console.log(`  thing.prototype.constructor.prototype[${k}]: `, v); }
            console.log('thing.prototype.constructor.prototype getOwnPropertyNames() : ', Object.getOwnPropertyNames(_t.prototype.constructor.prototype));
          }
        }


  // ---------------------------------------------------------------------
  // Error ids
  // ---------------------------------------------------------------------
//  setErrorTypes(_types) { this.errors = _types; }


};


Logger.ObjT = {
  UNDEFINED     : 'UNDEFINED',
  NULL          : 'NULL',
  BOOL          : 'BOOL',
  STRING        : 'STRING',
  SYMBOL        : 'SYMBOL',
  NUMBER        : 'NUMBER',
  OBJECT        : 'OBJECT',   // includes objects generated from functions
  FUNCTION      : 'FUNCTION',
  CLASS         : 'CLASS',
  INSTANCE      : 'INSTANCE',
  ASYNCFUNCTION : 'ASYNCFUNCTION',
  //  STATICFUNCTION : 'STATICFUNCTION', // no way to differentiate static function from regular function, as it's only about where it is placed on the object/instance/class
};

Logger._glogger = null;

module.exports = Logger;
