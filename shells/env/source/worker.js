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
const root = typeof window === 'object' ? window : global;

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

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/array-set.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/array-set.js ***!
  \***************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = __webpack_require__(/*! ./util */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/util.js");
var has = Object.prototype.hasOwnProperty;

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
function ArraySet() {
  this._array = [];
  this._set = Object.create(null);
}

/**
 * Static method for creating ArraySet instances from an existing array.
 */
ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
  var set = new ArraySet();
  for (var i = 0, len = aArray.length; i < len; i++) {
    set.add(aArray[i], aAllowDuplicates);
  }
  return set;
};

/**
 * Return how many unique items are in this ArraySet. If duplicates have been
 * added, than those do not count towards the size.
 *
 * @returns Number
 */
ArraySet.prototype.size = function ArraySet_size() {
  return Object.getOwnPropertyNames(this._set).length;
};

/**
 * Add the given string to this set.
 *
 * @param String aStr
 */
ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
  var sStr = util.toSetString(aStr);
  var isDuplicate = has.call(this._set, sStr);
  var idx = this._array.length;
  if (!isDuplicate || aAllowDuplicates) {
    this._array.push(aStr);
  }
  if (!isDuplicate) {
    this._set[sStr] = idx;
  }
};

/**
 * Is the given string a member of this set?
 *
 * @param String aStr
 */
ArraySet.prototype.has = function ArraySet_has(aStr) {
  var sStr = util.toSetString(aStr);
  return has.call(this._set, sStr);
};

/**
 * What is the index of the given string in the array?
 *
 * @param String aStr
 */
ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
  var sStr = util.toSetString(aStr);
  if (has.call(this._set, sStr)) {
    return this._set[sStr];
  }
  throw new Error('"' + aStr + '" is not in the set.');
};

/**
 * What is the element at the given index?
 *
 * @param Number aIdx
 */
ArraySet.prototype.at = function ArraySet_at(aIdx) {
  if (aIdx >= 0 && aIdx < this._array.length) {
    return this._array[aIdx];
  }
  throw new Error('No element indexed by ' + aIdx);
};

/**
 * Returns the array representation of this set (which has the proper indices
 * indicated by indexOf). Note that this is a copy of the internal array used
 * for storing the members so that no one can mess with internal state.
 */
ArraySet.prototype.toArray = function ArraySet_toArray() {
  return this._array.slice();
};

exports.ArraySet = ArraySet;


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64-vlq.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64-vlq.js ***!
  \****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var base64 = __webpack_require__(/*! ./base64 */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64.js");

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

var VLQ_BASE_SHIFT = 5;

// binary: 100000
var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
var VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
var VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0
    ? ((-aValue) << 1) + 1
    : (aValue << 1) + 0;
}

/**
 * Converts to a two-complement value from a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
 *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
 */
function fromVLQSigned(aValue) {
  var isNegative = (aValue & 1) === 1;
  var shifted = aValue >> 1;
  return isNegative
    ? -shifted
    : shifted;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
exports.encode = function base64VLQ_encode(aValue) {
  var encoded = "";
  var digit;

  var vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += base64.encode(digit);
  } while (vlq > 0);

  return encoded;
};

/**
 * Decodes the next base 64 VLQ value from the given string and returns the
 * value and the rest of the string via the out parameter.
 */
exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
  var strLen = aStr.length;
  var result = 0;
  var shift = 0;
  var continuation, digit;

  do {
    if (aIndex >= strLen) {
      throw new Error("Expected more digits in base 64 VLQ value.");
    }

    digit = base64.decode(aStr.charCodeAt(aIndex++));
    if (digit === -1) {
      throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
    }

    continuation = !!(digit & VLQ_CONTINUATION_BIT);
    digit &= VLQ_BASE_MASK;
    result = result + (digit << shift);
    shift += VLQ_BASE_SHIFT;
  } while (continuation);

  aOutParam.value = fromVLQSigned(result);
  aOutParam.rest = aIndex;
};


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64.js":
/*!************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64.js ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/**
 * Encode an integer in the range of 0 to 63 to a single base 64 digit.
 */
exports.encode = function (number) {
  if (0 <= number && number < intToCharMap.length) {
    return intToCharMap[number];
  }
  throw new TypeError("Must be between 0 and 63: " + number);
};

/**
 * Decode a single base 64 character code digit to an integer. Returns -1 on
 * failure.
 */
exports.decode = function (charCode) {
  var bigA = 65;     // 'A'
  var bigZ = 90;     // 'Z'

  var littleA = 97;  // 'a'
  var littleZ = 122; // 'z'

  var zero = 48;     // '0'
  var nine = 57;     // '9'

  var plus = 43;     // '+'
  var slash = 47;    // '/'

  var littleOffset = 26;
  var numberOffset = 52;

  // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
  if (bigA <= charCode && charCode <= bigZ) {
    return (charCode - bigA);
  }

  // 26 - 51: abcdefghijklmnopqrstuvwxyz
  if (littleA <= charCode && charCode <= littleZ) {
    return (charCode - littleA + littleOffset);
  }

  // 52 - 61: 0123456789
  if (zero <= charCode && charCode <= nine) {
    return (charCode - zero + numberOffset);
  }

  // 62: +
  if (charCode == plus) {
    return 62;
  }

  // 63: /
  if (charCode == slash) {
    return 63;
  }

  // Invalid base64 digit.
  return -1;
};


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/binary-search.js":
/*!*******************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/binary-search.js ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.GREATEST_LOWER_BOUND = 1;
exports.LEAST_UPPER_BOUND = 2;

/**
 * Recursive implementation of binary search.
 *
 * @param aLow Indices here and lower do not contain the needle.
 * @param aHigh Indices here and higher do not contain the needle.
 * @param aNeedle The element being searched for.
 * @param aHaystack The non-empty array being searched.
 * @param aCompare Function which takes two elements and returns -1, 0, or 1.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 */
function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
  // This function terminates when one of the following is true:
  //
  //   1. We find the exact element we are looking for.
  //
  //   2. We did not find the exact element, but we can return the index of
  //      the next-closest element.
  //
  //   3. We did not find the exact element, and there is no next-closest
  //      element than the one we are searching for, so we return -1.
  var mid = Math.floor((aHigh - aLow) / 2) + aLow;
  var cmp = aCompare(aNeedle, aHaystack[mid], true);
  if (cmp === 0) {
    // Found the element we are looking for.
    return mid;
  }
  else if (cmp > 0) {
    // Our needle is greater than aHaystack[mid].
    if (aHigh - mid > 1) {
      // The element is in the upper half.
      return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
    }

    // The exact needle element was not found in this haystack. Determine if
    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return aHigh < aHaystack.length ? aHigh : -1;
    } else {
      return mid;
    }
  }
  else {
    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    } else {
      return aLow < 0 ? -1 : aLow;
    }
  }
}

/**
 * This is an implementation of binary search which will always try and return
 * the index of the closest element if there is no exact hit. This is because
 * mappings between original and generated line/col pairs are single points,
 * and there is an implicit region between each of them, so a miss just means
 * that you aren't on the very start of a region.
 *
 * @param aNeedle The element you are looking for.
 * @param aHaystack The array that is being searched.
 * @param aCompare A function which takes the needle and an element in the
 *     array and returns -1, 0, or 1 depending on whether the needle is less
 *     than, equal to, or greater than the element, respectively.
 * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
 *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
 */
exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
  if (aHaystack.length === 0) {
    return -1;
  }

  var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                              aCompare, aBias || exports.GREATEST_LOWER_BOUND);
  if (index < 0) {
    return -1;
  }

  // We have found either the exact element, or the next-closest element than
  // the one we are searching for. However, there may be more than one such
  // element. Make sure we always return the smallest of these.
  while (index - 1 >= 0) {
    if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
      break;
    }
    --index;
  }

  return index;
};


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/quick-sort.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/quick-sort.js ***!
  \****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

// It turns out that some (most?) JavaScript engines don't self-host
// `Array.prototype.sort`. This makes sense because C++ will likely remain
// faster than JS when doing raw CPU-intensive sorting. However, when using a
// custom comparator function, calling back and forth between the VM's C++ and
// JIT'd JS is rather slow *and* loses JIT type information, resulting in
// worse generated code for the comparator function than would be optimal. In
// fact, when sorting with a comparator, these costs outweigh the benefits of
// sorting in C++. By using our own JS-implemented Quick Sort (below), we get
// a ~3500ms mean speed-up in `bench/bench.html`.

/**
 * Swap the elements indexed by `x` and `y` in the array `ary`.
 *
 * @param {Array} ary
 *        The array.
 * @param {Number} x
 *        The index of the first item.
 * @param {Number} y
 *        The index of the second item.
 */
function swap(ary, x, y) {
  var temp = ary[x];
  ary[x] = ary[y];
  ary[y] = temp;
}

/**
 * Returns a random integer within the range `low .. high` inclusive.
 *
 * @param {Number} low
 *        The lower bound on the range.
 * @param {Number} high
 *        The upper bound on the range.
 */
function randomIntInRange(low, high) {
  return Math.round(low + (Math.random() * (high - low)));
}

/**
 * The Quick Sort algorithm.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 * @param {Number} p
 *        Start index of the array
 * @param {Number} r
 *        End index of the array
 */
function doQuickSort(ary, comparator, p, r) {
  // If our lower bound is less than our upper bound, we (1) partition the
  // array into two pieces and (2) recurse on each half. If it is not, this is
  // the empty array and our base case.

  if (p < r) {
    // (1) Partitioning.
    //
    // The partitioning chooses a pivot between `p` and `r` and moves all
    // elements that are less than or equal to the pivot to the before it, and
    // all the elements that are greater than it after it. The effect is that
    // once partition is done, the pivot is in the exact place it will be when
    // the array is put in sorted order, and it will not need to be moved
    // again. This runs in O(n) time.

    // Always choose a random pivot so that an input array which is reverse
    // sorted does not cause O(n^2) running time.
    var pivotIndex = randomIntInRange(p, r);
    var i = p - 1;

    swap(ary, pivotIndex, r);
    var pivot = ary[r];

    // Immediately after `j` is incremented in this loop, the following hold
    // true:
    //
    //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
    //
    //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
    for (var j = p; j < r; j++) {
      if (comparator(ary[j], pivot) <= 0) {
        i += 1;
        swap(ary, i, j);
      }
    }

    swap(ary, i + 1, j);
    var q = i + 1;

    // (2) Recurse on each half.

    doQuickSort(ary, comparator, p, q - 1);
    doQuickSort(ary, comparator, q + 1, r);
  }
}

/**
 * Sort the given array in-place with the given comparator function.
 *
 * @param {Array} ary
 *        An array to sort.
 * @param {function} comparator
 *        Function to use to compare two items.
 */
exports.quickSort = function (ary, comparator) {
  doQuickSort(ary, comparator, 0, ary.length - 1);
};


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/source-map-consumer.js":
/*!*************************************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/source-map-consumer.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var util = __webpack_require__(/*! ./util */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/util.js");
var binarySearch = __webpack_require__(/*! ./binary-search */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/binary-search.js");
var ArraySet = __webpack_require__(/*! ./array-set */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/array-set.js").ArraySet;
var base64VLQ = __webpack_require__(/*! ./base64-vlq */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/base64-vlq.js");
var quickSort = __webpack_require__(/*! ./quick-sort */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/quick-sort.js").quickSort;

function SourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  return sourceMap.sections != null
    ? new IndexedSourceMapConsumer(sourceMap)
    : new BasicSourceMapConsumer(sourceMap);
}

SourceMapConsumer.fromSourceMap = function(aSourceMap) {
  return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
}

/**
 * The version of the source mapping spec that we are consuming.
 */
SourceMapConsumer.prototype._version = 3;

// `__generatedMappings` and `__originalMappings` are arrays that hold the
// parsed mapping coordinates from the source map's "mappings" attribute. They
// are lazily instantiated, accessed via the `_generatedMappings` and
// `_originalMappings` getters respectively, and we only parse the mappings
// and create these arrays once queried for a source location. We jump through
// these hoops because there can be many thousands of mappings, and parsing
// them is expensive, so we only want to do it if we must.
//
// Each object in the arrays is of the form:
//
//     {
//       generatedLine: The line number in the generated code,
//       generatedColumn: The column number in the generated code,
//       source: The path to the original source file that generated this
//               chunk of code,
//       originalLine: The line number in the original source that
//                     corresponds to this chunk of generated code,
//       originalColumn: The column number in the original source that
//                       corresponds to this chunk of generated code,
//       name: The name of the original symbol which generated this chunk of
//             code.
//     }
//
// All properties except for `generatedLine` and `generatedColumn` can be
// `null`.
//
// `_generatedMappings` is ordered by the generated positions.
//
// `_originalMappings` is ordered by the original positions.

SourceMapConsumer.prototype.__generatedMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
  get: function () {
    if (!this.__generatedMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__generatedMappings;
  }
});

SourceMapConsumer.prototype.__originalMappings = null;
Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
  get: function () {
    if (!this.__originalMappings) {
      this._parseMappings(this._mappings, this.sourceRoot);
    }

    return this.__originalMappings;
  }
});

SourceMapConsumer.prototype._charIsMappingSeparator =
  function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
    var c = aStr.charAt(index);
    return c === ";" || c === ",";
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
SourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

SourceMapConsumer.GENERATED_ORDER = 1;
SourceMapConsumer.ORIGINAL_ORDER = 2;

SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
SourceMapConsumer.LEAST_UPPER_BOUND = 2;

/**
 * Iterate over each mapping between an original source/line/column and a
 * generated line/column in this source map.
 *
 * @param Function aCallback
 *        The function that is called with each mapping.
 * @param Object aContext
 *        Optional. If specified, this object will be the value of `this` every
 *        time that `aCallback` is called.
 * @param aOrder
 *        Either `SourceMapConsumer.GENERATED_ORDER` or
 *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
 *        iterate over the mappings sorted by the generated file's line/column
 *        order or the original's source/line/column order, respectively. Defaults to
 *        `SourceMapConsumer.GENERATED_ORDER`.
 */
SourceMapConsumer.prototype.eachMapping =
  function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
    var context = aContext || null;
    var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

    var mappings;
    switch (order) {
    case SourceMapConsumer.GENERATED_ORDER:
      mappings = this._generatedMappings;
      break;
    case SourceMapConsumer.ORIGINAL_ORDER:
      mappings = this._originalMappings;
      break;
    default:
      throw new Error("Unknown order of iteration.");
    }

    var sourceRoot = this.sourceRoot;
    mappings.map(function (mapping) {
      var source = mapping.source === null ? null : this._sources.at(mapping.source);
      if (source != null && sourceRoot != null) {
        source = util.join(sourceRoot, source);
      }
      return {
        source: source,
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        name: mapping.name === null ? null : this._names.at(mapping.name)
      };
    }, this).forEach(aCallback, context);
  };

/**
 * Returns all generated line and column information for the original source,
 * line, and column provided. If no column is provided, returns all mappings
 * corresponding to a either the line we are searching for or the next
 * closest line that has any mappings. Otherwise, returns all mappings
 * corresponding to the given line and either the column we are searching for
 * or the next closest column that has any offsets.
 *
 * The only argument is an object with the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: Optional. the column number in the original source.
 *
 * and an array of objects is returned, each with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
SourceMapConsumer.prototype.allGeneratedPositionsFor =
  function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
    var line = util.getArg(aArgs, 'line');

    // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
    // returns the index of the closest mapping less than the needle. By
    // setting needle.originalColumn to 0, we thus find the last mapping for
    // the given line, provided such a mapping exists.
    var needle = {
      source: util.getArg(aArgs, 'source'),
      originalLine: line,
      originalColumn: util.getArg(aArgs, 'column', 0)
    };

    if (this.sourceRoot != null) {
      needle.source = util.relative(this.sourceRoot, needle.source);
    }
    if (!this._sources.has(needle.source)) {
      return [];
    }
    needle.source = this._sources.indexOf(needle.source);

    var mappings = [];

    var index = this._findMapping(needle,
                                  this._originalMappings,
                                  "originalLine",
                                  "originalColumn",
                                  util.compareByOriginalPositions,
                                  binarySearch.LEAST_UPPER_BOUND);
    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (aArgs.column === undefined) {
        var originalLine = mapping.originalLine;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we found. Since
        // mappings are sorted, this is guaranteed to find all mappings for
        // the line we found.
        while (mapping && mapping.originalLine === originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      } else {
        var originalColumn = mapping.originalColumn;

        // Iterate until either we run out of mappings, or we run into
        // a mapping for a different line than the one we were searching for.
        // Since mappings are sorted, this is guaranteed to find all mappings for
        // the line we are searching for.
        while (mapping &&
               mapping.originalLine === line &&
               mapping.originalColumn == originalColumn) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[++index];
        }
      }
    }

    return mappings;
  };

exports.SourceMapConsumer = SourceMapConsumer;

/**
 * A BasicSourceMapConsumer instance represents a parsed source map which we can
 * query for information about the original file positions by giving it a file
 * position in the generated source.
 *
 * The only parameter is the raw source map (either as a JSON string, or
 * already parsed to an object). According to the spec, source maps have the
 * following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - sources: An array of URLs to the original source files.
 *   - names: An array of identifiers which can be referrenced by individual mappings.
 *   - sourceRoot: Optional. The URL root from which all sources are relative.
 *   - sourcesContent: Optional. An array of contents of the original source files.
 *   - mappings: A string of base64 VLQs which contain the actual mappings.
 *   - file: Optional. The generated file this source map is associated with.
 *
 * Here is an example source map, taken from the source map spec[0]:
 *
 *     {
 *       version : 3,
 *       file: "out.js",
 *       sourceRoot : "",
 *       sources: ["foo.js", "bar.js"],
 *       names: ["src", "maps", "are", "fun"],
 *       mappings: "AA,AB;;ABCDE;"
 *     }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
 */
function BasicSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sources = util.getArg(sourceMap, 'sources');
  // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
  // requires the array) to play nice here.
  var names = util.getArg(sourceMap, 'names', []);
  var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
  var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
  var mappings = util.getArg(sourceMap, 'mappings');
  var file = util.getArg(sourceMap, 'file', null);

  // Once again, Sass deviates from the spec and supplies the version as a
  // string rather than a number, so we use loose equality checking here.
  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  sources = sources
    .map(String)
    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    .map(util.normalize)
    // Always ensure that absolute sources are internally stored relative to
    // the source root, if the source root is absolute. Not doing this would
    // be particularly problematic when the source root is a prefix of the
    // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
    .map(function (source) {
      return sourceRoot && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
        ? util.relative(sourceRoot, source)
        : source;
    });

  // Pass `true` below to allow duplicate names and sources. While source maps
  // are intended to be compressed and deduplicated, the TypeScript compiler
  // sometimes generates source maps with duplicates in them. See Github issue
  // #72 and bugzil.la/889492.
  this._names = ArraySet.fromArray(names.map(String), true);
  this._sources = ArraySet.fromArray(sources, true);

  this.sourceRoot = sourceRoot;
  this.sourcesContent = sourcesContent;
  this._mappings = mappings;
  this.file = file;
}

BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

/**
 * Create a BasicSourceMapConsumer from a SourceMapGenerator.
 *
 * @param SourceMapGenerator aSourceMap
 *        The source map that will be consumed.
 * @returns BasicSourceMapConsumer
 */
