/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from './chai-web.js';
import {APIPort, PECOuterPort, PECInnerPort} from '../api-channel.js';

class Registrar {
  constructor() {
    this.calls = new Map();
    this.handlers = new Map();
    this.initializers = new Map();
    this.initializerHandlers = new Map();
  }
}

describe('API channel', function() {
  let outer;
  let inner;

  before(() => {
    APIPort.prototype._testingHook = function() {
      // Change the argumentType mapping objects/functions to generate string identifiers.
      this.Direct = 'Direct';
      this.LocalMapped = 'LocalMapped';
      this.Mapped = 'Mapped';
      this.Map = (keyprimitive, valueprimitive) => `Map(${keyprimitive},${valueprimitive})`;
      this.List = (primitive) => `List(${primitive})`;
      this.ByLiteral = (clazz) => `ByLiteral(${clazz.name})`;

      // Override the registration functions to just capture the names and args in a Registrar.
      this._reg_ = new Registrar();
      this.registerCall = function(name, argumentTypes) {
        this._reg_.calls.set(name, argumentTypes);
      };
      this.registerHandler = function(name, argumentTypes) {
        this._reg_.handlers.set(name, argumentTypes);
      };
      this.registerInitializer = function(name, argumentTypes) {
        this._reg_.initializers.set(name, argumentTypes);
      };
      this.registerInitializerHandler = function(name, argumentTypes) {
        this._reg_.initializerHandlers.set(name, argumentTypes);
      };
      this.registerRedundantInitializer = this.registerInitializer;
    };

    const port = {};
    const arc = {id: ''}; // OuterPortAttachment constructor needs the id.

    // PECOuterPort can call DevToolsConnected during setup, so we need to stub that.
    const outerPort = new PECOuterPort(port, arc);
    outerPort.DevToolsConnected = () => {};

    outer = outerPort._reg_;
    inner = (new PECInnerPort(port))._reg_;
  });

  after(() => {
    // Restore the normal APIPort constructor behaviour.
    APIPort.prototype._testingHook = function() {};
  });

  // Verifies that message functions are correctly defined between the two sides of the API channel:
  // - registerCall on one side must have a registerHandler on the other;
  // - same for registerInitializer/registerRedundantInitializer and registerInitializerHandler;
  // - the argumentTypes object for the two sides must have the same names and matching types.
  //
  // Argument type matching is defined as:
  // - Direct can match to either Direct or LocalMapped;
  // - LocalMapped cannot match to LocalMapped;
  // - all other combinations must be an exact match.
  //
  // Note that this modifies handlerMap, which is ok because every map in the two Registrar objects
  // is only used once in the four tests below.
  function verify(callerMap, callerLabel, handlerMap, handlerLabel) {
    for (const [name, callerArgs] of callerMap) {
      const handlerArgs = handlerMap.get(name);
      assert.isDefined(handlerArgs, `${callerLabel} '${name}': missing ${handlerLabel}`);

      for (const [arg, callerType] of Object.entries(callerArgs)) {
        const handlerType = handlerArgs[arg];
        assert.isDefined(handlerType, `${callerLabel} '${name}': missing arg '${arg}' in ${handlerLabel}`);
        delete handlerArgs[arg];

        if ((callerType === handlerType && callerType !== 'LocalMapped') ||
            (callerType === 'Direct' && handlerType === 'LocalMapped') ||
            (callerType === 'LocalMapped' && handlerType === 'Direct')) {
          continue;
        }
        assert.fail(0, 0, `${callerLabel} '${name}': type mismatch for arg '${arg}': '${callerType}' vs '${handlerType}'`);
      }
      assert.isEmpty(handlerArgs, `${callerLabel} '${name}': ${handlerLabel} has extra args '${Object.keys(handlerArgs)}'`);
      handlerMap.delete(name);
    }
    assert.isEmpty(handlerMap, `${handlerLabel}s with no ${callerLabel}s: ${[...handlerMap.keys()]}`);
  }

  it('outer port calls match inner port handlers', () => {
    verify(outer.calls, 'PECOuterPort call', inner.handlers, 'PECInnerPort handler');
  });

  it('inner port calls match outer port handlers', () => {
    verify(inner.calls, 'PECInnerPort call', outer.handlers, 'PECOuterPort handler');
  });

  it('outer port initializers match inner port initializer handlers', () => {
    verify(outer.initializers, 'PECOuterPort initializer', inner.initializerHandlers, 'PECInnerPort initializerHandler');
  });

  it('inner port initializers match outer port initializer handlers', () => {
    verify(inner.initializers, 'PECInnerPort initializer', outer.initializerHandlers, 'PECOuterPort initializerHandler');
  });
});
