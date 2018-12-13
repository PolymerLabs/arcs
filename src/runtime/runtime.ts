/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Description} from './description.js';
import {Manifest} from './manifest.js';

// To start with, this class will simply hide the runtime classes that are
// currently imported by ArcsLib.js. Once that refactoring is done, we can
// think about what the api should actually look like.
export class Runtime {
  // list of all the arcs this runtime knows about
  private arcs;
  constructor() {
    this.arcs = [];

    // user information. One persona per runtime for now.
  }


  // Stuff the shell needs

  /**
   * Given an arc, returns it's description as a string.
   */
  static getArcDescription(arc) : Promise<string> {
    // Verify that it's one of my arcs, and make this non-static, once I have
    // Runtime objects in the calling code.
    return new Description(arc).getArcDescription();
  }

  /**
   * Parse a textual manifest and return a Manifest object. See the Manifest
   * class for the options accepted.
   */
  static parseManifest(content, options?) : Promise<Manifest> {
    return Manifest.parse(content, options);
  }

  /**
   * Load and parse a manifest from a resource (not striclty a file) and return
   * a Manifest object. The loader determines the semantics of the fileName. See
   * the Manifest class for details.
   */
  static loadManifest(fileName, loader, options) : Promise<Manifest> {
    return Manifest.load(fileName, loader, options);
  }

  // stuff the strategizer needs

}