BasicSourceMapConsumer.fromSourceMap =
  function SourceMapConsumer_fromSourceMap(aSourceMap) {
    var smc = Object.create(BasicSourceMapConsumer.prototype);

    var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
    var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
    smc.sourceRoot = aSourceMap._sourceRoot;
    smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                            smc.sourceRoot);
    smc.file = aSourceMap._file;

    // Because we are modifying the entries (by converting string sources and
    // names to indices into the sources and names ArraySets), we have to make
    // a copy of the entry or else bad things happen. Shared mutable state
    // strikes again! See github issue #191.

    var generatedMappings = aSourceMap._mappings.toArray().slice();
    var destGeneratedMappings = smc.__generatedMappings = [];
    var destOriginalMappings = smc.__originalMappings = [];

    for (var i = 0, length = generatedMappings.length; i < length; i++) {
      var srcMapping = generatedMappings[i];
      var destMapping = new Mapping;
      destMapping.generatedLine = srcMapping.generatedLine;
      destMapping.generatedColumn = srcMapping.generatedColumn;

      if (srcMapping.source) {
        destMapping.source = sources.indexOf(srcMapping.source);
        destMapping.originalLine = srcMapping.originalLine;
        destMapping.originalColumn = srcMapping.originalColumn;

        if (srcMapping.name) {
          destMapping.name = names.indexOf(srcMapping.name);
        }

        destOriginalMappings.push(destMapping);
      }

      destGeneratedMappings.push(destMapping);
    }

    quickSort(smc.__originalMappings, util.compareByOriginalPositions);

    return smc;
  };

/**
 * The version of the source mapping spec that we are consuming.
 */
BasicSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
  get: function () {
    return this._sources.toArray().map(function (s) {
      return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
    }, this);
  }
});

/**
 * Provide the JIT with a nice shape / hidden class.
 */
function Mapping() {
  this.generatedLine = 0;
  this.generatedColumn = 0;
  this.source = null;
  this.originalLine = null;
  this.originalColumn = null;
  this.name = null;
}

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
BasicSourceMapConsumer.prototype._parseMappings =
  function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    var generatedLine = 1;
    var previousGeneratedColumn = 0;
    var previousOriginalLine = 0;
    var previousOriginalColumn = 0;
    var previousSource = 0;
    var previousName = 0;
    var length = aStr.length;
    var index = 0;
    var cachedSegments = {};
    var temp = {};
    var originalMappings = [];
    var generatedMappings = [];
    var mapping, str, segment, end, value;

    while (index < length) {
      if (aStr.charAt(index) === ';') {
        generatedLine++;
        index++;
        previousGeneratedColumn = 0;
      }
      else if (aStr.charAt(index) === ',') {
        index++;
      }
      else {
        mapping = new Mapping();
        mapping.generatedLine = generatedLine;

        // Because each offset is encoded relative to the previous one,
        // many segments often have the same encoding. We can exploit this
        // fact by caching the parsed variable length fields of each segment,
        // allowing us to avoid a second parse if we encounter the same
        // segment again.
        for (end = index; end < length; end++) {
          if (this._charIsMappingSeparator(aStr, end)) {
            break;
          }
        }
        str = aStr.slice(index, end);

        segment = cachedSegments[str];
        if (segment) {
          index += str.length;
        } else {
          segment = [];
          while (index < end) {
            base64VLQ.decode(aStr, index, temp);
            value = temp.value;
            index = temp.rest;
            segment.push(value);
          }

          if (segment.length === 2) {
            throw new Error('Found a source, but no line and column');
          }

          if (segment.length === 3) {
            throw new Error('Found a source and line, but no column');
          }

          cachedSegments[str] = segment;
        }

        // Generated column.
        mapping.generatedColumn = previousGeneratedColumn + segment[0];
        previousGeneratedColumn = mapping.generatedColumn;

        if (segment.length > 1) {
          // Original source.
          mapping.source = previousSource + segment[1];
          previousSource += segment[1];

          // Original line.
          mapping.originalLine = previousOriginalLine + segment[2];
          previousOriginalLine = mapping.originalLine;
          // Lines are stored 0-based
          mapping.originalLine += 1;

          // Original column.
          mapping.originalColumn = previousOriginalColumn + segment[3];
          previousOriginalColumn = mapping.originalColumn;

          if (segment.length > 4) {
            // Original name.
            mapping.name = previousName + segment[4];
            previousName += segment[4];
          }
        }

        generatedMappings.push(mapping);
        if (typeof mapping.originalLine === 'number') {
          originalMappings.push(mapping);
        }
      }
    }

    quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
    this.__generatedMappings = generatedMappings;

    quickSort(originalMappings, util.compareByOriginalPositions);
    this.__originalMappings = originalMappings;
  };

/**
 * Find the mapping that best matches the hypothetical "needle" mapping that
 * we are searching for in the given "haystack" of mappings.
 */
BasicSourceMapConsumer.prototype._findMapping =
  function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                         aColumnName, aComparator, aBias) {
    // To return the position we are searching for, we must first find the
    // mapping for the given position and then return the opposite position it
    // points to. Because the mappings are sorted, we can use binary search to
    // find the best mapping.

    if (aNeedle[aLineName] <= 0) {
      throw new TypeError('Line must be greater than or equal to 1, got '
                          + aNeedle[aLineName]);
    }
    if (aNeedle[aColumnName] < 0) {
      throw new TypeError('Column must be greater than or equal to 0, got '
                          + aNeedle[aColumnName]);
    }

    return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
  };

/**
 * Compute the last column for each generated mapping. The last column is
 * inclusive.
 */
BasicSourceMapConsumer.prototype.computeColumnSpans =
  function SourceMapConsumer_computeColumnSpans() {
    for (var index = 0; index < this._generatedMappings.length; ++index) {
      var mapping = this._generatedMappings[index];

      // Mappings do not contain a field for the last generated columnt. We
      // can come up with an optimistic estimate, however, by assuming that
      // mappings are contiguous (i.e. given two consecutive mappings, the
      // first mapping ends where the second one starts).
      if (index + 1 < this._generatedMappings.length) {
        var nextMapping = this._generatedMappings[index + 1];

        if (mapping.generatedLine === nextMapping.generatedLine) {
          mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
          continue;
        }
      }

      // The last mapping for each line spans the entire line.
      mapping.lastGeneratedColumn = Infinity;
    }
  };

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
BasicSourceMapConsumer.prototype.originalPositionFor =
  function SourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._generatedMappings,
      "generatedLine",
      "generatedColumn",
      util.compareByGeneratedPositionsDeflated,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._generatedMappings[index];

      if (mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source !== null) {
          source = this._sources.at(source);
          if (this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
        }
        var name = util.getArg(mapping, 'name', null);
        if (name !== null) {
          name = this._names.at(name);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: name
        };
      }
    }

    return {
      source: null,
      line: null,
      column: null,
      name: null
    };
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
  function BasicSourceMapConsumer_hasContentsOfAllSources() {
    if (!this.sourcesContent) {
      return false;
    }
    return this.sourcesContent.length >= this._sources.size() &&
      !this.sourcesContent.some(function (sc) { return sc == null; });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
BasicSourceMapConsumer.prototype.sourceContentFor =
  function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    if (!this.sourcesContent) {
      return null;
    }

    if (this.sourceRoot != null) {
      aSource = util.relative(this.sourceRoot, aSource);
    }

    if (this._sources.has(aSource)) {
      return this.sourcesContent[this._sources.indexOf(aSource)];
    }

    var url;
    if (this.sourceRoot != null
        && (url = util.urlParse(this.sourceRoot))) {
      // XXX: file:// URIs and absolute paths lead to unexpected behavior for
      // many users. We can help them out when they expect file:// URIs to
      // behave like it would if they were running a local HTTP server. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
      var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
      if (url.scheme == "file"
          && this._sources.has(fileUriAbsPath)) {
        return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
      }

      if ((!url.path || url.path == "/")
          && this._sources.has("/" + aSource)) {
        return this.sourcesContent[this._sources.indexOf("/" + aSource)];
      }
    }

    // This function is used recursively from
    // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
    // don't want to throw if we can't find the source - we just want to
    // return null, so we provide a flag to exit gracefully.
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
 *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
 *     closest element that is smaller than or greater than the one we are
 *     searching for, respectively, if the exact element cannot be found.
 *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
BasicSourceMapConsumer.prototype.generatedPositionFor =
  function SourceMapConsumer_generatedPositionFor(aArgs) {
    var source = util.getArg(aArgs, 'source');
    if (this.sourceRoot != null) {
      source = util.relative(this.sourceRoot, source);
    }
    if (!this._sources.has(source)) {
      return {
        line: null,
        column: null,
        lastColumn: null
      };
    }
    source = this._sources.indexOf(source);

    var needle = {
      source: source,
      originalLine: util.getArg(aArgs, 'line'),
      originalColumn: util.getArg(aArgs, 'column')
    };

    var index = this._findMapping(
      needle,
      this._originalMappings,
      "originalLine",
      "originalColumn",
      util.compareByOriginalPositions,
      util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
    );

    if (index >= 0) {
      var mapping = this._originalMappings[index];

      if (mapping.source === needle.source) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }
    }

    return {
      line: null,
      column: null,
      lastColumn: null
    };
  };

exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

/**
 * An IndexedSourceMapConsumer instance represents a parsed source map which
 * we can query for information. It differs from BasicSourceMapConsumer in
 * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
 * input.
 *
 * The only parameter is a raw source map (either as a JSON string, or already
 * parsed to an object). According to the spec for indexed source maps, they
 * have the following attributes:
 *
 *   - version: Which version of the source map spec this map is following.
 *   - file: Optional. The generated file this source map is associated with.
 *   - sections: A list of section definitions.
 *
 * Each value under the "sections" field has two fields:
 *   - offset: The offset into the original specified at which this section
 *       begins to apply, defined as an object with a "line" and "column"
 *       field.
 *   - map: A source map definition. This source map could also be indexed,
 *       but doesn't have to be.
 *
 * Instead of the "map" field, it's also possible to have a "url" field
 * specifying a URL to retrieve a source map from, but that's currently
 * unsupported.
 *
 * Here's an example source map, taken from the source map spec[0], but
 * modified to omit a section which uses the "url" field.
 *
 *  {
 *    version : 3,
 *    file: "app.js",
 *    sections: [{
 *      offset: {line:100, column:10},
 *      map: {
 *        version : 3,
 *        file: "section.js",
 *        sources: ["foo.js", "bar.js"],
 *        names: ["src", "maps", "are", "fun"],
 *        mappings: "AAAA,E;;ABCDE;"
 *      }
 *    }],
 *  }
 *
 * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
 */
function IndexedSourceMapConsumer(aSourceMap) {
  var sourceMap = aSourceMap;
  if (typeof aSourceMap === 'string') {
    sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
  }

  var version = util.getArg(sourceMap, 'version');
  var sections = util.getArg(sourceMap, 'sections');

  if (version != this._version) {
    throw new Error('Unsupported version: ' + version);
  }

  this._sources = new ArraySet();
  this._names = new ArraySet();

  var lastOffset = {
    line: -1,
    column: 0
  };
  this._sections = sections.map(function (s) {
    if (s.url) {
      // The url field will require support for asynchronicity.
      // See https://github.com/mozilla/source-map/issues/16
      throw new Error('Support for url field in sections not implemented.');
    }
    var offset = util.getArg(s, 'offset');
    var offsetLine = util.getArg(offset, 'line');
    var offsetColumn = util.getArg(offset, 'column');

    if (offsetLine < lastOffset.line ||
        (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
      throw new Error('Section offsets must be ordered and non-overlapping.');
    }
    lastOffset = offset;

    return {
      generatedOffset: {
        // The offset fields are 0-based, but we use 1-based indices when
        // encoding/decoding from VLQ.
        generatedLine: offsetLine + 1,
        generatedColumn: offsetColumn + 1
      },
      consumer: new SourceMapConsumer(util.getArg(s, 'map'))
    }
  });
}

IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

/**
 * The version of the source mapping spec that we are consuming.
 */
IndexedSourceMapConsumer.prototype._version = 3;

/**
 * The list of original sources.
 */
Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
  get: function () {
    var sources = [];
    for (var i = 0; i < this._sections.length; i++) {
      for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
        sources.push(this._sections[i].consumer.sources[j]);
      }
    }
    return sources;
  }
});

/**
 * Returns the original source, line, and column information for the generated
 * source's line and column positions provided. The only argument is an object
 * with the following properties:
 *
 *   - line: The line number in the generated source.
 *   - column: The column number in the generated source.
 *
 * and an object is returned with the following properties:
 *
 *   - source: The original source file, or null.
 *   - line: The line number in the original source, or null.
 *   - column: The column number in the original source, or null.
 *   - name: The original identifier, or null.
 */
IndexedSourceMapConsumer.prototype.originalPositionFor =
  function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
    var needle = {
      generatedLine: util.getArg(aArgs, 'line'),
      generatedColumn: util.getArg(aArgs, 'column')
    };

    // Find the section containing the generated position we're trying to map
    // to an original position.
    var sectionIndex = binarySearch.search(needle, this._sections,
      function(needle, section) {
        var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
        if (cmp) {
          return cmp;
        }

        return (needle.generatedColumn -
                section.generatedOffset.generatedColumn);
      });
    var section = this._sections[sectionIndex];

    if (!section) {
      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    }

    return section.consumer.originalPositionFor({
      line: needle.generatedLine -
        (section.generatedOffset.generatedLine - 1),
      column: needle.generatedColumn -
        (section.generatedOffset.generatedLine === needle.generatedLine
         ? section.generatedOffset.generatedColumn - 1
         : 0),
      bias: aArgs.bias
    });
  };

/**
 * Return true if we have the source content for every source in the source
 * map, false otherwise.
 */
IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
  function IndexedSourceMapConsumer_hasContentsOfAllSources() {
    return this._sections.every(function (s) {
      return s.consumer.hasContentsOfAllSources();
    });
  };

/**
 * Returns the original source content. The only argument is the url of the
 * original source file. Returns null if no original source content is
 * available.
 */
IndexedSourceMapConsumer.prototype.sourceContentFor =
  function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      var content = section.consumer.sourceContentFor(aSource, true);
      if (content) {
        return content;
      }
    }
    if (nullOnMissing) {
      return null;
    }
    else {
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    }
  };

/**
 * Returns the generated line and column information for the original source,
 * line, and column positions provided. The only argument is an object with
 * the following properties:
 *
 *   - source: The filename of the original source.
 *   - line: The line number in the original source.
 *   - column: The column number in the original source.
 *
 * and an object is returned with the following properties:
 *
 *   - line: The line number in the generated source, or null.
 *   - column: The column number in the generated source, or null.
 */
IndexedSourceMapConsumer.prototype.generatedPositionFor =
  function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];

      // Only consider this section if the requested source is in the list of
      // sources of the consumer.
      if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
        continue;
      }
      var generatedPosition = section.consumer.generatedPositionFor(aArgs);
      if (generatedPosition) {
        var ret = {
          line: generatedPosition.line +
            (section.generatedOffset.generatedLine - 1),
          column: generatedPosition.column +
            (section.generatedOffset.generatedLine === generatedPosition.line
             ? section.generatedOffset.generatedColumn - 1
             : 0)
        };
        return ret;
      }
    }

    return {
      line: null,
      column: null
    };
  };

/**
 * Parse the mappings in a string in to a data structure which we can easily
 * query (the ordered arrays in the `this.__generatedMappings` and
 * `this.__originalMappings` properties).
 */
IndexedSourceMapConsumer.prototype._parseMappings =
  function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
    this.__generatedMappings = [];
    this.__originalMappings = [];
    for (var i = 0; i < this._sections.length; i++) {
      var section = this._sections[i];
      var sectionMappings = section.consumer._generatedMappings;
      for (var j = 0; j < sectionMappings.length; j++) {
        var mapping = sectionMappings[j];

        var source = section.consumer._sources.at(mapping.source);
        if (section.consumer.sourceRoot !== null) {
          source = util.join(section.consumer.sourceRoot, source);
        }
        this._sources.add(source);
        source = this._sources.indexOf(source);

        var name = section.consumer._names.at(mapping.name);
        this._names.add(name);
        name = this._names.indexOf(name);

        // The mappings coming from the consumer for the section have
        // generated positions relative to the start of the section, so we
        // need to offset them to be relative to the start of the concatenated
        // generated file.
        var adjustedMapping = {
          source: source,
          generatedLine: mapping.generatedLine +
            (section.generatedOffset.generatedLine - 1),
          generatedColumn: mapping.generatedColumn +
            (section.generatedOffset.generatedLine === mapping.generatedLine
            ? section.generatedOffset.generatedColumn - 1
            : 0),
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: name
        };

        this.__generatedMappings.push(adjustedMapping);
        if (typeof adjustedMapping.originalLine === 'number') {
          this.__originalMappings.push(adjustedMapping);
        }
      }
    }

    quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
    quickSort(this.__originalMappings, util.compareByOriginalPositions);
  };

exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/util.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/util.js ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  } else {
    throw new Error('"' + aName + '" is a required argument.');
  }
}
exports.getArg = getArg;

var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
var dataUrlRegexp = /^data:.+\,.+$/;

function urlParse(aUrl) {
  var match = aUrl.match(urlRegexp);
  if (!match) {
    return null;
  }
  return {
    scheme: match[1],
    auth: match[2],
    host: match[3],
    port: match[4],
    path: match[5]
  };
}
exports.urlParse = urlParse;

function urlGenerate(aParsedUrl) {
  var url = '';
  if (aParsedUrl.scheme) {
    url += aParsedUrl.scheme + ':';
  }
  url += '//';
  if (aParsedUrl.auth) {
    url += aParsedUrl.auth + '@';
  }
  if (aParsedUrl.host) {
    url += aParsedUrl.host;
  }
  if (aParsedUrl.port) {
    url += ":" + aParsedUrl.port
  }
  if (aParsedUrl.path) {
    url += aParsedUrl.path;
  }
  return url;
}
exports.urlGenerate = urlGenerate;

/**
 * Normalizes a path, or the path portion of a URL:
 *
 * - Replaces consecutive slashes with one slash.
 * - Removes unnecessary '.' parts.
 * - Removes unnecessary '<dir>/..' parts.
 *
 * Based on code in the Node.js 'path' core module.
 *
 * @param aPath The path or url to normalize.
 */
function normalize(aPath) {
  var path = aPath;
  var url = urlParse(aPath);
  if (url) {
    if (!url.path) {
      return aPath;
    }
    path = url.path;
  }
  var isAbsolute = exports.isAbsolute(path);

  var parts = path.split(/\/+/);
  for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
    part = parts[i];
    if (part === '.') {
      parts.splice(i, 1);
    } else if (part === '..') {
      up++;
    } else if (up > 0) {
      if (part === '') {
        // The first part is blank if the path is absolute. Trying to go
        // above the root is a no-op. Therefore we can remove all '..' parts
        // directly after the root.
        parts.splice(i + 1, up);
        up = 0;
      } else {
        parts.splice(i, 2);
        up--;
      }
    }
  }
  path = parts.join('/');

  if (path === '') {
    path = isAbsolute ? '/' : '.';
  }

  if (url) {
    url.path = path;
    return urlGenerate(url);
  }
  return path;
}
exports.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be joined with the root.
 *
 * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
 *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
 *   first.
 * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
 *   is updated with the result and aRoot is returned. Otherwise the result
 *   is returned.
 *   - If aPath is absolute, the result is aPath.
 *   - Otherwise the two paths are joined with a slash.
 * - Joining for example 'http://' and 'www.example.com' is also supported.
 */
