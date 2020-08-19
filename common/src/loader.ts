
/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {fetch} from './fetch.js';
import {Path} from './path.js';

export class Loader {
  static async loadText(root, path?) {
    const url = Path.url(root, path);
    const response = await fetch(url);
    return await response.text();
  }
}
