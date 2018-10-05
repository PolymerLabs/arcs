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
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./shell/source/worker-entry.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./devtools/shared/devtools-broker.js":
/*!********************************************!*\
  !*** ./devtools/shared/devtools-broker.js ***!
  \********************************************/
/*! exports provided: DevtoolsBroker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(global) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DevtoolsBroker", function() { return DevtoolsBroker; });
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// Debugging is initialized either by /devtools/src/run-mark-connected.js, which is
// injected by the devtools extension content script in the browser env,
// or used directly when debugging nodeJS.

// Data needs to be referenced via a global object, otherwise extension and
// Arcs have different instances.
let root = typeof window === 'object' ? window : global;

if (!root._arcDebugPromise) {
  root._arcDebugPromise = new Promise(resolve => {
    root._arcDebugPromiseResolve = resolve;
  });
}

class DevtoolsBroker {
  static get onceConnected() {
    return root._arcDebugPromise;
  }
  static markConnected() {
    root._arcDebugPromiseResolve();
    return {preExistingArcs: !!root.arc};
  }
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/*! no static exports found */
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

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1, eval)("this");
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./platform/assert-web.js":
/*!********************************!*\
  !*** ./platform/assert-web.js ***!
  \********************************/
/*! exports provided: assert */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "assert", function() { return assert; });
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

function assert(test, message) {
  if (!test) {
    debugger; // eslint-disable-line no-debugger
    throw new Error(message);
  }
}


/***/ }),

/***/ "./platform/devtools-channel-web.js":
/*!******************************************!*\
  !*** ./platform/devtools-channel-web.js ***!
  \******************************************/
/*! exports provided: DevtoolsChannel */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DevtoolsChannel", function() { return DevtoolsChannel; });
/* harmony import */ var _runtime_debug_abstract_devtools_channel_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../runtime/debug/abstract-devtools-channel.js */ "./runtime/debug/abstract-devtools-channel.js");
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */




class DevtoolsChannel extends _runtime_debug_abstract_devtools_channel_js__WEBPACK_IMPORTED_MODULE_0__["AbstractDevtoolsChannel"] {
  constructor() {
    super();
    document.addEventListener('arcs-debug-in', e => this._handleMessage(e.detail));
  }

  _flush(messages) {
    document.dispatchEvent(new CustomEvent('arcs-debug-out', {detail: messages}));
  }
}


/***/ }),

/***/ "./platform/fs-web.js":
/*!****************************!*\
  !*** ./platform/fs-web.js ***!
  \****************************/
/*! exports provided: fs */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fs", function() { return fs; });
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = {};


/***/ }),

/***/ "./platform/vm-web.js":
/*!****************************!*\
  !*** ./platform/vm-web.js ***!
  \****************************/
/*! exports provided: vm */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "vm", function() { return vm; });
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const vm = {};


/***/ }),

/***/ "./runtime/api-channel.js":
/*!********************************!*\
  !*** ./runtime/api-channel.js ***!
  \********************************/
/*! exports provided: APIPort, PECOuterPort, PECInnerPort */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "APIPort", function() { return APIPort; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PECOuterPort", function() { return PECOuterPort; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PECInnerPort", function() { return PECInnerPort; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_spec_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./particle-spec.js */ "./runtime/particle-spec.js");
/* harmony import */ var _ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ts-build/type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _debug_outer_port_attachment_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./debug/outer-port-attachment.js */ "./runtime/debug/outer-port-attachment.js");
/* harmony import */ var _debug_devtools_connection_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./debug/devtools-connection.js */ "./runtime/debug/devtools-connection.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */








class ThingMapper {
  constructor(prefix) {
    this._prefix = prefix;
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
  }

  _newIdentifier() {
    return this._prefix + (this._nextIdentifier++);
  }

  createMappingForThing(thing, requestedId) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this._reverseIdMap.has(thing));
    let id;
    if (requestedId) {
      id = requestedId;
    } else if (thing.apiChannelMappingId) {
      id = thing.apiChannelMappingId;
    } else {
      id = this._newIdentifier();
    }
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this._idMap.has(id), `${requestedId ? 'requestedId' : (thing.apiChannelMappingId ? 'apiChannelMappingId' : 'newIdentifier()')} ${id} already in use`);
    this.establishThingMapping(id, thing);
    return id;
  }

  maybeCreateMappingForThing(thing) {
    if (this.hasMappingForThing(thing)) {
      return this.identifierForThing(thing);
    }
    return this.createMappingForThing(thing);
  }

  async establishThingMapping(id, thing) {
    let continuation;
    if (Array.isArray(thing)) {
      [thing, continuation] = thing;
    }
    this._idMap.set(id, thing);
    if (thing instanceof Promise) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(continuation == null);
      await this.establishThingMapping(id, await thing);
    } else {
      this._reverseIdMap.set(thing, id);
      if (continuation) {
        await continuation();
      }
    }
  }

  hasMappingForThing(thing) {
    return this._reverseIdMap.has(thing);
  }

  identifierForThing(thing) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this._reverseIdMap.has(thing), `Missing thing [${thing}]`);
    return this._reverseIdMap.get(thing);
  }

  thingForIdentifier(id) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this._idMap.has(id), `Missing id: ${id}`);
    return this._idMap.get(id);
  }
}


class APIPort {
  constructor(messagePort, prefix) {
    this._port = messagePort;
    this._mapper = new ThingMapper(prefix);
    this._messageMap = new Map();
    this._port.onmessage = async e => this._processMessage(e);
    this._debugAttachment = null;
    this.messageCount = 0;

    this.Direct = {
      convert: a => a,
      unconvert: a => a
    };

    this.LocalMapped = {
      convert: a => this._mapper.maybeCreateMappingForThing(a),
      unconvert: a => this._mapper.thingForIdentifier(a)
    };

    this.Mapped = {
      convert: a => this._mapper.identifierForThing(a),
      unconvert: a => this._mapper.thingForIdentifier(a)
    };

    this.Map = function(keyprimitive, valueprimitive) {
      return {
        convert: a => {
          let r = {};
          a.forEach((value, key) => r[keyprimitive.convert(key)] = valueprimitive.convert(value));
          return r;
        },
        unconvert: a => {
          let r = new Map();
          for (let key in a) {
            r.set(
                keyprimitive.unconvert(key), valueprimitive.unconvert(a[key]));
          }
          return r;
        }
      };
    };

    this.List = function(primitive) {
      return {
        convert: a => a.map(v => primitive.convert(v)),
        unconvert: a => a.map(v => primitive.unconvert(v))
      };
    };

    this.ByLiteral = function(clazz) {
      return {
        convert: a => a.toLiteral(),
        unconvert: a => clazz.fromLiteral(a)
      };
    };

    this._testingHook();
  }

  // Overridden by unit tests.
  _testingHook() {
  }

  close() {
    this._port.close();
  }

  async _processMessage(e) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this._messageMap.has(e.data.messageType));

    this.messageCount++;

    let handler = this._messageMap.get(e.data.messageType);
    let args;
    try {
      args = this._unprocessArguments(handler.args, e.data.messageBody);
    } catch (exc) {
      console.error(`Exception during unmarshaling for ${e.data.messageType}`);
      throw exc;
    }
    // If any of the converted arguments are still pending promises
    // wait for them to complete before processing the message.
    for (let arg of Object.values(args)) {
      if (arg instanceof Promise) {
        arg.then(() => this._processMessage(e));
        return;
      }
    }
    let handlerName = 'on' + e.data.messageType;
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this[handlerName], `no handler named ${handlerName}`);
    let result = this[handlerName](args);
    if (this._debugAttachment && this._debugAttachment[handlerName]) {
      this._debugAttachment[handlerName](args);
    }
    if (handler.isInitializer) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(args.identifier);
      await this._mapper.establishThingMapping(args.identifier, result);
    }
  }

  _processArguments(argumentTypes, args) {
    let messageBody = {};
    for (let argument in argumentTypes) {
      messageBody[argument] = argumentTypes[argument].convert(args[argument]);
    }
    return messageBody;
  }

  _unprocessArguments(argumentTypes, args) {
    let messageBody = {};
    for (let argument in argumentTypes) {
      messageBody[argument] = argumentTypes[argument].unconvert(args[argument]);
    }
    return messageBody;
  }

  registerCall(name, argumentTypes) {
    this[name] = args => {
      let call = {messageType: name, messageBody: this._processArguments(argumentTypes, args)};
      this.messageCount++;
      this._port.postMessage(call);
      if (this._debugAttachment && this._debugAttachment[name]) {
        this._debugAttachment[name](args);
      }
    };
  }

  registerHandler(name, argumentTypes) {
    this._messageMap.set(name, {args: argumentTypes});
  }

  registerInitializerHandler(name, argumentTypes) {
    argumentTypes.identifier = this.Direct;
    this._messageMap.set(name, {
      isInitializer: true,
      args: argumentTypes,
    });
  }

  registerRedundantInitializer(name, argumentTypes, mappingIdArg) {
    this.registerInitializer(name, argumentTypes, mappingIdArg, true /* redundant */);
  }

  registerInitializer(name, argumentTypes, mappingIdArg = null, redundant = false) {
    this[name] = (thing, args) => {
      if (redundant && this._mapper.hasMappingForThing(thing)) return;
      let call = {messageType: name, messageBody: this._processArguments(argumentTypes, args)};
      let requestedId = mappingIdArg && args[mappingIdArg];
      call.messageBody.identifier = this._mapper.createMappingForThing(thing, requestedId);
      this.messageCount++;
      this._port.postMessage(call);
      if (this._debugAttachment && this._debugAttachment[name]) {
        this._debugAttachment[name](thing, args);
      }
    };
  }
}

class PECOuterPort extends APIPort {
  constructor(messagePort, arc) {
    super(messagePort, 'o');

    this.registerCall('Stop', {});
    this.registerRedundantInitializer('DefineHandle', {type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct});
    this.registerInitializer('InstantiateParticle',
      {id: this.Direct, spec: this.ByLiteral(_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"]), handles: this.Map(this.Direct, this.Mapped)}, 'id');

    this.registerCall('UIEvent', {particle: this.Mapped, slotName: this.Direct, event: this.Direct});
    this.registerCall('SimpleCallback', {callback: this.Direct, data: this.Direct});
    this.registerCall('AwaitIdle', {version: this.Direct});
    this.registerCall('StartRender', {particle: this.Mapped, slotName: this.Direct, contentTypes: this.List(this.Direct)});
    this.registerCall('StopRender', {particle: this.Mapped, slotName: this.Direct});

    this.registerHandler('Render', {particle: this.Mapped, slotName: this.Direct, content: this.Direct});
    this.registerHandler('InitializeProxy', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('SynchronizeProxy', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('HandleGet', {handle: this.Mapped, callback: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleToList', {handle: this.Mapped, callback: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleSet', {handle: this.Mapped, data: this.Direct, particleId: this.Direct, barrier: this.Direct});
    this.registerHandler('HandleClear', {handle: this.Mapped, particleId: this.Direct, barrier: this.Direct});
    this.registerHandler('HandleStore', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleRemove', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleRemoveMultiple', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleStream', {handle: this.Mapped, callback: this.Direct, pageSize: this.Direct});
    this.registerHandler('StreamCursorNext', {handle: this.Mapped, callback: this.Direct, cursorId: this.Direct});
    this.registerHandler('StreamCursorClose', {handle: this.Mapped, cursorId: this.Direct});

    this.registerHandler('Idle', {version: this.Direct, relevance: this.Map(this.Mapped, this.Direct)});

    this.registerHandler('GetBackingStore', {callback: this.Direct, storageKey: this.Direct, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"])});
    this.registerInitializer('GetBackingStoreCallback', {callback: this.Direct, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct, id: this.Direct, storageKey: this.Direct});

    this.registerHandler('ConstructInnerArc', {callback: this.Direct, particle: this.Mapped});
    this.registerCall('ConstructArcCallback', {callback: this.Direct, arc: this.LocalMapped});

    this.registerHandler('ArcCreateHandle', {callback: this.Direct, arc: this.LocalMapped, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct});
    this.registerInitializer('CreateHandleCallback', {callback: this.Direct, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct, id: this.Direct});
    this.registerHandler('ArcMapHandle', {callback: this.Direct, arc: this.LocalMapped, handle: this.Mapped});
    this.registerInitializer('MapHandleCallback', {callback: this.Direct, id: this.Direct});
    this.registerHandler('ArcCreateSlot',
      {callback: this.Direct, arc: this.LocalMapped, transformationParticle: this.Mapped, transformationSlotName: this.Direct, hostedParticleName: this.Direct, hostedSlotName: this.Direct, handleId: this.Direct});
    this.registerInitializer('CreateSlotCallback', {callback: this.Direct, hostedSlotId: this.Direct});
    this.registerCall('InnerArcRender', {transformationParticle: this.Mapped, transformationSlotName: this.Direct, hostedSlotId: this.Direct, content: this.Direct});

    this.registerHandler('ArcLoadRecipe', {arc: this.LocalMapped, recipe: this.Direct, callback: this.Direct});

    this.registerHandler('RaiseSystemException', {exception: this.Direct, methodName: this.Direct, particleId: this.Direct});

    _debug_devtools_connection_js__WEBPACK_IMPORTED_MODULE_4__["DevtoolsConnection"].onceConnected.then(
      devtoolsChannel => this._debugAttachment = new _debug_outer_port_attachment_js__WEBPACK_IMPORTED_MODULE_3__["OuterPortAttachment"](arc, devtoolsChannel));
  }
}

class PECInnerPort extends APIPort {
  constructor(messagePort) {
    super(messagePort, 'i');

    this.registerHandler('Stop', {});
    this.registerInitializerHandler('DefineHandle', {type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct});
    this.registerInitializerHandler('InstantiateParticle',
      {id: this.Direct, spec: this.ByLiteral(_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"]), handles: this.Map(this.Direct, this.Mapped)});

    this.registerHandler('UIEvent', {particle: this.Mapped, slotName: this.Direct, event: this.Direct});
    this.registerHandler('SimpleCallback', {callback: this.LocalMapped, data: this.Direct});
    this.registerHandler('AwaitIdle', {version: this.Direct});
    this.registerHandler('StartRender', {particle: this.Mapped, slotName: this.Direct, contentTypes: this.List(this.Direct)});
    this.registerHandler('StopRender', {particle: this.Mapped, slotName: this.Direct});

    this.registerCall('Render', {particle: this.Mapped, slotName: this.Direct, content: this.Direct});
    this.registerCall('InitializeProxy', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('SynchronizeProxy', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('HandleGet', {handle: this.Mapped, callback: this.LocalMapped, particleId: this.Direct});
    this.registerCall('HandleToList', {handle: this.Mapped, callback: this.LocalMapped, particleId: this.Direct});
    this.registerCall('HandleSet', {handle: this.Mapped, data: this.Direct, particleId: this.Direct, barrier: this.Direct});
    this.registerCall('HandleClear', {handle: this.Mapped, particleId: this.Direct, barrier: this.Direct});
    this.registerCall('HandleStore', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleRemove', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleRemoveMultiple', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleStream', {handle: this.Mapped, callback: this.LocalMapped, pageSize: this.Direct});
    this.registerCall('StreamCursorNext', {handle: this.Mapped, callback: this.LocalMapped, cursorId: this.Direct});
    this.registerCall('StreamCursorClose', {handle: this.Mapped, cursorId: this.Direct});

    this.registerCall('Idle', {version: this.Direct, relevance: this.Map(this.Mapped, this.Direct)});

    this.registerCall('GetBackingStore', {callback: this.LocalMapped, storageKey: this.Direct, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"])});
    this.registerInitializerHandler('GetBackingStoreCallback', {callback: this.LocalMapped, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct, id: this.Direct, storageKey: this.Direct});

    this.registerCall('ConstructInnerArc', {callback: this.LocalMapped, particle: this.Mapped});
    this.registerHandler('ConstructArcCallback', {callback: this.LocalMapped, arc: this.Direct});

    this.registerCall('ArcCreateHandle', {callback: this.LocalMapped, arc: this.Direct, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct});
    this.registerInitializerHandler('CreateHandleCallback', {callback: this.LocalMapped, type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct, id: this.Direct});
    this.registerCall('ArcMapHandle', {callback: this.LocalMapped, arc: this.Direct, handle: this.Mapped});
    this.registerInitializerHandler('MapHandleCallback', {callback: this.LocalMapped, id: this.Direct});
    this.registerCall('ArcCreateSlot',
      {callback: this.LocalMapped, arc: this.Direct, transformationParticle: this.Mapped, transformationSlotName: this.Direct, hostedParticleName: this.Direct, hostedSlotName: this.Direct, handleId: this.Direct});
    this.registerInitializerHandler('CreateSlotCallback', {callback: this.LocalMapped, hostedSlotId: this.Direct});
    this.registerHandler('InnerArcRender', {transformationParticle: this.Mapped, transformationSlotName: this.Direct, hostedSlotId: this.Direct, content: this.Direct});

    this.registerCall('ArcLoadRecipe', {arc: this.Direct, recipe: this.Direct, callback: this.LocalMapped});

    this.registerCall('RaiseSystemException', {exception: this.Direct, methodName: this.Direct, particleId: this.Direct});
  }
}


/***/ }),

/***/ "./runtime/converters/jsonldToManifest.js":
/*!************************************************!*\
  !*** ./runtime/converters/jsonldToManifest.js ***!
  \************************************************/
/*! exports provided: JsonldToManifest */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "JsonldToManifest", function() { return JsonldToManifest; });
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let supportedTypes = ['Text', 'URL', 'Number', 'Boolean'];

class JsonldToManifest {
  static convert(jsonld, theClass) {
    let obj = JSON.parse(jsonld);
    let classes = {};
    let properties = {};

    if (!obj['@graph']) {
      obj['@graph'] = [obj];
    }

    for (let item of obj['@graph']) {
      if (item['@type'] == 'rdf:Property') {
        properties[item['@id']] = item;
      } else if (item['@type'] == 'rdfs:Class') {
        classes[item['@id']] = item;
        item.subclasses = [];
        item.superclass = null;
      }
    }

    for (let clazz of Object.values(classes)) {
      if (clazz['rdfs:subClassOf'] !== undefined) {
        if (clazz['rdfs:subClassOf'].length == undefined) {
          clazz['rdfs:subClassOf'] = [clazz['rdfs:subClassOf']];
        }
        for (let subClass of clazz['rdfs:subClassOf']) {
          let superclass = subClass['@id'];
          if (clazz.superclass == undefined) {
            clazz.superclass = [];
          }
          if (classes[superclass]) {
            classes[superclass].subclasses.push(clazz);
            clazz.superclass.push(classes[superclass]);
          } else {
            clazz.superclass.push({'@id': superclass});
          }
        }
      }
    }

    for (let clazz of Object.values(classes)) {
      if (clazz.subclasses.length == 0 && theClass == undefined) {
        theClass = clazz;
      }
    }

    let relevantProperties = [];
    for (let property of Object.values(properties)) {
      let domains = property['schema:domainIncludes'];
      if (!domains) {
        domains = {'@id': theClass['@id']};
      }
      if (!domains.length) {
        domains = [domains];
      }
      domains = domains.map(a => a['@id']);
      if (domains.includes(theClass['@id'])) {
        let name = property['@id'].split(':')[1];
        let type = property['schema:rangeIncludes'];
        if (!type) {
          console.log(property);
        }
        if (!type.length) {
          type = [type];
        }

        type = type.map(a => a['@id'].split(':')[1]);
        type = type.filter(type => supportedTypes.includes(type));
        if (type.length > 0) {
          relevantProperties.push({name, type});
        }
      }
    }

    let className = theClass['@id'].split(':')[1];
    let superNames = theClass.superclass ? theClass.superclass.map(a => a['@id'].split(':')[1]) : [];

    let s = '';
    for (let superName of superNames) {
      s += `import 'https://schema.org/${superName}'\n\n`;
    }

    s += `schema ${className}`;
    if (superNames.length > 0) {
      s += ` extends ${superNames.join(', ')}`;
    }

    if (relevantProperties.length > 0) {
      for (let property of relevantProperties) {
        let type;
        if (property.type.length > 1) {
          type = '(' + property.type.join(' or ') + ')';
        } else {
          type = property.type[0];
        }
        s += `\n  ${type} ${property.name}`;
      }
    }
    s += '\n';

    return s;
  }
}


/***/ }),

/***/ "./runtime/debug/abstract-devtools-channel.js":
/*!****************************************************!*\
  !*** ./runtime/debug/abstract-devtools-channel.js ***!
  \****************************************************/
/*! exports provided: AbstractDevtoolsChannel */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AbstractDevtoolsChannel", function() { return AbstractDevtoolsChannel; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */




class AbstractDevtoolsChannel {
  constructor() {
    this.debouncedMessages = [];
    this.debouncing = false;
    this.messageListeners = new Map();
  }

  send(message) {
    this.debouncedMessages.push(message);
    if (!this.debouncing) {
      this.debouncing = true;
      setTimeout(() => {
        this._flush(this.debouncedMessages);
        this.debouncedMessages = [];
        this.debouncing = false;
      }, 100);
    }
  }

  listen(arcOrId, messageType, callback) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(messageType);
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(arcOrId);
    const arcId = typeof arcOrId === 'string' ? arcOrId : arcOrId.id.toString();
    const key = `${arcId}/${messageType}`;
    let listeners = this.messageListeners.get(key);
    if (!listeners) this.messageListeners.set(key, listeners = []);
    listeners.push(callback);
  }

  _handleMessage(msg) {
    let listeners = this.messageListeners.get(`${msg.arcId}/${msg.messageType}`);
    if (!listeners) {
      console.warn(`No one is listening to ${msg.messageType} message`);
    } else {
      for (let listener of listeners) listener(msg);
    }
  }

  _flush(messages) {
    throw 'Not implemented in an abstract class';
  }
}


/***/ }),

/***/ "./runtime/debug/devtools-connection.js":
/*!**********************************************!*\
  !*** ./runtime/debug/devtools-connection.js ***!
  \**********************************************/
/*! exports provided: DevtoolsConnection, DevtoolsForTests */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DevtoolsConnection", function() { return DevtoolsConnection; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DevtoolsForTests", function() { return DevtoolsForTests; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _platform_devtools_channel_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../platform/devtools-channel-web.js */ "./platform/devtools-channel-web.js");
/* harmony import */ var _testing_devtools_channel_stub_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./testing/devtools-channel-stub.js */ "./runtime/debug/testing/devtools-channel-stub.js");
/* harmony import */ var _devtools_shared_devtools_broker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../devtools/shared/devtools-broker.js */ "./devtools/shared/devtools-broker.js");
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */






let channel = null;
let isConnected = false;
let onceConnectedResolve = null;
let onceConnected = new Promise(resolve => onceConnectedResolve = resolve);

_devtools_shared_devtools_broker_js__WEBPACK_IMPORTED_MODULE_3__["DevtoolsBroker"].onceConnected.then(() => {
  DevtoolsConnection.ensure();
  onceConnectedResolve(channel);
  isConnected = true;
});

class DevtoolsConnection {
  static get isConnected() {
    return isConnected;
  }
  static get onceConnected() {
    return onceConnected;
  }
  static get() {
    return channel;
  }
  static ensure() {
    if (!channel) channel = new _platform_devtools_channel_web_js__WEBPACK_IMPORTED_MODULE_1__["DevtoolsChannel"]();
  }
}

class DevtoolsForTests {
  static get channel() {
    return channel;
  }
  static ensureStub() {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!channel);
    channel = new _testing_devtools_channel_stub_js__WEBPACK_IMPORTED_MODULE_2__["DevtoolsChannelStub"]();
    onceConnectedResolve(channel);
    isConnected = true;
  }
  static reset() {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(channel);
    isConnected = false;
    onceConnectedResolve = null;
    onceConnected = new Promise(resolve => onceConnectedResolve = resolve);
    channel = null;
  }
}


/***/ }),

/***/ "./runtime/debug/outer-port-attachment.js":
/*!************************************************!*\
  !*** ./runtime/debug/outer-port-attachment.js ***!
  \************************************************/
/*! exports provided: OuterPortAttachment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OuterPortAttachment", function() { return OuterPortAttachment; });
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 

class OuterPortAttachment {
  constructor(arc, devtoolsChannel) {
    this._devtoolsChannel = devtoolsChannel;
    this._arcIdString = arc.id.toString();
    this._speculative = arc.isSpeculative;
    this._callbackRegistry = {};
    this._particleRegistry = {};
  }

  InstantiateParticle(particle, {id, spec, handles}) {
    this._particleRegistry[id] = spec;
    this._devtoolsChannel.send({
      messageType: 'InstantiateParticle',
      messageBody: Object.assign(
        this._arcMetadata(),
        this._trimParticleSpec(id, spec, handles)
      )
    });
  }

  SimpleCallback({callback, data}) {
    let callbackDetails = this._callbackRegistry[callback];
    if (callbackDetails) {
      // Copying callback data, as the callback can be used multiple times.
      this._sendDataflowMessage(Object.assign({}, callbackDetails), data);
    }
  }

  onInitializeProxy({handle, callback}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'on-change', handle});
  }

  onSynchronizeProxy({handle, callback}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'sync-model', handle});
  }

  onHandleGet({handle, callback, particleId}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'get', handle, particleId});
  }

  onHandleToList({handle, callback, particleId}) {
    this._callbackRegistry[callback] = this._describeHandleCall(
      {operation: 'toList', handle, particleId});
  }

  onHandleSet({handle, data, particleId, barrier}) {
    this._logHandleCall({operation: 'set', handle, data, particleId});
  }

  onHandleStore({handle, data, particleId}) {
    this._logHandleCall({operation: 'store', handle, data, particleId});
  }

  onHandleClear({handle, particleId, barrier}) {
    this._logHandleCall({operation: 'clear', handle, particleId});
  }

  onHandleRemove({handle, data, particleId}) {
    this._logHandleCall({operation: 'remove', handle, data, particleId});
  }

  // TODO: add BigCollection stream APIs?

  _logHandleCall(args) {
    this._sendDataflowMessage(this._describeHandleCall(args), args.data);
  }

  _sendDataflowMessage(messageBody, data) {
    messageBody.data = JSON.stringify(data);
    messageBody.timestamp = Date.now();
    this._devtoolsChannel.send({messageType: 'dataflow', messageBody});
  }

  _describeHandleCall({operation, handle, particleId}) {
    let metadata = Object.assign(this._arcMetadata(), {
      operation,
      handle: this._describeHandle(handle)
    });
    if (particleId) metadata.particle = this._describeParticle(particleId);
    return metadata;
  }

  _arcMetadata() {
    return {
      arcId: this._arcIdString,
      speculative: this._speculative
    };
  }

  _trimParticleSpec(id, spec, handles) {
    let connections = {};
    spec.connectionMap.forEach((value, key) => {
      connections[key] = Object.assign({
        direction: value.direction
      }, this._describeHandle(handles.get(key)));
    });
    return {
      id,
      name: spec.name,
      connections,
      implFile: spec.implFile
    };
  }

  _describeParticle(id) {
    let particleSpec = this._particleRegistry[id];
    return {
      id,
      name: particleSpec && particleSpec.name
      // TODO: Send entire spec only once and refer to it by ID in the tool.
    };
  }

  _describeHandle(handle) {
    return {
      id: handle.id,
      storageKey: handle._storageKey,
      name: handle.name,
      description: handle.description,
      type: this._describeHandleType(handle._type)
    };
  }

  // TODO: This is fragile and incomplete. Change this into sending entire
  //       handle object once and refer back to it via its ID in the tool.
  _describeHandleType(handleType) {
    switch (handleType.constructor.name) {
      case 'Type':
        switch (handleType.tag) {
          case 'Collection': return `[${this._describeHandleType(handleType.data)}]`;
          case 'Entity': return this._describeHandleType(handleType.data);
          default: return `${handleType.tag} ${this._describeHandleType(handleType.data)}`;
        }
      case 'Schema':
        return handleType.name;
      case 'Shape':
        return 'Shape';
    }
    return '';
  }
}


/***/ }),

/***/ "./runtime/debug/testing/devtools-channel-stub.js":
/*!********************************************************!*\
  !*** ./runtime/debug/testing/devtools-channel-stub.js ***!
  \********************************************************/
/*! exports provided: DevtoolsChannelStub */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DevtoolsChannelStub", function() { return DevtoolsChannelStub; });
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

class DevtoolsChannelStub {
  constructor() {
    this._messages = [];
  }

  get messages() {
    return this._messages;
  }

  send(message) {
    this._messages.push(JSON.parse(JSON.stringify(message)));
  }

  listen(arcOrId, messageType, callback) { /* No-op */ }

  clear() {
    this._messages.length = 0;
  }
}


/***/ }),