function join(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }
  if (aPath === "") {
    aPath = ".";
  }
  var aPathUrl = urlParse(aPath);
  var aRootUrl = urlParse(aRoot);
  if (aRootUrl) {
    aRoot = aRootUrl.path || '/';
  }

  // `join(foo, '//www.example.org')`
  if (aPathUrl && !aPathUrl.scheme) {
    if (aRootUrl) {
      aPathUrl.scheme = aRootUrl.scheme;
    }
    return urlGenerate(aPathUrl);
  }

  if (aPathUrl || aPath.match(dataUrlRegexp)) {
    return aPath;
  }

  // `join('http://', 'www.example.com')`
  if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
    aRootUrl.host = aPath;
    return urlGenerate(aRootUrl);
  }

  var joined = aPath.charAt(0) === '/'
    ? aPath
    : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

  if (aRootUrl) {
    aRootUrl.path = joined;
    return urlGenerate(aRootUrl);
  }
  return joined;
}
exports.join = join;

exports.isAbsolute = function (aPath) {
  return aPath.charAt(0) === '/' || !!aPath.match(urlRegexp);
};

/**
 * Make a path relative to a URL or another path.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 */
function relative(aRoot, aPath) {
  if (aRoot === "") {
    aRoot = ".";
  }

  aRoot = aRoot.replace(/\/$/, '');

  // It is possible for the path to be above the root. In this case, simply
  // checking whether the root is a prefix of the path won't work. Instead, we
  // need to remove components from the root one by one, until either we find
  // a prefix that fits, or we run out of components to remove.
  var level = 0;
  while (aPath.indexOf(aRoot + '/') !== 0) {
    var index = aRoot.lastIndexOf("/");
    if (index < 0) {
      return aPath;
    }

    // If the only part of the root that is left is the scheme (i.e. http://,
    // file:///, etc.), one or more slashes (/), or simply nothing at all, we
    // have exhausted all components, so the path is not relative to the root.
    aRoot = aRoot.slice(0, index);
    if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
      return aPath;
    }

    ++level;
  }

  // Make sure we add a "../" for each component we removed from the root.
  return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
}
exports.relative = relative;

var supportsNullProto = (function () {
  var obj = Object.create(null);
  return !('__proto__' in obj);
}());

function identity (s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return '$' + aStr;
  }

  return aStr;
}
exports.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  var length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
      s.charCodeAt(length - 2) !== 95  /* '_' */ ||
      s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 4) !== 116 /* 't' */ ||
      s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
      s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
      s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
      s.charCodeAt(length - 8) !== 95  /* '_' */ ||
      s.charCodeAt(length - 9) !== 95  /* '_' */) {
    return false;
  }

  for (var i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

/**
 * Comparator between two mappings where the original positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same original source/line/column, but different generated
 * line and column the same. Useful when searching for a mapping with a
 * stubbed out mapping.
 */
function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
  var cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0 || onlyCompareOriginal) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByOriginalPositions = compareByOriginalPositions;

/**
 * Comparator between two mappings with deflated source and name indices where
 * the generated positions are compared.
 *
 * Optionally pass in `true` as `onlyCompareGenerated` to consider two
 * mappings with the same generated line and column, but different
 * source/name/original line and column the same. Useful when searching for a
 * mapping with a stubbed out mapping.
 */
function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0 || onlyCompareGenerated) {
    return cmp;
  }

  cmp = mappingA.source - mappingB.source;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return mappingA.name - mappingB.name;
}
exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  var cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;


/***/ }),

/***/ "./node_modules/sourcemapped-stacktrace/sourcemapped-stacktrace.js":
/*!*************************************************************************!*\
  !*** ./node_modules/sourcemapped-stacktrace/sourcemapped-stacktrace.js ***!
  \*************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
 * sourcemapped-stacktrace.js
 * created by James Salter <iteration@gmail.com> (2014)
 *
 * https://github.com/novocaine/sourcemapped-stacktrace
 *
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/*global define */

// note we only include source-map-consumer, not the whole source-map library,
// which includes gear for generating source maps that we don't need
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! source-map/lib/source-map-consumer */ "./node_modules/sourcemapped-stacktrace/node_modules/source-map/lib/source-map-consumer.js")], __WEBPACK_AMD_DEFINE_RESULT__ = (function(source_map_consumer) {

  var global_mapForUri = {};

  /**
   * Re-map entries in a stacktrace using sourcemaps if available.
   *
   * @param {Array} stack - Array of strings from the browser's stack
   *                        representation. Currently only Chrome
   *                        format is supported.
   * @param {function} done - Callback invoked with the transformed stacktrace
   *                          (an Array of Strings) passed as the first
   *                          argument
   * @param {Object} [opts] - Optional options object.
   * @param {Function} [opts.filter] - Filter function applied to each stackTrace line.
   *                                   Lines which do not pass the filter won't be processesd.
   * @param {boolean} [opts.cacheGlobally] - Whether to cache sourcemaps globally across multiple calls.
   * @param {boolean} [opts.sync] - Whether to use synchronous ajax to load the sourcemaps.
   */
  var mapStackTrace = function(stack, done, opts) {
    var lines;
    var line;
    var mapForUri = {};
    var rows = {};
    var fields;
    var uri;
    var expected_fields;
    var regex;
    var skip_lines;

    var fetcher = new Fetcher(opts);

    if (isChromeOrEdge() || isIE11Plus()) {
      regex = /^ +at.+\((.*):([0-9]+):([0-9]+)/;
      expected_fields = 4;
      // (skip first line containing exception message)
      skip_lines = 1;
    } else if (isFirefox() || isSafari()) {
      regex = /@(.*):([0-9]+):([0-9]+)/;
      expected_fields = 4;
      skip_lines = 0;
    } else {
      throw new Error("unknown browser :(");
    }

    lines = stack.split("\n").slice(skip_lines);

    for (var i=0; i < lines.length; i++) {
      line = lines[i];
      if ( opts && opts.filter && !opts.filter(line) ) continue;
      
      fields = line.match(regex);
      if (fields && fields.length === expected_fields) {
        rows[i] = fields;
        uri = fields[1];
        if (!uri.match(/<anonymous>/)) {
          fetcher.fetchScript(uri);
        }
      }
    }

    fetcher.sem.whenReady(function() {
      var result = processSourceMaps(lines, rows, fetcher.mapForUri);
      done(result);
    });
  };

  var isChromeOrEdge = function() {
    return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  };

  var isFirefox = function() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  };  

  var isSafari = function() {
    return navigator.userAgent.toLowerCase().indexOf('safari') > -1;
  };
		
  var isIE11Plus = function() {
   	return document.documentMode && document.documentMode >= 11;
  };


  var Semaphore = function() {
    this.count = 0;
    this.pending = [];
  };

  Semaphore.prototype.incr = function() {
    this.count++;
  };

  Semaphore.prototype.decr = function() {
    this.count--;
    this.flush();
  };

  Semaphore.prototype.whenReady = function(fn) {
    this.pending.push(fn);
    this.flush();
  };

  Semaphore.prototype.flush = function() {
    if (this.count === 0) {
        this.pending.forEach(function(fn) { fn(); });
        this.pending = [];
    }
  };


  var Fetcher = function(opts) {
    this.sem = new Semaphore();
    this.sync = opts && opts.sync;
    this.mapForUri = opts && opts.cacheGlobally ? global_mapForUri : {};
  };

  Fetcher.prototype.ajax = function(uri, callback) {
    var xhr = createXMLHTTPObject();
    var that = this;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        callback.call(that, xhr, uri);
      }
    };
    xhr.open("GET", uri, !this.sync);
    xhr.send();
  }

  Fetcher.prototype.fetchScript = function(uri) {
    if (!(uri in this.mapForUri)) {
      this.sem.incr();
      this.mapForUri[uri] = null;
    } else {
      return;
    }

    this.ajax(uri, this.onScriptLoad);
  };

  var absUrlRegex = new RegExp('^(?:[a-z]+:)?//', 'i');

  Fetcher.prototype.onScriptLoad = function(xhr, uri) {
    if (xhr.status === 200 || (uri.slice(0, 7) === "file://" && xhr.status === 0)) {
      // find .map in file.
      //
      // attempt to find it at the very end of the file, but tolerate trailing
      // whitespace inserted by some packers.
      var match = xhr.responseText.match("//# [s]ourceMappingURL=(.*)[\\s]*$", "m");
      if (match && match.length === 2) {
        // get the map
        var mapUri = match[1];

        var embeddedSourceMap = mapUri.match("data:application/json;(charset=[^;]+;)?base64,(.*)");

        if (embeddedSourceMap && embeddedSourceMap[2]) {
          this.mapForUri[uri] = new source_map_consumer.SourceMapConsumer(atob(embeddedSourceMap[2]));
          this.sem.decr();
        } else {
          if (!absUrlRegex.test(mapUri)) {
            // relative url; according to sourcemaps spec is 'source origin'
            var origin;
            var lastSlash = uri.lastIndexOf('/');
            if (lastSlash !== -1) {
              origin = uri.slice(0, lastSlash + 1);
              mapUri = origin + mapUri;
              // note if lastSlash === -1, actual script uri has no slash
              // somehow, so no way to use it as a prefix... we give up and try
              // as absolute
            }
          }

          this.ajax(mapUri, function(xhr) {
            if (xhr.status === 200 || (mapUri.slice(0, 7) === "file://" && xhr.status === 0)) {
              this.mapForUri[uri] = new source_map_consumer.SourceMapConsumer(xhr.responseText);
            }
            this.sem.decr();
          });
        }
      } else {
        // no map
        this.sem.decr();
      }
    } else {
      // HTTP error fetching uri of the script
      this.sem.decr();
    }
  };

  var processSourceMaps = function(lines, rows, mapForUri) {
    var result = [];
    var map;
    for (var i=0; i < lines.length; i++) {
      var row = rows[i];
      if (row) {
        var uri = row[1];
        var line = parseInt(row[2], 10);
        var column = parseInt(row[3], 10);
        map = mapForUri[uri];

        if (map) {
          // we think we have a map for that uri. call source-map library
          var origPos = map.originalPositionFor(
            { line: line, column: column });
          result.push(formatOriginalPosition(origPos.source,
            origPos.line, origPos.column, origPos.name || origName(lines[i])));
        } else {
          // we can't find a map for that url, but we parsed the row.
          // reformat unchanged line for consistency with the sourcemapped
          // lines.
          result.push(formatOriginalPosition(uri, line, column, origName(lines[i])));
        }
      } else {
        // we weren't able to parse the row, push back what we were given
        result.push(lines[i]);
      }
    }

    return result;
  };

  function origName(origLine) {
    var match = String(origLine).match((isChromeOrEdge() || isIE11Plus()) ?
      / +at +([^ ]*).*/ :
      /([^@]*)@.*/);
    return match && match[1];
  }

  var formatOriginalPosition = function(source, line, column, name) {
    // mimic chrome's format
    return "    at " + (name ? name : "(unknown)") +
      " (" + source + ":" + line + ":" + column + ")";
  };

  // xmlhttprequest boilerplate
  var XMLHttpFactories = [
	function () {return new XMLHttpRequest();},
	function () {return new ActiveXObject("Msxml2.XMLHTTP");},
	function () {return new ActiveXObject("Msxml3.XMLHTTP");},
	function () {return new ActiveXObject("Microsoft.XMLHTTP");}
  ];

  function createXMLHTTPObject() {
      var xmlhttp = false;
      for (var i=0;i<XMLHttpFactories.length;i++) {
          try {
              xmlhttp = XMLHttpFactories[i]();
          }
          catch (e) {
              continue;
          }
          break;
      }
      return xmlhttp;
  }

  return {
    mapStackTrace: mapStackTrace
  }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


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

/***/ "./platform/sourcemapped-stacktrace-web.js":
/*!*************************************************!*\
  !*** ./platform/sourcemapped-stacktrace-web.js ***!
  \*************************************************/
