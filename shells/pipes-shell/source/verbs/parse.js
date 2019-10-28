/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Utils} from '../../../lib/utils.js';
import {logsFactory} from '../../../../build/platform/logs-factory.js';

const {log} = logsFactory('pipe::parse');

// can provide either a path or literal content for a manifest
export const parse = async ({path, content}, tid, bus) => {
  // TODO(sjmiles): catch exceptions and relay over bus?
  let manifest;
  if (path) {
    log(`loading [${path}]`);
    manifest = await Utils.parseFile(path);
  } else if (content) {
    log(`parsing [${content.length}] bytes`);
    manifest = await Utils.parse(content);
  }
  let recipes = [];
  if (manifest) {
    recipes = manifest.allRecipes.map(r => ({name: r.name, triggers: r.triggers}));
  }
  log(`sending [${JSON.stringify(recipes)}]`);
  bus.send({tid, messageType: 'manifest', recipes});
};