/***/ "./runtime/dom-particle-base.js":
/*!**************************************!*\
  !*** ./runtime/dom-particle-base.js ***!
  \**************************************/
/*! exports provided: DomParticleBase */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DomParticleBase", function() { return DomParticleBase; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./particle.js */ "./runtime/particle.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */





/** @class DomParticleBase
 * Particle that interoperates with DOM.
 */
class DomParticleBase extends _particle_js__WEBPACK_IMPORTED_MODULE_1__["Particle"] {
  constructor() {
    super();
  }
  /** @method get template()
   * Override to return a String defining primary markup.
   */
  get template() {
    return '';
  }
  /** @method getTemplate(slotName)
   * Override to return a String defining primary markup for the given slot name.
   */
  getTemplate(slotName) {
    // TODO: only supports a single template for now. add multiple templates support.
    return this.template;
  }
  /** @method getTemplateName(slotName)
   * Override to return a String defining the name of the template for the given slot name.
   */
  getTemplateName(slotName) {
    // TODO: only supports a single template for now. add multiple templates support.
    return `default`;
  }
  /** @method shouldRender()
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender() {
    return true;
  }
  /** @method render()
   * Override to return a dictionary to map into the template.
   */
  render() {
    return {};
  }
  renderSlot(slotName, contentTypes) {
    const stateArgs = this._getStateArgs();
    let slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    // Set this to support multiple slots consumed by a particle, without needing
    // to pass slotName to particle's render method, where it useless in most cases.
    this.currentSlotName = slotName;
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every slot
    if (this.shouldRender(...stateArgs)) {
      let content = {};
      if (slot._requestedContentTypes.has('template')) {
        content.template = this.getTemplate(slot.slotName);
      }
      if (slot._requestedContentTypes.has('model')) {
        content.model = this.render(...stateArgs);
      }
      content.templateName = this.getTemplateName(slot.slotName);
      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
    this.currentSlotName = undefined;
  }
  _getStateArgs() {
    return [];
  }
  forceRenderTemplate(slotName) {
    this._slotByName.forEach((slot, name) => {
      if (!slotName || (name == slotName)) {
        slot._requestedContentTypes.add('template');
      }
    });
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      this[handler]({data});
    }
  }
  setParticleDescription(pattern) {
    if (typeof pattern === 'string') {
      return super.setParticleDescription(pattern);
    }
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!!pattern.template && !!pattern.model, 'Description pattern must either be string or have template and model');
    super.setDescriptionPattern('_template_', pattern.template);
    super.setDescriptionPattern('_model_', JSON.stringify(pattern.model));
  }
  /** @method clearHandle(handleName)
   * Remove entities from named handle.
   */
  async clearHandle(handleName) {
    const handle = this.handles.get(handleName);
    if (handle.clear) {
      handle.clear();
    } else {
      const entities = await handle.toList();
      if (entities) {
        return Promise.all(entities.map(entity => handle.remove(entity)));
      }
    }
  }
  /** @method mergeEntitiesToHandle(handleName, entityArray)
   * Merge entities from Array into named handle.
   */
  async mergeEntitiesToHandle(handleName, entities) {
    const idMap = {};
    const handle = this.handles.get(handleName);
    const handleEntities = await handle.toList();
    handleEntities.forEach(entity => idMap[entity.id] = entity);
    for (const entity of entities) {
      if (!idMap[entity.id]) {
        handle.store(entity);
      }
    }
    //Promise.all(entities.map(entity => !idMap[entity.id] && handle.store(entity)));
    //Promise.all(entities.map(entity => handle.store(entity)));
  }
  /** @method appendEntitiesToHandle(handleName, entityArray)
   * Append entities from Array to named handle.
   */
  async appendEntitiesToHandle(handleName, entities) {
    const handle = this.handles.get(handleName);
    Promise.all(entities.map(entity => handle.store(entity)));
  }
  /** @method appendRawDataToHandle(handleName, rawDataArray)
   * Create an entity from each rawData, and append to named handle.
   */
  async appendRawDataToHandle(handleName, rawDataArray) {
    const handle = this.handles.get(handleName);
    const entityClass = handle.entityClass;
    Promise.all(rawDataArray.map(raw => handle.store(new entityClass(raw))));
  }
  /** @method updateVariable(handleName, rawData)
   * Modify value of named handle. A new entity is created
   * from `rawData` (`new <EntityClass>(rawData)`).
   */
  updateVariable(handleName, rawData) {
    const handle = this.handles.get(handleName);
    const entity = new (handle.entityClass)(rawData);
    handle.set(entity);
    return entity;
  }
  /** @method updateSet(handleName, entity)
   * Modify or insert `entity` into named handle.
   * Modification is done by removing the old entity and reinserting the new one.
   */
  async updateSet(handleName, entity) {
    // Set the entity into the right place in the set. If we find it
    // already present replace it, otherwise, add it.
    // TODO(dstockwell): Replace this with happy entity mutation approach.
    const handle = this.handles.get(handleName);
    const entities = await handle.toList();
    const target = entities.find(r => r.id === entity.id);
    if (target) {
      handle.remove(target);
    }
    handle.store(entity);
  }
  /** @method boxQuery(box, userid)
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  boxQuery(box, userid) {
    return box.filter(item => userid === item.getUserID().split('|')[0]);
  }
}


/***/ }),

/***/ "./runtime/dom-particle.js":
/*!*********************************!*\
  !*** ./runtime/dom-particle.js ***!
  \*********************************/
/*! exports provided: DomParticle */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DomParticle", function() { return DomParticle; });
/* harmony import */ var _shell_components_xen_xen_state_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../shell/components/xen/xen-state.js */ "./shell/components/xen/xen-state.js");
/* harmony import */ var _dom_particle_base_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./dom-particle-base.js */ "./runtime/dom-particle-base.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */





/** @class DomParticle
 * Particle that interoperates with DOM and uses a simple state system
 * to handle updates.
 */
class DomParticle extends Object(_shell_components_xen_xen_state_js__WEBPACK_IMPORTED_MODULE_0__["XenStateMixin"])(_dom_particle_base_js__WEBPACK_IMPORTED_MODULE_1__["DomParticleBase"]) {
  constructor() {
    super();
    // alias properties to remove `_`
    this.state = this._state;
    this.props = this._props;
  }
  /** @method willReceiveProps(props, state, oldProps, oldState)
   * Override if necessary, to do things when props change.
   */
  willReceiveProps() {
  }
  /** @method update(props, state, oldProps, oldState)
   * Override if necessary, to modify superclass config.
   */
  update() {
  }
  /** @method shouldRender(props, state, oldProps, oldState)
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender() {
    return true;
  }
  /** @method render(props, state, oldProps, oldState)
   * Override to return a dictionary to map into the template.
   */
  render() {
    return {};
  }
  /** @method setState(state)
   * Copy values from `state` into the particle's internal state,
   * triggering an update cycle unless currently updating.
   */
  setState(state) {
    return this._setState(state);
  }
  // TODO(sjmiles): deprecated, just use setState
  setIfDirty(state) {
    console.warn('DomParticle: `setIfDirty` is deprecated, please use `setState` instead');
    return this._setState(state);
  }
  /** @method configureHandles(handles)
   * This is called once during particle setup. Override to control sync and update
   * configuration on specific handles (via their configure() method).
   * `handles` is a map from names to handle instances.
   */
  configureHandles(handles) {
    // Example: handles.get('foo').configure({keepSynced: false});
  }
  /** @method get config()
   * Override if necessary, to modify superclass config.
   */
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      handleNames: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slots.values()].map(s => s.name)
    };
  }
  // affordances for aliasing methods to remove `_`
  _willReceiveProps(...args) {
    this.willReceiveProps(...args);
  }
  _update(...args) {
    this.update(...args);
    if (this.shouldRender(...args)) { // TODO: should shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
    }
    this.config.slotNames.forEach(s => this.renderSlot(s, ['model']));
  }
  //
  // deprecated
  get _views() {
    console.warn(`Particle ${this.spec.name} uses deprecated _views getter.`);
    return this.handles;
  }
  async setViews(views) {
    console.warn(`Particle ${this.spec.name} uses deprecated setViews method.`);
    return this.setHandles(views);
  }
  // end deprecated
  //
  async setHandles(handles) {
    this.configureHandles(handles);
    this.handles = handles;
    this._handlesToSync = new Set();
    for (let name of this.config.handleNames) {
      let handle = handles.get(name);
      if (handle && handle.options.keepSynced && handle.options.notifySync) {
        this._handlesToSync.add(name);
      }
    }
    // make sure we invalidate once, even if there are no incoming handles
    setTimeout(() => !this._hasProps && this._invalidate(), 200);
    //this._invalidate();
  }
  async onHandleSync(handle, model) {
    this._handlesToSync.delete(handle.name);
    if (this._handlesToSync.size == 0) {
      await this._handlesToProps();
    }
  }
  async onHandleUpdate(handle, update) {
    // TODO(sjmiles): debounce handles updates
    const work = () => {
      //console.warn(handle, update);
      this._handlesToProps();
    };
    this._debounce('handleUpdateDebounce', work, 100);
  }
  async _handlesToProps() {
    let config = this.config;
    // acquire (async) list data from handles; BigCollections map to the handle itself
    let data = await Promise.all(
      config.handleNames
      .map(name => this.handles.get(name))
      .map(handle => {
        if (handle.toList) return handle.toList();
        if (handle.get) return handle.get();
        return handle;
      })
    );
    // convert handle data (array) into props (dictionary)
    let props = Object.create(null);
    config.handleNames.forEach((name, i) => {
      props[name] = data[i];
    });
    this._hasProps = true;
    this._setProps(props);
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove `this._state` parameter
      this[handler]({data}, this._state);
    }
  }
  _debounce(key, func, delay) {
    const subkey = `_debounce_${key}`;
    if (!this._state[subkey]) {
      this.startBusy();
    }
    const idleThenFunc = () => {
      this.doneBusy();
      func();
      this._state[subkey] = null;
    };
    super._debounce(key, idleThenFunc, delay);
  }
}


/***/ }),

/***/ "./runtime/entity.js":
/*!***************************!*\
  !*** ./runtime/entity.js ***!
  \***************************/
/*! exports provided: Entity */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Entity", function() { return Entity; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/symbols.js */ "./runtime/ts-build/symbols.js");
/* harmony import */ var _ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ts-build/type.js */ "./runtime/ts-build/type.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt






class Entity {
  constructor(userIDComponent) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!userIDComponent || userIDComponent.indexOf(':') == -1, 'user IDs must not contain the \':\' character');
    this[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = undefined;
    this._userIDComponent = userIDComponent;
  }
  get data() {
    return undefined;
  }

  getUserID() {
    return this._userIDComponent;
  }

  isIdentified() {
    return this[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] !== undefined;
  }
  // TODO: entity should not be exposing its IDs.
  get id() {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!!this.isIdentified());
    return this[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier];
  }
  identify(identifier) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this.isIdentified());
    this[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = identifier;
    let components = identifier.split(':');
    if (components[components.length - 2] == 'uid') {
      this._userIDComponent = components[components.length - 1];
    }
  }
  createIdentity(components) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this.isIdentified());
    let id;
    if (this._userIDComponent) {
      id = `${components.base}:uid:${this._userIDComponent}`;
    } else {
      id = `${components.base}:${components.component()}`;
    }
    this[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = id;
  }
  toLiteral() {
    return this.rawData;
  }

  static get type() {
    // TODO: should the entity's key just be its type?
    // Should it just be called type in that case?
    return _ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"].newEntity(this.key.schema);
  }
}


/***/ }),

/***/ "./runtime/fetch-web.js":
/*!******************************!*\
  !*** ./runtime/fetch-web.js ***!
  \******************************/
/*! exports provided: fetch */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fetch", function() { return local_fetch; });
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// 'export default fetch' works because 'fetch' is evaluated as an expression, which finds the
// appropriate global definition - but we don't want to use default exports.
// 'export {fetch}' doesn't work because 'fetch' is just a name in that context and is not defined.
// So we need to use an expression to find the global fetch function then map that for export.

const local_fetch = fetch;



/***/ }),

/***/ "./runtime/handle.js":
/*!***************************!*\
  !*** ./runtime/handle.js ***!
  \***************************/
/*! exports provided: handleFor */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "handleFor", function() { return handleFor; });
/* harmony import */ var _ts_build_reference_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ts-build/reference.js */ "./runtime/ts-build/reference.js");
/* harmony import */ var _ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/symbols.js */ "./runtime/ts-build/symbols.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_spec_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./particle-spec.js */ "./runtime/particle-spec.js");
/** @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */







// TODO: This won't be needed once runtime is transferred between contexts.
function cloneData(data) {
  return data;
  //return JSON.parse(JSON.stringify(data));
}

function restore(entry, entityClass) {
  Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(entityClass, 'Handles need entity classes for deserialization');
  let {id, rawData} = entry;
  let entity = new entityClass(cloneData(rawData));
  if (entry.id) {
    entity.identify(entry.id);
  }

  // TODO some relation magic, somewhere, at some point.

  return entity;
}

/** @class Handle
 * Base class for Collections and Variables.
 */
class Handle {
  constructor(proxy, name, particleId, canRead, canWrite) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(!(proxy instanceof Handle));
    this._proxy = proxy;
    this.name = name || this._proxy.name;
    this.canRead = canRead;
    this.canWrite = canWrite;
    this._particleId = particleId;
    this.options = {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    };
  }

  raiseSystemException(exception, method) {
    this._proxy.raiseSystemException(exception, method, this._particleId);
  }

  // `options` may contain any of:
  // - keepSynced (bool): load full data on startup, maintain data in proxy and resync as required
  // - notifySync (bool): if keepSynced is true, call onHandleSync when the full data is received
  // - notifyUpdate (bool): call onHandleUpdate for every change event received
  // - notifyDesync (bool): if keepSynced is true, call onHandleDesync when desync is detected
  configure(options) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(this.canRead, 'configure can only be called on readable Handles');
    try {
      let keys = Object.keys(this.options);
      let badKeys = Object.keys(options).filter(o => !keys.includes(o));
      if (badKeys.length > 0) {
        throw new Error(`Invalid option in Handle.configure(): ${badKeys}`);
      }
      Object.assign(this.options, options);
    } catch (e) {
      this.raiseSystemException(e, 'Handle::configure');
      throw e;
    }
  }

  _serialize(entity) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(entity, 'can\'t serialize a null entity');
    if (!entity.isIdentified()) {
      entity.createIdentity(this._proxy.generateIDComponents());
    }
    let id = entity[_ts_build_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier];
    let rawData = entity.dataClone();
    return {
      id,
      rawData
    };
  }

  get type() {
    return this._proxy._type;
  }

  get _id() {
    return this._proxy._id;
  }

  toManifestString() {
    return `'${this._id}'`;
  }
}

/** @class Collection
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set. A particle's manifest dictates the types of handles that
 * need to be connected to that particle, and the current recipe identifies
 * which handles are connected.
 */
class Collection extends Handle {
  // Called by StorageProxy.
  _notify(kind, particle, details) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        particle.onHandleSync(this, this._restore(details));
        return;
      case 'update': {
        let update = {};
        if ('add' in details) {
          update.added = this._restore(details.add);
        }
        if ('remove' in details) {
          update.removed = this._restore(details.remove);
        }
        update.originator = details.originatorId == this._particleId;
        particle.onHandleUpdate(this, update);
        return;
      }
      case 'desync':
        particle.onHandleDesync(this);
        return;
    }
  }

  /** @method async get(id)
   * Returns the Entity specified by id contained by the handle, or null if this id is not
   * contained by the handle.
   * throws: Error if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
   * in the particle's manifest.
   */
  async get(id) {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    return this._restore([await this._proxy.get(id, this._particleId)])[0];
  }

  /** @method async toList()
   * Returns a list of the Entities contained by the handle.
   * throws: Error if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
     in the particle's manifest.
   */
  async toList() {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    return this._restore(await this._proxy.toList(this._particleId));
  }

  _restore(list) {
    return (list !== null) ? list.map(a => restore(a, this.entityClass)) : null;
  }

  /** @method store(entity)
   * Stores a new entity into the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async store(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    let keys = [this._proxy.generateID() + 'key'];
    return this._proxy.store(serialization, keys, this._particleId);
  }

  /** @method clear()
   * Removes all known entities from the Handle. 
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
   * in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    return this._proxy.clear();
  }

  /** @method remove(entity)
   * Removes an entity from the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async remove(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    // Remove the keys that exist at storage/proxy.
    let keys = [];
    return this._proxy.remove(serialization.id, keys, this._particleId);
  }
}

/** @class Variable
 * A handle on a single entity. A particle's manifest dictates
 * the types of handles that need to be connected to that particle, and
 * the current recipe identifies which handles are connected.
 */