/*! exports provided: mapStackTrace */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mapStackTrace", function() { return mapStackTrace; });
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// "Convert" old-style module to ES6.
const smst = __webpack_require__(/*! sourcemapped-stacktrace/sourcemapped-stacktrace.js */ "./node_modules/sourcemapped-stacktrace/sourcemapped-stacktrace.js");
const mapStackTrace = smst.mapStackTrace;


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
/* harmony import */ var _ts_build_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/particle-spec.js */ "./runtime/ts-build/particle-spec.js");
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
    this._attachStack = false;
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
          const r = {};
          a.forEach((value, key) => r[keyprimitive.convert(key)] = valueprimitive.convert(value));
          return r;
        },
        unconvert: a => {
          const r = new Map();
          for (const key in a) {
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

    const cnt = this.messageCount++;

    const handler = this._messageMap.get(e.data.messageType);
    let args;
    try {
      args = this._unprocessArguments(handler.args, e.data.messageBody);
    } catch (exc) {
      console.error(`Exception during unmarshaling for ${e.data.messageType}`);
      throw exc;
    }
    // If any of the converted arguments are still pending promises
    // wait for them to complete before processing the message.
    for (const arg of Object.values(args)) {
      if (arg instanceof Promise) {
        arg.then(() => this._processMessage(e));
        return;
      }
    }
    const handlerName = 'on' + e.data.messageType;
    Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this[handlerName], `no handler named ${handlerName}`);
    if (this._debugAttachment) {
      this._debugAttachment.handlePecMessage(handlerName, e.data.messageBody, cnt, e.data.stack);
    }
    const result = this[handlerName](args);
    if (handler.isInitializer) {
      Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(args.identifier);
      await this._mapper.establishThingMapping(args.identifier, result);
    }
  }

  _processArguments(argumentTypes, args) {
    const messageBody = {};
    for (const argument in argumentTypes) {
      messageBody[argument] = argumentTypes[argument].convert(args[argument]);
    }
    return messageBody;
  }

  _unprocessArguments(argumentTypes, args) {
    const messageBody = {};
    for (const argument in argumentTypes) {
      messageBody[argument] = argumentTypes[argument].unconvert(args[argument]);
    }
    return messageBody;
  }

  registerCall(name, argumentTypes) {
    this[name] = args => {
      const call = {messageType: name, messageBody: this._processArguments(argumentTypes, args)};
      if (this._attachStack) call.stack = new Error().stack;
      const cnt = this.messageCount++;
      this._port.postMessage(call);
      if (this._debugAttachment) {
        this._debugAttachment.handlePecMessage(name, call.messageBody, cnt, new Error().stack);
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
      const call = {messageType: name, messageBody: this._processArguments(argumentTypes, args)};
      if (this._attachStack) call.stack = new Error().stack;
      const requestedId = mappingIdArg && args[mappingIdArg];
      call.messageBody.identifier = this._mapper.createMappingForThing(thing, requestedId);
      const cnt = this.messageCount++;
      this._port.postMessage(call);
      if (this._debugAttachment) {
        this._debugAttachment.handlePecMessage(name, call.messageBody, cnt, new Error().stack);
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
      {id: this.Direct, spec: this.ByLiteral(_ts_build_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"]), handles: this.Map(this.Direct, this.Mapped)}, 'id');

    this.registerCall('UIEvent', {particle: this.Mapped, slotName: this.Direct, event: this.Direct});
    this.registerCall('SimpleCallback', {callback: this.Direct, data: this.Direct});
    this.registerCall('AwaitIdle', {version: this.Direct});
    this.registerCall('StartRender', {particle: this.Mapped, slotName: this.Direct, providedSlots: this.Map(this.Direct, this.Direct), contentTypes: this.List(this.Direct)});
    this.registerCall('StopRender', {particle: this.Mapped, slotName: this.Direct});

    this.registerHandler('Render', {particle: this.Mapped, slotName: this.Direct, content: this.Direct});
    this.registerHandler('InitializeProxy', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('SynchronizeProxy', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('HandleGet', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('HandleToList', {handle: this.Mapped, callback: this.Direct});
    this.registerHandler('HandleSet', {handle: this.Mapped, data: this.Direct, particleId: this.Direct, barrier: this.Direct});
    this.registerHandler('HandleClear', {handle: this.Mapped, particleId: this.Direct, barrier: this.Direct});
    this.registerHandler('HandleStore', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleRemove', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleRemoveMultiple', {handle: this.Mapped, callback: this.Direct, data: this.Direct, particleId: this.Direct});
    this.registerHandler('HandleStream', {handle: this.Mapped, callback: this.Direct, pageSize: this.Direct, forward: this.Direct});
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

    // We need an API call to tell the context side that DevTools has been connected, so it can start sending
    // stack traces attached to the API calls made from that side.
    this.registerCall('DevToolsConnected', {});
    _debug_devtools_connection_js__WEBPACK_IMPORTED_MODULE_4__["DevtoolsConnection"].onceConnected.then(devtoolsChannel => {
      this.DevToolsConnected();
      this._debugAttachment = new _debug_outer_port_attachment_js__WEBPACK_IMPORTED_MODULE_3__["OuterPortAttachment"](arc, devtoolsChannel);
    });
  }
}

class PECInnerPort extends APIPort {
  constructor(messagePort) {
    super(messagePort, 'i');

    this.registerHandler('Stop', {});
    this.registerInitializerHandler('DefineHandle', {type: this.ByLiteral(_ts_build_type_js__WEBPACK_IMPORTED_MODULE_2__["Type"]), name: this.Direct});
    this.registerInitializerHandler('InstantiateParticle',
      {id: this.Direct, spec: this.ByLiteral(_ts_build_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"]), handles: this.Map(this.Direct, this.Mapped)});

    this.registerHandler('UIEvent', {particle: this.Mapped, slotName: this.Direct, event: this.Direct});
    this.registerHandler('SimpleCallback', {callback: this.LocalMapped, data: this.Direct});
    this.registerHandler('AwaitIdle', {version: this.Direct});
    this.registerHandler('StartRender', {particle: this.Mapped, slotName: this.Direct, providedSlots: this.Map(this.Direct, this.Direct), contentTypes: this.List(this.Direct)});
    this.registerHandler('StopRender', {particle: this.Mapped, slotName: this.Direct});

    this.registerCall('Render', {particle: this.Mapped, slotName: this.Direct, content: this.Direct});
    this.registerCall('InitializeProxy', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('SynchronizeProxy', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('HandleGet', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('HandleToList', {handle: this.Mapped, callback: this.LocalMapped});
    this.registerCall('HandleSet', {handle: this.Mapped, data: this.Direct, particleId: this.Direct, barrier: this.Direct});
    this.registerCall('HandleClear', {handle: this.Mapped, particleId: this.Direct, barrier: this.Direct});
    this.registerCall('HandleStore', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleRemove', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleRemoveMultiple', {handle: this.Mapped, callback: this.LocalMapped, data: this.Direct, particleId: this.Direct});
    this.registerCall('HandleStream', {handle: this.Mapped, callback: this.LocalMapped, pageSize: this.Direct, forward: this.Direct});
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

    // To show stack traces for calls made inside the context, we need to capture the trace at the call point and
    // send it along with the message. We only want to do this after a DevTools connection has been detected, which
    // we can't directly detect inside a worker context, so the PECOuterPort will send an API message instead.
    this.registerHandler('DevToolsConnected', {});
    this.onDevToolsConnected = () => this._attachStack = true;
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
    const listeners = this.messageListeners.get(`${msg.arcId}/${msg.messageType}`);
    if (!listeners) {
      console.warn(`No one is listening to ${msg.messageType} message`);
    } else {
      for (const listener of listeners) listener(msg);
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
/* harmony import */ var _platform_sourcemapped_stacktrace_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/sourcemapped-stacktrace-web.js */ "./platform/sourcemapped-stacktrace-web.js");
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
  }

  handlePecMessage(name, pecMsgBody, pecMsgCount, stackString) {
    // Skip speculative and pipes arcs for now.
    if (this._arcIdString.endsWith('-pipes') || this._speculative) return;

    const stack = this._extractStackFrames(stackString);
    this._devtoolsChannel.send({
      messageType: 'PecLog',
      messageBody: {name, pecMsgBody, pecMsgCount, timestamp: Date.now(), stack},
    });
  }

  _extractStackFrames(stackString) {
    const stack = [];
    if (!stackString) return stack;

    // File refs should appear only in stack traces generated by tests run with
    // --explore set.
    if (stackString.includes('(file:///')) {
      // The slice discards the 'Error' text and the the stack frame
      // corresponding to the API channel function, which is already being
      // displayed in the log entry.
      for (const frameString of stackString.split('\n    at ').slice(2)) {
        let match = frameString.match(/^(.*) \((.*)\)$/);
        if (match === null) {
          match = {1: '<unknown>', 2: frameString};
        }

        let location = match[2].replace(/:[0-9]+$/, '');
        if (location.startsWith('file')) {
          // 'file:///<path>/arcs.*/runtime/file.js:84'
          // -> location: 'runtime/file.js:150'
          location = location.replace(/^.*\/arcs[^/]*\//, '');
        }
        stack.push({method: match[1], location, target: null, targetClass: 'noLink'});
      }
      return stack;
    }

    // The slice discards the stack frame corresponding to the API channel
    // function, which is already being displayed in the log entry.
    Object(_platform_sourcemapped_stacktrace_web_js__WEBPACK_IMPORTED_MODULE_0__["mapStackTrace"])(stackString, mapped => mapped.slice(1).map(frameString => {
      // Each frame has the form '    at function (source:line:column)'.
      // Extract the function name and source:line:column text, then set up
      // a frame object with the following fields:
      //   location: text to display as the source in devtools Arcs panel
      //   target: URL to open in devtools Sources panel
      //   targetClass: CSS class specifier to attach to the location text
      let match = frameString.match(/^ {4}at (.*) \((.*)\)$/);
      if (match === null) {
        match = {1: '<unknown>', 2: frameString.replace(/^ *at */, '')};
      }

      const frame = {method: match[1]};
      const source = match[2].replace(/:[0-9]+$/, '');
      if (source.startsWith('http')) {
        // 'http://<url>/arcs.*/shell/file.js:150'
        // -> location: 'shell/file.js:150', target: same as source
        frame.location = source.replace(/^.*\/arcs[^/]*\//, '');
        frame.target = source;
        frame.targetClass = 'link';
      } else if (source.startsWith('webpack')) {
        // 'webpack:///runtime/sub/file.js:18'
        // -> location: 'runtime/sub/file.js:18', target: 'webpack:///./runtime/sub/file.js:18'
        frame.location = source.slice(11);
        frame.target = `webpack:///./${frame.location}`;
        frame.targetClass = 'link';
      } else {
        // '<anonymous>' (or similar)
        frame.location = source;
        frame.target = null;
        frame.targetClass = 'noLink';
      }
      stack.push(frame);
    }), {sync: true, cacheGlobally: true});
    return stack;
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
/* harmony import */ var _ts_build_particle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/particle.js */ "./runtime/ts-build/particle.js");
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
class DomParticleBase extends _ts_build_particle_js__WEBPACK_IMPORTED_MODULE_1__["Particle"] {
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
    const slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    // Set this to support multiple slots consumed by a particle, without needing
    // to pass slotName to particle's render method, where it useless in most cases.
    this.currentSlotName = slotName;
    contentTypes.forEach(ct => slot.requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every slot
    if (this.shouldRender(...stateArgs)) {
      const content = {};
      if (slot.requestedContentTypes.has('template')) {
        content.template = this.getTemplate(slot.slotName);
      }
      if (slot.requestedContentTypes.has('model')) {
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
        slot.requestedContentTypes.add('template');
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
    await this.handles.get(handleName).clear();
    /*
    const handle = this.handles.get(handleName);
    if (handle.clear) {
      handle.clear();
    } else {
      const entities = await handle.toList();
      if (entities) {
        return Promise.all(entities.map(entity => handle.remove(entity)));
      }
    }
    */
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
    if (handle) {
      Promise.all(entities.map(entity => handle.store(entity)));
    }
  }
  /** @method appendRawDataToHandle(handleName, rawDataArray)
   * Create an entity from each rawData, and append to named handle.
   */
  async appendRawDataToHandle(handleName, rawDataArray) {
    const handle = this.handles.get(handleName);
    if (handle) {
      Promise.all(rawDataArray.map(raw => handle.store(new (handle.entityClass)(raw))));
    }
  }
  /** @method updateVariable(handleName, rawData)
   * Modify value of named handle. A new entity is created
   * from `rawData` (`new [EntityClass](rawData)`).
   */
  updateVariable(handleName, rawData) {
    const handle = this.handles.get(handleName);
    if (handle) {
      const entity = new (handle.entityClass)(rawData);
      handle.set(entity);
      return entity;
    }
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
    if (handle) {
      // const entities = await handle.toList();
      // const target = entities.find(r => r.id === entity.id);
      // if (target) {
      //   handle.remove(target);
      // }
      handle.remove(entity);
      handle.store(entity);
    }
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
    for (const name of this.config.handleNames) {
      const handle = handles.get(name);
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
    const config = this.config;
    // acquire (async) list data from handles; BigCollections map to the handle itself
    const data = await Promise.all(
      config.handleNames
      .map(name => this.handles.get(name))
      .map(handle => {
        if (handle.toList) return handle.toList();
        if (handle.get) return handle.get();
        return handle;
      })
    );
    // convert handle data (array) into props (dictionary)
    const props = Object.create(null);
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
/* harmony import */ var _ts_build_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ts-build/particle-spec.js */ "./runtime/ts-build/particle-spec.js");
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
    const otherMappedHandles = [];
    const otherConnections = [];
    let index = 2;
    const skipConnectionNames = [listHandleName, particleHandleName];
    for (const [connectionName, otherHandle] of handles) {
      if (skipConnectionNames.includes(connectionName)) {
        continue;
      }
      // TODO(wkorman): For items with embedded recipes we may need a map
      // (perhaps id to index) to make sure we don't map a handle into the inner
      // arc multiple times unnecessarily.
      otherMappedHandles.push(
          `use '${await arc.mapHandle(otherHandle._proxy)}' as v${index}`);
      const hostedOtherConnection = hostedParticle.connections.find(
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
    const arc = await this.constructInnerArc();
    const listHandleName = 'list';
    const particleHandleName = 'hostedParticle';
    const particleHandle = handles.get(particleHandleName);
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

    for (const [index, item] of this.getListEntries(list)) {
      let resolvedHostedParticle = hostedParticle;
      if (this.handleIds[item.id]) {
        const itemHandle = await this.handleIds[item.id];
        itemHandle.set(item);
        continue;
      }

      const itemHandlePromise =
          arc.createHandle(type.primitiveType(), 'item' + index);
      this.handleIds[item.id] = itemHandlePromise;

      const itemHandle = await itemHandlePromise;

      if (!resolvedHostedParticle) {
        // If we're muxing on behalf of an item with an embedded recipe, the
        // hosted particle should be retrievable from the item itself. Else we
        // just skip this item.
        if (!item.renderParticleSpec) {
          continue;
        }
        resolvedHostedParticle =
            _ts_build_particle_spec_js__WEBPACK_IMPORTED_MODULE_1__["ParticleSpec"].fromLiteral(JSON.parse(item.renderParticleSpec));
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
      const hostedSlotName = [...resolvedHostedParticle.slots.keys()][0];
      const slotName = [...this.spec.slots.values()][0].name;
      const slotId = await arc.createSlot(
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
    const subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
    if (!subId) {
      return;
    }
    const items = this._state.renderModel ? this._state.renderModel.items : [];
    const listIndex = items.findIndex(item => item.subId == subId);
    const item = Object.assign({}, content.model, {subId});
    if (listIndex >= 0 && listIndex < items.length) {
      items[listIndex] = item;
    } else {
      items.push(item);
    }
    this._setState({renderModel: {items}});
  }

  combineHostedTemplate(slotName, hostedSlotId, content) {
    const subId = this._itemSubIdByHostedSlotId.get(hostedSlotId);
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
const re = /<style>((?:.|[\r\n])*)<\/style>((?:.|[\r\n])*)/;

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

/***/ "./runtime/ts-build/converters/jsonldToManifest.js":
/*!*********************************************************!*\
  !*** ./runtime/ts-build/converters/jsonldToManifest.js ***!
  \*********************************************************/
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
const supportedTypes = ['Text', 'URL', 'Number', 'Boolean'];
class JsonldToManifest {
    static convert(jsonld, theClass = undefined) {
        const obj = JSON.parse(jsonld);
        const classes = {};
        const properties = {};
        if (!obj['@graph']) {
            obj['@graph'] = [obj];
        }
        for (const item of obj['@graph']) {
            if (item['@type'] === 'rdf:Property') {
                properties[item['@id']] = item;
            }
            else if (item['@type'] === 'rdfs:Class') {
                classes[item['@id']] = item;
                item['subclasses'] = [];
                item['superclass'] = null;
            }
        }
        for (const clazz of Object.values(classes)) {
            if (clazz['rdfs:subClassOf'] !== undefined) {
                if (clazz['rdfs:subClassOf'].length == undefined) {
                    clazz['rdfs:subClassOf'] = [clazz['rdfs:subClassOf']];
                }
                for (const subClass of clazz['rdfs:subClassOf']) {
                    const superclass = subClass['@id'];
                    if (clazz['superclass'] == undefined) {
                        clazz['superclass'] = [];
                    }
                    if (classes[superclass]) {
                        classes[superclass].subclasses.push(clazz);
                        clazz['superclass'].push(classes[superclass]);
                    }
                    else {
                        clazz['superclass'].push({ '@id': superclass });
                    }
                }
            }
        }
        for (const clazz of Object.values(classes)) {
            if (clazz['subclasses'].length === 0 && theClass == undefined) {
                theClass = clazz;
            }
        }
        const relevantProperties = [];
        for (const property of Object.values(properties)) {
            let domains = property['schema:domainIncludes'];
            if (!domains) {
                domains = { '@id': theClass['@id'] };
            }
            if (!domains.length) {
                domains = [domains];
            }
            domains = domains.map(a => a['@id']);
            if (domains.includes(theClass['@id'])) {
                const name = property['@id'].split(':')[1];
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
                    relevantProperties.push({ name, type });
                }
            }
        }
        const className = theClass['@id'].split(':')[1];
        const superNames = theClass && theClass.superclass ? theClass.superclass.map(a => a['@id'].split(':')[1]) : [];
        let s = '';
        for (const superName of superNames) {
            s += `import 'https://schema.org/${superName}'\n\n`;
        }
        s += `schema ${className}`;
        if (superNames.length > 0) {
            s += ` extends ${superNames.join(', ')}`;
        }
        if (relevantProperties.length > 0) {
            for (const property of relevantProperties) {
                let type;
                if (property.type.length > 1) {
                    type = '(' + property.type.join(' or ') + ')';
                }
                else {
                    type = property.type[0];
                }
                s += `\n  ${type} ${property.name}`;
            }
        }
        s += '\n';
        return s;
    }
}
//# sourceMappingURL=jsonldToManifest.js.map

/***/ }),

/***/ "./runtime/ts-build/entity.js":
/*!************************************!*\
  !*** ./runtime/ts-build/entity.js ***!
  \************************************/
/*! exports provided: Entity */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Entity", function() { return Entity; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _symbols_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./symbols.js */ "./runtime/ts-build/symbols.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


class Entity {
    constructor(userIDComponent) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!userIDComponent || userIDComponent.indexOf(':') === -1, 'user IDs must not contain the \':\' character');
        this[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = undefined;
        this.userIDComponent = userIDComponent;
    }
    get data() {
        return undefined;
    }
    getUserID() {
        return this.userIDComponent;
    }
    isIdentified() {
        return this[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] !== undefined;
    }
    // TODO: entity should not be exposing its IDs.
    get id() {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!!this.isIdentified());
        return this[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier];
    }
    identify(identifier) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this.isIdentified());
        this[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = identifier;
        const components = identifier.split(':');
        if (components[components.length - 2] === 'uid') {
            this.userIDComponent = components[components.length - 1];
        }
    }
    createIdentity(components) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(!this.isIdentified());
        let id;
        if (this.userIDComponent) {
            id = `${components.base}:uid:${this.userIDComponent}`;
        }
        else {
            id = `${components.base}:${components.component()}`;
        }
        this[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier] = id;
    }
    toLiteral() {
        return this.rawData;
    }
}
//# sourceMappingURL=entity.js.map

/***/ }),

/***/ "./runtime/ts-build/handle.js":
/*!************************************!*\
  !*** ./runtime/ts-build/handle.js ***!
  \************************************/
/*! exports provided: Handle, handleFor */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Handle", function() { return Handle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "handleFor", function() { return handleFor; });
/* harmony import */ var _reference_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./reference.js */ "./runtime/ts-build/reference.js");
/* harmony import */ var _symbols_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./symbols.js */ "./runtime/ts-build/symbols.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_spec_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./particle-spec.js */ "./runtime/ts-build/particle-spec.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
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
    const { id, rawData } = entry;
    const entity = new entityClass(cloneData(rawData));
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
    // TODO type particleId, marked as string, but called with number
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
            const keys = Object.keys(this.options);
            const badKeys = Object.keys(options).filter(o => !keys.includes(o));
            if (badKeys.length > 0) {
                throw new Error(`Invalid option in Handle.configure(): ${badKeys}`);
            }
            Object.assign(this.options, options);
        }
        catch (e) {
            this.raiseSystemException(e, 'Handle::configure');
            throw e;
        }
    }
    _serialize(entity) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(entity, 'can\'t serialize a null entity');
        if (!entity.isIdentified()) {
            entity.createIdentity(this._proxy.generateIDComponents());
        }
        const id = entity[_symbols_js__WEBPACK_IMPORTED_MODULE_1__["Symbols"].identifier];
        const rawData = entity.dataClone();
        return {
            id,
            rawData
        };
    }
    get type() {
        return this._proxy.type;
    }
    get _id() {
        return this._proxy.id;
    }
    async store(entity) {
        throw new Error('unimplemented');
    }
    toManifestString() {
        return `'${this._id}'`;
    }
}
/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set. A particle's manifest dictates the types of handles that
 * need to be connected to that particle, and the current recipe identifies
 * which handles are connected.
 */
class Collection extends Handle {
    _notify(kind, particle, details) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(this.canRead, '_notify should not be called for non-readable handles');
        switch (kind) {
            case 'sync':
                particle.onHandleSync(this, this._restore(details));
                return;
            case 'update': {
                // tslint:disable-next-line: no-any
                const update = {};
                if ('add' in details) {
                    update.added = this._restore(details.add);
                }
                if ('remove' in details) {
                    update.removed = this._restore(details.remove);
                }
                update.originator = details.originatorId === this._particleId;
                particle.onHandleUpdate(this, update);
                return;
            }
            case 'desync':
                particle.onHandleDesync(this);
                return;
            default:
                throw new Error('unsupported');
        }
    }
    /**
     * Returns the Entity specified by id contained by the handle, or null if this id is not
     * contained by the handle.
     * @throws {Error} if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
     * in the particle's manifest.
     */
    async get(id) {
        if (!this.canRead) {
            throw new Error('Handle not readable');
        }
        return this._restore([await this._proxy.get(id, this._particleId)])[0];
    }
    /**
     * @returns a list of the Entities contained by the handle.
     * @throws {Error} if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
     * in the particle's manifest.
     */
    async toList() {
        if (!this.canRead) {
            throw new Error('Handle not readable');
        }
        return this._restore(await this._proxy.toList());
    }
    _restore(list) {
        return (list !== null) ? list.map(a => restore(a, this.entityClass)) : null;
    }
    /**
     * Stores a new entity into the Handle.
     * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async store(entity) {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        const serialization = this._serialize(entity);
        const keys = [this._proxy.generateID() + 'key'];
        return this._proxy.store(serialization, keys, this._particleId);
    }
    /**
     * Removes all known entities from the Handle.
     * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async clear() {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        return this._proxy.clear(this._particleId);
    }
    /**
     * Removes an entity from the Handle.
     * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async remove(entity) {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        const serialization = this._serialize(entity);
        // Remove the keys that exist at storage/proxy.
        const keys = [];
        return this._proxy.remove(serialization.id, keys, this._particleId);
    }
}
/**
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
                }
                catch (e) {
                    this.raiseSystemException(e, `${particle.name}::onHandleSync`);
                }
                return;
            case 'update': {
                try {
                    await particle.onHandleUpdate(this, { data: this._restore(details.data) });
                }
                catch (e) {
                    this.raiseSystemException(e, `${particle.name}::onHandleUpdate`);
                }
                return;
            }
            case 'desync':
                try {
                    await particle.onHandleDesync(this);
                }
                catch (e) {
                    this.raiseSystemException(e, `${particle.name}::onHandleDesync`);
                }
                return;
            default:
                throw new Error('unsupported');
        }
    }
    /**
     * @returns the Entity contained by the Variable, or undefined if the Variable
     * is cleared.
     * @throws {Error} if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
     * in the particle's manifest.
     */
    async get() {
        if (!this.canRead) {
            throw new Error('Handle not readable');
        }
        const model = await this._proxy.get();
        return this._restore(model);
    }
    _restore(model) {
        if (model === null) {
            return null;
        }
        if (this.type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["EntityType"]) {
            return restore(model, this.entityClass);
        }
        if (this.type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["InterfaceType"]) {
            return _particle_spec_js__WEBPACK_IMPORTED_MODULE_3__["ParticleSpec"].fromLiteral(model);
        }
        if (this.type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["ReferenceType"]) {
            return new _reference_js__WEBPACK_IMPORTED_MODULE_0__["Reference"](model, this.type, this._proxy.pec);
        }
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_2__["assert"])(false, `Don't know how to deliver handle data of type ${this.type}`);
    }
    /**
     * Stores a new entity into the Variable, replacing any existing entity.
     * @throws {Error} if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async set(entity) {
        try {
            if (!this.canWrite) {
                throw new Error('Handle not writeable');
            }
            return this._proxy.set(this._serialize(entity), this._particleId);
        }
        catch (e) {
            this.raiseSystemException(e, 'Handle::set');
            throw e;
        }
    }
    /**
     * Clears any entity currently in the Variable.
     * @throws {Error} if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async clear() {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        return this._proxy.clear(this._particleId);
    }
}
/**
 * Provides paginated read access to a BigCollection. Conforms to the javascript iterator protocol
 * but is not marked as iterable because next() is async, which is currently not supported by
 * implicit iteration in Javascript.
 */
class Cursor {
    constructor(parent, cursorId) {
        this._parent = parent;
        this._cursorId = cursorId;
    }
    /**
     * Returns {value: [items], done: false} while there are items still available, or {done: true}
     * when the cursor has completed reading the collection.
     */
    async next() {
        const data = await this._parent._proxy.cursorNext(this._cursorId);
        if (!data.done) {
            data.value = data.value.map(a => restore(a, this._parent.entityClass));
        }
        return data;
    }
    /**
     * Terminates the streamed read. This must be called if a cursor is no longer needed but has not
     * yet completed streaming (i.e. next() hasn't returned {done: true}).
     */
    close() {
        this._parent._proxy.cursorClose(this._cursorId);
    }
}
/**
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
    /**
     * Stores a new entity into the Handle.
     * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async store(entity) {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        const serialization = this._serialize(entity);
        const keys = [this._proxy.generateID() + 'key'];
        return this._proxy.store(serialization, keys, this._particleId);
    }
    /**
     * Removes an entity from the Handle.
     * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     * in the particle's manifest.
     */
    async remove(entity) {
        if (!this.canWrite) {
            throw new Error('Handle not writeable');
        }
        const serialization = this._serialize(entity);
        return this._proxy.remove(serialization.id, this._particleId);
    }
    /**
     * @returns a Cursor instance that iterates over the full set of entities, reading `pageSize`
     * entities at a time. The cursor views a snapshot of the collection, locked to the version
     * at which the cursor is created.
     *
     * By default items are returned in order of original insertion into the collection (with the
     * caveat that items removed during a streamed read may be returned at the end). Set `forward`
     * to false to return items in reverse insertion order.
     *
     * @throws {Error} if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
     * in the particle's manifest.
     */
    async stream({ pageSize, forward = true }) {
        if (!this.canRead) {
            throw new Error('Handle not readable');
        }
        if (isNaN(pageSize) || pageSize < 1) {
            throw new Error('Streamed reads require a positive pageSize');
        }
        const cursorId = await this._proxy.stream(pageSize, forward);
        return new Cursor(this, cursorId);
    }
}
function handleFor(proxy, name = null, particleId = 0, canRead = true, canWrite = true) {
    let handle;
    if (proxy.type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["CollectionType"]) {
        handle = new Collection(proxy, name, particleId, canRead, canWrite);
    }
    else if (proxy.type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["BigCollectionType"]) {
        handle = new BigCollection(proxy, name, particleId, canRead, canWrite);
    }
    else {
        handle = new Variable(proxy, name, particleId, canRead, canWrite);
    }
    const type = proxy.type.getContainedType() || proxy.type;
    if (type instanceof _type_js__WEBPACK_IMPORTED_MODULE_4__["EntityType"]) {
        handle.entityClass = type.entitySchema.entityClass(proxy.pec);
    }
    return handle;
}
//# sourceMappingURL=handle.js.map

/***/ }),

/***/ "./runtime/ts-build/loader.js":
/*!************************************!*\
  !*** ./runtime/ts-build/loader.js ***!
  \************************************/
/*! exports provided: Loader */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Loader", function() { return Loader; });
/* harmony import */ var _platform_fs_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/fs-web.js */ "./platform/fs-web.js");
/* harmony import */ var _platform_vm_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../platform/vm-web.js */ "./platform/vm-web.js");
/* harmony import */ var _fetch_web_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../fetch-web.js */ "./runtime/fetch-web.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _particle_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./particle.js */ "./runtime/ts-build/particle.js");
/* harmony import */ var _dom_particle_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../dom-particle.js */ "./runtime/dom-particle.js");
/* harmony import */ var _multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../multiplexer-dom-particle.js */ "./runtime/multiplexer-dom-particle.js");
/* harmony import */ var _reference_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./reference.js */ "./runtime/ts-build/reference.js");
/* harmony import */ var _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../transformation-dom-particle.js */ "./runtime/transformation-dom-particle.js");
/* harmony import */ var _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./converters/jsonldToManifest.js */ "./runtime/ts-build/converters/jsonldToManifest.js");
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
        const path = fileName.replace(/[/][^/]+$/, '/');
        return path;
    }
    join(prefix, path) {
        if (/^https?:\/\//.test(path)) {
            return path;
        }
        // TODO: replace this with something that isn't hacky
        if (path[0] === '/' || path[1] === ':') {
            return path;
        }
        prefix = this.path(prefix);
        path = this.normalizeDots(`${prefix}${path}`);
        return path;
    }
    // convert `././foo/bar/../baz` to `./foo/baz`
    normalizeDots(path) {
        // only unix slashes
        path = path.replace(/\\/g, '/');
        // remove './'
        path = path.replace(/\/\.\//g, '/');
        // remove 'foo/..'
        const norm = s => s.replace(/(?:^|\/)[^./]*\/\.\./g, '');
        for (let n = norm(path); n !== path; path = n, n = norm(path))
            ;
        return path;
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
                }
                else {
                    resolve(data.toString('utf-8'));
                }
            });
        });
    }
    _loadURL(url) {
        if (/\/\/schema.org\//.test(url)) {
            if (url.endsWith('/Thing')) {
                return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])('https://schema.org/Product.jsonld').then(res => res.text()).then(data => _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__["JsonldToManifest"].convert(data, { '@id': 'schema:Thing' }));
            }
            return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])(url + '.jsonld').then(res => res.text()).then(data => _converters_jsonldToManifest_js__WEBPACK_IMPORTED_MODULE_9__["JsonldToManifest"].convert(data));
        }
        return Object(_fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"])(url).then(res => res.text());
    }
    async loadParticleClass(spec) {
        const clazz = await this.requireParticle(spec.implFile);
        clazz.spec = spec;
        return clazz;
    }
    async requireParticle(fileName) {
        if (fileName === null)
            fileName = '';
        const src = await this.loadResource(fileName);
        // Note. This is not real isolation.
        const script = new _platform_vm_web_js__WEBPACK_IMPORTED_MODULE_1__["vm"].Script(src, { filename: fileName, displayErrors: true });
        const result = [];
        const self = {
            defineParticle(particleWrapper) {
                result.push(particleWrapper);
            },
            console,
            fetch: _fetch_web_js__WEBPACK_IMPORTED_MODULE_2__["fetch"],
            setTimeout,
            importScripts: s => null //console.log(`(skipping browser-space import for [${s}])`)
        };
        script.runInNewContext(self, { filename: fileName, displayErrors: true });
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(result.length > 0 && typeof result[0] === 'function', `Error while instantiating particle implementation from ${fileName}`);
        return this.unwrapParticle(result[0]);
    }
    setParticleExecutionContext(pec) {
        this.pec = pec;
    }
    unwrapParticle(particleWrapper) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(this.pec);
        return particleWrapper({ Particle: _particle_js__WEBPACK_IMPORTED_MODULE_4__["Particle"], DomParticle: _dom_particle_js__WEBPACK_IMPORTED_MODULE_5__["DomParticle"], TransformationDomParticle: _transformation_dom_particle_js__WEBPACK_IMPORTED_MODULE_8__["TransformationDomParticle"], MultiplexerDomParticle: _multiplexer_dom_particle_js__WEBPACK_IMPORTED_MODULE_6__["MultiplexerDomParticle"], Reference: _reference_js__WEBPACK_IMPORTED_MODULE_7__["Reference"].newClientReference(this.pec), html });
    }
}
//# sourceMappingURL=loader.js.map

