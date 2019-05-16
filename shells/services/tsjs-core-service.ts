/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Service, Services} from '../../src/runtime/services.js';
import {Constructor, Consumes} from '../../src/runtime/hot.js';
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

function TfCoreMixin<TBase extends Constructor>(base: TBase) {
  return class extends base {
    private _tfc = null;

    get tfc() {
      return async () => {
        if (!this._tfc) {
          this._tfc = await dynamicScript(`https://unpkg.com/@tensorflow/tfjs-core@${VERSION}/dist/tf-core.min.js`);
        }
        return this._tfc;
      };
    }
  };
}

function TfLayersMixin<TBase extends Constructor>(base: TBase) {
  return class extends base {
    private _tfl = null;

    get tfl() {
      return async () => {
        if (!this._tfl) {
          await this.tfc;
          this._tfl = await dynamicScript(`https://unpkg.com/@tensorflow/tfjs-core@${VERSION}/dist/tf-core.min.js`);
        }
        return this._tfl;
      };
    }
  };
}

function TfMixin<TBase extends Constructor>(base: TBase) {
  return class extends base {
    private _tf = null;

    get tf() {
      return async () => {
        if (!this._tf) {
          this._tf = await dynamicScript(`https://unpkg.com/@tensorflow/tfjs@${VERSION}/dist/tf.min.js`);
        }
        return this._tf;
      };
    }
  };
}


const injectorFactory = (key: string, url: string) => async (f: Consumes<{[key: string]: unknown}>) => {
  const lib = await dynamicScript(url);
  return (...args) => f({[key]: lib, ...args});
};

class ReshapeService extends TfCoreService {
}

Services.register('tfjs-core', {

});