class Variable extends Handle {
  // Called by StorageProxy.
  async _notify(kind, particle, details) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        try {
          await particle.onHandleSync(this, this._restore(details));
        } catch (e) {
          this.raiseSystemException(e, `${particle.name}::onHandleSync`);
        }
        return;
      case 'update': {
        try {
          await particle.onHandleUpdate(this, {data: this._restore(details.data)});
        } catch (e) {
          this.raiseSystemException(e, `${particle.name}::onHandleUpdate`);
        }
        return;
      }
      case 'desync':
        try {
          await particle.onHandleDesync(this);
        } catch (e) {
          this.raiseSystemException(e, `${particle.name}::onHandleDesync`);
        }
        return;
    }
  }

  /** @method async get()
  * Returns the Entity contained by the Variable, or undefined if the Variable
  * is cleared.
  * throws: Error if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
    in the particle's manifest.
   */
  async get() {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    let model = await this._proxy.get(this._particleId);
    return this._restore(model);
  }

  _restore(model) {
    if (model === null) {
      return null;
    }
    if (this.type.isEntity) {
      return restore(model, this.entityClass);
    }
    if (this.type.isInterface) {
      return _particle_spec_js__WEBPACK_IMPORTED_MODULE_3__["ParticleSpec"].fromLiteral(model);
    }
    if (this.type.isReference) {
      return new _ts_build_reference_js__WEBPACK_IMPORTED_MODULE_0__["Reference"](model, this.type, this._proxy.pec);
    }
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(false, `Don't know how to deliver handle data of type ${this.type}`);
  }

  /** @method set(entity)
   * Stores a new entity into the Variable, replacing any existing entity.
   * throws: Error if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async set(entity) {
    try {
      if (!this.canWrite) {
        throw new Error('Handle not writeable');
      }
      return this._proxy.set(this._serialize(entity), this._particleId);
    } catch (e) {
      this.raiseSystemException(e, 'Handle::set');
      throw e;
    }
  }

  /** @method clear()
   * Clears any entity currently in the Variable.
   * throws: Error if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    return this._proxy.clear(this._particleId);
  }
}

/** @class Cursor
 * Provides paginated read access to a BigCollection. Conforms to the javascript iterator protocol
 * but is not marked as iterable because next() is async, which is currently not supported by
 * implicit iteration in Javascript.
 */
class Cursor {
  constructor(parent, cursorId) {
    this._parent = parent;
    this._cursorId = cursorId;
  }

  /** @method next()
   * Returns {value: [items], done: false} while there are items still available, or {done: true}
   * when the cursor has completed reading the collection.
   */
  async next() {
    let data = await this._parent._proxy.cursorNext(this._cursorId);
    if (!data.done) {
      data.value = data.value.map(a => restore(a, this._parent.entityClass));
    }
    return data;
  }

  /** @method close()
   * Terminates the streamed read. This must be called if a cursor is no longer needed but has not
   * yet completed streaming (i.e. next() hasn't returned {done: true}).
   */
  close() {
    this._parent._proxy.cursorClose(this._cursorId);
  }
}

/** @class BigCollection
 * A handle on a large set of Entity data. Similar to Collection, except the complete set of
 * entities is not available directly; use stream() to read the full set. Particles wanting to
 * operate on BigCollections should do so in the setHandles() call, since BigCollections do not
 * trigger onHandleSync() or onHandleUpdate().
 */
class BigCollection extends Handle {
  configure(options) {
    throw new Error('BigCollections do not support sync/update configuration');
  }

  async _notify(kind, particle, details) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(this.canRead, '_notify should not be called for non-readable handles');
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(kind === 'sync', 'BigCollection._notify only supports sync events');
    await particle.onHandleSync(this, []);
  }

  /** @method store(entity)
   * Stores a new entity into the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
   * in the particle's manifest.
   */
  async store(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    let keys = [this._proxy.generateID() + 'key'];
    return this._proxy.store(serialization, keys, this._particleId);
  }

  /** @method remove(entity)
   * Removes an entity from the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
   * in the particle's manifest.
   */
  async remove(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    return this._proxy.remove(serialization.id, [], this._particleId);
  }

  /** @method stream(pageSize)
   * Returns a Cursor instance that iterates over the full set of entities, reading `pageSize`
   * entities at a time. The cursor views a snapshot of the collection, locked to the version
   * at which the cursor is created.
   * throws: Error if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
   * in the particle's manifest.
   */
  async stream(pageSize) {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    let cursorId = await this._proxy.stream(pageSize);
    return new Cursor(this, cursorId);
  }
}

function handleFor(proxy, name, particleId, canRead = true, canWrite = true) {
  let handle;
  if (proxy.type.isCollection) {
    handle = new Collection(proxy, name, particleId, canRead, canWrite);
  } else if (proxy.type.isBigCollection) {
    handle = new BigCollection(proxy, name, particleId, canRead, canWrite);
  } else {
    handle = new Variable(proxy, name, particleId, canRead, canWrite);
  }

  let type = proxy.type.getContainedType() || proxy.type;
  if (type.isEntity) {
    handle.entityClass = type.entitySchema.entityClass(proxy.pec);
  }
  return handle;
}


/***/ }),

/***/ "./runtime/loader.js":
/*!***************************!*\
  !*** ./runtime/loader.js ***!
  \***************************/
/*! exports provided: Loader */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Loader", function() { return Loader; });
/* harmony import */ var _platform_fs_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/fs-web.js */ "./platform/fs-web.js");
/* harmony import */ var _platform_vm_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform/vm-web.js */ "./platform/vm-web.js");
/* harmony import */ var _fetch_web_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fetch-web.js */ "./runtime/fetch-web.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./particle.js */ "./runtime/particle.js");
/* harmony import */ var _dom_particle_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./dom-particle.js */ "./runtime/dom-particle.js");
/* harmony import */ var _multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./multiplexer-dom-particle.js */ "./runtime/multiplexer-dom-particle.js");
/* harmony import */ var _ts_build_reference_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./ts-build/reference.js */ "./runtime/ts-build/reference.js");
/* harmony import */ var _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./transformation-dom-particle.js */ "./runtime/transformation-dom-particle.js");
/* harmony import */ var _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./converters/jsonldToManifest.js */ "./runtime/converters/jsonldToManifest.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */












const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

function schemaLocationFor(name) {
  return `../entities/${name}.schema`;
}

class Loader {
  path(fileName) {
    let path = fileName.replace(/[/][^/]+$/, '/');
    return path;
  }

  join(prefix, path) {
    if (/^https?:\/\//.test(path)) {
      return path;
    }
    // TODO: replace this with something that isn't hacky
    if (path[0] == '/' || path[1] == ':') {
      return path;
    }
    prefix = this.path(prefix);
    return prefix + path;
  }

  loadResource(file) {
    if (/^https?:\/\//.test(file)) {
      return this._loadURL(file);
    }
    return this._loadFile(file);
  }

  _loadFile(file) {
    return new Promise((resolve, reject) => {
      _platform_fs_web_js__WEBPACK_IMPORTED_MODULE_0__["fs"].readFile(file, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.toString('utf-8'));
        }
      });
    });
  }

  _loadURL(url) {
    if (/\/\/schema.org\//.test(url)) {
      if (url.endsWith('/Thing')) {
        return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])('https://schema.org/Product.jsonld').then(res => res.text()).then(data => _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__["JsonldToManifest"].convert(data, {'@id': 'schema:Thing'}));
      }
      return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])(url + '.jsonld').then(res => res.text()).then(data => _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__["JsonldToManifest"].convert(data));
    }
    return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])(url).then(res => res.text());
  }

  async loadParticleClass(spec) {
    let clazz = await this.requireParticle(spec.implFile);
    clazz.spec = spec;
    return clazz;
  }

  async requireParticle(fileName) {
    if (fileName === null) fileName = '';
    let src = await this.loadResource(fileName);
    // Note. This is not real isolation.
    let script = new _platform_vm_web_js__WEBPACK_IMPORTED_MODULE_1__["vm"].Script(src, {filename: fileName, displayErrors: true});
    let result = [];
    let self = {
      defineParticle(particleWrapper) {
        result.push(particleWrapper);
      },
      console,
      fetch: _fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"],
      setTimeout,
      importScripts: s => null //console.log(`(skipping browser-space import for [${s}])`)
    };
    script.runInNewContext(self, {filename: fileName, displayErrors: true});
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(result.length > 0 && typeof result[0] == 'function', `Error while instantiating particle implementation from ${fileName}`);
    return this.unwrapParticle(result[0]);
  }

  setParticleExecutionContext(pec) {
    this._pec = pec;
  }

  unwrapParticle(particleWrapper) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(this._pec);
    return particleWrapper({Particle: _particle_js__WEBPACK_IMPORTED_MODULE_4__["Particle"], DomParticle: _dom_particle_js__WEBPACK_IMPORTED_MODULE_5__["DomParticle"], TransformationDomParticle: _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_8__["TransformationDomParticle"], MultiplexerDomParticle: _multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_6__["MultiplexerDomParticle"], Reference: Object(_ts_build_reference_js__WEBPACK_IMPORTED_MODULE_7__["newClientReference"])(this._pec), html});
  }

}


/***/ }),

/***/ "./runtime/multiplexer-dom-particle.js":
/*!*********************************************!*\
  !*** ./runtime/multiplexer-dom-particle.js ***!
  \*********************************************/
/*! exports provided: MultiplexerDomParticle */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MultiplexerDomParticle", function() { return MultiplexerDomParticle; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_spec_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./particle-spec.js */ "./runtime/particle-spec.js");
/* harmony import */ var _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./transformation-dom-particle.js */ "./runtime/transformation-dom-particle.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */






class MultiplexerDomParticle extends _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_2__["TransformationDomParticle"] {
  constructor() {
    super();
    this._itemSubIdByHostedSlotId = new Map();
    this._connByHostedConn = new Map();
  }

  async _mapParticleConnections(
      listHandleName,
      particleHandleName,
      hostedParticle,
      handles,
      arc) {
    let otherMappedHandles = [];
    let otherConnections = [];
    let index = 2;
    const skipConnectionNames = [listHandleName, particleHandleName];
    for (let [connectionName, otherHandle] of handles) {
      if (skipConnectionNames.includes(connectionName)) {
        continue;
      }
      // TODO(wkorman): For items with embedded recipes we may need a map
      // (perhaps id to index) to make sure we don't map a handle into the inner
      // arc multiple times unnecessarily.
      otherMappedHandles.push(
          `use '${await arc.mapHandle(otherHandle._proxy)}' as v${index}`);
      let hostedOtherConnection = hostedParticle.connections.find(
          conn => conn.isCompatibleType(otherHandle.type));
      if (hostedOtherConnection) {
        otherConnections.push(`${hostedOtherConnection.name} = v${index++}`);
        // TODO(wkorman): For items with embedded recipes where we may have a
        // different particle rendering each item, we need to track
        // |connByHostedConn| keyed on the particle type.
        this._connByHostedConn.set(hostedOtherConnection.name, connectionName);
      }
    }
    return [otherMappedHandles, otherConnections];
  }

  async setHandles(handles) {
    this.handleIds = {};
    let arc = await this.constructInnerArc();
    const listHandleName = 'list';
    const particleHandleName = 'hostedParticle';
    let particleHandle = handles.get(particleHandleName);
    let hostedParticle = null;
    let otherMappedHandles = [];
    let otherConnections = [];
    if (particleHandle) {
      hostedParticle = await particleHandle.get();
      if (hostedParticle) {
        [otherMappedHandles, otherConnections] =
            await this._mapParticleConnections(
                listHandleName, particleHandleName, hostedParticle, handles, arc);
      }
    }
    this.setState({
      arc,
      type: handles.get(listHandleName).type,
      hostedParticle,
      otherMappedHandles,
      otherConnections
    });

    super.setHandles(handles);
  }

  async willReceiveProps(
      {list},
      {arc, type, hostedParticle, otherMappedHandles, otherConnections}) {
    if (list.length > 0) {
      this.relevance = 0.1;
    }

    for (let [index, item] of this.getListEntries(list)) {
      let resolvedHostedParticle = hostedParticle;
      if (this.handleIds[item.id]) {
        let itemHandle = await this.handleIds[item.id];
        itemHandle.set(item);
        continue;
      }

      let itemHandlePromise =
          arc.createHandle(type.primitiveType(), 'item' + index);
      this.handleIds[item.id] = itemHandlePromise;

      let itemHandle = await itemHandlePromise;

      if (!resolvedHostedParticle) {
        // If we're muxing on behalf of an item with an embedded recipe, the
        // hosted particle should be retrievable from the item itself. Else we
        // just skip this item.
        if (!item.renderParticleSpec) {
          continue;
        }
        resolvedHostedParticle =
            _particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"].fromLiteral(JSON.parse(item.renderParticleSpec));
        // Re-map compatible handles and compute the connections specific
        // to this item's render particle.
        const listHandleName = 'list';
        const particleHandleName = 'renderParticle';
        [otherMappedHandles, otherConnections] =
            await this._mapParticleConnections(
                listHandleName,
                particleHandleName,
                resolvedHostedParticle,
                this.handles,
                arc);
      }
      let hostedSlotName = [...resolvedHostedParticle.slots.keys()][0];
      let slotName = [...this.spec.slots.values()][0].name;
      let slotId = await arc.createSlot(
          this, slotName, resolvedHostedParticle.name, hostedSlotName, itemHandle._id);

      if (!slotId) {
        continue;
      }

      this._itemSubIdByHostedSlotId.set(slotId, item.id);

      try {
        const recipe = this.constructInnerRecipe(
          resolvedHostedParticle,
          item,
          itemHandle,
          {name: hostedSlotName, id: slotId},
          {connections: otherConnections, handles: otherMappedHandles}
        );
        await arc.loadRecipe(recipe, this);
        itemHandle.set(item);
      } catch (e) {
        console.log(e);
      }
    }
  }

  combineHostedModel(slotName, hostedSlotId, content) {
    let subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
    if (!subId) {
      return;
    }
    let items = this._state.renderModel ? this._state.renderModel.items : [];
    let listIndex = items.findIndex(item => item.subId == subId);
    let item = Object.assign({}, content.model, {subId});
    if (listIndex >= 0 && listIndex < items.length) {
      items[listIndex] = item;
    } else {
      items.push(item);
    }
    this._setState({renderModel: {items}});
  }

  combineHostedTemplate(slotName, hostedSlotId, content) {
    let subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
    if (!subId) {
      return;
    }
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(content.templateName, `Template name is missing for slot '${slotName}' (hosted slot ID: '${hostedSlotId}')`);
    this._setState({templateName: Object.assign(this._state.templateName || {}, {[subId]: `${content.templateName}`})});

    if (content.template) {
      let template = content.template;
      // Append subid$={{subid}} attribute to all provided slots, to make it usable for the transformation particle.
      template = template.replace(new RegExp('slotid="[a-z]+"', 'gi'), '$& subid$="{{subId}}"');

      // Replace hosted particle connection in template with the corresponding particle connection names.
      // TODO: make this generic!
      this._connByHostedConn.forEach((conn, hostedConn) => {
        template = template.replace(
            new RegExp(`{{${hostedConn}.description}}`, 'g'),
            `{{${conn}.description}}`);
      });
      this._setState({template: Object.assign(this._state.template || {}, {[content.templateName]: template})});

      this.forceRenderTemplate();
    }
  }

  // Abstract methods below.

  // Called to produce a full interpolated recipe for loading into an inner
  // arc for each item. Subclasses should override this method as by default
  // it does nothing and so no recipe will be returned and content will not
  // be loaded successfully into the inner arc.
  constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {}

  // Called with the list of items and by default returns the direct result of
  // `Array.entries()`. Subclasses can override this method to alter the item
  // order or otherwise permute the items as desired before their slots are
  // created and contents are rendered.
  getListEntries(list) {
    return list.entries();
  }
}


/***/ }),

/***/ "./runtime/particle-execution-context.js":
/*!***********************************************!*\
  !*** ./runtime/particle-execution-context.js ***!
  \***********************************************/
/*! exports provided: ParticleExecutionContext */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(global) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ParticleExecutionContext", function() { return ParticleExecutionContext; });
/* harmony import */ var _handle_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./handle.js */ "./runtime/handle.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _api_channel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./api-channel.js */ "./runtime/api-channel.js");
/* harmony import */ var _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./storage-proxy.js */ "./runtime/storage-proxy.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */







class ParticleExecutionContext {
  constructor(port, idBase, loader) {
    this._apiPort = new _api_channel_js__WEBPACK_IMPORTED_MODULE_2__["PECInnerPort"](port);
    this._particles = [];
    this._idBase = idBase;
    this._nextLocalID = 0;
    this._loader = loader;
    loader.setParticleExecutionContext(this);
    this._pendingLoads = [];
    this._scheduler = new _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxyScheduler"]();
    this._keyedProxies = {};

    /*
     * This code ensures that the relevant types are known
     * in the scope object, because otherwise we can't do
     * particleSpec resolution, which is currently a necessary
     * part of particle construction.
     *
     * Possibly we should eventually consider having particle
     * specifications separated from particle classes - and
     * only keeping type information on the arc side.
     */
    this._apiPort.onDefineHandle = ({type, identifier, name}) => {
      return new _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"](identifier, type, this._apiPort, this, this._scheduler, name);
    };

    this._apiPort.onGetBackingStoreCallback = ({type, id, name, callback, storageKey}) => {
      let proxy = new _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"](id, type, this._apiPort, this, this._scheduler, name);
      proxy.storageKey = storageKey;
      return [proxy, () => callback(proxy, storageKey)];
    };


    this._apiPort.onCreateHandleCallback = ({type, id, name, callback}) => {
      let proxy = new _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"](id, type, this._apiPort, this, this._scheduler, name);
      return [proxy, () => callback(proxy)];
    };

    this._apiPort.onMapHandleCallback = ({id, callback}) => {
      return [id, () => callback(id)];
    };

    this._apiPort.onCreateSlotCallback = ({hostedSlotId, callback}) => {
      return [hostedSlotId, () => callback(hostedSlotId)];
    };

    this._apiPort.onInnerArcRender = ({transformationParticle, transformationSlotName, hostedSlotId, content}) => {
      transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
    };

    this._apiPort.onStop = () => {
      if (global.close) {
        global.close();
      }
    };

    this._apiPort.onInstantiateParticle =
      ({id, spec, handles}) => this._instantiateParticle(id, spec, handles);

    this._apiPort.onSimpleCallback = ({callback, data}) => callback(data);

    this._apiPort.onConstructArcCallback = ({callback, arc}) => callback(arc);

    this._apiPort.onAwaitIdle = ({version}) =>
      this.idle.then(a => {
        // TODO: dom-particles update is async, this is a workaround to allow dom-particles to
        // update relevance, after handles are updated. Needs better idle signal.
        setTimeout(() => { this._apiPort.Idle({version, relevance: this.relevance}); }, 0);
      });

    this._apiPort.onUIEvent = ({particle, slotName, event}) => particle.fireEvent(slotName, event);

    this._apiPort.onStartRender = ({particle, slotName, contentTypes}) => {
      /** @class Slot
       * A representation of a consumed slot. Retrieved from a particle using
       * particle.getSlot(name)
       */
      class Slotlet {
        constructor(pec, particle, slotName) {
          this._slotName = slotName;
          this._particle = particle;
          this._handlers = new Map();
          this._pec = pec;
          this._requestedContentTypes = new Set();
        }
        get particle() { return this._particle; }
        get slotName() { return this._slotName; }
        get isRendered() { return this._isRendered; }
        /** @method render(content)
         * renders content to the slot.
         */
        render(content) {
          this._pec._apiPort.Render({particle, slotName, content});

          Object.keys(content).forEach(key => { this._requestedContentTypes.delete(key); });
          // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
          this._isRendered = this._requestedContentTypes.size == 0 && (Object.keys(content).length > 0);
        }
        /** @method registerEventHandler(name, f)
         * registers a callback to be invoked when 'name' event happens.
         */
        registerEventHandler(name, f) {
          if (!this._handlers.has(name)) {
            this._handlers.set(name, []);
          }
          this._handlers.get(name).push(f);
        }
        clearEventHandlers(name) {
          this._handlers.set(name, []);
        }
        fireEvent(event) {
          for (let handler of this._handlers.get(event.handler) || []) {
            handler(event);
          }
        }
      }

      particle._slotByName.set(slotName, new Slotlet(this, particle, slotName));
      particle.renderSlot(slotName, contentTypes);
    };

    this._apiPort.onStopRender = ({particle, slotName}) => {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(particle._slotByName.has(slotName),
        `Stop render called for particle ${particle.name} slot ${slotName} without start render being called.`);
      particle._slotByName.delete(slotName);
    };
  }

  generateIDComponents() {
    return {base: this._idBase, component: () => this._nextLocalID++};
  }

  generateID() {
    return `${this._idBase}:${this._nextLocalID++}`;
  }

