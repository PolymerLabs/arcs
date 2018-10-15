// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// This file provides a set of utility methods that make it easier to trace interactions
// between multiple objects.
//
// Usage:
//   (1) all functions except fullTrace take a list of names of member properties. These
//       names are read from the provided object and thier values are added to the trace string.

//   DLog.trace(object, string, [members]) - trace the current function call of object with
//     optional additional string
//   DLog.traceObject(object, logObj, name, [members]) - trace the current function call of
//     object and dump the contents of logObj (named name)
//   DLog.log(object, string, [members]) - log the provided string
//   DLog.logObject(object, logObj, name, [members]) - log the provided logObj 

let StackTrace = require('../node_modules/stacktrace-js/stacktrace.js');

let __reffedObjects = new Map();

let rand255 = () => Math.round((Math.random() * 256) - 0.5);
let newColor = () => `rgb(${rand255()}, ${rand255()}, ${rand255()})`;

let getColor = (object) => {
  if (!__reffedObjects.get(object)) {
    __reffedObjects.set(object, newColor());
  }
  return `background:${__reffedObjects.get(object)};color:white;`;
};

export class DLog {
  static trace(object, string, args) {
    let funName = StackTrace.getSync()[1].functionName;
    console.log(DLog._logString(object, `${funName}: ${string}`, args), getColor(object), '');
  }

  static log(object, string, args) {
    console.log(DLog._logString(object, string, args), getColor(object), '');
  }

  static _logString(object, string, args) {
    let details = '';
    switch (object.constructor.name) {
      case 'FirebaseCollection':
      case 'FirebaseVariable':
        {
          let key = object.storageKey;
          let keyBits = key.split('://');
          details = keyBits[0];
          if (keyBits[0] == 'firebase') {
            keyBits = keyBits[1].split('/');
            if (keyBits[5] == 'handles') {
              let idBits = keyBits[6].split(':');
              details += ` S${idBits[0]} I${idBits[2]}`;
            } else {
              details += ` ${keyBits.slice(2).join('/')}`;
            }
          }
          details += ` ${object.type}`;
          break;
        }
      case 'CollectionProxy':
      case 'VariableProxy':
      case 'VolatileCollection':
      case 'VolatileVariable':
        details = object.id;
        break;
    }

    if (args && args.length) {
      for (let arg of args) {
        details += ` ${arg}: ${object[arg]}`;
      }
    }

    return `%c${details}%c ${string}`;
  }

  static logObject(object, logObj, name, args) {
    console.log(DLog._logString(object, name, args), getColor(object), '', logObj);
  }

  static traceObject(object, logObj, name, args) {
    let funName = StackTrace.getSync()[1].functionName;
    console.log(DLog._logString(object, `${funName}: ${name}`, args), getColor(object), '', logObj);
  }

  static fullTrace() {
    console.log(StackTrace.getSync().slice(1).map(a => a.toString()).join('\n'));
  }
}
