/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

self.Tf = class {
  constructor(scope) {
    this.scope = scope;
  }
  async sequential() {
    return await this.scope.service({call: 'tfjs.sequential'});
  }
  async linearRegression(model, training, fits, query) {
    return await this.scope.service({call: 'tfjs.linearRegression', model, training, fits, query});
  }
  dispose(reference) {
    this.scope.service({call: 'tfjs.dispose', reference});
  }
}