  innerArcHandle(arcId, particleId) {
    let pec = this;
    return {
      createHandle: function(type, name, hostParticle) {
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcCreateHandle({arc: arcId, type, name, callback: proxy => {
            let handle = Object(_handle_js__WEBPACK_IMPORTED_MODULE_0__["handleFor"])(proxy, name, particleId);
            resolve(handle);
            if (hostParticle) {
              proxy.register(hostParticle, handle);
            }
          }}));
      },
      mapHandle: function(handle) {
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcMapHandle({arc: arcId, handle, callback: id => {
            resolve(id);
          }}));
      },
      createSlot: function(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId) {
        // handleId: the ID of a handle (returned by `createHandle` above) this slot is rendering; null - if not applicable.
        // TODO: support multiple handle IDs.
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcCreateSlot({arc: arcId, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId, callback: hostedSlotId => {
            resolve(hostedSlotId);
          }}));
      },
      loadRecipe: function(recipe) {
        // TODO: do we want to return a promise on completion?
        return new Promise((resolve, reject) => pec._apiPort.ArcLoadRecipe({
          arc: arcId,
          recipe,
          callback: a => {
            if (a == undefined) {
              resolve();
            } else {
              reject(a);
            }
          }
        }));
      }
    };
  }

  getStorageProxy(storageKey, type) {
    if (!this._keyedProxies[storageKey]) {      
      this._keyedProxies[storageKey] = new Promise((resolve, reject) => {
        this._apiPort.GetBackingStore({storageKey, type, callback: (proxy, storageKey) => {
          this._keyedProxies[storageKey] = proxy;
          resolve(proxy);
        }});
      });
    }
    return this._keyedProxies[storageKey];
  }

  defaultCapabilitySet() {
    return {
      constructInnerArc: particle => {
        return new Promise((resolve, reject) =>
          this._apiPort.ConstructInnerArc({callback: arcId => {resolve(this.innerArcHandle(arcId, particle.id));}, particle}));
      }
    };
  }

  async _instantiateParticle(id, spec, proxies) {
    let name = spec.name;
    let resolve = null;
    let p = new Promise(res => resolve = res);
    this._pendingLoads.push(p);
    let clazz = await this._loader.loadParticleClass(spec);
    let capabilities = this.defaultCapabilitySet();
    let particle = new clazz(); // TODO: how can i add an argument to DomParticle ctor?
    particle.id = id;
    particle.capabilities = capabilities;
    this._particles.push(particle);

    let handleMap = new Map();
    let registerList = [];
    proxies.forEach((proxy, name) => {
      let connSpec = spec.connectionMap.get(name);
      let handle = Object(_handle_js__WEBPACK_IMPORTED_MODULE_0__["handleFor"])(proxy, name, id, connSpec.isInput, connSpec.isOutput);
      handleMap.set(name, handle);

      // Defer registration of handles with proxies until after particles have a chance to
      // configure them in setHandles.
      registerList.push({proxy, particle, handle});
    });

    return [particle, async () => {
      await particle.setHandles(handleMap);
      registerList.forEach(({proxy, particle, handle}) => proxy.register(particle, handle));
      let idx = this._pendingLoads.indexOf(p);
      this._pendingLoads.splice(idx, 1);
      resolve();
    }];
  }

  get relevance() {
    let rMap = new Map();
    this._particles.forEach(p => {
      if (p.relevances.length == 0) {
        return;
      }
      rMap.set(p, p.relevances);
      p.relevances = [];
    });
    return rMap;
  }

  get busy() {
    if (this._pendingLoads.length > 0 || this._scheduler.busy) {
      return true;
    }
    if (this._particles.filter(particle => particle.busy).length > 0) {
      return true;
    }
    return false;
  }

  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    let busyParticlePromises = this._particles.filter(particle => particle.busy).map(particle => particle.idle);
    return Promise.all([this._scheduler.idle, ...this._pendingLoads, ...busyParticlePromises]).then(() => this.idle);
  }
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./runtime/particle-spec.js":
/*!**********************************!*\
  !*** ./runtime/particle-spec.js ***!
  \**********************************/
/*! exports provided: ProvidedSlotSpec, ParticleSpec */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ProvidedSlotSpec", function() { return ProvidedSlotSpec; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ParticleSpec", function() { return ParticleSpec; });
/* harmony import */ var _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ts-build/type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./recipe/type-checker.js */ "./runtime/recipe/type-checker.js");
/* harmony import */ var _ts_build_shape_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ts-build/shape.js */ "./runtime/ts-build/shape.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */






class ConnectionSpec {
  constructor(rawData, typeVarMap) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.type = rawData.type.mergeTypeVariablesByName(typeVarMap);
    this.isOptional = rawData.isOptional;
    this.tags = rawData.tags || [];
    this.dependentConnections = [];
  }

  instantiateDependentConnections(particle, typeVarMap) {
    for (let dependentArg of this.rawData.dependentConnections) {
      let dependentConnection = particle.createConnection(dependentArg, typeVarMap);
      dependentConnection.parentConnection = this;
      this.dependentConnections.push(dependentConnection);
    }

  }

  get isInput() {
    // TODO: we probably don't really want host to be here.
    return this.direction == 'in' || this.direction == 'inout' || this.direction == 'host';
  }

  get isOutput() {
    return this.direction == 'out' || this.direction == 'inout';
  }

  isCompatibleType(type) {
    return _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_1__["TypeChecker"].compareTypes({type}, {type: this.type, direction: this.direction});
  }
}

class SlotSpec {
  constructor(slotModel) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired;
    this.isSet = slotModel.isSet;
    this.tags = slotModel.tags || [];
    this.formFactor = slotModel.formFactor; // TODO: deprecate form factors?
    this.providedSlots = [];
    if (!slotModel.providedSlots) {
      return;
    }
    slotModel.providedSlots.forEach(ps => {
      this.providedSlots.push(new ProvidedSlotSpec(ps));
    });
  }

  getProvidedSlotSpec(name) {
    return this.providedSlots.find(ps => ps.name == name);
  }
}

class ProvidedSlotSpec {
  constructor(slotModel) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired || false;
    this.isSet = slotModel.isSet || false;
    this.tags = slotModel.tags || [];
    this.formFactor = slotModel.formFactor; // TODO: deprecate form factors?
    this.handles = slotModel.handles || [];
  }
}

class ParticleSpec {
  constructor(model) {
    this._model = model;
    this.name = model.name;
    this.verbs = model.verbs;
    let typeVarMap = new Map();
    this.connections = [];
    model.args.forEach(arg => this.createConnection(arg, typeVarMap));
    this.connectionMap = new Map();
    this.connections.forEach(a => this.connectionMap.set(a.name, a));
    this.inputs = this.connections.filter(a => a.isInput);
    this.outputs = this.connections.filter(a => a.isOutput);

    // initialize descriptions patterns.
    model.description = model.description || {};
    this.validateDescription(model.description);
    this.pattern = model.description['pattern'];
    this.connections.forEach(connectionSpec => {
      connectionSpec.pattern = model.description[connectionSpec.name];
    });

    this.implFile = model.implFile;
    this.affordance = model.affordance;
    this.slots = new Map();
    if (model.slots) {
      model.slots.forEach(s => this.slots.set(s.name, new SlotSpec(s)));
    }
    // Verify provided slots use valid handle connection names.
    this.slots.forEach(slot => {
      slot.providedSlots.forEach(ps => {
        ps.handles.forEach(v => Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(this.connectionMap.has(v), 'Cannot provide slot for nonexistent handle constraint ', v));
      });
    });
  }

  createConnection(arg, typeVarMap) {
    let connection = new ConnectionSpec(arg, typeVarMap);
    this.connections.push(connection);
    connection.instantiateDependentConnections(this, typeVarMap);
    return connection;
  }

  isInput(param) {
    for (let input of this.inputs) if (input.name == param) return true;
  }

  isOutput(param) {
    for (let outputs of this.outputs) if (outputs.name == param) return true;
  }

  getSlotSpec(slotName) {
    return this.slots.get(slotName);
  }

  get primaryVerb() {
    return (this.verbs.length > 0) ? this.verbs[0] : undefined;
  }

  matchAffordance(affordance) {
    return this.slots.size <= 0 || this.affordance.includes(affordance);
  }

  toLiteral() {
    let {args, name, verbs, description, implFile, affordance, slots} = this._model;
    let connectionToLiteral = ({type, direction, name, isOptional, dependentConnections}) => ({type: type.toLiteral(), direction, name, isOptional, dependentConnections: dependentConnections.map(connectionToLiteral)});
    args = args.map(a => connectionToLiteral(a));
    return {args, name, verbs, description, implFile, affordance, slots};
  }

  static fromLiteral(literal) {
    let {args, name, verbs, description, implFile, affordance, slots} = literal;
    let connectionFromLiteral = ({type, direction, name, isOptional, dependentConnections}) =>
      ({type: _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(type), direction, name, isOptional, dependentConnections: dependentConnections ? dependentConnections.map(connectionFromLiteral) : []});
    args = args.map(connectionFromLiteral);
    return new ParticleSpec({args, name, verbs: verbs || [], description, implFile, affordance, slots});
  }

  clone() {
    return ParticleSpec.fromLiteral(this.toLiteral());
  }

  equals(other) {
    return JSON.stringify(this.toLiteral()) === JSON.stringify(other.toLiteral());
  }

  validateDescription(description) {
    Object.keys(description || []).forEach(d => {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(['kind', 'location', 'pattern'].includes(d) || this.connectionMap.has(d), `Unexpected description for ${d}`);
    });
  }

  toInterface() {
    return _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newInterface(this._toShape());
  }

  _toShape() {
    const handles = this._model.args;
    // TODO: wat do?
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(!this.slots.length, 'please implement slots toShape');
    const slots = [];
    return new _ts_build_shape_js__WEBPACK_IMPORTED_MODULE_2__["Shape"](handles, slots);
  }

  toString() {
    let results = [];
    let verbs = '';
    if (this.verbs.length > 0) {
      verbs = ' ' + this.verbs.map(verb => `&${verb}`).join(' ');
    }
    results.push(`particle ${this.name}${verbs} in '${this.implFile}'`.trim());
    let indent = '  ';
    let writeConnection = (connection, indent) => {
      results.push(`${indent}${connection.direction} ${connection.type.toString()}${connection.isOptional ? '?' : ''} ${connection.name}`);
      for (let dependent of connection.dependentConnections) {
        writeConnection(dependent, indent + '  ');
      }
    };

    for (let connection of this.connections) {
      if (connection.parentConnection) {
        continue;
      }
      writeConnection(connection, indent);
    }

    this.affordance.filter(a => a != 'mock').forEach(a => results.push(`  affordance ${a}`));
    this.slots.forEach(s => {
      // Consume slot.
      let consume = [];
      if (s.isRequired) {
        consume.push('must');
      }
      consume.push('consume');
      if (s.isSet) {
        consume.push('set of');
      }
      consume.push(s.name);
      if (s.tags.length > 0) {
        consume.push(s.tags.map(a => `#${a}`).join(' '));
      }
      results.push(`  ${consume.join(' ')}`);
      if (s.formFactor) {
        results.push(`    formFactor ${s.formFactor}`);
      }
      // Provided slots.
      s.providedSlots.forEach(ps => {
        let provide = [];
        if (ps.isRequired) {
          provide.push('must');
        }
        provide.push('provide');
        if (ps.isSet) {
          provide.push('set of');
        }
        provide.push(ps.name);
        if (ps.tags.length > 0) {
          provide.push(ps.tags.map(a => `#${a}`).join(' '));
        }
        results.push(`    ${provide.join(' ')}`);
        if (ps.formFactor) {
          results.push(`      formFactor ${ps.formFactor}`);
        }
        ps.handles.forEach(handle => results.push(`      handle ${handle}`));
      });
    });
    // Description
    if (this.pattern) {
      results.push(`  description \`${this.pattern}\``);
      this.connections.forEach(cs => {
        if (cs.pattern) {
          results.push(`    ${cs.name} \`${cs.pattern}\``);
        }
      });
    }
    return results.join('\n');
  }

  toManifestString() {
    return this.toString();
  }
}


/***/ }),

/***/ "./runtime/particle.js":
/*!*****************************!*\
  !*** ./runtime/particle.js ***!
  \*****************************/
/*! exports provided: Particle */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Particle", function() { return Particle; });
/* harmony import */ var _tracelib_trace_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../tracelib/trace.js */ "./tracelib/trace.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */





/** @class Particle
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
class Particle {
  constructor(capabilities) {
    this.spec = this.constructor.spec;
    if (this.spec.inputs.length == 0) {
      this.extraData = true;
    }
    this.relevances = [];
    this._idle = Promise.resolve();
    this._busy = 0;
    this._slotByName = new Map();
    this.capabilities = capabilities || {};
  }

  /** @method setHandles(handles)
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * Handles is a map from handle names to store handles.
   */
  setHandles(handles) {
  }
  
  /** @method setViews(views)
   * This method is deprecated. Use setHandles instead.
   */
  setViews(views) {
  }

  /** @method onHandleSync(handle, model)
   * Called for handles that are configured with both keepSynced and notifySync, when they are
   * updated with the full model of their data. This will occur once after setHandles() and any time
   * thereafter if the handle is resynchronized.
   *
   * handle: The Handle instance that was updated.
   * model: For Variable-backed Handles, the Entity data or null if the Variable is not set.
   *        For Collection-backed Handles, the Array of Entities, which may be empty.
   */
  onHandleSync(handle, model) {
  }

  /** @method onHandleUpdate(handle, update)
   * Called for handles that are configued with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * handle: The Handle instance that was updated.
   * update: An object containing one of the following fields:
   *    data: The full Entity for a Variable-backed Handle.
   *    added: An Array of Entities added to a Collection-backed Handle.
   *    removed: An Array of Entities removed from a Collection-backed Handle.
   */
  onHandleUpdate(handle, update) {
  }

  /** @method onHandleDesync(handle)
   * Called for handles that are configured with both keepSynced and notifyDesync, when they are
   * detected as being out-of-date against the backing store. For Variables, the event that triggers
   * this will also resync the data and thus this call may usually be ignored. For Collections, the
   * underlying proxy will automatically request a full copy of the stored data to resynchronize.
   * onHandleSync will be invoked when that is received.
   *
   * handle: The Handle instance that was desynchronized.
   */
  onHandleDesync(handle) {
  }

  constructInnerArc() {
    if (!this.capabilities.constructInnerArc) {
      throw new Error('This particle is not allowed to construct inner arcs');
    }
    return this.capabilities.constructInnerArc(this);
  }

  get busy() {
    return this._busy > 0;
  }

  get idle() {
    return this._idle;
  }

  set relevance(r) {
    this.relevances.push(r);
  }

  startBusy() {
    if (this._busy == 0) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    this._busy++;
  }
  
   doneBusy() {
    this._busy--;
    if (this._busy == 0) {
      this._idleResolver();
    }
  }

  inputs() {
    return this.spec.inputs;
  }

  outputs() {
    return this.spec.outputs;
  }

  /** @method getSlot(name)
   * Returns the slot with provided name.
   */
  getSlot(name) {
    return this._slotByName.get(name);
  }

  static buildManifest(strings, ...bits) {
    let output = [];
    for (let i = 0; i < bits.length; i++) {
        let str = strings[i];
        let indent = / *$/.exec(str)[0];
        let bitStr;
        if (typeof bits[i] == 'string') {
          bitStr = bits[i];
        } else {
          bitStr = bits[i].toManifestString();
        }
        bitStr = bitStr.replace(/(\n)/g, '$1' + indent);
        output.push(str);
        output.push(bitStr);
    }
    if (strings.length > bits.length) {
      output.push(strings[strings.length - 1]);
    }
    return output.join('');
  }

  setParticleDescription(pattern) {
    return this.setDescriptionPattern('pattern', pattern);
  }
  setDescriptionPattern(connectionName, pattern) {
    let descriptions = this.handles.get('descriptions');
    if (descriptions) {
      descriptions.store(new descriptions.entityClass({key: connectionName, value: pattern}, this.spec.name + '-' + connectionName));
      return true;
    }
    return false;
  }
}


/***/ }),

/***/ "./runtime/recipe/type-checker.js":
/*!****************************************!*\
  !*** ./runtime/recipe/type-checker.js ***!
  \****************************************/
/*! exports provided: TypeChecker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TypeChecker", function() { return TypeChecker; });
/* harmony import */ var _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../ts-build/type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _type_variable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../type-variable.js */ "./runtime/type-variable.js");
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt




class TypeChecker {

  // resolve a list of handleConnection types against a handle
  // base type. This is the core type resolution mechanism, but should only
  // be used when types can actually be associated with each other / constrained.
  //
  // By design this function is called exactly once per handle in a recipe during
  // normalization, and should provide the same final answers regardless of the
  // ordering of handles within that recipe
  //
  // NOTE: you probably don't want to call this function, if you think you
  // do, talk to shans@.
  static processTypeList(baseType, list) {
    let newBaseType = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newVariable(new _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"](''));
    if (baseType) {
      newBaseType.data.resolution = baseType;
    }
    baseType = newBaseType;

    let concreteTypes = [];

    // baseType might be a variable (and is definitely a variable if no baseType was available).
    // Some of the list might contain variables too.

    // First attempt to merge all the variables into the baseType
    //
    // If the baseType is a variable then this results in a single place to manipulate the constraints
    // of all the other connected variables at the same time.
    for (let item of list) {
      if (item.type.resolvedType().hasVariable) {
        baseType = TypeChecker._tryMergeTypeVariable(baseType, item.type);
        if (baseType == null) {
          return null;
        }
      } else {
        concreteTypes.push(item);
      }
    }

    for (let item of concreteTypes) {
      if (!TypeChecker._tryMergeConstraints(baseType, item)) {
        return null;
      }
    }

    let getResolution = candidate => {
      if (candidate.isVariable == false) {
        return candidate;
      }
      if (candidate.canReadSubset == null || candidate.canWriteSuperset == null) {
        return candidate;
      }
      if (candidate.canReadSubset.isMoreSpecificThan(candidate.canWriteSuperset)) {
        if (candidate.canWriteSuperset.isMoreSpecificThan(candidate.canReadSubset)) {
          candidate.variable.resolution = candidate.canReadSubset;
        }
        return candidate;
      }
      return null;
    };

    let candidate = baseType.resolvedType();

    if (candidate.isCollection) {
      let resolution = getResolution(candidate.collectionType);
      return (resolution !== null) ? resolution.collectionOf() : null;
    }
    if (candidate.isBigCollection) {
      let resolution = getResolution(candidate.bigCollectionType);
      return (resolution !== null) ? resolution.bigCollectionOf() : null;
    }

    return getResolution(candidate);
  }

  static _tryMergeTypeVariable(base, onto) {
    let [primitiveBase, primitiveOnto] = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(base.resolvedType(), onto.resolvedType());

    if (primitiveBase.isVariable) {
      if (primitiveOnto.isVariable) {
        // base, onto both variables.
        let result = primitiveBase.variable.maybeMergeConstraints(primitiveOnto.variable);
        if (result == false) {
          return null;
        }
        // Here onto grows, one level at a time,
        // as we assign new resolution to primitiveOnto, which is a leaf.
        primitiveOnto.variable.resolution = primitiveBase;
      } else {
        // base variable, onto not.
        primitiveBase.variable.resolution = primitiveOnto;
      }
      return base;
    } else if (primitiveOnto.isVariable) {
      // onto variable, base not.
      primitiveOnto.variable.resolution = primitiveBase;
      return onto;
    } else if (primitiveBase.isInterface && primitiveOnto.isInterface) {
      let result = primitiveBase.interfaceShape.tryMergeTypeVariablesWith(primitiveOnto.interfaceShape);
      if (result == null) {
        return null;
      }
      return _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newInterface(result);
    } else if ((primitiveBase.isTypeContainer() && primitiveBase.hasVariable)
               || (primitiveOnto.isTypeContainer() && primitiveOnto.hasVariable)) {
      // Cannot merge [~a] with a type that is not a variable and not a collection.
      return null;
    }
    throw new Error('tryMergeTypeVariable shouldn\'t be called on two types without any type variables');
  }

  static _tryMergeConstraints(handleType, {type, direction}) {
    let [primitiveHandleType, primitiveConnectionType] = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(handleType.resolvedType(), type.resolvedType());
    if (primitiveHandleType.isVariable) {
      while (primitiveConnectionType.isTypeContainer()) {
        if (primitiveHandleType.variable.resolution != null
            || primitiveHandleType.variable.canReadSubset != null
            || primitiveHandleType.variable.canWriteSuperset != null) {
          // Resolved and/or constrained variables can only represent Entities, not sets.
          return false;
        }
        // If this is an undifferentiated variable then we need to create structure to match against. That's
        // allowed because this variable could represent anything, and it needs to represent this structure
        // in order for type resolution to succeed.
        let newVar = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newVariable(new _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"]('a'));
        primitiveHandleType.variable.resolution = 
            primitiveConnectionType.isCollection ? _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newCollection(newVar) : (primitiveConnectionType.isBigCollection ? _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newBigCollection(newVar) : _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newReference(newVar));
        let unwrap = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(primitiveHandleType.resolvedType(), primitiveConnectionType);
        [primitiveHandleType, primitiveConnectionType] = unwrap;
      }

      if (direction == 'out' || direction == 'inout' || direction == '`provide') {
        // the canReadSubset of the handle represents the maximal type that can be read from the
        // handle, so we need to intersect out any type that is more specific than the maximal type
        // that could be written.
        if (!primitiveHandleType.variable.maybeMergeCanReadSubset(primitiveConnectionType.canWriteSuperset)) {
          return false;
        }
      }
      if (direction == 'in' || direction == 'inout' || direction == '`consume') {
        // the canWriteSuperset of the handle represents the maximum lower-bound type that is read from the handle,
        // so we need to union it with the type that wants to be read here.
        if (!primitiveHandleType.variable.maybeMergeCanWriteSuperset(primitiveConnectionType.canReadSubset)) {
          return false;
        }
      }
    } else {
      if (primitiveConnectionType.tag !== primitiveHandleType.tag) {
        return false;
      }

      if (direction == 'out' || direction == 'inout') {
        if (!TypeChecker._writeConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
          return false;
        }
      }
      if (direction == 'in' || direction == 'inout') {
        if (!TypeChecker._readConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
          return false;
        }
      }
    }

    return true;
  }

  static _writeConstraintsApply(handleType, connectionType) {
    // this connection wants to write to this handle. If the written type is
    // more specific than the canReadSubset then it isn't violating the maximal type
    // that can be read.
    let writtenType = connectionType.canWriteSuperset;
    if (writtenType == null || handleType.canReadSubset == null) {
      return true;
    }
    if (writtenType.isMoreSpecificThan(handleType.canReadSubset)) {
      return true;
    }
    return false;
  }

  static _readConstraintsApply(handleType, connectionType) {
    // this connection wants to read from this handle. If the read type
    // is less specific than the canWriteSuperset, then it isn't violating
    // the maximum lower-bound read type.
    let readType = connectionType.canReadSubset;
    if (readType == null || handleType.canWriteSuperset == null) {
      return true;
    }
    if (handleType.canWriteSuperset.isMoreSpecificThan(readType)) {
      return true;
    }
    return false;
  }

  // Compare two types to see if they could be potentially resolved (in the absence of other
  // information). This is used as a filter when selecting compatible handles or checking
  // validity of recipes. This function returning true never implies that full type resolution
  // will succeed, but if the function returns false for a pair of types that are associated
  // then type resolution is guaranteed to fail.
  //
  // left, right: {type, direction, connection}
  static compareTypes(left, right) {
    let resolvedLeft = left.type.resolvedType();
    let resolvedRight = right.type.resolvedType();
    let [leftType, rightType] = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(resolvedLeft, resolvedRight);

    // a variable is compatible with a set only if it is unconstrained.
    if (leftType.isVariable && rightType.isTypeContainer()) {
      return !(leftType.variable.canReadSubset || leftType.variable.canWriteSuperset);
    }
    if (rightType.isVariable && leftType.isTypeContainer()) {
      return !(rightType.variable.canReadSubset || rightType.variable.canWriteSuperset);
    }

    if (leftType.isVariable || rightType.isVariable) {
      // TODO: everything should use this, eventually. Need to implement the
      // right functionality in Shapes first, though.
      return _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].canMergeConstraints(leftType, rightType);
    }

    if ((leftType == undefined) !== (rightType == undefined)) {
      return false;
    }
    if (leftType == rightType) {
      return true;
    }

    if (leftType.tag != rightType.tag) {
      return false;
    }

    if (leftType.isSlot) {
      return true;
    }

    // TODO: we need a generic way to evaluate type compatibility
    //       shapes + entities + etc
    if (leftType.isInterface && rightType.isInterface) {
      if (leftType.interfaceShape.equals(rightType.interfaceShape)) {
        return true;
      }
    }

    if (!leftType.isEntity || !rightType.isEntity) {
      return false;
    }

    let leftIsSub = leftType.entitySchema.isMoreSpecificThan(rightType.entitySchema);
    let leftIsSuper = rightType.entitySchema.isMoreSpecificThan(leftType.entitySchema);

    if (leftIsSuper && leftIsSub) {
       return true;
    }
    if (!leftIsSuper && !leftIsSub) {
      return false;
    }
    let [superclass, subclass] = leftIsSuper ? [left, right] : [right, left];

    // treat handle types as if they were 'inout' connections. Note that this
    // guarantees that the handle's type will be preserved, and that the fact
    // that the type comes from a handle rather than a connection will also
    // be preserved.
    let superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'inout');
    let subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'inout');
    if (superDirection == 'in') {
      return true;
    }
    if (subDirection == 'out') {
      return true;
    }
    return false;
  }
}


