/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Service, Services} from '../../src/runtime/services.js';
import {dynamicScript} from './dynamic-script.js';

const VERSION = '1.1.2';

class TfCoreService implements Service {
  private _tfc = null;
  private _url = `https://unpkg.com/@tensorflow/tfjs-core@${VERSION}/dist/tf-core.min.js`;

  get tfc() {
    return async () => {
      if (!this._tfc) {
        this._tfc = await dynamicScript(this._url);
      }
      return this._tfc;
    };
  }
}


