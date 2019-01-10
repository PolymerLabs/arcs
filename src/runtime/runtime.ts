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
import {Loader} from './loader.js'
import {Manifest} from './manifest.js';

// Runtime provides basic functionality exposed as a set of static methods.
export class Runtime {
  // Stuff the shell needs

  /**
   * Given an arc, returns it's description as a string.
   */
  static async getArcDescription(arc) : Promise<string> {
    // Verify that it's one of my arcs, and make this non-static, once I have
    // Runtime objects in the calling code.
    return (await Description.create(arc)).getArcDescription();
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

  // These are temporary to provide a mechanism whereby the shell can tell the
  // runtime what loader to use, rather than always having to have an arc.
  // TODO(raulverag): Move this stuff to ArcRunner, when it exists, as it will
  // be part of the per-persona environment.
  static _loader: Loader;

  static setLoader(loader: Loader) {
    Runtime._loader = loader;
  }

  static getLoader(): Loader {
    return Runtime._loader;
  }
}