/***/ }),

/***/ "./runtime/storage-proxy.js":
/*!**********************************!*\
  !*** ./runtime/storage-proxy.js ***!
  \**********************************/
/*! exports provided: StorageProxy, StorageProxyScheduler */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StorageProxy", function() { return StorageProxy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StorageProxyScheduler", function() { return StorageProxyScheduler; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _ts_build_storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/storage/crdt-collection-model.js */ "./runtime/ts-build/storage/crdt-collection-model.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */





const SyncState = {none: 0, pending: 1, full: 2};

/** @class StorageProxy
 * Mediates between one or more Handles and the backing store outside the PEC.
 *
 * This can operate in two modes, based on how observing handles are configured:
 * - synchronized: the proxy maintains a copy of the full data held by the backing store, keeping
 *                 it in sync by listening to change events from the store.
 * - unsynchronized: the proxy simply passes through calls from Handles to the backing store.
 *
 * In synchronized mode we maintain a queue of sorted update events received from the backing store.
 * While events are received correctly - each update is one version ahead of our stored model - they
 * are processed immediately and observing handles are notified accordingly. If we receive an update
 * with a "future" version, the proxy is desynchronized:
 * - a request for the full data is sent to the backing store;
 * - any update events received after that (and before the response) are added to the queue;
 * - any new updates that can be applied will be (which may cause the proxy to "catch up" and resync
 *   before the full data response arrives);
 * - once the resync response is received, stale queued updates are discarded and any remaining ones
 *   are applied.
 */
class StorageProxy {
  constructor(id, type, port, pec, scheduler, name) {
    if (type.isCollection) {
      return new CollectionProxy(id, type, port, pec, scheduler, name);
    }
    if (type.isBigCollection) {
      return new BigCollectionProxy(id, type, port, pec, scheduler, name);
    }
    return new VariableProxy(id, type, port, pec, scheduler, name);
  }
}

class StorageProxyBase {
  constructor(id, type, port, pec, scheduler, name) {
    this._id = id;
    this._type = type;
    this._port = port;
    this._scheduler = scheduler;
    this.name = name;
    this._baseForNewID = pec.generateID();
    this._localIDComponent = 0;

    this._version = undefined;
    this._listenerAttached = false;
    this._keepSynced = false;
    this._synchronized = SyncState.none;
    this._observers = [];
    this._updates = [];

    this.pec = pec;
  }

  raiseSystemException(exception, methodName, particleId) {
    this._port.RaiseSystemException({exception: {message: exception.message, stack: exception.stack, name: exception.name}, methodName, particleId});
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }

  // Called by ParticleExecutionContext to associate (potentially multiple) particle/handle pairs with this proxy.
  register(particle, handle) {
    if (!handle.canRead) {
      return;
    }
    this._observers.push({particle, handle});

    // Attach an event listener to the backing store when the first readable handle is registered.
    if (!this._listenerAttached) {
      this._port.InitializeProxy({handle: this, callback: x => this._onUpdate(x)});
      this._listenerAttached = true;
    }

    // Change to synchronized mode as soon as we get any handle configured with keepSynced and send
    // a request to get the full model (once).
    // TODO: drop back to non-sync mode if all handles re-configure to !keepSynced
    if (handle.options.keepSynced) {
      if (!this._keepSynced) {
        this._port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        this._keepSynced = true;
      }

      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      if (handle.options.notifySync && this._synchronized == SyncState.full) {
        let syncModel = this._getModelForSync();
        this._scheduler.enqueue(particle, handle, ['sync', particle, syncModel]);
      }
    }
  }

  _onSynchronize({version, model}) {
    if (this._version !== undefined && version <= this._version) {
      console.warn(`StorageProxy '${this._id}' received stale model version ${version}; ` +
                   `current is ${this._version}`);
      return;
    }

    // Replace the stored data with the new one and notify handles that are configured for it.
    if (!this._synchronizeModel(version, model)) {
      return;
    }

    // We may have queued updates that were received after a desync; discard any that are stale
    // with respect to the received model.
    this._synchronized = SyncState.full;
    while (this._updates.length > 0 && this._updates[0].version <= version) {
      this._updates.shift();
    }

    let syncModel = this._getModelForSync();
    this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);
    this._processUpdates();
  }

  _onUpdate(update) {
    // Immediately notify any handles that are not configured with keepSynced but do want updates.
    if (this._observers.find(({handle}) => !handle.options.keepSynced && handle.options.notifyUpdate)) {
      let handleUpdate = this._processUpdate(update, false);
      this._notify('update', handleUpdate, options => !options.keepSynced && options.notifyUpdate);
    }

    // Bail if we're not in synchronized mode or this is a stale event.
    if (!this._keepSynced) {
      return;
    }
    if (update.version <= this._version) {
      console.warn(`StorageProxy '${this._id}' received stale update version ${update.version}; ` +
                   `current is ${this._version}`);
      return;
    }

    // Add the update to the queue and process. Most of the time the queue should be empty and
    // _processUpdates will consume this event immediately.
    this._updates.push(update);
    this._updates.sort((a, b) => a.version - b.version);
    this._processUpdates();
  }

  _notify(kind, details, predicate=() => true) {
    for (let {handle, particle} of this._observers) {
      if (predicate(handle.options)) {
        this._scheduler.enqueue(particle, handle, [kind, particle, details]);
      }
    }
  }

  _processUpdates() {

    let updateIsNext = update => {
      if (update.version == this._version + 1) {
        return true;
      }
      // Holy Layering Violation Batman
      // 
      // If we are a variable waiting for a barriered set response
      // then that set response *is* the next thing we're waiting for,
      // regardless of version numbers.
      //
      // TODO(shans): refactor this code so we don't need to layer-violate. 
      if (this._barrier && update.barrier == this._barrier) {
        return true;
      }
      return false;
    };

    // Consume all queued updates whose versions are monotonically increasing from our stored one.
    while (this._updates.length > 0 && updateIsNext(this._updates[0])) {
      let update = this._updates.shift();

      // Fold the update into our stored model.
      let handleUpdate = this._processUpdate(update);
      this._version = update.version;

      // Notify handles configured with keepSynced and notifyUpdates (non-keepSynced handles are
      // notified as updates are received).
      if (handleUpdate) {
        this._notify('update', handleUpdate, options => options.keepSynced && options.notifyUpdate);
      }
    }

    // If we still have update events queued, we must have received a future version are are now
    // desynchronized. Send a request for the full model and notify handles configured for it.
    if (this._updates.length > 0) {
      if (this._synchronized != SyncState.none) {
        this._synchronized = SyncState.none;
        this._port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        for (let {handle, particle} of this._observers) {
          if (handle.options.notifyDesync) {
            this._scheduler.enqueue(particle, handle, ['desync', particle]);
          }
        }
      }
    } else if (this._synchronized != SyncState.full) {
      // If we were desynced but have now consumed all update events, we've caught up.
      this._synchronized = SyncState.full;
    }
  }

  generateID() {
    return `${this._baseForNewID}:${this._localIDComponent++}`;
  }

  generateIDComponents() {
    return {base: this._baseForNewID, component: () => this._localIDComponent++};
  }
}


// Collections are synchronized in a CRDT Observed/Removed scheme.
// Each value is identified by an ID and a set of membership keys.
// Concurrent adds of the same value will specify the same ID but different
// keys. A value is removed by removing all of the observed keys. A value
// is considered to be removed if all of it's keys have been removed.
//
// In synchronized mode mutation takes place synchronously inside the proxy.
// The proxy uses the originatorId to skip over redundant events sent back
// by the storage object.
//
// In unsynchronized mode removal is not based on the keys observed at the
// proxy, since the proxy does not remember the state, but instead the set
// of keys that exist at the storage object at the time it receives the
// request.
class CollectionProxy extends StorageProxyBase {
  constructor(...args) {
    super(...args);
    this._model = new _ts_build_storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__["CrdtCollectionModel"]();
  }

  _getModelForSync() {
    return this._model.toList();
  }

  _synchronizeModel(version, model) {
    this._version = version;
    this._model = new _ts_build_storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__["CrdtCollectionModel"](model);
    return true;
  }

  _processUpdate(update, apply=true) {
    if (this._synchronized == SyncState.full) {
      // If we're synchronized, then any updates we sent have
      // already been applied/notified.
      for (let {handle} of this._observers) {
        if (update.originatorId == handle._particleId) {
          return null;
        }
      }
    }
    let added = [];
    let removed = [];
    if ('add' in update) {
      for (let {value, keys, effective} of update.add) {
        if (apply && this._model.add(value.id, value, keys) || !apply && effective) {
          added.push(value);
        }
      }
    } else if ('remove' in update) {
      for (let {value, keys, effective} of update.remove) {
        const localValue = this._model.getValue(value.id);
        if (apply && this._model.remove(value.id, keys) || !apply && effective) {
          removed.push(localValue);
        }
      }
    } else {
      throw new Error(`StorageProxy received invalid update event: ${JSON.stringify(update)}`);
    }
    if (added.length || removed.length) {
      let result = {};
      if (added.length) result.add = added;
      if (removed.length) result.remove = removed;
      result.originatorId = update.originatorId;
      return result;
    }
    return null;
  }

  // Read ops: if we're synchronized we can just return the local copy of the data.
  // Otherwise, send a request to the backing store.
  toList(particleId) {
    if (this._synchronized == SyncState.full) {
      return Promise.resolve(this._model.toList());
    } else {
      // TODO: in synchronized mode, this should integrate with SynchronizeProxy rather than
      //       sending a parallel request
      return new Promise(resolve =>
        this._port.HandleToList({callback: resolve, handle: this, particleId}));
    }
  }

  get(id, particleId) {
    if (this._synchronized == SyncState.full) {
      return Promise.resolve(this._model.getValue(id));
    } else {
      return new Promise((resolve, reject) =>
        this._port.HandleToList({callback: r => resolve(r.find(entity => entity.id === id)), handle: this, particleId}));
    }
  }

  store(value, keys, particleId) {
    let id = value.id;
    let data = {value, keys};
    this._port.HandleStore({handle: this, callback: () => {}, data, particleId});

    if (this._synchronized != SyncState.full) {
      return;
    }
    if (!this._model.add(id, value, keys)) {
      return;
    }
    let update = {originatorId: particleId, add: [value]};
    this._notify('update', update, options => options.notifyUpdate);
  }

  clear(particleId) {
    if (this._synchronized != SyncState.full) {
      this._port.HandleRemoveMultiple({handle: this, callback: () => {}, data: [], particleId});
    }

    let items = this._model.toList().map(item => ({id: item.id, keys: this._model.getKeys(item.id)}));
    this._port.HandleRemoveMultiple({handle: this, callback: () => {}, data: items, particleId});

    items = items.map(({id, keys}) => ({rawData: this._model.getValue(id).rawData, id, keys}));
    items = items.filter(item => this._model.remove(item.id, item.keys));
    if (items.length > 0) {
      this._notify('update', {originatorId: particleId, remove: items}, options => options.notifyUpdate);
    }
  }

  remove(id, keys, particleId) {
    if (this._synchronized != SyncState.full) {
      let data = {id, keys: []};
      this._port.HandleRemove({handle: this, callback: () => {}, data, particleId});
      return;
    }

    let value = this._model.getValue(id);
    if (!value) {
      return;
    }
    if (keys.length == 0) {
      keys = this._model.getKeys(id);
    }
    let data = {id, keys};
    this._port.HandleRemove({handle: this, callback: () => {}, data, particleId});

    if (!this._model.remove(id, keys)) {
      return;
    }
    let update = {originatorId: particleId, remove: [value]};
    this._notify('update', update, options => options.notifyUpdate);
  }
}

// Variables are synchronized in a 'last-writer-wins' scheme. When the
// VariableProxy mutates the model, it sets a barrier and expects to
// receive the barrier value echoed back in a subsequent update event.
// Between those two points in time updates are not applied or
// notified about as these reflect concurrent writes that did not 'win'.
class VariableProxy extends StorageProxyBase {
  constructor(...args) {
    super(...args);
    this._model = null;
    this._barrier = null;
  }

  _getModelForSync() {
    return this._model;
  }

  _synchronizeModel(version, model) {
    // If there's an active barrier then we shouldn't apply the model here, because
    // there is a more recent write from the particle side that is still in flight.
    if (this._barrier != null) {
      return false;
    }
    this._version = version;
    this._model = model.length == 0 ? null : model[0].value;
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this._model !== undefined);
    return true;
  }

  _processUpdate(update, apply=true) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])('data' in update);
    if (!apply) {
      return update;
    }
    // If we have set a barrier, suppress updates until after
    // we have seen the barrier return via an update.
    if (this._barrier != null) {
      if (update.barrier == this._barrier) {
        this._barrier = null;

        // HOLY LAYERING VIOLATION BATMAN
        //
        // We just cleared a barrier which means we are now synchronized. If we weren't
        // synchronized already, then we need to tell the handles.
        //
        // TODO(shans): refactor this code so we don't need to layer-violate. 
        if (this._synchronized !== SyncState.full) {
          this._synchronized = SyncState.full;
          let syncModel = this._getModelForSync();
          this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);

        }
      }
      return null;
    }
    this._model = update.data;
    return update;
  }

  // Read ops: if we're synchronized we can just return the local copy of the data.
  // Otherwise, send a request to the backing store.
  // TODO: in synchronized mode, these should integrate with SynchronizeProxy rather than
  //       sending a parallel request
  get(particleId) {
    if (this._synchronized == SyncState.full) {
      return Promise.resolve(this._model);
    } else {
      return new Promise(resolve =>
        this._port.HandleGet({callback: resolve, handle: this, particleId}));
    }
  }

  set(entity, particleId) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(entity !== undefined);
    if (JSON.stringify(this._model) == JSON.stringify(entity)) {
      return;
    }
    let barrier;

    // If we're setting to this handle but we aren't listening to firebase, 
    // then there's no point creating a barrier. In fact, if the response 
    // to the set comes back before a listener is registered then this proxy will
    // end up locked waiting for a barrier that will never arrive.
    if (this._listenerAttached) {
      barrier = this.generateID('barrier');
    } else {
      barrier = null;
    }
    // TODO: is this already a clone?
    this._model = JSON.parse(JSON.stringify(entity));
    this._barrier = barrier;
    this._port.HandleSet({data: entity, handle: this, particleId, barrier});
    let update = {originatorId: particleId, data: entity};
    this._notify('update', update, options => options.notifyUpdate);
  }

  clear(particleId) {
    if (this._model == null) {
      return;
    }
    let barrier = this.generateID('barrier');
    this._model = null;
    this._barrier = barrier;
    this._port.HandleClear({handle: this, particleId, barrier});
    let update = {originatorId: particleId, data: null};
    this._notify('update', update, options => options.notifyUpdate);
  }
}

// BigCollections are never synchronized. No local state is held and all operations are passed
// directly through to the backing store.
class BigCollectionProxy extends StorageProxyBase {
  register(particle, handle) {
    if (handle.canRead) {
      this._scheduler.enqueue(particle, handle, ['sync', particle, {}]);
    }
  }

  // TODO: surface get()

  async store(value, keys, particleId) {
    return new Promise(resolve =>
      this._port.HandleStore({handle: this, callback: resolve, data: {value, keys}, particleId}));
  }

  async remove(id, particleId) {
    return new Promise(resolve =>
      this._port.HandleRemove({handle: this, callback: resolve, data: {id, keys: []}, particleId}));
  }

  async stream(pageSize) {
    return new Promise(resolve =>
      this._port.HandleStream({handle: this, callback: resolve, pageSize}));
  }

  async cursorNext(cursorId) {
    return new Promise(resolve =>
      this._port.StreamCursorNext({handle: this, callback: resolve, cursorId}));
  }

  cursorClose(cursorId) {
    this._port.StreamCursorClose({handle: this, cursorId});
  }
}

class StorageProxyScheduler {
  constructor() {
    this._scheduled = false;
    // Particle -> {Handle -> [Queue of events]}
    this._queues = new Map();
  }

  // TODO: break apart args here, sync events should flush the queue.
  enqueue(particle, handle, args) {
    if (!this._queues.has(particle)) {
      this._queues.set(particle, new Map());
    }
    let byHandle = this._queues.get(particle);
    if (!byHandle.has(handle)) {
      byHandle.set(handle, []);
    }
    let queue = byHandle.get(handle);
    queue.push(args);
    this._schedule();
  }

  get busy() {
    return this._queues.size > 0;
  }

  _updateIdle() {
    if (this._idleResolver && !this.busy) {
      this._idleResolver();
      this._idle = null;
      this._idleResolver = null;
    }
  }

  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    if (!this._idle) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    return this._idle;
  }

  _schedule() {
    if (this._scheduled) {
      return;
    }
    this._scheduled = true;
    setTimeout(() => {
      this._scheduled = false;
      this._dispatch();
    }, 0);
  }

  _dispatch() {
    // TODO: should we process just one particle per task?
    while (this._queues.size > 0) {
      let particle = [...this._queues.keys()][0];
      let byHandle = this._queues.get(particle);
      this._queues.delete(particle);
      for (let [handle, queue] of byHandle.entries()) {
        for (let args of queue) {
          try {
            handle._notify(...args);
          } catch (e) {
            console.error('Error dispatching to particle', e);
            handle._proxy.raiseSystemException(e, 'StorageProxyScheduler::_dispatch', particle.id);
          }
        }
      }
    }

    this._updateIdle();
  }
}


/***/ }),

/***/ "./runtime/transformation-dom-particle.js":
/*!************************************************!*\
  !*** ./runtime/transformation-dom-particle.js ***!
  \************************************************/
/*! exports provided: TransformationDomParticle */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TransformationDomParticle", function() { return TransformationDomParticle; });
/* harmony import */ var _dom_particle_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dom-particle.js */ "./runtime/dom-particle.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */




// Regex to separate style and template.
let re = /<style>((?:.|[\r\n])*)<\/style>((?:.|[\r\n])*)/;

/** @class TransformationDomParticle
 * Particle that does transformation stuff with DOM.
 */
class TransformationDomParticle extends _dom_particle_js__WEBPACK_IMPORTED_MODULE_0__["DomParticle"] {
  getTemplate(slotName) {
    // TODO: add support for multiple slots.
    return this._state.template;
  }
  getTemplateName(slotName) {
    // TODO: add support for multiple slots.
    return this._state.templateName;
  }
  render(props, state) {
    return state.renderModel;
  }
  shouldRender(props, state) {
    return Boolean((state.template || state.templateName) && state.renderModel);
  }

  renderHostedSlot(slotName, hostedSlotId, content) {
    this.combineHostedTemplate(slotName, hostedSlotId, content);
    this.combineHostedModel(slotName, hostedSlotId, content);
  }

  // abstract
  combineHostedTemplate(slotName, hostedSlotId, content) {}
  combineHostedModel(slotName, hostedSlotId, content) {}

  // Helper methods that may be reused in transformation particles to combine hosted content.
  static propsToItems(propsValues) {
    return propsValues ? propsValues.map(({rawData, id}) => Object.assign({}, rawData, {subId: id})) : [];
  }
}


/***/ }),

/***/ "./runtime/ts-build/reference.js":
/*!***************************************!*\
  !*** ./runtime/ts-build/reference.js ***!
  \***************************************/
/*! exports provided: Reference, newClientReference */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Reference", function() { return Reference; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "newClientReference", function() { return newClientReference; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _handle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../handle.js */ "./runtime/handle.js");
/** @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */



class Reference {
    constructor(data, type, context) {
        this.entity = null;
        this.storageProxy = null;
        this.handle = null;
        this.id = data.id;
        this.storageKey = data.storageKey;
        this.context = context;
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(type.isReference);
        this.type = type;
    }
    async ensureStorageProxy() {
        if (this.storageProxy == null) {
            this.storageProxy = await this.context.getStorageProxy(this.storageKey, this.type.referenceReferredType);
            this.handle = Object(_handle_js__WEBPACK_IMPORTED_MODULE_2__["handleFor"])(this.storageProxy);
            if (this.storageKey) {
                Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this.storageKey === this.storageProxy.storageKey);
            }
            else {
                this.storageKey = this.storageProxy.storageKey;
            }
        }
    }
    async dereference() {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this.context, "Must have context to dereference");
        if (this.entity) {
            return this.entity;
        }
        await this.ensureStorageProxy();
        this.entity = await this.handle.get(this.id);
        return this.entity;
    }
    dataClone() {
        return { storageKey: this.storageKey, id: this.id };
    }
}
var ReferenceMode;
(function (ReferenceMode) {
    ReferenceMode[ReferenceMode["Unstored"] = 0] = "Unstored";
    ReferenceMode[ReferenceMode["Stored"] = 1] = "Stored";
})(ReferenceMode || (ReferenceMode = {}));
function newClientReference(context) {
    return class extends Reference {
        constructor(entity) {
            // TODO(shans): start carrying storageKey information around on Entity objects
            super({ id: entity.id, storageKey: null }, _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].newReference(entity.constructor.type), context);
            this.mode = ReferenceMode.Unstored;
            this.entity = entity;
            this.stored = new Promise(async (resolve, reject) => {
                await this.storeReference(entity);
                resolve();
            });
        }
        async storeReference(entity) {
            await this.ensureStorageProxy();
            await this.handle.store(entity);
            this.mode = ReferenceMode.Stored;
        }
        async dereference() {
            if (this.mode === ReferenceMode.Unstored) {
                return null;
            }
            return super.dereference();
        }
        isIdentified() {
            return this.entity.isIdentified();
        }
    };
}
//# sourceMappingURL=reference.js.map