/***/ }),

/***/ "./runtime/ts-build/particle-execution-context.js":
/*!********************************************************!*\
  !*** ./runtime/ts-build/particle-execution-context.js ***!
  \********************************************************/
/*! exports provided: ParticleExecutionContext */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(global) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ParticleExecutionContext", function() { return ParticleExecutionContext; });
/* harmony import */ var _handle_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./handle.js */ "./runtime/ts-build/handle.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _api_channel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../api-channel.js */ "./runtime/api-channel.js");
/* harmony import */ var _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./storage-proxy.js */ "./runtime/ts-build/storage-proxy.js");
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
        this.particles = [];
        this._nextLocalID = 0;
        this.pendingLoads = [];
        this.scheduler = new _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxyScheduler"]();
        this.keyedProxies = {};
        this.apiPort = new _api_channel_js__WEBPACK_IMPORTED_MODULE_2__["PECInnerPort"](port);
        this.idBase = idBase;
        this.loader = loader;
        loader.setParticleExecutionContext(this);
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
        this.apiPort.onDefineHandle = ({ type, identifier, name }) => {
            return _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"].newProxy(identifier, type, this.apiPort, this, this.scheduler, name);
        };
        this.apiPort.onGetBackingStoreCallback = ({ type, id, name, callback, storageKey }) => {
            const proxy = _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"].newProxy(id, type, this.apiPort, this, this.scheduler, name);
            proxy.storageKey = storageKey;
            return [proxy, () => callback(proxy, storageKey)];
        };
        this.apiPort.onCreateHandleCallback = ({ type, id, name, callback }) => {
            const proxy = _storage_proxy_js__WEBPACK_IMPORTED_MODULE_3__["StorageProxy"].newProxy(id, type, this.apiPort, this, this.scheduler, name);
            return [proxy, () => callback(proxy)];
        };
        this.apiPort.onMapHandleCallback = ({ id, callback }) => {
            return [id, () => callback(id)];
        };
        this.apiPort.onCreateSlotCallback = ({ hostedSlotId, callback }) => {
            return [hostedSlotId, () => callback(hostedSlotId)];
        };
        this.apiPort.onInnerArcRender = ({ transformationParticle, transformationSlotName, hostedSlotId, content }) => {
            transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
        };
        this.apiPort.onStop = () => {
            if (global['close']) {
                global['close']();
            }
        };
        this.apiPort.onInstantiateParticle =
            ({ id, spec, handles }) => this._instantiateParticle(id, spec, handles);
        this.apiPort.onSimpleCallback = ({ callback, data }) => callback(data);
        this.apiPort.onConstructArcCallback = ({ callback, arc }) => callback(arc);
        this.apiPort.onAwaitIdle = ({ version }) => this.idle.then(a => {
            // TODO: dom-particles update is async, this is a workaround to allow dom-particles to
            // update relevance, after handles are updated. Needs better idle signal.
            setTimeout(() => { this.apiPort.Idle({ version, relevance: this.relevance }); }, 0);
        });
        this.apiPort.onUIEvent = ({ particle, slotName, event }) => particle.fireEvent(slotName, event);
        this.apiPort.onStartRender = ({ particle, slotName, providedSlots, contentTypes }) => {
            /**
             * A representation of a consumed slot. Retrieved from a particle using
             * particle.getSlot(name)
             */
            class Slotlet {
                constructor(pec, particle, slotName, providedSlots) {
                    this.handlers = new Map();
                    this.requestedContentTypes = new Set();
                    this._isRendered = false;
                    this.slotName = slotName;
                    this.particle = particle;
                    this.pec = pec;
                    this.providedSlots = providedSlots;
                }
                get isRendered() { return this._isRendered; }
                /**
                 * renders content to the slot.
                 */
                render(content) {
                    if (content.template && this.providedSlots.size > 0) {
                        content = Object.assign({}, content);
                        if (typeof content.template === 'string') {
                            content.template = this.substituteSlotNamesForIds(content.template);
                        }
                        else {
                            content.template = Object.entries(content.template).reduce((templateDictionary, [templateName, templateValue]) => {
                                templateDictionary[templateName] = this.substituteSlotNamesForIds(templateValue);
                                return templateDictionary;
                            }, {});
                        }
                    }
                    this.pec.apiPort.Render({ particle, slotName, content });
                    Object.keys(content).forEach(key => { this.requestedContentTypes.delete(key); });
                    // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
                    this._isRendered = this.requestedContentTypes.size === 0 && (Object.keys(content).length > 0);
                }
                substituteSlotNamesForIds(template) {
                    this.providedSlots.forEach((slotId, slotName) => {
                        // TODO: This is a simple string replacement right now,
                        // ensuring that 'slotid' is an attribute on an HTML element would be an improvement.
                        template = template.replace(new RegExp(`slotid=\"${slotName}\"`, 'gi'), `slotid="${slotId}"`);
                    });
                    return template;
                }
                /**
                 * registers a callback to be invoked when 'name' event happens.
                 */
                registerEventHandler(name, f) {
                    if (!this.handlers.has(name)) {
                        this.handlers.set(name, []);
                    }
                    this.handlers.get(name).push(f);
                }
                clearEventHandlers(name) {
                    this.handlers.set(name, []);
                }
                fireEvent(event) {
                    for (const handler of this.handlers.get(event.handler) || []) {
                        handler(event);
                    }
                }
            }
            particle._slotByName.set(slotName, new Slotlet(this, particle, slotName, providedSlots));
            particle.renderSlot(slotName, contentTypes);
        };
        this.apiPort.onStopRender = ({ particle, slotName }) => {
            Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(particle._slotByName.has(slotName), `Stop render called for particle ${particle.name} slot ${slotName} without start render being called.`);
            particle._slotByName.delete(slotName);
        };
    }
    generateIDComponents() {
        return { base: this.idBase, component: () => this._nextLocalID++ };
    }
    generateID() {
        return `${this.idBase}:${this._nextLocalID++}`;
    }
    innerArcHandle(arcId, particleId) {
        const pec = this;
        return {
            createHandle(type, name, hostParticle) {
                return new Promise((resolve, reject) => pec.apiPort.ArcCreateHandle({ arc: arcId, type, name, callback: proxy => {
                        const handle = Object(_handle_js__WEBPACK_IMPORTED_MODULE_0__["handleFor"])(proxy, name, particleId);
                        resolve(handle);
                        if (hostParticle) {
                            proxy.register(hostParticle, handle);
                        }
                    } }));
            },
            mapHandle(handle) {
                return new Promise((resolve, reject) => pec.apiPort.ArcMapHandle({ arc: arcId, handle, callback: id => {
                        resolve(id);
                    } }));
            },
            createSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId) {
                // handleId: the ID of a handle (returned by `createHandle` above) this slot is rendering; null - if not applicable.
                // TODO: support multiple handle IDs.
                return new Promise((resolve, reject) => pec.apiPort.ArcCreateSlot({ arc: arcId, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId, callback: hostedSlotId => {
                        resolve(hostedSlotId);
                    } }));
            },
            loadRecipe(recipe) {
                // TODO: do we want to return a promise on completion?
                return new Promise((resolve, reject) => pec.apiPort.ArcLoadRecipe({
                    arc: arcId,
                    recipe,
                    callback: a => {
                        if (a == undefined) {
                            resolve();
                        }
                        else {
                            reject(a);
                        }
                    }
                }));
            }
        };
    }
    getStorageProxy(storageKey, type) {
        if (!this.keyedProxies[storageKey]) {
            this.keyedProxies[storageKey] = new Promise((resolve, reject) => {
                this.apiPort.GetBackingStore({ storageKey, type, callback: (proxy, storageKey) => {
                        this.keyedProxies[storageKey] = proxy;
                        resolve(proxy);
                    } });
            });
        }
        return this.keyedProxies[storageKey];
    }
    defaultCapabilitySet() {
        return {
            constructInnerArc: particle => {
                return new Promise((resolve, reject) => this.apiPort.ConstructInnerArc({ callback: arcId => { resolve(this.innerArcHandle(arcId, particle.id)); }, particle }));
            }
        };
    }
    async _instantiateParticle(id, spec, proxies) {
        const name = spec.name;
        let resolve = null;
        const p = new Promise(res => resolve = res);
        this.pendingLoads.push(p);
        const clazz = await this.loader.loadParticleClass(spec);
        const capabilities = this.defaultCapabilitySet();
        const particle = new clazz(); // TODO: how can i add an argument to DomParticle ctor?
        particle.id = id;
        particle.capabilities = capabilities;
        this.particles.push(particle);
        const handleMap = new Map();
        const registerList = [];
        proxies.forEach((proxy, name) => {
            const connSpec = spec.connectionMap.get(name);
            const handle = Object(_handle_js__WEBPACK_IMPORTED_MODULE_0__["handleFor"])(proxy, name, id, connSpec.isInput, connSpec.isOutput);
            handleMap.set(name, handle);
            // Defer registration of handles with proxies until after particles have a chance to
            // configure them in setHandles.
            registerList.push({ proxy, particle, handle });
        });
        return [particle, async () => {
                await particle.setHandles(handleMap);
                registerList.forEach(({ proxy, particle, handle }) => proxy.register(particle, handle));
                const idx = this.pendingLoads.indexOf(p);
                this.pendingLoads.splice(idx, 1);
                resolve();
            }];
    }
    get relevance() {
        const rMap = new Map();
        this.particles.forEach(p => {
            if (p.relevances.length === 0) {
                return;
            }
            rMap.set(p, p.relevances);
            p.relevances = [];
        });
        return rMap;
    }
    get busy() {
        if (this.pendingLoads.length > 0 || this.scheduler.busy) {
            return true;
        }
        if (this.particles.filter(particle => particle.busy).length > 0) {
            return true;
        }
        return false;
    }
    get idle() {
        if (!this.busy) {
            return Promise.resolve();
        }
        const busyParticlePromises = this.particles.filter(particle => particle.busy).map(particle => particle.idle);
        return Promise.all([this.scheduler.idle, ...this.pendingLoads, ...busyParticlePromises]).then(() => this.idle);
    }
}
//# sourceMappingURL=particle-execution-context.js.map
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./runtime/ts-build/particle-spec.js":
/*!*******************************************!*\
  !*** ./runtime/ts-build/particle-spec.js ***!
  \*******************************************/
