/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PlatformLoader} from '../../../build/platform/loader-web.js';
import {Utils} from '../../shells/lib/runtime/utils.js';

export class DevShellLoader extends PlatformLoader {
  constructor(fileMap) {
    super(Utils.createPathMap('../..'));
    super.flushCaches();
    this._fileMap = fileMap;
  }

  loadResource(path) {
    if (!path) {
      return undefined;
    }
    return this._fileMap[path] || super.loadResource(path);
  }

  path(fileName) {
    return this._fileMap[fileName] ? fileName : super.path(fileName);
  }

  clone() {
    return new DevShellLoader(this._fileMap, this._urlMap);
  }
}