/***/ }),

/***/ "./runtime/ts-build/schema.js":
/*!************************************!*\
  !*** ./runtime/ts-build/schema.js ***!
  \************************************/
/*! exports provided: Schema */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Schema", function() { return Schema; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../recipe/type-checker.js */ "./runtime/recipe/type-checker.js");
/* harmony import */ var _entity_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../entity.js */ "./runtime/entity.js");
/* harmony import */ var _reference_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./reference.js */ "./runtime/ts-build/reference.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */





class Schema {
    constructor(model) {
        const legacy = [];
        // TODO: remove this (remnants of normative/optional)
        if (model.sections) {
            legacy.push('sections');
            Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!model.fields);
            model.fields = {};
            for (const section of model.sections) {
                Object.assign(model.fields, section.fields);
            }
            delete model.sections;
        }
        if (model.name) {
            legacy.push('name');
            model.names = [model.name];
            delete model.name;
        }
        if (model.parents) {
            legacy.push('parents');
            for (const parent of model.parents) {
                const parentSchema = new Schema(parent);
                model.names.push(...parent.names);
                Object.assign(model.fields, parent.fields);
            }
            model.names = [...new Set(model.names)];
        }
        if (legacy.length > 0) {
            console.warn(`Schema ${model.names[0] || '*'} was serialized with legacy format (${legacy.join(', ')})`, new Error());
        }
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(model.fields);
        this._model = model;
        this.description = {};
        if (model.description) {
            model.description.description.forEach(desc => this.description[desc.name] = desc.pattern || desc.patterns[0]);
        }
    }
    toLiteral() {
        const fields = {};
        const updateField = field => {
            if (field.kind === 'schema-reference') {
                const schema = field.schema;
                return { kind: 'schema-reference', schema: { kind: schema.kind, model: schema.model.toLiteral() } };
            }
            else if (field.kind === 'schema-collection') {
                return { kind: 'schema-collection', schema: updateField(field.schema) };
            }
            else {
                return field;
            }
        };
        for (const key of Object.keys(this._model.fields)) {
            fields[key] = updateField(this._model.fields[key]);
        }
        return { names: this._model.names, fields, description: this.description };
    }
    static fromLiteral(data) {
        const fields = {};
        const updateField = field => {
            if (field.kind === 'schema-reference') {
                const schema = field.schema;
                return { kind: 'schema-reference', schema: { kind: schema.kind, model: _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].fromLiteral(schema.model) } };
            }
            else if (field.kind === 'schema-collection') {
                return { kind: 'schema-collection', schema: updateField(field.schema) };
            }
            else {
                return field;
            }
        };
        for (const key of Object.keys(data.fields)) {
            fields[key] = updateField(data.fields[key]);
        }
        const result = new Schema({ names: data.names, fields });
        result.description = data.description || {};
        return result;
    }
    get fields() {
        return this._model.fields;
    }
    get names() {
        return this._model.names;
    }
    // TODO: This should only be an ident used in manifest parsing.
    get name() {
        return this.names[0];
    }
    static typesEqual(fieldType1, fieldType2) {
        // TODO: structural check instead of stringification.
        return Schema._typeString(fieldType1) === Schema._typeString(fieldType2);
    }
    static _typeString(type) {
        if (typeof (type) !== 'object') {
            Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(typeof type === 'string');
            return type;
        }
        switch (type.kind) {
            case 'schema-union':
                return `(${type.types.join(' or ')})`;
            case 'schema-tuple':
                return `(${type.types.join(', ')})`;
            case 'schema-reference':
                return `Reference<${Schema._typeString(type.schema)}>`;
            case 'type-name':
            case 'schema-inline':
                return type.model.entitySchema.toInlineSchemaString();
            case 'schema-collection':
                return `[${Schema._typeString(type.schema)}]`;
            default:
                throw new Error(`Unknown type kind ${type.kind} in schema ${this.name}`);
        }
    }
    static union(schema1, schema2) {
        const names = [...new Set([...schema1.names, ...schema2.names])];
        const fields = {};
        for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
            if (fields[field]) {
                if (!Schema.typesEqual(fields[field], type)) {
                    return null;
                }
            }
            else {
                fields[field] = type;
            }
        }
        return new Schema({
            names,
            fields,
        });
    }
    static intersect(schema1, schema2) {
        const names = [...schema1.names].filter(name => schema2.names.includes(name));
        const fields = {};
        for (const [field, type] of Object.entries(schema1.fields)) {
            const otherType = schema2.fields[field];
            if (otherType && Schema.typesEqual(type, otherType)) {
                fields[field] = type;
            }
        }
        return new Schema({
            names,
            fields,
        });
    }
    equals(otherSchema) {
        return this === otherSchema || (this.name === otherSchema.name
            // TODO: Check equality without calling contains.
            && this.isMoreSpecificThan(otherSchema)
            && otherSchema.isMoreSpecificThan(this));
    }
    isMoreSpecificThan(otherSchema) {
        const names = new Set(this.names);
        for (const name of otherSchema.names) {
            if (!names.has(name)) {
                return false;
            }
        }
        const fields = {};
        for (const [name, type] of Object.entries(this.fields)) {
            fields[name] = type;
        }
        for (const [name, type] of Object.entries(otherSchema.fields)) {
            if (fields[name] == undefined) {
                return false;
            }
            if (!Schema.typesEqual(fields[name], type)) {
                return false;
            }
        }
        return true;
    }
    get type() {
        return _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].newEntity(this);
    }
    entityClass(context = null) {
        const schema = this;
        const className = this.name;
        const classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];
        const convertToJsType = fieldType => {
            switch (fieldType) {
                case 'Text':
                    return 'string';
                case 'URL':
                    return 'string';
                case 'Number':
                    return 'number';
                case 'Boolean':
                    return 'boolean';
                case 'Object':
                    return 'object';
                default:
                    throw new Error(`Unknown field type ${fieldType} in schema ${className}`);
            }
        };
        const fieldTypes = this.fields;
        const validateFieldAndTypes = (op, name, value) => _validateFieldAndTypes(op, name, fieldTypes[name], value);
        const _validateFieldAndTypes = (op, name, fieldType, value) => {
            if (fieldType === undefined) {
                throw new Error(`Can't ${op} field ${name}; not in schema ${className}`);
            }
            if (value === undefined || value === null) {
                return;
            }
            if (typeof (fieldType) !== 'object') {
                // Primitive fields.
                if (typeof (value) !== convertToJsType(fieldType)) {
                    throw new TypeError(`Type mismatch ${op}ting field ${name} (type ${fieldType}); ` +
                        `value '${value}' is type ${typeof (value)}`);
                }
                return;
            }
            switch (fieldType.kind) {
                case 'schema-union':
                    // Value must be a primitive that matches one of the union types.
                    for (const innerType of fieldType.types) {
                        if (typeof (value) === convertToJsType(innerType)) {
                            return;
                        }
                    }
                    throw new TypeError(`Type mismatch ${op}ting field ${name} (union [${fieldType.types}]); ` +
                        `value '${value}' is type ${typeof (value)}`);
                case 'schema-tuple':
                    // Value must be an array whose contents match each of the tuple types.
                    if (!Array.isArray(value)) {
                        throw new TypeError(`Cannot ${op} tuple ${name} with non-array value '${value}'`);
                    }
                    if (value.length !== fieldType.types.length) {
                        throw new TypeError(`Length mismatch ${op}ting tuple ${name} ` +
                            `[${fieldType.types}] with value '${value}'`);
                    }
                    fieldType.types.map((innerType, i) => {
                        if (value[i] !== undefined && value[i] !== null &&
                            typeof (value[i]) !== convertToJsType(innerType)) {
                            throw new TypeError(`Type mismatch ${op}ting field ${name} (tuple [${fieldType.types}]); ` +
                                `value '${value}' has type ${typeof (value[i])} at index ${i}`);
                        }
                    });
                    break;
                case 'schema-reference':
                    if (!(value instanceof _reference_js__WEBPACK_IMPORTED_MODULE_4__["Reference"])) {
                        throw new TypeError(`Cannot ${op} reference ${name} with non-reference '${value}'`);
                    }
                    if (!_recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__["TypeChecker"].compareTypes({ type: value.type }, { type: _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].newReference(fieldType.schema.model) })) {
                        throw new TypeError(`Cannot ${op} reference ${name} with value '${value}' of mismatched type`);
                    }
                    break;
                case 'schema-collection':
                    // WTF?! value instanceof Set is returning false sometimes here because the Set in
                    // this environment (a native code constructor) isn't equal to the Set that the value
                    // has been constructed with (another native code constructor)...
                    if (value.constructor.name !== 'Set') {
                        throw new TypeError(`Cannot ${op} collection ${name} with non-Set '${value}'`);
                    }
                    for (const element of value) {
                        _validateFieldAndTypes(op, name, fieldType.schema, element);
                    }
                    break;
                default:
                    throw new Error(`Unknown kind ${fieldType.kind} in schema ${className}`);
            }
        };
        const clazz = class extends _entity_js__WEBPACK_IMPORTED_MODULE_3__["Entity"] {
            constructor(data, userIDComponent) {
                super(userIDComponent);
                this.rawData = new Proxy({}, {
                    get: (target, name) => {
                        if (classJunk.includes(name) || name.constructor === Symbol) {
                            return undefined;
                        }
                        const value = target[name];
                        validateFieldAndTypes('get', name, value);
                        return value;
                    },
                    set: (target, name, value) => {
                        validateFieldAndTypes('set', name, value);
                        target[name] = value;
                        return true;
                    }
                });
                Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(data, `can't construct entity with null data`);
                // TODO: figure out how to do this only on wire-created entities.
                const sanitizedData = this.sanitizeData(data);
                for (const [name, value] of Object.entries(sanitizedData)) {
                    this.rawData[name] = value;
                }
            }
            sanitizeData(data) {
                const sanitizedData = {};
                for (const [name, value] of Object.entries(data)) {
                    sanitizedData[name] = this.sanitizeEntry(fieldTypes[name], value, name);
                }
                return sanitizedData;
            }
            sanitizeEntry(type, value, name) {
                if (!type) {
                    // If there isn't a field type for this, the proxy will pick up
                    // that fact and report a meaningful error.
                    return value;
                }
                if (type.kind === 'schema-reference' && value) {
                    if (value instanceof _reference_js__WEBPACK_IMPORTED_MODULE_4__["Reference"]) {
                        // Setting value as Reference (Particle side). This will enforce that the type provided for
                        // the handle matches the type of the reference.
                        return value;
                    }
                    else if (value.id && value.storageKey) {
                        // Setting value from raw data (Channel side).
                        // TODO(shans): This can't enforce type safety here as there isn't any type data available.
                        // Maybe this is OK because there's type checking on the other side of the channel?
                        return new _reference_js__WEBPACK_IMPORTED_MODULE_4__["Reference"](value, _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].newReference(type.schema.model), context);
                    }
                    else {
                        throw new TypeError(`Cannot set reference ${name} with non-reference '${value}'`);
                    }
                }
                else if (type.kind === 'schema-collection' && value) {
                    // WTF?! value instanceof Set is returning false sometimes here because the Set in
                    // this environment (a native code constructor) isn't equal to the Set that the value
                    // has been constructed with (another native code constructor)...
                    if (value.constructor.name === 'Set') {
                        return value;
                    }
                    else if (value.length && value instanceof Object) {
                        return new Set(value.map(v => this.sanitizeEntry(type.schema, v, name)));
                    }
                    else {
                        throw new TypeError(`Cannot set collection ${name} with non-collection '${value}'`);
                    }
                }
                else {
                    return value;
                }
            }
            dataClone() {
                const clone = {};
                for (const name of Object.keys(schema.fields)) {
                    if (this.rawData[name] !== undefined) {
                        if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
                            clone[name] = this.rawData[name].dataClone();
                        }
                        else if (fieldTypes[name] && fieldTypes[name].kind === 'schema-collection') {
                            clone[name] = [...this.rawData[name]].map(a => a.dataClone());
                        }
                        else {
                            clone[name] = this.rawData[name];
                        }
                    }
                }
                return clone;
            }
            static get key() {
                return {
                    tag: 'entity',
                    schema: schema.toLiteral(),
                };
            }
        };
        Object.defineProperty(clazz, 'type', { value: this.type });
        Object.defineProperty(clazz, 'name', { value: this.name });
        // TODO: add query / getter functions for user properties
        for (const name of Object.keys(this.fields)) {
            Object.defineProperty(clazz.prototype, name, {
                get() {
                    return this.rawData[name];
                },
                set(v) {
                    this.rawData[name] = v;
                }
            });
        }
        return clazz;
    }
    toInlineSchemaString(options) {
        const names = (this.names || ['*']).join(' ');
        const fields = Object.entries(this.fields).map(([name, type]) => `${Schema._typeString(type)} ${name}`).join(', ');
        return `${names} {${fields.length > 0 && options && options.hideFields ? '...' : fields}}`;
    }
    toManifestString() {
        const results = [];
        results.push(`schema ${this.names.join(' ')}`);
        results.push(...Object.entries(this.fields).map(([name, type]) => `  ${Schema._typeString(type)} ${name}`));
        if (Object.keys(this.description).length > 0) {
            results.push(`  description \`${this.description.pattern}\``);
            for (const name of Object.keys(this.description)) {
                if (name !== 'pattern') {
                    results.push(`    ${name} \`${this.description[name]}\``);
                }
            }
        }
        return results.join('\n');
    }
}
//# sourceMappingURL=schema.js.map

/***/ }),

/***/ "./runtime/ts-build/shape.js":
/*!***********************************!*\
  !*** ./runtime/ts-build/shape.js ***!
  \***********************************/
/*! exports provided: Shape */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Shape", function() { return Shape; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../recipe/type-checker.js */ "./runtime/recipe/type-checker.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// ShapeHandle {name, direction, type}
// Slot {name, direction, isRequired, isSet}
function _fromLiteral(member) {
    if (!!member && typeof member === 'object') {
        return _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].fromLiteral(member);
    }
    return member;
}
function _toLiteral(member) {
    if (!!member && member.toLiteral) {
        return member.toLiteral();
    }
    return member;
}
const handleFields = ['type', 'name', 'direction'];
const slotFields = ['name', 'direction', 'isRequired', 'isSet'];
class Shape {
    constructor(name, handles, slots) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(name);
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(handles !== undefined);
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(slots !== undefined);
        this.name = name;
        this.handles = handles;
        this.slots = slots;
        this.typeVars = [];
        for (const handle of handles) {
            for (const field of handleFields) {
                if (Shape.isTypeVar(handle[field])) {
                    this.typeVars.push({ object: handle, field });
                }
            }
        }
        for (const slot of slots) {
            for (const field of slotFields) {
                if (Shape.isTypeVar(slot[field])) {
                    this.typeVars.push({ object: slot, field });
                }
            }
        }
    }
    toPrettyString() {
        return 'SHAAAAPE';
    }
    mergeTypeVariablesByName(variableMap) {
        this.typeVars.map(({ object, field }) => object[field] = object[field].mergeTypeVariablesByName(variableMap));
    }
    get canReadSubset() {
        return this._cloneAndUpdate(typeVar => typeVar.canReadSubset);
    }
    get canWriteSuperset() {
        return this._cloneAndUpdate(typeVar => typeVar.canWriteSuperset);
    }
    isMoreSpecificThan(other) {
        if (this.handles.length !== other.handles.length ||
            this.slots.length !== other.slots.length) {
            return false;
        }
        // TODO: should probably confirm that handles and slots actually match.
        for (let i = 0; i < this.typeVars.length; i++) {
            const thisTypeVar = this.typeVars[i];
            const otherTypeVar = other.typeVars[i];
            if (!thisTypeVar.object[thisTypeVar.field].isMoreSpecificThan(otherTypeVar.object[otherTypeVar.field])) {
                return false;
            }
        }
        return true;
    }
    _applyExistenceTypeTest(test) {
        for (const typeRef of this.typeVars) {
            if (test(typeRef.object[typeRef.field])) {
                return true;
            }
        }
        return false;
    }
    _handlesToManifestString() {
        return this.handles
            .map(handle => {
            const type = handle.type.resolvedType();
            return `  ${handle.direction ? handle.direction + ' ' : ''}${type.toString()} ${handle.name ? handle.name : '*'}`;
        }).join('\n');
    }
    _slotsToManifestString() {
        // TODO deal with isRequired
        return this.slots
            .map(slot => `  ${slot.direction} ${slot.isSet ? 'set of ' : ''}${slot.name ? slot.name + ' ' : ''}`)
            .join('\n');
    }
    // TODO: Include name as a property of the shape and normalize this to just
    // toString().
    toString() {
        return `shape ${this.name}
${this._handlesToManifestString()}
${this._slotsToManifestString()}
`;
    }
    static fromLiteral(data) {
        const handles = data.handles.map(handle => ({ type: _fromLiteral(handle.type), name: _fromLiteral(handle.name), direction: _fromLiteral(handle.direction) }));
        const slots = data.slots.map(slot => ({ name: _fromLiteral(slot.name), direction: _fromLiteral(slot.direction), isRequired: _fromLiteral(slot.isRequired), isSet: _fromLiteral(slot.isSet) }));
        return new Shape(data.name, handles, slots);
    }
    toLiteral() {
        const handles = this.handles.map(handle => ({ type: _toLiteral(handle.type), name: _toLiteral(handle.name), direction: _toLiteral(handle.direction) }));
        const slots = this.slots.map(slot => ({ name: _toLiteral(slot.name), direction: _toLiteral(slot.direction), isRequired: _toLiteral(slot.isRequired), isSet: _toLiteral(slot.isSet) }));
        return { name: this.name, handles, slots };
    }
    clone(variableMap) {
        const handles = this.handles.map(({ name, direction, type }) => ({ name, direction, type: type ? type.clone(variableMap) : undefined }));
        const slots = this.slots.map(({ name, direction, isRequired, isSet }) => ({ name, direction, isRequired, isSet }));
        return new Shape(this.name, handles, slots);
    }
    cloneWithResolutions(variableMap) {
        return this._cloneWithResolutions(variableMap);
    }
    _cloneWithResolutions(variableMap) {
        const handles = this.handles.map(({ name, direction, type }) => ({ name, direction, type: type ? type._cloneWithResolutions(variableMap) : undefined }));
        const slots = this.slots.map(({ name, direction, isRequired, isSet }) => ({ name, direction, isRequired, isSet }));
        return new Shape(this.name, handles, slots);
    }
    canEnsureResolved() {
        for (const typeVar of this.typeVars) {
            if (!typeVar.object[typeVar.field].canEnsureResolved()) {
                return false;
            }
        }
        return true;
    }
    maybeEnsureResolved() {
        for (const typeVar of this.typeVars) {
            let variable = typeVar.object[typeVar.field];
            variable = variable.clone(new Map());
            if (!variable.maybeEnsureResolved())
                return false;
        }
        for (const typeVar of this.typeVars) {
            typeVar.object[typeVar.field].maybeEnsureResolved();
        }
        return true;
    }
    tryMergeTypeVariablesWith(other) {
        // Type variable enabled slot matching will Just Work when we
        // unify slots and handles.
        if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
            return null;
        }
        if (other.handles.length !== this.handles.length) {
            return null;
        }
        const handles = new Set(this.handles);
        const otherHandles = new Set(other.handles);
        const handleMap = new Map();
        let sizeCheck = handles.size;
        while (handles.size > 0) {
            const handleMatches = [...handles.values()].map(handle => ({ handle, match: [...otherHandles.values()].filter(otherHandle => this._equalHandle(handle, otherHandle)) }));
            for (const handleMatch of handleMatches) {
                // no match!
                if (handleMatch.match.length === 0) {
                    return null;
                }
                if (handleMatch.match.length === 1) {
                    handleMap.set(handleMatch.handle, handleMatch.match[0]);
                    otherHandles.delete(handleMatch.match[0]);
                    handles.delete(handleMatch.handle);
                }
            }
            // no progress!
            if (handles.size === sizeCheck) {
                return null;
            }
            sizeCheck = handles.size;
        }
        const handleList = [];
        for (const handle of this.handles) {
            const otherHandle = handleMap.get(handle);
            let resultType;
            if (handle.type.hasVariable || otherHandle.type.hasVariable) {
                resultType = _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__["TypeChecker"]._tryMergeTypeVariable(handle.type, otherHandle.type);
                if (!resultType) {
                    return null;
                }
            }
            else {
                resultType = handle.type || otherHandle.type;
            }
            handleList.push({ name: handle.name || otherHandle.name, direction: handle.direction || otherHandle.direction, type: resultType });
        }
        const slots = this.slots.map(({ name, direction, isRequired, isSet }) => ({ name, direction, isRequired, isSet }));
        return new Shape(this.name, handleList, slots);
    }
    resolvedType() {
        return this._cloneAndUpdate(typeVar => typeVar.resolvedType());
    }
    equals(other) {
        if (this.handles.length !== other.handles.length) {
            return false;
        }
        // TODO: this isn't quite right as it doesn't deal with duplicates properly
        if (!this._equalItems(other.handles, this.handles, this._equalHandle)) {
            return false;
        }
        if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
            return false;
        }
        return true;
    }
    _equalHandle(handle, otherHandle) {
        return handle.name === otherHandle.name && handle.direction === otherHandle.direction && handle.type.equals(otherHandle.type);
    }
    _equalSlot(slot, otherSlot) {
        return slot.name === otherSlot.name && slot.direction === otherSlot.direction && slot.isRequired === otherSlot.isRequired && slot.isSet === otherSlot.isSet;
    }
    _equalItems(otherItems, items, compareItem) {
        for (const otherItem of otherItems) {
            let exists = false;
            for (const item of items) {
                if (compareItem(item, otherItem)) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                return false;
            }
        }
        return true;
    }
    _cloneAndUpdate(update) {
        const copy = this.clone(new Map());
        copy.typeVars.forEach(typeVar => Shape._updateTypeVar(typeVar, update));
        return copy;
    }
    static _updateTypeVar(typeVar, update) {
        typeVar.object[typeVar.field] = update(typeVar.object[typeVar.field]);
    }
    static isTypeVar(reference) {
        return (reference instanceof _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"]) && reference.hasProperty(r => r.isVariable);
    }
    static mustMatch(reference) {
        return !(reference == undefined || Shape.isTypeVar(reference));
    }
    static handlesMatch(shapeHandle, particleHandle) {
        if (Shape.mustMatch(shapeHandle.name) &&
            shapeHandle.name !== particleHandle.name) {
            return false;
        }
        // TODO: direction subsetting?
        if (Shape.mustMatch(shapeHandle.direction) &&
            shapeHandle.direction !== particleHandle.direction) {
            return false;
        }
        if (shapeHandle.type == undefined) {
            return true;
        }
        if (shapeHandle.type.isVariableReference) {
            return false;
        }
        const [left, right] = _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].unwrapPair(shapeHandle.type, particleHandle.type);
        if (left.isVariable) {
            return [{ var: left, value: right, direction: shapeHandle.direction }];
        }
        else {
            return left.equals(right);
        }
    }
    static slotsMatch(shapeSlot, particleSlot) {
        if (Shape.mustMatch(shapeSlot.name) &&
            shapeSlot.name !== particleSlot.name) {
            return false;
        }
        if (Shape.mustMatch(shapeSlot.direction) &&
            shapeSlot.direction !== particleSlot.direction) {
            return false;
        }
        if (Shape.mustMatch(shapeSlot.isRequired) &&
            shapeSlot.isRequired !== particleSlot.isRequired) {
            return false;
        }
        if (Shape.mustMatch(shapeSlot.isSet) &&
            shapeSlot.isSet !== particleSlot.isSet) {
            return false;
        }
        return true;
    }
    particleMatches(particleSpec) {
        const shape = this.cloneWithResolutions(new Map());
        return shape.restrictType(particleSpec) !== false;
    }
    restrictType(particleSpec) {
        return this._restrictThis(particleSpec);
    }
    _restrictThis(particleSpec) {
        const handleMatches = this.handles.map(handle => particleSpec.connections.map(connection => ({ match: connection, result: Shape.handlesMatch(handle, connection) }))
            .filter(a => a.result !== false));
        const particleSlots = [];
        particleSpec.slots.forEach(consumedSlot => {
            particleSlots.push({ name: consumedSlot.name, direction: 'consume', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet });
            consumedSlot.providedSlots.forEach(providedSlot => {
                particleSlots.push({ name: providedSlot.name, direction: 'provide', isRequired: false, isSet: providedSlot.isSet });
            });
        });
        let slotMatches = this.slots.map(slot => particleSlots.filter(particleSlot => Shape.slotsMatch(slot, particleSlot)));
        slotMatches = slotMatches.map(matchList => matchList.map(slot => ({ match: slot, result: true })));
        const exclusions = [];
        // TODO: this probably doesn't deal with multiple match options.
        function choose(list, exclusions) {
            if (list.length === 0) {
                return [];
            }
            const thisLevel = list.pop();
            for (const connection of thisLevel) {
                if (exclusions.includes(connection.match)) {
                    continue;
                }
                const newExclusions = exclusions.slice();
                newExclusions.push(connection.match);
                const constraints = choose(list, newExclusions);
                if (constraints !== false) {
                    return connection.result.length ? constraints.concat(connection.result) : constraints;
                }
            }
            return false;
        }
        const handleOptions = choose(handleMatches, []);
        const slotOptions = choose(slotMatches, []);
        if (handleOptions === false || slotOptions === false) {
            return false;
        }
        for (const constraint of handleOptions) {
            if (!constraint.var.variable.resolution) {
                constraint.var.variable.resolution = constraint.value;
            }
            else if (constraint.var.variable.resolution.isVariable) {
                // TODO(shans): revisit how this should be done,
                // consider reusing tryMergeTypeVariablesWith(other).
                if (!_recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__["TypeChecker"].processTypeList(constraint.var, [{
                        type: constraint.value, direction: constraint.direction
                    }]))
                    return false;
            }
            else {
                if (!constraint.var.variable.resolution.equals(constraint.value))
                    return false;
            }
        }
        return this;
    }
}


