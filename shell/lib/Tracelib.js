/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__platform_fs_web_js__ = __webpack_require__(3);
/*
  Copyright 2015 Google Inc. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/



let events = [];
let pid;
let now;
if (typeof document == 'object') {
  pid = 42;
  now = function() {
    let t = performance.now();
    return t;
  };
} else {
  pid = process.pid;
  now = function() {
    let t = process.hrtime();
    return t[0] * 1000000 + t[1] / 1000;
  };
}

let flowId = 0;

function parseInfo(info) {
  if (!info)
    return {};
  if (typeof info == 'function')
    return parseInfo(info());
  if (info.toTraceInfo)
    return parseInfo(info.toTraceInfo());
  return info;
}

let module = {exports: {}};
/* harmony default export */ __webpack_exports__["a"] = (module.exports);
module.exports.enabled = false;
module.exports.enable = function() {
  module.exports.enabled = true;
  init();
};

// TODO: Add back support for options.
//module.exports.options = options;
//var enabled = Boolean(options.traceFile);

function init() {
  let result = {
    wait: function(f) {
      if (f instanceof Function) {
        return f();
      }
      return f;
    },
    resume: function() {
      return this;
    },
    start: function() {
      return this;
    },
    end: function() {
      return this;
    },
    step: function() {
      return this;
    },
    endWrap: function(fn) {
      return fn;
    },
  };
  module.exports.wrap = function(info, fn) {
    return fn;
  };
  module.exports.start = function(info, fn) {
    return result;
  };
  module.exports.async = function(info, fn) {
    return result;
  };
  module.exports.flow = function(info, fn) {
    return result;
  };
  module.exports.dump = function() {
  };

  if (!module.exports.enabled) {
    return;
  }

  module.exports.wrap = function(info, fn) {
    return function(...args) {
      let t = module.exports.start(info);
      try {
        return fn(...args);
      } finally {
        t.end();
      }
    };
  };
  module.exports.start = function(info) {
    info = parseInfo(info);
    let args = info.args || {};
    let begin = now();
    return {
      end: function(endInfo) {
        if (endInfo && endInfo.args) {
          Object.assign(args, endInfo.args);
        }
        let end = now();
        events.push({
          ph: 'X',
          ts: begin,
          dur: end - begin,
          cat: info.cat,
          name: info.name,
          args: args,
        });
      },
    };
  };
  // TODO: perhaps this should just be the only API, it acts the same as
  //       start() when there is no call to wait/resume().
  module.exports.async = function(info) {
    let trace = module.exports.start(info);
    let flow;
    let baseInfo = {cat: info.cat, name: info.name + ' (async)'};
    let n = 0;
    return {
      async wait(v) {
        let result;
        if (v instanceof Promise) {
          result = f;
        } else {
          result = v();
        }
        if (!flow) {
          flow = module.exports.flow(baseInfo).start();
        }
        trace.end();
        trace = null;
        return result;
      },
      resume(info) {
        if (info) {
          Object.assign(info, baseInfo);
        } else {
          info = baseInfo;
        }
        trace = module.exports.start(info);
        flow.step(baseInfo);
      },
      end(endInfo) {
        if (flow) {
          flow.end();
        }
        trace.end(endInfo);
      },
    };
  };
  module.exports.flow = function(info) {
    info = parseInfo(info);
    let id = flowId++;
    let started = false;
    return {
      start: function() {
        let begin = now();
        started = true;
        events.push({
          ph: 's',
          ts: begin,
          cat: info.cat,
          name: info.name,
          args: info.args,
          id: id,
        });
        return this;
      },
      end: function(endInfo) {
        if (!started) return;
        let end = now();
        endInfo = parseInfo(endInfo);
        events.push({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts: end,
          cat: info.cat,
          name: info.name,
          args: endInfo && endInfo.args,
          id: id,
        });
        return this;
      },
      step: function(stepInfo) {
        if (!started) return;
        let step = now();
        stepInfo = parseInfo(stepInfo);
        events.push({
          ph: 't',
          ts: step,
          cat: info.cat,
          name: info.name,
          args: stepInfo && stepInfo.args,
          id: id,
        });
        return this;
      },
    };
  };
  module.exports.save = function() {
    events.forEach(function(event) {
      event.pid = pid;
      event.tid = 0;
      if (!event.args) {
        delete event.args;
      }
      if (!event.cat) {
        event.cat = '';
      }
    });
    return {traceEvents: events};
  };
  module.exports.dump = function() {
    __WEBPACK_IMPORTED_MODULE_0__platform_fs_web_js__["a" /* default */].writeFileSync(options.traceFile, module.exports.save());
  };
  module.exports.download = function() {
    let a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module.exports.save()));
    a.click();
  };
}

init();

/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(2)))

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__arcs_tracelib_trace_js__ = __webpack_require__(0);
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */



window.Tracing = __WEBPACK_IMPORTED_MODULE_0__arcs_tracelib_trace_js__["a" /* default */];


/***/ }),
/* 2 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/* harmony default export */ __webpack_exports__["a"] = ({});


/***/ })
/******/ ]);
//# sourceMappingURL=Tracelib.js.map