/*! exports provided: ConnectionSpec, SlotSpec, ProvidedSlotSpec, ParticleSpec */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ConnectionSpec", function() { return ConnectionSpec; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SlotSpec", function() { return SlotSpec; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ProvidedSlotSpec", function() { return ProvidedSlotSpec; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ParticleSpec", function() { return ParticleSpec; });
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./recipe/type-checker.js */ "./runtime/ts-build/recipe/type-checker.js");
/* harmony import */ var _shape_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./shape.js */ "./runtime/ts-build/shape.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
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
        this.parentConnection = null;
        this.rawData = rawData;
        this.direction = rawData.direction;
        this.name = rawData.name;
        this.type = rawData.type.mergeTypeVariablesByName(typeVarMap);
        this.isOptional = rawData.isOptional;
        this.tags = rawData.tags || [];
        this.dependentConnections = [];
    }
    instantiateDependentConnections(particle, typeVarMap) {
        for (const dependentArg of this.rawData.dependentConnections) {
            const dependentConnection = particle.createConnection(dependentArg, typeVarMap);
            dependentConnection.parentConnection = this;
            this.dependentConnections.push(dependentConnection);
        }
    }
    get isInput() {
        // TODO: we probably don't really want host to be here.
        return this.direction === 'in' || this.direction === 'inout' || this.direction === 'host';
    }
    get isOutput() {
        return this.direction === 'out' || this.direction === 'inout';
    }
    isCompatibleType(type) {
        return _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_1__["TypeChecker"].compareTypes({ type }, { type: this.type, direction: this.direction });
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
        return this.providedSlots.find(ps => ps.name === name);
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
        this.model = model;
        this.name = model.name;
        this.verbs = model.verbs;
        const typeVarMap = new Map();
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
        this.modality = model.modality;
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
        const connection = new ConnectionSpec(arg, typeVarMap);
        this.connections.push(connection);
        connection.instantiateDependentConnections(this, typeVarMap);
        return connection;
    }
    isInput(param) {
        for (const input of this.inputs)
            if (input.name === param)
                return true;
        return false;
    }
    isOutput(param) {
        for (const outputs of this.outputs)
            if (outputs.name === param)
                return true;
        return false;
    }
    getSlotSpec(slotName) {
        return this.slots.get(slotName);
    }
    get primaryVerb() {
        return (this.verbs.length > 0) ? this.verbs[0] : undefined;
    }
    matchModality(modality) {
        return this.slots.size <= 0 || this.modality.includes(modality);
    }
    toLiteral() {
        const { args, name, verbs, description, implFile, modality, slots } = this.model;
        const connectionToLiteral = ({ type, direction, name, isOptional, dependentConnections }) => ({ type: type.toLiteral(), direction, name, isOptional, dependentConnections: dependentConnections.map(connectionToLiteral) });
        const argsLiteral = args.map(a => connectionToLiteral(a));
        return { args: argsLiteral, name, verbs, description, implFile, modality, slots };
    }
    static fromLiteral(literal) {
        let { args, name, verbs, description, implFile, modality, slots } = literal;
        const connectionFromLiteral = ({ type, direction, name, isOptional, dependentConnections }) => ({ type: _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(type), direction, name, isOptional, dependentConnections: dependentConnections ? dependentConnections.map(connectionFromLiteral) : [] });
        args = args.map(connectionFromLiteral);
        return new ParticleSpec({ args, name, verbs: verbs || [], description, implFile, modality, slots });
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
        return _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newInterface(this._toShape());
    }
    _toShape() {
        const handles = this.model.args;
        // TODO: wat do?
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_3__["assert"])(!this.slots.size, 'please implement slots toShape');
        const slots = [];
        return new _shape_js__WEBPACK_IMPORTED_MODULE_2__["Shape"](this.name, handles, slots);
    }
    toString() {
        const results = [];
        let verbs = '';
        if (this.verbs.length > 0) {
            verbs = ' ' + this.verbs.map(verb => `&${verb}`).join(' ');
        }
        results.push(`particle ${this.name}${verbs} in '${this.implFile}'`.trim());
        const indent = '  ';
        const writeConnection = (connection, indent) => {
            const tags = connection.tags.map((tag) => ` #${tag}`).join('');
            results.push(`${indent}${connection.direction}${connection.isOptional ? '?' : ''} ${connection.type.toString()} ${connection.name}${tags}`);
            for (const dependent of connection.dependentConnections) {
                writeConnection(dependent, indent + '  ');
            }
        };
        for (const connection of this.connections) {
            if (connection.parentConnection) {
                continue;
            }
            writeConnection(connection, indent);
        }
        this.modality.filter(a => a !== 'mock').forEach(a => results.push(`  modality ${a}`));
        this.slots.forEach(s => {
            // Consume slot.
            const consume = [];
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
                const provide = [];
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
//# sourceMappingURL=particle-spec.js.map

/***/ }),

/***/ "./runtime/ts-build/particle.js":
/*!**************************************!*\
  !*** ./runtime/ts-build/particle.js ***!
  \**************************************/
/*! exports provided: Particle */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Particle", function() { return Particle; });
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
class Particle {
    constructor(capabilities) {
        this.relevances = [];
        this._idle = Promise.resolve();
        this._busy = 0;
        // Only used by a Slotlet class in particle-execution-context
        // tslint:disable-next-line: no-any
        this._slotByName = new Map();
        // Typescript only sees this.constructor as a Function type.
        // TODO(shans): move spec off the constructor
        this.spec = this.constructor['spec'];
        if (this.spec.inputs.length === 0) {
            this.extraData = true;
        }
        this.capabilities = capabilities || {};
    }
    /**
     * This method is invoked with a handle for each store this particle
     * is registered to interact with, once those handles are ready for
     * interaction. Override the method to register for events from
     * the handles.
     *
     * @param handles a map from handle names to store handles.
     */
    setHandles(handles) {
    }
    /**
     * This method is deprecated. Use setHandles instead.
     */
    setViews(views) {
    }
    /**
     * Called for handles that are configured with both keepSynced and notifySync, when they are
     * updated with the full model of their data. This will occur once after setHandles() and any time
     * thereafter if the handle is resynchronized.
     *
     * @param handle The Handle instance that was updated.
     * @param model For Variable-backed Handles, the Entity data or null if the Variable is not set.
     *        For Collection-backed Handles, the Array of Entities, which may be empty.
     */
    onHandleSync(handle, model) {
    }
    /**
     * Called for handles that are configued with notifyUpdate, when change events are received from
     * the backing store. For handles also configured with keepSynced these events will be correctly
     * ordered, with some potential skips if a desync occurs. For handles not configured with
     * keepSynced, all change events will be passed through as they are received.
     *
     * @param handle The Handle instance that was updated.
     * @param update An object containing one of the following fields:
     *  - data: The full Entity for a Variable-backed Handle.
     *  - added: An Array of Entities added to a Collection-backed Handle.
     *  - removed: An Array of Entities removed from a Collection-backed Handle.
     */
    // tslint:disable-next-line: no-any
    onHandleUpdate(handle, update) {
    }
    /**
     * Called for handles that are configured with both keepSynced and notifyDesync, when they are
     * detected as being out-of-date against the backing store. For Variables, the event that triggers
     * this will also resync the data and thus this call may usually be ignored. For Collections, the
     * underlying proxy will automatically request a full copy of the stored data to resynchronize.
     * onHandleSync will be invoked when that is received.
     *
     * @param handle The Handle instance that was desynchronized.
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
        if (this._busy === 0) {
            this._idle = new Promise(resolve => this._idleResolver = resolve);
        }
        this._busy++;
    }
    doneBusy() {
        this._busy--;
        if (this._busy === 0) {
            this._idleResolver();
        }
    }
    inputs() {
        return this.spec.inputs;
    }
    outputs() {
        return this.spec.outputs;
    }
    /**
     * Returns the slot with provided name.
     */
    getSlot(name) {
        return this._slotByName.get(name);
    }
    static buildManifest(strings, ...bits) {
        const output = [];
        for (let i = 0; i < bits.length; i++) {
            const str = strings[i];
            const indent = / *$/.exec(str)[0];
            let bitStr;
            if (typeof bits[i] === 'string') {
                bitStr = bits[i];
            }
            else {
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
        const descriptions = this.handles.get('descriptions');
        if (descriptions) {
            // Typescript can't infer the type here and fails with TS2351
            // tslint:disable-next-line: no-any
            const entityClass = descriptions.entityClass;
            descriptions.store(new entityClass({ key: connectionName, value: pattern }, this.spec.name + '-' + connectionName));
            return true;
        }
        throw new Error('A particle needs a description handle to set a decription pattern');
    }
}
//# sourceMappingURL=particle.js.map

/***/ }),

/***/ "./runtime/ts-build/recipe/type-checker.js":
/*!*************************************************!*\
  !*** ./runtime/ts-build/recipe/type-checker.js ***!
  \*************************************************/
/*! exports provided: TypeChecker */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TypeChecker", function() { return TypeChecker; });
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _type_variable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../type-variable.js */ "./runtime/ts-build/type-variable.js");
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
        const newBaseTypeVariable = new _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"]('', null, null);
        if (baseType) {
            newBaseTypeVariable.resolution = baseType;
        }
        const newBaseType = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newVariable(newBaseTypeVariable);
        baseType = newBaseType;
        const concreteTypes = [];
        // baseType might be a variable (and is definitely a variable if no baseType was available).
        // Some of the list might contain variables too.
        // First attempt to merge all the variables into the baseType
        //
        // If the baseType is a variable then this results in a single place to manipulate the constraints
        // of all the other connected variables at the same time.
        for (const item of list) {
            if (item.type.resolvedType().hasVariable) {
                baseType = TypeChecker._tryMergeTypeVariable(baseType, item.type);
                if (baseType == null) {
                    return null;
                }
            }
            else {
                concreteTypes.push(item);
            }
        }
        for (const item of concreteTypes) {
            if (!TypeChecker._tryMergeConstraints(baseType, item)) {
                return null;
            }
        }
        const getResolution = candidate => {
            if (!(candidate instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"])) {
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
        const candidate = baseType.resolvedType();
        if (candidate instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["CollectionType"]) {
            const resolution = getResolution(candidate.collectionType);
            return (resolution !== null) ? resolution.collectionOf() : null;
        }
        if (candidate instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["BigCollectionType"]) {
            const resolution = getResolution(candidate.bigCollectionType);
            return (resolution !== null) ? resolution.bigCollectionOf() : null;
        }
        return getResolution(candidate);
    }
    static _tryMergeTypeVariable(base, onto) {
        const [primitiveBase, primitiveOnto] = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(base.resolvedType(), onto.resolvedType());
        if (primitiveBase instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
            if (primitiveOnto instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
                // base, onto both variables.
                const result = primitiveBase.variable.maybeMergeConstraints(primitiveOnto.variable);
                if (result === false) {
                    return null;
                }
                // Here onto grows, one level at a time,
                // as we assign new resolution to primitiveOnto, which is a leaf.
                primitiveOnto.variable.resolution = primitiveBase;
            }
            else {
                // base variable, onto not.
                primitiveBase.variable.resolution = primitiveOnto;
            }
            return base;
        }
        else if (primitiveOnto instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
            // onto variable, base not.
            primitiveOnto.variable.resolution = primitiveBase;
            return onto;
        }
        else if (primitiveBase instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["InterfaceType"] && primitiveOnto instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["InterfaceType"]) {
            const result = primitiveBase.interfaceShape.tryMergeTypeVariablesWith(primitiveOnto.interfaceShape);
            if (result == null) {
                return null;
            }
            return _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newInterface(result);
        }
        else if ((primitiveBase.isTypeContainer() && primitiveBase.hasVariable)
            || (primitiveOnto.isTypeContainer() && primitiveOnto.hasVariable)) {
            // Cannot merge [~a] with a type that is not a variable and not a collection.
            return null;
        }
        throw new Error('tryMergeTypeVariable shouldn\'t be called on two types without any type variables');
    }
    static _tryMergeConstraints(handleType, { type, direction }) {
        let [primitiveHandleType, primitiveConnectionType] = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(handleType.resolvedType(), type.resolvedType());
        if (primitiveHandleType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
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
                const newVar = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newVariable(new _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"]('a', null, null));
                if (primitiveConnectionType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["CollectionType"]) {
                    primitiveHandleType.variable.resolution = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newCollection(newVar);
                }
                else if (primitiveConnectionType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["BigCollectionType"]) {
                    primitiveHandleType.variable.resolution = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newBigCollection(newVar);
                }
                else {
                    primitiveHandleType.variable.resolution = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newReference(newVar);
                }
                const unwrap = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(primitiveHandleType.resolvedType(), primitiveConnectionType);
                [primitiveHandleType, primitiveConnectionType] = unwrap;
            }
            if (direction === 'out' || direction === 'inout' || direction === '`provide') {
                // the canReadSubset of the handle represents the maximal type that can be read from the
                // handle, so we need to intersect out any type that is more specific than the maximal type
                // that could be written.
                if (!primitiveHandleType.variable.maybeMergeCanReadSubset(primitiveConnectionType.canWriteSuperset)) {
                    return false;
                }
            }
            if (direction === 'in' || direction === 'inout' || direction === '`consume') {
                // the canWriteSuperset of the handle represents the maximum lower-bound type that is read from the handle,
                // so we need to union it with the type that wants to be read here.
                if (!primitiveHandleType.variable.maybeMergeCanWriteSuperset(primitiveConnectionType.canReadSubset)) {
                    return false;
                }
            }
        }
        else {
            if (primitiveConnectionType.tag !== primitiveHandleType.tag) {
                return false;
            }
            if (direction === 'out' || direction === 'inout') {
                if (!TypeChecker._writeConstraintsApply(primitiveHandleType, primitiveConnectionType)) {
                    return false;
                }
            }
            if (direction === 'in' || direction === 'inout') {
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
        const writtenType = connectionType.canWriteSuperset;
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
        const readType = connectionType.canReadSubset;
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
        const resolvedLeft = left.type.resolvedType();
        const resolvedRight = right.type.resolvedType();
        const [leftType, rightType] = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].unwrapPair(resolvedLeft, resolvedRight);
        // a variable is compatible with a set only if it is unconstrained.
        if (leftType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"] && rightType.isTypeContainer()) {
            return !(leftType.variable.canReadSubset || leftType.variable.canWriteSuperset);
        }
        if (rightType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"] && leftType.isTypeContainer()) {
            return !(rightType.variable.canReadSubset || rightType.variable.canWriteSuperset);
        }
        if (leftType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"] || rightType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
            // TODO: everything should use this, eventually. Need to implement the
            // right functionality in Shapes first, though.
            return _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].canMergeConstraints(leftType, rightType);
        }
        if ((leftType === undefined) !== (rightType === undefined)) {
            return false;
        }
        if (leftType === rightType) {
            return true;
        }
        if (leftType.tag !== rightType.tag) {
            return false;
        }
        if (leftType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["SlotType"]) {
            return true;
        }
        // TODO: we need a generic way to evaluate type compatibility
        //       shapes + entities + etc
        if (leftType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["InterfaceType"] && rightType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["InterfaceType"]) {
            if (leftType.interfaceShape.equals(rightType.interfaceShape)) {
                return true;
            }
        }
        if (!(leftType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["EntityType"]) || !(rightType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["EntityType"])) {
            return false;
        }
        const leftIsSub = leftType.entitySchema.isMoreSpecificThan(rightType.entitySchema);
        const leftIsSuper = rightType.entitySchema.isMoreSpecificThan(leftType.entitySchema);
        if (leftIsSuper && leftIsSub) {
            return true;
        }
        if (!leftIsSuper && !leftIsSub) {
            return false;
        }
        const [superclass, subclass] = leftIsSuper ? [left, right] : [right, left];
        // treat handle types as if they were 'inout' connections. Note that this
        // guarantees that the handle's type will be preserved, and that the fact
        // that the type comes from a handle rather than a connection will also
        // be preserved.
        const superDirection = superclass.direction || (superclass.connection ? superclass.connection.direction : 'inout');
        const subDirection = subclass.direction || (subclass.connection ? subclass.connection.direction : 'inout');
        if (superDirection === 'in') {
            return true;
        }
        if (subDirection === 'out') {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=type-checker.js.map

/***/ }),

/***/ "./runtime/ts-build/reference.js":
/*!***************************************!*\
  !*** ./runtime/ts-build/reference.js ***!
  \***************************************/
/*! exports provided: Reference */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Reference", function() { return Reference; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _handle_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./handle.js */ "./runtime/ts-build/handle.js");
/** @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */



var ReferenceMode;
(function (ReferenceMode) {
    ReferenceMode[ReferenceMode["Unstored"] = 0] = "Unstored";
    ReferenceMode[ReferenceMode["Stored"] = 1] = "Stored";
})(ReferenceMode || (ReferenceMode = {}));
class Reference {
    constructor(data, type, context) {
        this.entity = null;
        this.storageProxy = null;
        this.handle = null;
        this.id = data.id;
        this.storageKey = data.storageKey;
        this.context = context;
        this.type = type;
    }
    async ensureStorageProxy() {
        if (this.storageProxy == null) {
            this.storageProxy = await this.context.getStorageProxy(this.storageKey, this.type.referredType);
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
    static newClientReference(context) {
        return class extends Reference {
            constructor(entity) {
                // TODO(shans): start carrying storageKey information around on Entity objects
                super({ id: entity.id, storageKey: null }, new _type_js__WEBPACK_IMPORTED_MODULE_1__["ReferenceType"](entity.constructor.type), context);
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
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./recipe/type-checker.js */ "./runtime/ts-build/recipe/type-checker.js");
/* harmony import */ var _entity_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./entity.js */ "./runtime/ts-build/entity.js");
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
    static fromLiteral(data = { fields: {}, names: [], description: {} }) {
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
            static get type() {
                // TODO: should the entity's key just be its type?
                // Should it just be called type in that case?
                return _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].newEntity(this.key.schema);
            }
            static get key() {
                return {
                    tag: 'entity',
                    schema,
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
        const names = this.names.join(' ') || '*';
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
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./recipe/type-checker.js */ "./runtime/ts-build/recipe/type-checker.js");
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
        return (reference instanceof _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"]) && reference.hasProperty(r => r instanceof _type_js__WEBPACK_IMPORTED_MODULE_1__["VariableType"]);
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
        const [left, right] = _type_js__WEBPACK_IMPORTED_MODULE_1__["Type"].unwrapPair(shapeHandle.type, particleHandle.type);
        if (left instanceof _type_js__WEBPACK_IMPORTED_MODULE_1__["VariableType"]) {
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
            else if (constraint.var.variable.resolution instanceof _type_js__WEBPACK_IMPORTED_MODULE_1__["VariableType"]) {
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

/***/ "./runtime/ts-build/storage-proxy.js":
/*!*******************************************!*\
  !*** ./runtime/ts-build/storage-proxy.js ***!
  \*******************************************/
/*! exports provided: StorageProxy, CollectionProxy, VariableProxy, BigCollectionProxy, StorageProxyScheduler */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StorageProxy", function() { return StorageProxy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CollectionProxy", function() { return CollectionProxy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "VariableProxy", function() { return VariableProxy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BigCollectionProxy", function() { return BigCollectionProxy; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StorageProxyScheduler", function() { return StorageProxyScheduler; });
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./storage/crdt-collection-model.js */ "./runtime/ts-build/storage/crdt-collection-model.js");
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */




var SyncState;
(function (SyncState) {
    SyncState[SyncState["none"] = 0] = "none";
    SyncState[SyncState["pending"] = 1] = "pending";
    SyncState[SyncState["full"] = 2] = "full";
})(SyncState || (SyncState = {}));
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
        this.localIDComponent = 0;
        this.version = undefined;
        this.listenerAttached = false;
        this.keepSynced = false;
        this.synchronized = SyncState.none;
        this.observers = [];
        this.updates = [];
        this.barrier = null;
        this.id = id;
        this.type = type;
        this.port = port;
        this.scheduler = scheduler;
        this.name = name;
        this.baseForNewID = pec.generateID();
        this.updates = [];
        this.pec = pec;
    }
    static newProxy(id, type, port, pec, scheduler, name) {
        if (type instanceof _type_js__WEBPACK_IMPORTED_MODULE_2__["CollectionType"]) {
            return new CollectionProxy(id, type, port, pec, scheduler, name);
        }
        if (type instanceof _type_js__WEBPACK_IMPORTED_MODULE_2__["BigCollectionType"]) {
            return new BigCollectionProxy(id, type, port, pec, scheduler, name);
        }
        return new VariableProxy(id, type, port, pec, scheduler, name);
    }
    raiseSystemException(exception, methodName, particleId) {
        this.port.RaiseSystemException({ exception: { message: exception.message, stack: exception.stack, name: exception.name }, methodName, particleId });
    }
    /**
     *  Called by ParticleExecutionContext to associate (potentially multiple) particle/handle pairs with this proxy.
     */
    register(particle, handle) {
        if (!handle.canRead) {
            return;
        }
        this.observers.push({ particle, handle });
        // Attach an event listener to the backing store when the first readable handle is registered.
        if (!this.listenerAttached) {
            this.port.InitializeProxy({ handle: this, callback: x => this._onUpdate(x) });
            this.listenerAttached = true;
        }
        // Change to synchronized mode as soon as we get any handle configured with keepSynced and send
        // a request to get the full model (once).
        // TODO: drop back to non-sync mode if all handles re-configure to !keepSynced
        if (handle.options.keepSynced) {
            if (!this.keepSynced) {
                this.port.SynchronizeProxy({ handle: this, callback: x => this._onSynchronize(x) });
                this.keepSynced = true;
            }
            // If a handle configured for sync notifications registers after we've received the full
            // model, notify it immediately.
            if (handle.options.notifySync && this.synchronized === SyncState.full) {
                const syncModel = this._getModelForSync();
                this.scheduler.enqueue(particle, handle, ['sync', particle, syncModel]);
            }
        }
    }
    _onSynchronize({ version, model }) {
        if (this.version !== undefined && version <= this.version) {
            console.warn(`StorageProxy '${this.id}' received stale model version ${version}; ` +
                `current is ${this.version}`);
            return;
        }
        // Replace the stored data with the new one and notify handles that are configured for it.
        if (!this._synchronizeModel(version, model)) {
            return;
        }
        // We may have queued updates that were received after a desync; discard any that are stale
        // with respect to the received model.
        this.synchronized = SyncState.full;
        while (this.updates.length > 0 && this.updates[0].version <= version) {
            this.updates.shift();
        }
        const syncModel = this._getModelForSync();
        this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);
        this._processUpdates();
    }
    _onUpdate(update) {
        // Immediately notify any handles that are not configured with keepSynced but do want updates.
        if (this.observers.find(({ handle }) => !handle.options.keepSynced && handle.options.notifyUpdate)) {
            const handleUpdate = this._processUpdate(update, false);
            this._notify('update', handleUpdate, options => !options.keepSynced && options.notifyUpdate);
        }
        // Bail if we're not in synchronized mode or this is a stale event.
        if (!this.keepSynced) {
            return;
        }
        if (update.version <= this.version) {
            console.warn(`StorageProxy '${this.id}' received stale update version ${update.version}; ` +
                `current is ${this.version}`);
            return;
        }
        // Add the update to the queue and process. Most of the time the queue should be empty and
        // _processUpdates will consume this event immediately.
        this.updates.push(update);
        this.updates.sort((a, b) => a.version - b.version);
        this._processUpdates();
    }
    _notify(kind, details, predicate = (ignored) => true) {
        for (const { handle, particle } of this.observers) {
            if (predicate(handle.options)) {
                this.scheduler.enqueue(particle, handle, [kind, particle, details]);
            }
        }
    }
    _processUpdates() {
        const updateIsNext = update => {
            if (update.version === this.version + 1) {
                return true;
            }
            // Holy Layering Violation Batman
            // 
            // If we are a variable waiting for a barriered set response
            // then that set response *is* the next thing we're waiting for,
            // regardless of version numbers.
            //
            // TODO(shans): refactor this code so we don't need to layer-violate. 
            if (this.barrier && update.barrier === this.barrier) {
                return true;
            }
            return false;
        };
        // Consume all queued updates whose versions are monotonically increasing from our stored one.
        while (this.updates.length > 0 && updateIsNext(this.updates[0])) {
            const update = this.updates.shift();
            // Fold the update into our stored model.
            const handleUpdate = this._processUpdate(update);
            this.version = update.version;
            // Notify handles configured with keepSynced and notifyUpdates (non-keepSynced handles are
            // notified as updates are received).
            if (handleUpdate) {
                this._notify('update', handleUpdate, options => options.keepSynced && options.notifyUpdate);
            }
        }
        // If we still have update events queued, we must have received a future version are are now
        // desynchronized. Send a request for the full model and notify handles configured for it.
        if (this.updates.length > 0) {
            if (this.synchronized !== SyncState.none) {
                this.synchronized = SyncState.none;
                this.port.SynchronizeProxy({ handle: this, callback: x => this._onSynchronize(x) });
                for (const { handle, particle } of this.observers) {
                    if (handle.options.notifyDesync) {
                        this.scheduler.enqueue(particle, handle, ['desync', particle]);
                    }
                }
            }
        }
        else if (this.synchronized !== SyncState.full) {
            // If we were desynced but have now consumed all update events, we've caught up.
            this.synchronized = SyncState.full;
        }
    }
    generateID() {
        return `${this.baseForNewID}:${this.localIDComponent++}`;
    }
    generateIDComponents() {
        return { base: this.baseForNewID, component: () => this.localIDComponent++ };
    }
}
/**
 * Collections are synchronized in a CRDT Observed/Removed scheme.
 * Each value is identified by an ID and a set of membership keys.
 * Concurrent adds of the same value will specify the same ID but different
 * keys. A value is removed by removing all of the observed keys. A value
 * is considered to be removed if all of it's keys have been removed.
 *
 * In synchronized mode mutation takes place synchronously inside the proxy.
 * The proxy uses the originatorId to skip over redundant events sent back
 * by the storage object.
 *
 * In unsynchronized mode removal is not based on the keys observed at the
 * proxy, since the proxy does not remember the state, but instead the set
 * of keys that exist at the storage object at the time it receives the
 * request.
 */
class CollectionProxy extends StorageProxy {
    constructor() {
        super(...arguments);
        this.model = new _storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__["CrdtCollectionModel"]();
    }
    _getModelForSync() {
        return this.model.toList();
    }
    _synchronizeModel(version, model) {
        this.version = version;
        this.model = new _storage_crdt_collection_model_js__WEBPACK_IMPORTED_MODULE_1__["CrdtCollectionModel"](model);
        return true;
    }
    _processUpdate(update, apply = true) {
        if (this.synchronized === SyncState.full) {
            // If we're synchronized, then any updates we sent have
            // already been applied/notified.
            for (const { handle } of this.observers) {
                if (update.originatorId === handle._particleId) {
                    return null;
                }
            }
        }
        const added = [];
        const removed = [];
        if ('add' in update) {
            for (const { value, keys, effective } of update.add) {
                if (apply && this.model.add(value.id, value, keys) || !apply && effective) {
                    added.push(value);
                }
            }
        }
        else if ('remove' in update) {
            for (const { value, keys, effective } of update.remove) {
                const localValue = this.model.getValue(value.id);
                if (apply && this.model.remove(value.id, keys) || !apply && effective) {
                    removed.push(localValue);
                }
            }
        }
        else {
            throw new Error(`StorageProxy received invalid update event: ${JSON.stringify(update)}`);
        }
        if (added.length || removed.length) {
            const result = { originatorId: update.originatorId };
            if (added.length)
                result.add = added;
            if (removed.length)
                result.remove = removed;
            return result;
        }
        return null;
    }
    // Read ops: if we're synchronized we can just return the local copy of the data.
    // Otherwise, send a request to the backing store.
    toList() {
        if (this.synchronized === SyncState.full) {
            return Promise.resolve(this.model.toList());
        }
        else {
            // TODO: in synchronized mode, this should integrate with SynchronizeProxy rather than
            //       sending a parallel request
            return new Promise(resolve => this.port.HandleToList({ callback: resolve, handle: this }));
        }
    }
    get(id, particleId) {
        if (this.synchronized === SyncState.full) {
            return Promise.resolve(this.model.getValue(id));
        }
        else {
            return new Promise((resolve, reject) => this.port.HandleToList({ callback: r => resolve(r.find(entity => entity.id === id)), handle: this, particleId }));
        }
    }
    store(value, keys, particleId) {
        const id = value.id;
        const data = { value, keys };
        this.port.HandleStore({ handle: this, callback: () => { }, data, particleId });
        if (this.synchronized !== SyncState.full) {
            return;
        }
        if (!this.model.add(id, value, keys)) {
            return;
        }
        const update = { originatorId: particleId, add: [value] };
        this._notify('update', update, options => options.notifyUpdate);
    }
    clear(particleId) {
        if (this.synchronized !== SyncState.full) {
            this.port.HandleRemoveMultiple({ handle: this, callback: () => { }, data: [], particleId });
        }
        let items = this.model.toList().map(item => ({ id: item.id, keys: this.model.getKeys(item.id) }));
        this.port.HandleRemoveMultiple({ handle: this, callback: () => { }, data: items, particleId });
        items = items.map(({ id, keys }) => ({ rawData: this.model.getValue(id).rawData, id, keys }));
        items = items.filter(item => this.model.remove(item.id, item.keys));
        if (items.length > 0) {
            this._notify('update', { originatorId: particleId, remove: items }, options => options.notifyUpdate);
        }
    }
    remove(id, keys, particleId) {
        if (this.synchronized !== SyncState.full) {
            const data = { id, keys: [] };
            this.port.HandleRemove({ handle: this, callback: () => { }, data, particleId });
            return;
        }
        const value = this.model.getValue(id);
        if (!value) {
            return;
        }
        if (keys.length === 0) {
            keys = this.model.getKeys(id);
        }
        const data = { id, keys };
        this.port.HandleRemove({ handle: this, callback: () => { }, data, particleId });
        if (!this.model.remove(id, keys)) {
            return;
        }
        const update = { originatorId: particleId, remove: [value] };
        this._notify('update', update, options => options.notifyUpdate);
    }
}
/**
 * Variables are synchronized in a 'last-writer-wins' scheme. When the
 * VariableProxy mutates the model, it sets a barrier and expects to
 * receive the barrier value echoed back in a subsequent update event.
 * Between those two points in time updates are not applied or
 * notified about as these reflect concurrent writes that did not 'win'.
 */
class VariableProxy extends StorageProxy {
    constructor() {
        super(...arguments);
        this.model = null;
    }
    _getModelForSync() {
        return this.model;
    }
    _synchronizeModel(version, model) {
        // If there's an active barrier then we shouldn't apply the model here, because
        // there is a more recent write from the particle side that is still in flight.
        if (this.barrier != null) {
            return false;
        }
        this.version = version;
        this.model = model.length === 0 ? null : model[0].value;
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(this.model !== undefined);
        return true;
    }
    _processUpdate(update, apply = true) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])('data' in update);
        if (!apply) {
            return update;
        }
        // If we have set a barrier, suppress updates until after
        // we have seen the barrier return via an update.
        if (this.barrier != null) {
            if (update.barrier === this.barrier) {
                this.barrier = null;
                // HOLY LAYERING VIOLATION BATMAN
                //
                // We just cleared a barrier which means we are now synchronized. If we weren't
                // synchronized already, then we need to tell the handles.
                //
                // TODO(shans): refactor this code so we don't need to layer-violate. 
                if (this.synchronized !== SyncState.full) {
                    this.synchronized = SyncState.full;
                    const syncModel = this._getModelForSync();
                    this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);
                }
            }
            return null;
        }
        this.model = update.data;
        return update;
    }
    // Read ops: if we're synchronized we can just return the local copy of the data.
    // Otherwise, send a request to the backing store.
    // TODO: in synchronized mode, these should integrate with SynchronizeProxy rather than
    //       sending a parallel request
    get() {
        if (this.synchronized === SyncState.full) {
            return Promise.resolve(this.model);
        }
        else {
            return new Promise(resolve => this.port.HandleGet({ callback: resolve, handle: this }));
        }
    }
    set(entity, particleId) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(entity !== undefined);
        if (JSON.stringify(this.model) === JSON.stringify(entity)) {
            return;
        }
        let barrier;
        // If we're setting to this handle but we aren't listening to firebase, 
        // then there's no point creating a barrier. In fact, if the response 
        // to the set comes back before a listener is registered then this proxy will
        // end up locked waiting for a barrier that will never arrive.
        if (this.listenerAttached) {
            // TODO(shans): this.generateID() used to take a parameter. Is this the
            // cause of some of the key collisions we're seeing?
            barrier = this.generateID( /* 'barrier' */);
        }
        else {
            barrier = null;
        }
        // TODO: is this already a clone?
        this.model = JSON.parse(JSON.stringify(entity));
        this.barrier = barrier;
        this.port.HandleSet({ data: entity, handle: this, particleId, barrier });
        const update = { originatorId: particleId, data: entity };
        this._notify('update', update, options => options.notifyUpdate);
    }
    clear(particleId) {
        if (this.model == null) {
            return;
        }
        const barrier = this.generateID( /* 'barrier' */);
        this.model = null;
        this.barrier = barrier;
        this.port.HandleClear({ handle: this, particleId, barrier });
        const update = { originatorId: particleId, data: null };
        this._notify('update', update, options => options.notifyUpdate);
    }
}
// BigCollections are never synchronized. No local state is held and all operations are passed
// directly through to the backing store.
class BigCollectionProxy extends StorageProxy {
    register(particle, handle) {
        if (handle.canRead) {
            this.scheduler.enqueue(particle, handle, ['sync', particle, {}]);
        }
    }
    // tslint:disable-next-line: no-any
    _getModelForSync() {
        throw new Error("_getModelForSync not implemented for BigCollectionProxy");
    }
    _processUpdate() {
        throw new Error("_processUpdate not implemented for BigCollectionProxy");
    }
    _synchronizeModel() {
        throw new Error("_synchronizeModel not implemented for BigCollectionProxy");
    }
    // TODO: surface get()
    async store(value, keys, particleId) {
        return new Promise(resolve => this.port.HandleStore({ handle: this, callback: resolve, data: { value, keys }, particleId }));
    }
    async remove(id, particleId) {
        return new Promise(resolve => this.port.HandleRemove({ handle: this, callback: resolve, data: { id, keys: [] }, particleId }));
    }
    async stream(pageSize, forward) {
        return new Promise(resolve => this.port.HandleStream({ handle: this, callback: resolve, pageSize, forward }));
    }
    async cursorNext(cursorId) {
        return new Promise(resolve => this.port.StreamCursorNext({ handle: this, callback: resolve, cursorId }));
    }
    cursorClose(cursorId) {
        this.port.StreamCursorClose({ handle: this, cursorId });
    }
}
class StorageProxyScheduler {
    constructor() {
        this._scheduled = false;
        this._queues = new Map();
        this._idleResolver = null;
        this._idle = null;
        this._scheduled = false;
        // Particle -> {Handle -> [Queue of events]}
        this._queues = new Map();
    }
    // TODO: break apart args here, sync events should flush the queue.
    enqueue(particle, handle, args) {
        if (!this._queues.has(particle)) {
            this._queues.set(particle, new Map());
        }
        const byHandle = this._queues.get(particle);
        if (!byHandle.has(handle)) {
            byHandle.set(handle, []);
        }
        const queue = byHandle.get(handle);
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
            const particle = [...this._queues.keys()][0];
            const byHandle = this._queues.get(particle);
            this._queues.delete(particle);
            for (const [handle, queue] of byHandle.entries()) {
                for (const args of queue) {
                    try {
                        handle._notify(...args);
                    }
                    catch (e) {
                        console.error('Error dispatching to particle', e);
                        handle._proxy.raiseSystemException(e, 'StorageProxyScheduler::_dispatch', handle._particleId);
                    }
                }
            }
        }
        this._updateIdle();
    }
}
//# sourceMappingURL=storage-proxy.js.map

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
    /**
     * Adds membership, `keys`, of `value` indexed by `id` to this collection.
     * Returns whether the change is effective (`id` is new to the collection,
     * or `value` is different to the value previously stored).
     */
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
                Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_0__["assert"])(newKeys, 'cannot add without new keys. incoming=' + keys.join(',') + ' existing=' + [...item.keys].join(','));
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
    /**
     * Removes the membership, `keys`, of the value indexed by `id` from this collection.
     * Returns whether the change is effective (the value is no longer present
     * in the collection because all of the keys have been removed).
     */
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