//# sourceMappingURL=shape.js.map

/***/ }),

/***/ "./runtime/ts-build/storage/crdt-collection-model.js":
/*!***********************************************************!*\
  !*** ./runtime/ts-build/storage/crdt-collection-model.js ***!
  \***********************************************************/
/*! exports provided: CrdtCollectionModel */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CrdtCollectionModel", function() { return CrdtCollectionModel; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../platform/assert-web.js */ "./platform/assert-web.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

class CrdtCollectionModel {
    constructor(model = undefined) {
        // id => {value, Set[keys]}
        this.items = new Map();
        if (model) {
            for (let { id, value, keys } of model) {
                if (!keys) {
                    keys = [];
                }
                this.items.set(id, { value, keys: new Set(keys) });
            }
        }
    }
    // Adds membership, `keys`, of `value` indexed by `id` to this collection.
    // Returns whether the change is effective (`id` is new to the collection,
    // or `value` is different to the value previously stored).
    add(id, value, keys) {
        // Ensure that keys is actually an array, not a single string.
        // TODO(shans): remove this when all callers are implemented in typeScript.
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(keys.length > 0 && typeof keys === 'object', 'add requires a list of keys');
        let item = this.items.get(id);
        let effective = false;
        if (!item) {
            item = { value, keys: new Set(keys) };
            this.items.set(id, item);
            effective = true;
        }
        else {
            let newKeys = false;
            for (const key of keys) {
                if (!item.keys.has(key)) {
                    newKeys = true;
                }
                item.keys.add(key);
            }
            if (!this._equals(item.value, value)) {
                Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(newKeys, 'cannot add without new keys');
                item.value = value;
                effective = true;
            }
        }
        return effective;
    }
    _equals(value1, value2) {
        if (Boolean(value1) !== Boolean(value2)) {
            return false;
        }
        if (!value1) {
            return true;
        }
        const type1 = typeof (value1);
        if (type1 !== typeof (value2)) {
            return false;
        }
        if (type1 === 'object') {
            const keys = Object.keys(value1);
            if (keys.length !== Object.keys(value2).length) {
                return false;
            }
            return keys.every(key => this._equals(value1[key], value2[key]));
        }
        return JSON.stringify(value1) === JSON.stringify(value2);
    }
    // Removes the membership, `keys`, of the value indexed by `id` from this collection.
    // Returns whether the change is effective (the value is no longer present
    // in the collection because all of the keys have been removed).
    remove(id, keys) {
        const item = this.items.get(id);
        if (!item) {
            return false;
        }
        for (const key of keys) {
            item.keys.delete(key);
        }
        const effective = item.keys.size === 0;
        if (effective) {
            this.items.delete(id);
        }
        return effective;
    }
    // [{id, value, keys: []}]
    toLiteral() {
        const result = [];
        for (const [id, { value, keys }] of this.items.entries()) {
            result.push({ id, value, keys: [...keys] });
        }
        return result;
    }
    toList() {
        return [...this.items.values()].map(item => item.value);
    }
    has(id) {
        return this.items.has(id);
    }
    getKeys(id) {
        const item = this.items.get(id);
        return item ? [...item.keys] : [];
    }
    getValue(id) {
        const item = this.items.get(id);
        return item ? item.value : null;
    }
    get size() {
        return this.items.size;
    }
}
//# sourceMappingURL=crdt-collection-model.js.map

/***/ }),

/***/ "./runtime/ts-build/symbols.js":
/*!*************************************!*\
  !*** ./runtime/ts-build/symbols.js ***!
  \*************************************/
/*! exports provided: Symbols */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Symbols", function() { return Symbols; });
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
// tslint:disable-next-line: variable-name
const Symbols = { identifier: Symbol('id') };
//# sourceMappingURL=symbols.js.map

/***/ }),

/***/ "./runtime/ts-build/tuple-fields.js":
/*!******************************************!*\
  !*** ./runtime/ts-build/tuple-fields.js ***!
  \******************************************/
/*! exports provided: TupleFields */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TupleFields", function() { return TupleFields; });
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

class TupleFields {
    constructor(fieldList) {
        this.fieldList = fieldList;
    }
    static fromLiteral(literal) {
        return new TupleFields(literal.map(a => _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(a)));
    }
    toLiteral() {
        return this.fieldList.map(a => a.toLiteral());
    }
    clone() {
        return new TupleFields(this.fieldList.map(a => a.clone({})));
    }
    equals(other) {
        if (this.fieldList.length !== other.fieldList.length) {
            return false;
        }
        for (let i = 0; i < this.fieldList.length; i++) {
            if (!this.fieldList[i].equals(other.fieldList[i])) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=tuple-fields.js.map

/***/ }),

/***/ "./runtime/ts-build/type.js":
/*!**********************************!*\
  !*** ./runtime/ts-build/type.js ***!
  \**********************************/
/*! exports provided: Type */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Type", function() { return Type; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _shape_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shape.js */ "./runtime/ts-build/shape.js");
/* harmony import */ var _schema_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./schema.js */ "./runtime/ts-build/schema.js");
/* harmony import */ var _type_variable_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../type-variable.js */ "./runtime/type-variable.js");
/* harmony import */ var _tuple_fields_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./tuple-fields.js */ "./runtime/ts-build/tuple-fields.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../recipe/type-checker.js */ "./runtime/recipe/type-checker.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

function addType(name, arg) {
    const lowerName = name[0].toLowerCase() + name.substring(1);
    const upperArg = arg ? arg[0].toUpperCase() + arg.substring(1) : '';
    Object.defineProperty(Type.prototype, `${lowerName}${upperArg}`, {
        get() {
            if (!this[`is${name}`]) {
                Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this[`is${name}`], `{${this.tag}, ${this.data}} is not of type ${name}`);
            }
            return this.data;
        }
    });
    Object.defineProperty(Type.prototype, `is${name}`, {
        get() {
            return this.tag === name;
        }
    });
}
class Type {
    constructor(tag, data) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(typeof tag === 'string');
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(data);
        if (tag === 'Entity') {
            Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(data instanceof _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"]);
        }
        if (tag === 'Collection' || tag === 'BigCollection') {
            if (!(data instanceof Type) && data.tag && data.data) {
                data = new Type(data.tag, data.data);
            }
        }
        if (tag === 'Variable') {
            if (!(data instanceof _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"])) {
                data = new _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"](data.name, data.constraint);
            }
        }
        this.tag = tag;
        this.data = data;
    }
    static newEntity(entity) {
        return new Type('Entity', entity);
    }
    static newVariable(variable) {
        return new Type('Variable', variable);
    }
    static newCollection(collection) {
        return new Type('Collection', collection);
    }
    static newBigCollection(bigCollection) {
        return new Type('BigCollection', bigCollection);
    }
    static newRelation(relation) {
        return new Type('Relation', relation);
    }
    static newInterface(iface) {
        return new Type('Interface', iface);
    }
    static newSlot(slot) {
        return new Type('Slot', slot);
    }
    static newReference(reference) {
        return new Type('Reference', reference);
    }
    // Provided only to get a Type object for SyntheticStorage; do not use otherwise.
    static newSynthesized() {
        return new Type('Synthesized', 1);
    }
    mergeTypeVariablesByName(variableMap) {
        if (this.isVariable) {
            const name = this.variable.name;
            let variable = variableMap.get(name);
            if (!variable) {
                variable = this;
                variableMap.set(name, this);
            }
            else {
                if (variable.variable.hasConstraint || this.variable.hasConstraint) {
                    const mergedConstraint = variable.variable.maybeMergeConstraints(this.variable);
                    if (!mergedConstraint) {
                        throw new Error('could not merge type variables');
                    }
                }
            }
            return variable;
        }
        if (this.isCollection) {
            const primitiveType = this.collectionType;
            const result = primitiveType.mergeTypeVariablesByName(variableMap);
            return (result === primitiveType) ? this : result.collectionOf();
        }
        if (this.isBigCollection) {
            const primitiveType = this.bigCollectionType;
            const result = primitiveType.mergeTypeVariablesByName(variableMap);
            return (result === primitiveType) ? this : result.bigCollectionOf();
        }
        if (this.isInterface) {
            const shape = this.interfaceShape.clone(new Map());
            shape.mergeTypeVariablesByName(variableMap);
            // TODO: only build a new type when a variable is modified
            return Type.newInterface(shape);
        }
        return this;
    }
    static unwrapPair(type1, type2) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(type1 instanceof Type);
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(type2 instanceof Type);
        if (type1.isCollection && type2.isCollection) {
            return Type.unwrapPair(type1.collectionType, type2.collectionType);
        }
        if (type1.isBigCollection && type2.isBigCollection) {
            return Type.unwrapPair(type1.bigCollectionType, type2.bigCollectionType);
        }
        if (type1.isReference && type2.isReference) {
            return Type.unwrapPair(type1.referenceReferredType, type2.referenceReferredType);
        }
        return [type1, type2];
    }
    // TODO: update call sites to use the type checker instead (since they will
    // have additional information about direction etc.)
    equals(type) {
        return _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_5__["TypeChecker"].compareTypes({ type: this }, { type });
    }
    _applyExistenceTypeTest(test) {
        if (this.isCollection) {
            return this.collectionType._applyExistenceTypeTest(test);
        }
        if (this.isBigCollection) {
            return this.bigCollectionType._applyExistenceTypeTest(test);
        }
        if (this.isInterface) {
            return this.interfaceShape._applyExistenceTypeTest(test);
        }
        return test(this);
    }
    get hasVariable() {
        return this._applyExistenceTypeTest(type => type.isVariable);
    }
    get hasUnresolvedVariable() {
        return this._applyExistenceTypeTest(type => type.isVariable && !type.variable.isResolved());
    }
    get hasVariableReference() {
        return this._applyExistenceTypeTest(type => type.isVariableReference);
    }
    // TODO: remove this in favor of a renamed collectionType
    primitiveType() {
        return this.collectionType;
    }
    getContainedType() {
        if (this.isCollection) {
            return this.collectionType;
        }
        if (this.isBigCollection) {
            return this.bigCollectionType;
        }
        if (this.isReference) {
            return this.referenceReferredType;
        }
        return null;
    }
    isTypeContainer() {
        return this.isCollection || this.isBigCollection || this.isReference;
    }
    collectionOf() {
        return Type.newCollection(this);
    }
    bigCollectionOf() {
        return Type.newBigCollection(this);
    }
    resolvedType() {
        if (this.isCollection) {
            const primitiveType = this.collectionType;
            const resolvedPrimitiveType = primitiveType.resolvedType();
            return (primitiveType !== resolvedPrimitiveType) ? resolvedPrimitiveType.collectionOf() : this;
        }
        if (this.isBigCollection) {
            const primitiveType = this.bigCollectionType;
            const resolvedPrimitiveType = primitiveType.resolvedType();
            return (primitiveType !== resolvedPrimitiveType) ? resolvedPrimitiveType.bigCollectionOf() : this;
        }
        if (this.isReference) {
            const primitiveType = this.referenceReferredType;
            const resolvedPrimitiveType = primitiveType.resolvedType();
            return (primitiveType !== resolvedPrimitiveType) ? Type.newReference(resolvedPrimitiveType) : this;
        }
        if (this.isVariable) {
            const resolution = this.variable.resolution;
            if (resolution) {
                return resolution;
            }
        }
        if (this.isInterface) {
            return Type.newInterface(this.interfaceShape.resolvedType());
        }
        return this;
    }
    isResolved() {
        // TODO: one of these should not exist.
        return !this.hasUnresolvedVariable;
    }
    canEnsureResolved() {
        if (this.isResolved()) {
            return true;
        }
        if (this.isInterface) {
            return this.interfaceShape.canEnsureResolved();
        }
        if (this.isVariable) {
            return this.variable.canEnsureResolved();
        }
        if (this.isCollection) {
            return this.collectionType.canEnsureResolved();
        }
        if (this.isBigCollection) {
            return this.bigCollectionType.canEnsureResolved();
        }
        if (this.isReference) {
            return this.referenceReferredType.canEnsureResolved();
        }
        return true;
    }
    maybeEnsureResolved() {
        if (this.isInterface) {
            return this.interfaceShape.maybeEnsureResolved();
        }
        if (this.isVariable) {
            return this.variable.maybeEnsureResolved();
        }
        if (this.isCollection) {
            return this.collectionType.maybeEnsureResolved();
        }
        if (this.isBigCollection) {
            return this.bigCollectionType.maybeEnsureResolved();
        }
        if (this.isReference) {
            return this.referenceReferredType.maybeEnsureResolved();
        }
        return true;
    }
    get canWriteSuperset() {
        if (this.isVariable) {
            return this.variable.canWriteSuperset;
        }
        if (this.isEntity || this.isSlot) {
            return this;
        }
        if (this.isInterface) {
            return Type.newInterface(this.interfaceShape.canWriteSuperset);
        }
        throw new Error(`canWriteSuperset not implemented for ${this}`);
    }
    get canReadSubset() {
        if (this.isVariable) {
            return this.variable.canReadSubset;
        }
        if (this.isEntity || this.isSlot) {
            return this;
        }
        if (this.isInterface) {
            return Type.newInterface(this.interfaceShape.canReadSubset);
        }
        if (this.isReference) {
            return this.referenceReferredType.canReadSubset;
        }
        throw new Error(`canReadSubset not implemented for ${this}`);
    }
    isMoreSpecificThan(type) {
        if (this.tag !== type.tag) {
            return false;
        }
        if (this.isEntity) {
            return this.entitySchema.isMoreSpecificThan(type.entitySchema);
        }
        if (this.isInterface) {
            return this.interfaceShape.isMoreSpecificThan(type.interfaceShape);
        }
        if (this.isSlot) {
            // TODO: formFactor checking, etc.
            return true;
        }
        throw new Error(`contains not implemented for ${this}`);
    }
    static _canMergeCanReadSubset(type1, type2) {
        if (type1.canReadSubset && type2.canReadSubset) {
            if (type1.canReadSubset.tag !== type2.canReadSubset.tag) {
                return false;
            }
            if (type1.canReadSubset.isEntity) {
                return _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].intersect(type1.canReadSubset.entitySchema, type2.canReadSubset.entitySchema) !== null;
            }
            throw new Error(`_canMergeCanReadSubset not implemented for types tagged with ${type1.canReadSubset.tag}`);
        }
        return true;
    }
    static _canMergeCanWriteSuperset(type1, type2) {
        if (type1.canWriteSuperset && type2.canWriteSuperset) {
            if (type1.canWriteSuperset.tag !== type2.canWriteSuperset.tag) {
                return false;
            }
            if (type1.canWriteSuperset.isEntity) {
                return _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].union(type1.canWriteSuperset.entitySchema, type2.canWriteSuperset.entitySchema) !== null;
            }
        }
        return true;
    }
    // Tests whether two types' constraints are compatible with each other
    static canMergeConstraints(type1, type2) {
        return Type._canMergeCanReadSubset(type1, type2) && Type._canMergeCanWriteSuperset(type1, type2);
    }
    // Clone a type object.
    // When cloning multiple types, variables that were associated with the same name
    // before cloning should still be associated after cloning. To maintain this 
    // property, create a Map() and pass it into all clone calls in the group.
    clone(variableMap) {
        const type = this.resolvedType();
        if (type.isVariable) {
            if (variableMap.has(type.variable)) {
                return new Type('Variable', variableMap.get(type.variable));
            }
            else {
                const newTypeVariable = _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"].fromLiteral(type.variable.toLiteral());
                variableMap.set(type.variable, newTypeVariable);
                return new Type('Variable', newTypeVariable);
            }
        }
        if (type.data.clone) {
            return new Type(type.tag, type.data.clone(variableMap));
        }
        return Type.fromLiteral(type.toLiteral());
    }
    // Clone a type object, maintaining resolution information.
    // This function SHOULD NOT BE USED at the type level. In order for type variable
    // information to be maintained correctly, an entire context root needs to be
    // cloned.
    _cloneWithResolutions(variableMap) {
        if (this.isVariable) {
            if (variableMap.has(this.variable)) {
                return new Type('Variable', variableMap.get(this.variable));
            }
            else {
                const newTypeVariable = _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"].fromLiteral(this.variable.toLiteralIgnoringResolutions());
                if (this.variable.resolution) {
                    newTypeVariable.resolution = this.variable.resolution._cloneWithResolutions(variableMap);
                }
                if (this.variable._canReadSubset) {
                    newTypeVariable.canReadSubset = this.variable.canReadSubset._cloneWithResolutions(variableMap);
                }
                if (this.variable._canWriteSuperset) {
                    newTypeVariable.canWriteSuperset = this.variable.canWriteSuperset._cloneWithResolutions(variableMap);
                }
                variableMap.set(this.variable, newTypeVariable);
                return new Type('Variable', newTypeVariable);
            }
        }
        if (this.data instanceof _shape_js__WEBPACK_IMPORTED_MODULE_1__["Shape"] || this.data instanceof Type) {
            return new Type(this.tag, this.data._cloneWithResolutions(variableMap));
        }
        return Type.fromLiteral(this.toLiteral());
    }
    toLiteral() {
        if (this.isVariable && this.variable.resolution) {
            return this.variable.resolution.toLiteral();
        }
        if (this.data instanceof Type || this.data instanceof _shape_js__WEBPACK_IMPORTED_MODULE_1__["Shape"] || this.data instanceof _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"] ||
            this.data instanceof _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"]) {
            return { tag: this.tag, data: this.data.toLiteral() };
        }
        return this;
    }
    static _deliteralizer(tag) {
        switch (tag) {
            case 'Interface':
                return _shape_js__WEBPACK_IMPORTED_MODULE_1__["Shape"].fromLiteral;
            case 'Entity':
                return _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].fromLiteral;
            case 'Collection':
            case 'BigCollection':
                return Type.fromLiteral;
            case 'Tuple':
                return _tuple_fields_js__WEBPACK_IMPORTED_MODULE_4__["TupleFields"].fromLiteral;
            case 'Variable':
                return _type_variable_js__WEBPACK_IMPORTED_MODULE_3__["TypeVariable"].fromLiteral;
            case 'Reference':
                return Type.fromLiteral;
            default:
                return a => a;
        }
    }
    static fromLiteral(literal) {
        if (literal.tag === 'SetView') {
            // TODO: SetView is deprecated, remove when possible.
            literal.tag = 'Collection';
        }
        return new Type(literal.tag, Type._deliteralizer(literal.tag)(literal.data));
    }
    // TODO: is this the same as _applyExistenceTypeTest
    hasProperty(property) {
        if (property(this)) {
            return true;
        }
        if (this.isCollection) {
            return this.collectionType.hasProperty(property);
        }
        if (this.isBigCollection) {
            return this.bigCollectionType.hasProperty(property);
        }
        return false;
    }
    toString(options = undefined) {
        if (this.isCollection) {
            return `[${this.collectionType.toString(options)}]`;
        }
        if (this.isBigCollection) {
            return `BigCollection<${this.bigCollectionType.toString(options)}>`;
        }
        if (this.isEntity) {
            return this.entitySchema.toInlineSchemaString(options);
        }
        if (this.isInterface) {
            return this.interfaceShape.name;
        }
        if (this.isVariable) {
            return `~${this.variable.name}`;
        }
        if (this.isSlot) {
            return 'Slot';
        }
        if (this.isReference) {
            return 'Reference<' + this.referenceReferredType.toString() + '>';
        }
        throw new Error(`Add support to serializing type: ${JSON.stringify(this)}`);
    }
    getEntitySchema() {
        if (this.isCollection) {
            return this.collectionType.getEntitySchema();
        }
        if (this.isBigCollection) {
            return this.bigCollectionType.getEntitySchema();
        }
        if (this.isEntity) {
            return this.entitySchema;
        }
        if (this.isVariable) {
            if (this.variable.isResolved()) {
                return this.resolvedType().getEntitySchema();
            }
        }
    }
    toPrettyString() {
        // Try extract the description from schema spec.
        const entitySchema = this.getEntitySchema();
        if (entitySchema) {
            if (this.isTypeContainer() && entitySchema.description.plural) {
                return entitySchema.description.plural;
            }
            if (this.isEntity && entitySchema.description.pattern) {
                return entitySchema.description.pattern;
            }
        }
        if (this.isRelation) {
            return JSON.stringify(this.data);
        }
        if (this.isCollection) {
            return `${this.collectionType.toPrettyString()} List`;
        }
        if (this.isBigCollection) {
            return `Collection of ${this.bigCollectionType.toPrettyString()}`;
        }
        if (this.isVariable) {
            return this.variable.isResolved() ? this.resolvedType().toPrettyString() : `[~${this.variable.name}]`;
        }
        if (this.isEntity) {
            // Spit MyTypeFOO to My Type FOO
            if (this.entitySchema.name) {
                return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, '$1 $2').replace(/([A-Z][^A-Z])/g, ' $1').replace(/[\s]+/g, ' ').trim();
            }
            return JSON.stringify(this.entitySchema.toLiteral());
        }
        if (this.isInterface) {
            return this.interfaceShape.toPrettyString();
        }
    }
}
addType('Entity', 'schema');
addType('Variable');
addType('Collection', 'type');
addType('BigCollection', 'type');
addType('Relation', 'entities');
addType('Interface', 'shape');
addType('Slot');
addType('Reference', 'referredType');
// Special case for SyntheticStorage, not a real Type in the usual sense.
addType('Synthesized');





//# sourceMappingURL=type.js.map

/***/ }),

/***/ "./runtime/type-variable.js":
/*!**********************************!*\
  !*** ./runtime/type-variable.js ***!
  \**********************************/
/*! exports provided: TypeVariable */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TypeVariable", function() { return TypeVariable; });
/* harmony import */ var _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ts-build/type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _ts_build_schema_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ts-build/schema.js */ "./runtime/ts-build/schema.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt






class TypeVariable {
  constructor(name, canWriteSuperset, canReadSubset) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(typeof name == 'string');
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(canWriteSuperset == null || canWriteSuperset instanceof _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"]);
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(canReadSubset == null || canReadSubset instanceof _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"]);
    this.name = name;
    this._canWriteSuperset = canWriteSuperset;
    this._canReadSubset = canReadSubset;
    this._resolution = null;
  }

  // Merge both the read subset (upper bound) and write superset (lower bound) constraints
  // of two variables together. Use this when two separate type variables need to resolve
  // to the same value.
  maybeMergeConstraints(variable) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(variable instanceof TypeVariable);

    if (!this.maybeMergeCanReadSubset(variable.canReadSubset)) {
      return false;
    }
    return this.maybeMergeCanWriteSuperset(variable.canWriteSuperset);
  }

  // merge a type variable's read subset (upper bound) constraints into this variable.
  // This is used to accumulate read constraints when resolving a handle's type.
  maybeMergeCanReadSubset(constraint) {
    if (constraint == null) {
      return true;
    }

    if (this.canReadSubset == null) {
      this.canReadSubset = constraint;
      return true;
    }

    if (this.canReadSubset.isSlot && constraint.isSlot) {
      // TODO: formFactor compatibility, etc.
      return true;
    }

    let mergedSchema = _ts_build_schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
    if (!mergedSchema) {
      return false;
    }

    this.canReadSubset = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newEntity(mergedSchema);
    return true;
  }

  // merge a type variable's write superset (lower bound) constraints into this variable.
  // This is used to accumulate write constraints when resolving a handle's type.
  maybeMergeCanWriteSuperset(constraint) {
    if (constraint == null) {
      return true;
    }

    if (this.canWriteSuperset == null) {
      this.canWriteSuperset = constraint;
      return true;
    }

    if (this.canWriteSuperset.isSlot && constraint.isSlot) {
      // TODO: formFactor compatibility, etc.
      return true;
    }

    let mergedSchema = _ts_build_schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].union(this.canWriteSuperset.entitySchema, constraint.entitySchema);
    if (!mergedSchema) {
      return false;
    }

    this.canWriteSuperset = _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newEntity(mergedSchema);
    return true;
  }

  isSatisfiedBy(type) {
    let constraint = this._canWriteSuperset;
    if (!constraint) {
      return true;
    }
    if (!constraint.isEntity || !type.isEntity) {
      throw new Error(`constraint checking not implemented for ${this} and ${type}`);
    }
    return type.entitySchema.isMoreSpecificThan(constraint.entitySchema);
  }

  get resolution() {
    if (this._resolution) {
      return this._resolution.resolvedType();
    }
    return null;
  }

  set resolution(value) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(value instanceof _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"]);
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._resolution);
    let elementType = value.resolvedType().getContainedType();
    if (elementType !== null && elementType.isVariable) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(elementType.variable != this, 'variable cannot resolve to collection of itself');
    }

    let probe = value;
    while (probe) {
      if (!probe.isVariable) {
        break;
      }
      if (probe.variable == this) {
        return;
      }
      probe = probe.variable.resolution;
    }

    this._resolution = value;
    this._canWriteSuperset = null;
    this._canReadSubset = null;
  }

  get canWriteSuperset() {
    if (this._resolution) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._canWriteSuperset);
      if (this._resolution.isVariable) {
        return this._resolution.variable.canWriteSuperset;
      }
      return null;
    }
    return this._canWriteSuperset;
  }

  set canWriteSuperset(value) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._resolution);
    this._canWriteSuperset = value;
  }

  get canReadSubset() {
    if (this._resolution) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._canReadSubset);
      if (this._resolution.isVariable) {
        return this._resolution.variable.canReadSubset;
      }
      return null;
    }
    return this._canReadSubset;
  }

  set canReadSubset(value) {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._resolution);
    this._canReadSubset = value;
  }

  get hasConstraint() {
    return this._canReadSubset !== null || this._canWriteSuperset !== null;
  }

  canEnsureResolved() {
    if (this._resolution) {
      return this._resolution.canEnsureResolved();
    }
    if (this._canWriteSuperset || this._canReadSubset) {
      return true;
    }
    return false;
  }

  maybeEnsureResolved() {
    if (this._resolution) {
      return this._resolution.maybeEnsureResolved();
    }
    if (this._canWriteSuperset) {
      this.resolution = this._canWriteSuperset;
      return true;
    }
    if (this._canReadSubset) {
      this.resolution = this._canReadSubset;
      return true;
    }
    return false;
  }

  toLiteral() {
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(this.resolution == null);
    return this.toLiteralIgnoringResolutions();
  }

  toLiteralIgnoringResolutions() {
    return {
      name: this.name,
      canWriteSuperset: this._canWriteSuperset && this._canWriteSuperset.toLiteral(),
      canReadSubset: this._canReadSubset && this._canReadSubset.toLiteral()
    };
  }

  static fromLiteral(data) {
    return new TypeVariable(
        data.name,
        data.canWriteSuperset ? _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(data.canWriteSuperset) : null,
        data.canReadSubset ? _ts_build_type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(data.canReadSubset) : null);
  }

  isResolved() {
    return (this._resolution && this._resolution.isResolved());
  }
}


/***/ }),

/***/ "./shell/components/xen/xen-state.js":
/*!*******************************************!*\
  !*** ./shell/components/xen/xen-state.js ***!
  \*******************************************/
/*! exports provided: XenStateMixin, nob, debounce */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "XenStateMixin", function() { return XenStateMixin; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "nob", function() { return nob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "debounce", function() { return debounce; });
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const nob = () => Object.create(null);

const debounce = (key, action, delay) => {
  if (key) {
    clearTimeout(key);
  }
  if (action && delay) {
    return setTimeout(action, delay);
  }
};

const XenStateMixin = Base => class extends Base {
  constructor() {
    super();
    this._pendingProps = nob();
    this._props = this._getInitialProps() || nob();
    this._lastProps = nob();
    this._state = this._getInitialState() || nob();
    this._lastState = nob();
  }
  _getInitialProps() {
  }
  _getInitialState() {
  }
  _getProperty(name) {
    return this._pendingProps[name] || this._props[name];
  }
  _setProperty(name, value) {
    // dirty checking opportunity
    if (this._validator || this._wouldChangeProp(name, value)) {
      this._pendingProps[name] = value;
      this._invalidateProps();
    }
  }
  _wouldChangeValue(map, name, value) {
    // TODO(sjmiles): fundamental dirty-checking issue here. Can be overridden to change
    // behavior, but the default implementation will use strict reference checking.
    // To modify structured values one must create a new Object with the new values.
    // See `_setImmutableState`.
    return (map[name] !== value);
    // TODO(sjmiles): an example of dirty-checking that instead simply punts on structured data
    //return (typeof value === 'object') || (map[name] !== value);
  }
  _wouldChangeProp(name, value) {
    return this._wouldChangeValue(this._props, name, value);
  }
  _wouldChangeState(name, value) {
    return this._wouldChangeValue(this._state, name, value);
  }
  _setProps(props) {
    // TODO(sjmiles): should be a replace instead of a merge?
    Object.assign(this._pendingProps, props);
    this._invalidateProps();
  }
  _invalidateProps() {
    this._propsInvalid = true;
    this._invalidate();
  }
  _setImmutableState(name, value) {
    if (typeof name === 'object') {
      console.warn('Xen:: _setImmutableState takes name and value args for a single property, dictionaries not supported.');
      value = Object.values(name)[0];
      name = Object.names(name)[0];
    }
    if (typeof value === 'object') {
      value = Object.assign(Object.create(null), value);
    }
    this._state[name] = value;
    this._invalidate();
  }
  _setState(object) {
    let dirty = false;
    const state = this._state;
    for (const property in object) {
      const value = object[property];
      if (this._wouldChangeState(property, value)) {
        dirty = true;
        state[property] = value;
      }
    }
    if (dirty) {
      this._invalidate();
      return true;
    }
  }
  // TODO(sjmiles): deprecated
  _setIfDirty(object) {
    return this._setState(object);
  }
  _async(fn) {
    return Promise.resolve().then(fn.bind(this));
    //return setTimeout(fn.bind(this), 10);
  }
  _invalidate() {
    if (!this._validator) {
      this._validator = this._async(this._validate);
    }
  }
  _getStateArgs() {
    return [this._props, this._state, this._lastProps, this._lastState];
  }
  _validate() {
    const stateArgs = this._getStateArgs();
    // try..catch to ensure we nullify `validator` before return
    try {
      // TODO(sjmiles): should be a replace instead of a merge
      Object.assign(this._props, this._pendingProps);
      if (this._propsInvalid) {
        // TODO(sjmiles): should/can have different timing from rendering?
        this._willReceiveProps(...stateArgs);
        this._propsInvalid = false;
      }
      if (this._shouldUpdate(...stateArgs)) {
        // TODO(sjmiles): consider throttling update to rAF
        this._ensureMount();
        this._doUpdate(...stateArgs);
      }
    } catch (x) {
      console.error(x);
    }
    // nullify validator _after_ methods so state changes don't reschedule validation
    this._validator = null;
    // save the old props and state
    this._lastProps = Object.assign(nob(), this._props);
    this._lastState = Object.assign(nob(), this._state);
  }
  _doUpdate(...stateArgs) {
    this._update(...stateArgs);
    this._didUpdate(...stateArgs);
  }
  _ensureMount() {
  }
  _willReceiveProps() {
  }
  _shouldUpdate() {
    return true;
  }
  _update() {
  }
  _didUpdate() {
  }
  _debounce(key, func, delay) {
    key = `_debounce_${key}`;
    this._state[key] = debounce(this._state[key], func, delay != null ? delay : 16);
  }
};




/***/ }),

/***/ "./shell/source/browser-loader.js":
/*!****************************************!*\
  !*** ./shell/source/browser-loader.js ***!
  \****************************************/
/*! exports provided: BrowserLoader */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BrowserLoader", function() { return BrowserLoader; });
/* harmony import */ var _runtime_loader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../runtime/loader.js */ "./runtime/loader.js");
/* harmony import */ var _runtime_particle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../runtime/particle.js */ "./runtime/particle.js");
/* harmony import */ var _runtime_dom_particle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../runtime/dom-particle.js */ "./runtime/dom-particle.js");
/* harmony import */ var _runtime_multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../runtime/multiplexer-dom-particle.js */ "./runtime/multiplexer-dom-particle.js");
/* harmony import */ var _runtime_transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../runtime/transformation-dom-particle.js */ "./runtime/transformation-dom-particle.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */







const logFactory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble} [Particle]`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 4px;`);
const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();

const dumbCache = {};

class BrowserLoader extends _runtime_loader_js__WEBPACK_IMPORTED_MODULE_0__["Loader"] {
  constructor(urlMap) {
    super();
    this._urlMap = urlMap;
  }
  _loadURL(url) {
    const resolved = this._resolve(url);
    // use URL to normalize the path for deduping
    const cacheKey = new URL(resolved, document.URL).href;
    // console.log(`browser-loader::_loadURL`);
    // console.log(`    ${url}`);
    // console.log(`    ${resolved}`);
    // console.log(`    ${cacheKey}`);
    const resource = dumbCache[cacheKey];
    return resource || (dumbCache[cacheKey] = super._loadURL(resolved));
  }
  loadResource(name) {
    // subclass impl differentiates paths and URLs,
    // for browser env we can feed both kinds into _loadURL
    return this._loadURL(name);
  }
  _resolve(path) {
    //return new URL(path, this._base).href;
    let url = this._urlMap[path];
    if (!url && path) {
      // TODO(sjmiles): inefficient!
      let macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) == k);
      if (macro) {
        url = this._urlMap[macro] + path.slice(macro.length);
      }
    }
    url = url || path;
    //console.log(`browser-loader: resolve(${path}) = ${url}`);
    return url;
  }
  requireParticle(fileName) {
    const path = this._resolve(fileName);
    // inject path to this particle into the UrlMap,
    // allows "foo.js" particle to invoke `importScripts(resolver('foo/othermodule.js'))`
    this.mapParticleUrl(path);
    const result = [];
    self.defineParticle = function(particleWrapper) {
      result.push(particleWrapper);
    };
    importScripts(path);
    delete self.defineParticle;
    const logger = logFactory(fileName.split('/').pop(), '#1faa00');
    return this.unwrapParticle(result[0], logger);
  }
  mapParticleUrl(path) {
    let parts = path.split('/');
    let suffix = parts.pop();
    let folder = parts.join('/');
    let name = suffix.split('.').shift();
    this._urlMap[name] = folder;
  }
  unwrapParticle(particleWrapper, log) {
    // TODO(sjmiles): regarding `resolver`:
    //  _resolve method allows particles to request remapping of assets paths
    //  for use in DOM
    let resolver = this._resolve.bind(this);
    // TODO(sjmiles): hack to plumb `fetch` into Particle space under node
    const _fetch = BrowserLoader.fetch || fetch;
    return particleWrapper({
      Particle: _runtime_particle_js__WEBPACK_IMPORTED_MODULE_1__["Particle"],
      DomParticle: _runtime_dom_particle_js__WEBPACK_IMPORTED_MODULE_2__["DomParticle"],
      MultiplexerDomParticle: _runtime_multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_3__["MultiplexerDomParticle"],
      SimpleParticle: _runtime_dom_particle_js__WEBPACK_IMPORTED_MODULE_2__["DomParticle"],
      TransformationDomParticle: _runtime_transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_4__["TransformationDomParticle"],
      resolver,
      log,
      html,
      _fetch
    });
  }
}


/***/ }),

/***/ "./shell/source/worker-entry.js":
/*!**************************************!*\
  !*** ./shell/source/worker-entry.js ***!
  \**************************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _runtime_particle_execution_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../runtime/particle-execution-context.js */ "./runtime/particle-execution-context.js");
/* harmony import */ var _browser_loader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./browser-loader.js */ "./shell/source/browser-loader.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt




const log = console.log.bind(console, `%cworker-entry`, `background: #12005e; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);

self.onmessage = function(e) {
  self.onmessage = null;
  let {id, base} = e.data;
  //log('starting worker', id);
  new _runtime_particle_execution_context_js__WEBPACK_IMPORTED_MODULE_0__["ParticleExecutionContext"](e.ports[0], id, new _browser_loader_js__WEBPACK_IMPORTED_MODULE_1__["BrowserLoader"](base));
};


/***/ }),

/***/ "./tracelib/trace.js":
/*!***************************!*\
  !*** ./tracelib/trace.js ***!
  \***************************/
/*! exports provided: Tracing */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(process) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Tracing", function() { return Tracing; });
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
    return performance.now() * 1000;
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
  if (!info) {
    return {};
  }
  if (typeof info == 'function') {
    return parseInfo(info());
  }
  if (info.toTraceInfo) {
    return parseInfo(info.toTraceInfo());
  }
  return info;
}

let streamingCallbacks = [];
function pushEvent(event) {
    event.pid = pid;
    event.tid = 0;
    if (!event.args) {
      delete event.args;
    }
    if (!event.ov) {
      delete event.ov;
    }
    if (!event.cat) {
      event.cat = '';
    }
    events.push(event);
    Promise.resolve().then(() => {
      for (let {callback, predicate} of streamingCallbacks) {
          if (!predicate || predicate(event)) callback(event);
      }
    });
}

let module = {exports: {}};
const Tracing = module.exports;
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
    wait: async function(v) {
      return v;
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
    addArgs: function() {
    },
    endWith: async function(v) {
      return v;
    },
  };
  module.exports.wrap = function(info, fn) {
    return fn;
  };
  module.exports.start = function(info, fn) {
    return result;
  };
  module.exports.flow = function(info, fn) {
    return result;
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

  function startSyncTrace(info) {
    info = parseInfo(info);
    let args = info.args;
    let begin = now();
    return {
      addArgs: function(extraArgs) {
        args = Object.assign(args || {}, extraArgs);
      },
      end: function(endInfo = {}, flow) {
        endInfo = parseInfo(endInfo);
        if (endInfo.args) {
          args = Object.assign(args || {}, endInfo.args);
        }
        endInfo = Object.assign({}, info, endInfo);
        this.endTs = now();
        pushEvent({
          ph: 'X',
          ts: begin,
          dur: this.endTs - begin,
          cat: endInfo.cat,
          name: endInfo.name,
          ov: endInfo.overview,
          args: args,
          // Arcs Devtools Specific:
          flowId: flow && flow.id(),
          seq: endInfo.sequence
        });
      },
      beginTs: begin
    };
  }
  module.exports.start = function(info) {
    let trace = startSyncTrace(info);
    let flow;
    let baseInfo = {cat: info.cat, name: info.name + ' (async)', overview: info.overview, sequence: info.sequence};
    return {
      async wait(v, info) {
        let flowExisted = !!flow;
        if (!flowExisted) {
          flow = module.exports.flow(baseInfo);
        }
        trace.end(info, flow);
        if (flowExisted) {
          flow.step(Object.assign({ts: trace.beginTs}, baseInfo));
        } else {
          flow.start({ts: trace.endTs});
        }
        trace = null;
        try {
          return await v;
        } finally {
          trace = startSyncTrace(baseInfo);
        }
      },
      addArgs(extraArgs) {
        trace.addArgs(extraArgs);
      },
      end(endInfo) {
        trace.end(endInfo, flow);
        if (flow) {
          flow.end({ts: trace.beginTs});
        }
      },
      async endWith(v, endInfo) {
        if (Promise.resolve(v) === v) { // If v is a promise.
          v = this.wait(v);
          try {
            return await v;
          } finally {
            this.end(endInfo);
          }
        } else { // If v is not a promise.
          this.end(endInfo);
          return v;
        }
      }
    };
  };
  module.exports.flow = function(info) {
    info = parseInfo(info);
    let id = flowId++;
    let started = false;
    return {
      start: function(startInfo) {
        let ts = (startInfo && startInfo.ts) || now();
        started = true;
        pushEvent({
          ph: 's',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: info.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      end: function(endInfo) {
        if (!started) return;
        let ts = (endInfo && endInfo.ts) || now();
        endInfo = parseInfo(endInfo);
        pushEvent({
          ph: 'f',
          bp: 'e', // binding point is enclosing slice.
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: endInfo && endInfo.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      step: function(stepInfo) {
        if (!started) return;
        let ts = (stepInfo && stepInfo.ts) || now();
        stepInfo = parseInfo(stepInfo);
        pushEvent({
          ph: 't',
          ts,
          cat: info.cat,
          name: info.name,
          ov: info.overview,
          args: stepInfo && stepInfo.args,
          id: id,
          seq: info.sequence
        });
        return this;
      },
      id: () => id
    };
  };
  module.exports.save = function() {
    return {traceEvents: events};
  };
  module.exports.download = function() {
    let a = document.createElement('a');
    a.download = 'trace.json';
    a.href = 'data:text/plain;base64,' + btoa(JSON.stringify(module.exports.save()));
    a.click();
  };
  module.exports.now = now;
  module.exports.stream = function(callback, predicate) {
    streamingCallbacks.push({callback, predicate});
  };
  module.exports.__clearForTests = function() {
    events.length = 0;
    streamingCallbacks.length = 0;
  };
}

init();

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/process/browser.js */ "./node_modules/process/browser.js")))

/***/ })

/******/ });
//# sourceMappingURL=worker-entry.js.map