/***/ "./runtime/ts-build/type-variable.js":
/*!*******************************************!*\
  !*** ./runtime/ts-build/type-variable.js ***!
  \*******************************************/
/*! exports provided: TypeVariable */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TypeVariable", function() { return TypeVariable; });
/* harmony import */ var _type_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./type.js */ "./runtime/ts-build/type.js");
/* harmony import */ var _platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../platform/assert-web.js */ "./platform/assert-web.js");
/* harmony import */ var _schema_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./schema.js */ "./runtime/ts-build/schema.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt



class TypeVariable {
    constructor(name, canWriteSuperset, canReadSubset) {
        this.name = name;
        this._canWriteSuperset = canWriteSuperset;
        this._canReadSubset = canReadSubset;
        this._resolution = null;
    }
    /**
     * Merge both the read subset (upper bound) and write superset (lower bound) constraints
     * of two variables together. Use this when two separate type variables need to resolve
     * to the same value.
     */
    maybeMergeConstraints(variable) {
        if (!this.maybeMergeCanReadSubset(variable.canReadSubset)) {
            return false;
        }
        return this.maybeMergeCanWriteSuperset(variable.canWriteSuperset);
    }
    /**
     * Merge a type variable's read subset (upper bound) constraints into this variable.
     * This is used to accumulate read constraints when resolving a handle's type.
     */
    maybeMergeCanReadSubset(constraint) {
        if (constraint == null) {
            return true;
        }
        if (this.canReadSubset == null) {
            this.canReadSubset = constraint;
            return true;
        }
        if (this.canReadSubset instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["SlotType"] && constraint instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["SlotType"]) {
            // TODO: formFactor compatibility, etc.
            return true;
        }
        const mergedSchema = _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].intersect(this.canReadSubset.entitySchema, constraint.entitySchema);
        if (!mergedSchema) {
            return false;
        }
        this.canReadSubset = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newEntity(mergedSchema);
        return true;
    }
    /**
     * merge a type variable's write superset (lower bound) constraints into this variable.
     * This is used to accumulate write constraints when resolving a handle's type.
     */
    maybeMergeCanWriteSuperset(constraint) {
        if (constraint == null) {
            return true;
        }
        if (this.canWriteSuperset == null) {
            this.canWriteSuperset = constraint;
            return true;
        }
        if (this.canWriteSuperset instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["SlotType"] && constraint instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["SlotType"]) {
            // TODO: formFactor compatibility, etc.
            return true;
        }
        const mergedSchema = _schema_js__WEBPACK_IMPORTED_MODULE_2__["Schema"].union(this.canWriteSuperset.entitySchema, constraint.entitySchema);
        if (!mergedSchema) {
            return false;
        }
        this.canWriteSuperset = _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].newEntity(mergedSchema);
        return true;
    }
    isSatisfiedBy(type) {
        const constraint = this._canWriteSuperset;
        if (!constraint) {
            return true;
        }
        if (!(constraint instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["EntityType"]) || !(type instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["EntityType"])) {
            throw new Error(`constraint checking not implemented for ${this} and ${type}`);
        }
        return type.getEntitySchema().isMoreSpecificThan(constraint.getEntitySchema());
    }
    get resolution() {
        if (this._resolution) {
            return this._resolution.resolvedType();
        }
        return null;
    }
    set resolution(value) {
        Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(!this._resolution);
        const elementType = value.resolvedType().getContainedType();
        if (elementType instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
            Object(_platform_assert_web_js__WEBPACK_IMPORTED_MODULE_1__["assert"])(elementType.variable !== this, 'variable cannot resolve to collection of itself');
        }
        let probe = value;
        while (probe) {
            if (!(probe instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"])) {
                break;
            }
            if (probe.variable === this) {
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
            if (this._resolution instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
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
            if (this._resolution instanceof _type_js__WEBPACK_IMPORTED_MODULE_0__["VariableType"]) {
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
        return new TypeVariable(data.name, data.canWriteSuperset ? _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(data.canWriteSuperset) : null, data.canReadSubset ? _type_js__WEBPACK_IMPORTED_MODULE_0__["Type"].fromLiteral(data.canReadSubset) : null);
    }
    isResolved() {
        return (this._resolution && this._resolution.isResolved());
    }
}
//# sourceMappingURL=type-variable.js.map

/***/ }),

/***/ "./runtime/ts-build/type.js":
/*!**********************************!*\
  !*** ./runtime/ts-build/type.js ***!
  \**********************************/
/*! exports provided: Type, EntityType, VariableType, CollectionType, BigCollectionType, RelationType, InterfaceType, SlotType, ReferenceType, ArcInfoType, HandleInfoType */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Type", function() { return Type; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "EntityType", function() { return EntityType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "VariableType", function() { return VariableType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CollectionType", function() { return CollectionType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BigCollectionType", function() { return BigCollectionType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RelationType", function() { return RelationType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "InterfaceType", function() { return InterfaceType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SlotType", function() { return SlotType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ReferenceType", function() { return ReferenceType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ArcInfoType", function() { return ArcInfoType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "HandleInfoType", function() { return HandleInfoType; });
/* harmony import */ var _schema_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./schema.js */ "./runtime/ts-build/schema.js");
/* harmony import */ var _type_variable_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./type-variable.js */ "./runtime/ts-build/type-variable.js");
/* harmony import */ var _shape_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./shape.js */ "./runtime/ts-build/shape.js");
/* harmony import */ var _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./recipe/type-checker.js */ "./runtime/ts-build/recipe/type-checker.js");
// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt




class Type {
    constructor(tag, data) {
        this.tag = tag;
        this.data = data;
    }
    // TODO: remove these; callers can directly construct the classes now
    static newEntity(entity) {
        return new EntityType(entity);
    }
    static newVariable(variable) {
        return new VariableType(variable);
    }
    static newCollection(collection) {
        return new CollectionType(collection);
    }
    static newBigCollection(bigCollection) {
        return new BigCollectionType(bigCollection);
    }
    static newRelation(relation) {
        return new RelationType(relation);
    }
    static newInterface(iface) {
        return new InterfaceType(iface);
    }
    static newSlot(slot) {
        return new SlotType(slot);
    }
    static newReference(reference) {
        return new ReferenceType(reference);
    }
    static newArcInfo() {
        return new ArcInfoType();
    }
    static newHandleInfo() {
        return new HandleInfoType();
    }
    static fromLiteral(literal) {
        switch (literal.tag) {
            case 'Entity':
                return new EntityType(_schema_js__WEBPACK_IMPORTED_MODULE_0__["Schema"].fromLiteral(literal.data));
            case 'Variable':
                return new VariableType(_type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"].fromLiteral(literal.data));
            case 'Collection':
                return new CollectionType(Type.fromLiteral(literal.data));
            case 'BigCollection':
                return new BigCollectionType(Type.fromLiteral(literal.data));
            case 'Relation':
                return new RelationType(literal.data);
            case 'Interface':
                return new InterfaceType(_shape_js__WEBPACK_IMPORTED_MODULE_2__["Shape"].fromLiteral(literal.data));
            case 'Slot':
                return new SlotType(literal.data);
            case 'Reference':
                return new ReferenceType(Type.fromLiteral(literal.data));
            case 'ArcInfo':
                return new ArcInfoType();
            case 'HandleInfo':
                return new HandleInfoType();
            default:
                throw new Error(`fromLiteral: unknown type ${literal}`);
        }
    }
    static unwrapPair(type1, type2) {
        if (type1.tag === type2.tag) {
            const contained1 = type1.getContainedType();
            if (contained1 !== null) {
                return Type.unwrapPair(contained1, type2.getContainedType());
            }
        }
        return [type1, type2];
    }
    /** Tests whether two types' constraints are compatible with each other. */
    static canMergeConstraints(type1, type2) {
        return Type._canMergeCanReadSubset(type1, type2) && Type._canMergeCanWriteSuperset(type1, type2);
    }
    static _canMergeCanReadSubset(type1, type2) {
        if (type1.canReadSubset && type2.canReadSubset) {
            if (type1.canReadSubset.tag !== type2.canReadSubset.tag) {
                return false;
            }
            if (type1.canReadSubset instanceof EntityType) {
                return _schema_js__WEBPACK_IMPORTED_MODULE_0__["Schema"].intersect(type1.canReadSubset.entitySchema, type2.canReadSubset.entitySchema) !== null;
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
            if (type1.canWriteSuperset instanceof EntityType) {
                return _schema_js__WEBPACK_IMPORTED_MODULE_0__["Schema"].union(type1.canWriteSuperset.entitySchema, type2.canWriteSuperset.entitySchema) !== null;
            }
        }
        return true;
    }
    // TODO: update call sites to use the type checker instead (since they will
    // have additional information about direction etc.)
    equals(type) {
        return _recipe_type_checker_js__WEBPACK_IMPORTED_MODULE_3__["TypeChecker"].compareTypes({ type: this }, { type });
    }
    isResolved() {
        // TODO: one of these should not exist.
        return !this.hasUnresolvedVariable;
    }
    mergeTypeVariablesByName(variableMap) {
        return this;
    }
    _applyExistenceTypeTest(test) {
        return test(this);
    }
    get hasVariable() {
        return this._applyExistenceTypeTest(type => type instanceof VariableType);
    }
    get hasUnresolvedVariable() {
        return this._applyExistenceTypeTest(type => type instanceof VariableType && !type.variable.isResolved());
    }
    primitiveType() {
        return null;
    }
    getContainedType() {
        return null;
    }
    isTypeContainer() {
        return false;
    }
    collectionOf() {
        return new CollectionType(this);
    }
    bigCollectionOf() {
        return new BigCollectionType(this);
    }
    resolvedType() {
        return this;
    }
    canEnsureResolved() {
        return this.isResolved() || this._canEnsureResolved();
    }
    _canEnsureResolved() {
        return true;
    }
    maybeEnsureResolved() {
        return true;
    }
    get canWriteSuperset() {
        throw new Error(`canWriteSuperset not implemented for ${this}`);
    }
    get canReadSubset() {
        throw new Error(`canReadSubset not implemented for ${this}`);
    }
    isMoreSpecificThan(type) {
        return this.tag === type.tag && this._isMoreSpecificThan(type);
    }
    _isMoreSpecificThan(type) {
        throw new Error(`isMoreSpecificThan not implemented for ${this}`);
    }
    /**
     * Clone a type object.
     * When cloning multiple types, variables that were associated with the same name
     * before cloning should still be associated after cloning. To maintain this
     * property, create a Map() and pass it into all clone calls in the group.
     */
    clone(variableMap) {
        // TODO: clean this up
        const type = this.resolvedType();
        if (type instanceof VariableType) {
            if (variableMap.has(type.variable)) {
                return new VariableType(variableMap.get(type.variable));
            }
            else {
                const newTypeVariable = _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"].fromLiteral(type.variable.toLiteral());
                variableMap.set(type.variable, newTypeVariable);
                return new VariableType(newTypeVariable);
            }
        }
        if (type.data['clone']) {
            return Type.fromLiteral({ tag: type.tag, data: type.data['clone'](variableMap) });
        }
        return Type.fromLiteral(type.toLiteral());
    }
    /**
     * Clone a type object, maintaining resolution information.
     * This function SHOULD NOT BE USED at the type level. In order for type variable
     * information to be maintained correctly, an entire context root needs to be
     * cloned.
     */
    _cloneWithResolutions(variableMap) {
        return Type.fromLiteral(this.toLiteral());
    }
    // tslint:disable-next-line: no-any
    toLiteral() {
        return this;
    }
    // TODO: is this the same as _applyExistenceTypeTest
    hasProperty(property) {
        return property(this) || this._hasProperty(property);
    }
    _hasProperty(property) {
        return false;
    }
    toString(options = undefined) {
        return this.tag;
    }
    getEntitySchema() {
        return null;
    }
    toPrettyString() {
        return null;
    }
}
class EntityType extends Type {
    // TODO: replace with a member var once data has been removed
    get entitySchema() { return this.data; }
    constructor(schema) {
        super('Entity', schema);
    }
    // These type identifier methods are being left in place for non-runtime code.
    get isEntity() {
        return true;
    }
    get canWriteSuperset() {
        return this;
    }
    get canReadSubset() {
        return this;
    }
    _isMoreSpecificThan(type) {
        return this.entitySchema.isMoreSpecificThan(type.entitySchema);
    }
    toLiteral() {
        return { tag: this.tag, data: this.entitySchema.toLiteral() };
    }
    toString(options = undefined) {
        return this.entitySchema.toInlineSchemaString(options);
    }
    getEntitySchema() {
        return this.entitySchema;
    }
    toPrettyString() {
        if (this.entitySchema.description.pattern) {
            return this.entitySchema.description.pattern;
        }
        // Spit MyTypeFOO to My Type FOO
        if (this.entitySchema.name) {
            return this.entitySchema.name.replace(/([^A-Z])([A-Z])/g, '$1 $2')
                .replace(/([A-Z][^A-Z])/g, ' $1')
                .replace(/[\s]+/g, ' ')
                .trim();
        }
        return JSON.stringify(this.entitySchema.toLiteral());
    }
}
// Yes, these names need fixing.
class VariableType extends Type {
    // TODO: replace with a member var once data has been removed
    get variable() { return this.data; }
    constructor(variable) {
        super('Variable', variable);
    }
    get isVariable() {
        return true;
    }
    mergeTypeVariablesByName(variableMap) {
        const name = this.variable.name;
        let variable = variableMap.get(name);
        if (!variable) {
            variable = this;
            variableMap.set(name, this);
        }
        else if (variable instanceof VariableType) {
            if (variable.variable.hasConstraint || this.variable.hasConstraint) {
                const mergedConstraint = variable.variable.maybeMergeConstraints(this.variable);
                if (!mergedConstraint) {
                    throw new Error('could not merge type variables');
                }
            }
        }
        return variable;
    }
    resolvedType() {
        return this.variable.resolution || this;
    }
    _canEnsureResolved() {
        return this.variable.canEnsureResolved();
    }
    maybeEnsureResolved() {
        return this.variable.maybeEnsureResolved();
    }
    get canWriteSuperset() {
        return this.variable.canWriteSuperset;
    }
    get canReadSubset() {
        return this.variable.canReadSubset;
    }
    _cloneWithResolutions(variableMap) {
        if (variableMap.has(this.variable)) {
            return new VariableType(variableMap.get(this.variable));
        }
        else {
            const newTypeVariable = _type_variable_js__WEBPACK_IMPORTED_MODULE_1__["TypeVariable"].fromLiteral(this.variable.toLiteralIgnoringResolutions());
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
            return new VariableType(newTypeVariable);
        }
    }
    toLiteral() {
        return this.variable.resolution ? this.variable.resolution.toLiteral()
            : { tag: this.tag, data: this.variable.toLiteral() };
    }
    toString(options = undefined) {
        return `~${this.variable.name}`;
    }
    getEntitySchema() {
        return this.variable.isResolved() ? this.resolvedType().getEntitySchema() : null;
    }
    toPrettyString() {
        return this.variable.isResolved() ? this.resolvedType().toPrettyString() : `[~${this.variable.name}]`;
    }
}
class CollectionType extends Type {
    // TODO: replace with a member var once data has been removed
    get collectionType() { return this.data; }
    constructor(collectionType) {
        super('Collection', collectionType);
    }
    get isCollection() {
        return true;
    }
    mergeTypeVariablesByName(variableMap) {
        const primitiveType = this.collectionType;
        const result = primitiveType.mergeTypeVariablesByName(variableMap);
        return (result === primitiveType) ? this : result.collectionOf();
    }
    _applyExistenceTypeTest(test) {
        return this.collectionType._applyExistenceTypeTest(test);
    }
    // TODO: remove this in favor of a renamed collectionType
    primitiveType() {
        return this.collectionType;
    }
    getContainedType() {
        return this.collectionType;
    }
    isTypeContainer() {
        return true;
    }
    resolvedType() {
        const primitiveType = this.collectionType;
        const resolvedPrimitiveType = primitiveType.resolvedType();
        return (primitiveType !== resolvedPrimitiveType) ? resolvedPrimitiveType.collectionOf() : this;
    }
    _canEnsureResolved() {
        return this.collectionType.canEnsureResolved();
    }
    maybeEnsureResolved() {
        return this.collectionType.maybeEnsureResolved();
    }
    _cloneWithResolutions(variableMap) {
        return new CollectionType(this.collectionType._cloneWithResolutions(variableMap));
    }
    toLiteral() {
        return { tag: this.tag, data: this.collectionType.toLiteral() };
    }
    _hasProperty(property) {
        return this.collectionType.hasProperty(property);
    }
    toString(options = undefined) {
        return `[${this.collectionType.toString(options)}]`;
    }
    getEntitySchema() {
        return this.collectionType.getEntitySchema();
    }
    toPrettyString() {
        const entitySchema = this.getEntitySchema();
        if (entitySchema && entitySchema.description.plural) {
            return entitySchema.description.plural;
        }
        return `${this.collectionType.toPrettyString()} List`;
    }
}
class BigCollectionType extends Type {
    // TODO: replace with a member var once data has been removed
    get bigCollectionType() { return this.data; }
    constructor(bigCollectionType) {
        super('BigCollection', bigCollectionType);
    }
    get isBigCollection() {
        return true;
    }
    mergeTypeVariablesByName(variableMap) {
        const primitiveType = this.bigCollectionType;
        const result = primitiveType.mergeTypeVariablesByName(variableMap);
        return (result === primitiveType) ? this : result.bigCollectionOf();
    }
    _applyExistenceTypeTest(test) {
        return this.bigCollectionType._applyExistenceTypeTest(test);
    }
    getContainedType() {
        return this.bigCollectionType;
    }
    isTypeContainer() {
        return true;
    }
    resolvedType() {
        const primitiveType = this.bigCollectionType;
        const resolvedPrimitiveType = primitiveType.resolvedType();
        return (primitiveType !== resolvedPrimitiveType) ? resolvedPrimitiveType.bigCollectionOf() : this;
    }
    _canEnsureResolved() {
        return this.bigCollectionType.canEnsureResolved();
    }
    maybeEnsureResolved() {
        return this.bigCollectionType.maybeEnsureResolved();
    }
    _cloneWithResolutions(variableMap) {
        return new BigCollectionType(this.bigCollectionType._cloneWithResolutions(variableMap));
    }
    toLiteral() {
        return { tag: this.tag, data: this.bigCollectionType.toLiteral() };
    }
    _hasProperty(property) {
        return this.bigCollectionType.hasProperty(property);
    }
    toString(options = undefined) {
        return `BigCollection<${this.bigCollectionType.toString(options)}>`;
    }
    getEntitySchema() {
        return this.bigCollectionType.getEntitySchema();
    }
    toPrettyString() {
        const entitySchema = this.getEntitySchema();
        if (entitySchema && entitySchema.description.plural) {
            return entitySchema.description.plural;
        }
        return `Collection of ${this.bigCollectionType.toPrettyString()}`;
    }
}
class RelationType extends Type {
    // TODO: replace with a member var once data has been removed
    get relationEntities() { return this.data; }
    constructor(relation) {
        super('Relation', relation);
    }
    get isRelation() {
        return true;
    }
    toPrettyString() {
        return JSON.stringify(this.relationEntities);
    }
}
class InterfaceType extends Type {
    // TODO: replace with a member var once data has been removed
    get interfaceShape() { return this.data; }
    constructor(iface) {
        super('Interface', iface);
    }
    get isInterface() {
        return true;
    }
    mergeTypeVariablesByName(variableMap) {
        const shape = this.interfaceShape.clone(new Map());
        shape.mergeTypeVariablesByName(variableMap);
        // TODO: only build a new type when a variable is modified
        return new InterfaceType(shape);
    }
    _applyExistenceTypeTest(test) {
        return this.interfaceShape._applyExistenceTypeTest(test);
    }
    resolvedType() {
        return new InterfaceType(this.interfaceShape.resolvedType());
    }
    _canEnsureResolved() {
        return this.interfaceShape.canEnsureResolved();
    }
    maybeEnsureResolved() {
        return this.interfaceShape.maybeEnsureResolved();
    }
    get canWriteSuperset() {
        return new InterfaceType(this.interfaceShape.canWriteSuperset);
    }
    get canReadSubset() {
        return new InterfaceType(this.interfaceShape.canReadSubset);
    }
    _isMoreSpecificThan(type) {
        return this.interfaceShape.isMoreSpecificThan(type.interfaceShape);
    }
    _cloneWithResolutions(variableMap) {
        return new InterfaceType(this.interfaceShape._cloneWithResolutions(variableMap));
    }
    toLiteral() {
        return { tag: this.tag, data: this.interfaceShape.toLiteral() };
    }
    toString(options = undefined) {
        return this.interfaceShape.name;
    }
    toPrettyString() {
        return this.interfaceShape.toPrettyString();
    }
}
class SlotType extends Type {
    // TODO: replace with a member var once data has been removed
    get slot() { return this.data; }
    constructor(slot) {
        super('Slot', slot);
    }
    get isSlot() {
        return true;
    }
    get canWriteSuperset() {
        return this;
    }
    get canReadSubset() {
        return this;
    }
    _isMoreSpecificThan(type) {
        // TODO: formFactor checking, etc.
        return true;
    }
    toString(options = undefined) {
        const fields = [];
        for (const key of Object.keys(this.slot)) {
            if (this.slot[key] !== undefined) {
                fields.push(`${key}:${this.slot[key]}`);
            }
        }
        let fieldsString = '';
        if (fields.length !== 0) {
            fieldsString = ` {${fields.join(', ')}}`;
        }
        return `Slot${fieldsString}`;
    }
    toPrettyString() {
        const fields = [];
        for (const key of Object.keys(this.slot)) {
            if (this.slot[key] !== undefined) {
                fields.push(`${key}:${this.slot[key]}`);
            }
        }
        let fieldsString = '';
        if (fields.length !== 0) {
            fieldsString = ` {${fields.join(', ')}}`;
        }
        return `Slot${fieldsString}`;
    }
}
class ReferenceType extends Type {
    // TODO: replace with a member var once data has been removed
    get referredType() { return this.data; }
    constructor(reference) {
        super('Reference', reference);
    }
    get isReference() {
        return true;
    }
    getContainedType() {
        return this.referredType;
    }
    isTypeContainer() {
        return true;
    }
    resolvedType() {
        const primitiveType = this.referredType;
        const resolvedPrimitiveType = primitiveType.resolvedType();
        return (primitiveType !== resolvedPrimitiveType) ? new ReferenceType(resolvedPrimitiveType) : this;
    }
    _canEnsureResolved() {
        return this.referredType.canEnsureResolved();
    }
    maybeEnsureResolved() {
        return this.referredType.maybeEnsureResolved();
    }
    get canReadSubset() {
        return this.referredType.canReadSubset;
    }
    _cloneWithResolutions(variableMap) {
        return new ReferenceType(this.referredType._cloneWithResolutions(variableMap));
    }
    toLiteral() {
        return { tag: this.tag, data: this.referredType.toLiteral() };
    }
    toString(options = undefined) {
        return 'Reference<' + this.referredType.toString() + '>';
    }
}
class ArcInfoType extends Type {
    constructor() {
        super('ArcInfo', null);
    }
    get isArcInfo() {
        return true;
    }
}
class HandleInfoType extends Type {
    constructor() {
        super('HandleInfo', null);
    }
    get isHandleInfo() {
        return true;
    }
}
//# sourceMappingURL=type.js.map

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
/* harmony import */ var _runtime_ts_build_loader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../runtime/ts-build/loader.js */ "./runtime/ts-build/loader.js");
/* harmony import */ var _runtime_ts_build_particle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../runtime/ts-build/particle.js */ "./runtime/ts-build/particle.js");
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

class BrowserLoader extends _runtime_ts_build_loader_js__WEBPACK_IMPORTED_MODULE_0__["Loader"] {
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
      const macro = Object.keys(this._urlMap).sort((a, b) => b.length - a.length).find(k => path.slice(0, k.length) == k);
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
    //console.log(`requireParticle [${path}]`);
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
    const parts = path.split('/');
    const suffix = parts.pop();
    const folder = parts.join('/');
    const name = suffix.split('.').shift();
    this._urlMap[name] = folder;
  }
  unwrapParticle(particleWrapper, log) {
    // TODO(sjmiles): regarding `resolver`:
    //  _resolve method allows particles to request remapping of assets paths
    //  for use in DOM
    const resolver = this._resolve.bind(this);
    // TODO(sjmiles): hack to plumb `fetch` into Particle space under node
    const _fetch = BrowserLoader.fetch || fetch;
    return particleWrapper({
      Particle: _runtime_ts_build_particle_js__WEBPACK_IMPORTED_MODULE_1__["Particle"],
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
/* harmony import */ var _runtime_ts_build_particle_execution_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../runtime/ts-build/particle-execution-context.js */ "./runtime/ts-build/particle-execution-context.js");
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
  const {id, base} = e.data;
  //log('starting worker', id);
  new _runtime_ts_build_particle_execution_context_js__WEBPACK_IMPORTED_MODULE_0__["ParticleExecutionContext"](e.ports[0], id, new _browser_loader_js__WEBPACK_IMPORTED_MODULE_1__["BrowserLoader"](base));
};


/***/ })

/******/ });
//# sourceMappingURL=worker-entry.js.map